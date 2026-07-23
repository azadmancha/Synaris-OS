"""
Learning Analytics API.

Aggregates user data across sessions, messages, quizzes, and concept mastery
to provide a comprehensive learning dashboard with progress tracking and insights.
"""

import uuid
from collections import Counter
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user_id
from app.infrastructure.database import get_db
from app.models.concept_mastery import ConceptMastery
from app.models.learning_session import LearningSession
from app.models.message import Message
from app.models.quiz import Quiz

router = APIRouter(prefix="/user", tags=["analytics"])


def _naive(dt: datetime | None) -> datetime | None:
    """Convert an aware datetime to naive UTC for safe comparison.

    SQLAlchemy's DateTime(timezone=True) returns aware datetimes on PostgreSQL
    but naive datetimes on SQLite. Converting to naive UTC avoids offset-naive
    vs offset-aware comparison errors regardless of database backend.
    """
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(UTC).replace(tzinfo=None)
    return dt


# ─── Schemas ───────────────────────────────────────────────


class ConceptMasterySummary(BaseModel):
    concept_name: str
    subject: str
    mastery_level: str
    confidence_score: float | None
    times_encountered: int
    times_correct: int | None
    times_incorrect: int | None
    last_reviewed_at: str | None


class QuizPerformanceSummary(BaseModel):
    quiz_id: str
    topic: str
    difficulty: str
    score: int | None
    total_points: int | None
    percentage: float | None
    completed_at: str | None


class SubjectBreakdown(BaseModel):
    subject: str
    session_count: int
    message_count: int
    total_time_minutes: int


class ActivityDay(BaseModel):
    date: str
    sessions: int
    messages: int


class MistakeSummary(BaseModel):
    question: str
    topic: str
    difficulty: str
    user_answer: str
    correct_answer: str
    explanation: str | None
    quiz_id: str
    quiz_completed_at: str | None


class WeakTopic(BaseModel):
    topic: str
    mistake_count: int
    total_questions: int
    accuracy: float  # 0.0 to 1.0


class AnalyticsResponse(BaseModel):
    # Overall stats
    total_sessions: int
    total_messages: int
    total_quizzes: int
    total_concepts: int

    # Session stats
    active_sessions: int
    average_messages_per_session: float

    # Quiz stats
    quizzes_completed: int
    average_quiz_score: float | None
    highest_quiz_score: float | None
    quiz_streak: int  # consecutive correct quizzes (80%+)

    # Concept mastery
    mastered_concepts: int
    learning_concepts: int
    undiscovered_concepts: int
    average_confidence: float | None
    top_subject: str | None

    # Subject breakdown
    subjects: list[SubjectBreakdown]

    # Recent quizzes
    recent_quizzes: list[QuizPerformanceSummary]

    # Concept mastery details
    concept_mastery: list[ConceptMasterySummary]

    # Activity timeline (last 7 days)
    activity_timeline: list[ActivityDay]

    # Learning streak (consecutive days with activity)
    learning_streak_days: int

    # Time-based insights
    session_count_today: int
    is_active_today: bool
    first_learning_date: str | None

    # ── Mistake analysis ──
    total_mistakes: int
    weakest_topics: list[WeakTopic]
    recent_mistakes: list[MistakeSummary]  # last 10 mistakes


# ─── Endpoints ─────────────────────────────────────────────


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Get comprehensive learning analytics for the current user."""

    # Use aware UTC internally, then strip tzinfo for comparison against SQLAlchemy timestamps.
    # SQLAlchemy's DateTime(timezone=True) returns aware datetimes on PostgreSQL
    # but naive datetimes on SQLite. Converting everything to naive UTC avoids
    # "can't compare offset-naive and offset-aware datetimes" errors on any backend.
    now_utc = datetime.now(UTC)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)

    # ── Sessions ──────────────────────────────────────────
    sessions_result = await db.execute(
        select(LearningSession).where(LearningSession.user_id == user_id)
    )
    sessions = sessions_result.scalars().all()
    total_sessions = len(sessions)
    active_sessions = sum(1 for s in sessions if s.status == "active")
    total_session_messages = sum(s.message_count for s in sessions)
    average_messages_per_session = round(
        total_session_messages / total_sessions, 1
    ) if total_sessions > 0 else 0

    # Sessions created today
    sessions_today = [
        s for s in sessions
        if        s.created_at and _naive(s.created_at) >= today_start
    ]
    session_count_today = len(sessions_today)
    is_active_today = session_count_today > 0

    # First learning date
    first_learning_date = None
    if sessions:
        first_session = min(sessions, key=lambda s: _naive(s.created_at) or today_start)
        if first_session.created_at:
            first_learning_date = first_session.created_at.isoformat()

    # ── Messages ──────────────────────────────────────────
    messages_result = await db.execute(
        select(func.count()).select_from(Message).where(
            Message.session_id.in_(
                select(LearningSession.id).where(LearningSession.user_id == user_id)
            )
        )
    )
    total_messages = messages_result.scalar() or 0

    # ── Quizzes ───────────────────────────────────────────
    quizzes_result = await db.execute(
        select(Quiz).where(
            Quiz.user_id == user_id
        ).order_by(desc(Quiz.created_at))
    )
    quizzes = quizzes_result.scalars().all()
    total_quizzes = len(quizzes)
    completed_quizzes = [q for q in quizzes if q.status == "completed"]
    quizzes_completed = len(completed_quizzes)

    # Quiz score statistics
    quiz_scores = [
        (q.score / q.total_points * 100) if q.score is not None and q.total_points and q.total_points > 0 else 0
        for q in completed_quizzes
    ]
    average_quiz_score = round(sum(quiz_scores) / len(quiz_scores), 1) if quiz_scores else None
    highest_quiz_score = round(max(quiz_scores), 1) if quiz_scores else None

    # Quiz streak: consecutive completed quizzes scoring 80%+
    quiz_streak = 0
    for q in completed_quizzes:
        if q.score is not None and q.total_points and q.total_points > 0:
            pct = q.score / q.total_points * 100
            if pct >= 80:
                quiz_streak += 1
            else:
                break

    # Recent quizzes
    recent_quizzes_data = []
    for q in quizzes[:5]:
        pct = (
            round(q.score / q.total_points * 100, 1)
            if q.score is not None and q.total_points and q.total_points > 0
            else None
        )
        recent_quizzes_data.append(QuizPerformanceSummary(
            quiz_id=str(q.id),
            topic=q.topic,
            difficulty=q.difficulty,
            score=q.score,
            total_points=q.total_points,
            percentage=pct,
            completed_at=q.completed_at.isoformat() if q.completed_at else None,
        ))

    # ── Concept Mastery ───────────────────────────────────
    concepts_result = await db.execute(
        select(ConceptMastery).where(ConceptMastery.user_id == user_id)
    )
    concepts = concepts_result.scalars().all()
    total_concepts = len(concepts)

    mastered_concepts = sum(1 for c in concepts if c.mastery_level == "mastered")
    learning_concepts = sum(
        1 for c in concepts if c.mastery_level in ("familiar", "practicing")
    )
    undiscovered_concepts = sum(
        1 for c in concepts if c.mastery_level in ("undiscovered", "introduced")
    )

    # Average confidence
    confidence_scores = [c.confidence_score for c in concepts if c.confidence_score is not None]
    average_confidence = round(sum(confidence_scores) / len(confidence_scores), 2) if confidence_scores else None

    # Top subject (by session count)
    subject_counter = Counter(s.subject for s in sessions if s.subject)
    top_subject = subject_counter.most_common(1)[0][0] if subject_counter else None

    # Concept mastery details
    concept_mastery_data = []
    for c in sorted(concepts, key=lambda x: x.confidence_score or 0, reverse=True)[:20]:
        concept_mastery_data.append(ConceptMasterySummary(
            concept_name=c.concept_name,
            subject=c.subject,
            mastery_level=c.mastery_level,
            confidence_score=c.confidence_score,
            times_encountered=c.times_encountered,
            times_correct=c.times_correct,
            times_incorrect=c.times_incorrect,
            last_reviewed_at=c.last_reviewed_at.isoformat() if c.last_reviewed_at else None,
        ))

    # ── Subject Breakdown ─────────────────────────────────
    subjects_data = []
    for subject, count in subject_counter.most_common():
        subject_messages = sum(
            s.message_count for s in sessions if s.subject == subject
        )
        subjects_data.append(SubjectBreakdown(
            subject=subject or "general",
            session_count=count,
            message_count=subject_messages,
            total_time_minutes=count * 15,  # Estimate ~15 min per session
        ))

    # ── Activity Timeline (last 7 days) ──────────────────
    activity_timeline = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        day_sessions = [
            s for s in sessions
            if s.created_at and _naive(s.created_at).date() == day.date()
        ]
        day_messages = sum(s.message_count for s in day_sessions)
        activity_timeline.append(ActivityDay(
            date=day.strftime("%a"),
            sessions=len(day_sessions),
            messages=day_messages,
        ))

    # ── Mistake Analysis ──────────────────────────────────
    all_mistakes: list[dict] = []
    topic_stats: dict[str, dict[str, int]] = {}

    for q in completed_quizzes:
        topic = q.topic or "general"
        if topic not in topic_stats:
            topic_stats[topic] = {"mistakes": 0, "total": 0}

        questions = q.questions or []
        for question in questions:
            if question.get("user_answer") is not None:
                is_correct = question.get("user_answer") == question.get("correct_answer")
                topic_stats[topic]["total"] += 1
                if not is_correct:
                    topic_stats[topic]["mistakes"] += 1
                    all_mistakes.append({
                        "question": question.get("question", ""),
                        "topic": topic,
                        "difficulty": q.difficulty,
                        "user_answer": question.get("user_answer", ""),
                        "correct_answer": question.get("correct_answer", ""),
                        "explanation": question.get("explanation"),
                        "quiz_id": str(q.id),
                        "quiz_completed_at": q.completed_at.isoformat() if q.completed_at else None,
                    })

    total_mistakes = len(all_mistakes)
    weakest_topics = sorted(
        [
            WeakTopic(
                topic=t,
                mistake_count=s["mistakes"],
                total_questions=s["total"],
                accuracy=round(
                    (s["total"] - s["mistakes"]) / s["total"], 2
                ) if s["total"] > 0 else 0.0,
            )
            for t, s in topic_stats.items()
        ],
        key=lambda x: x.accuracy,
    )
    recent_mistakes = [MistakeSummary(**m) for m in all_mistakes[-10:]]

    # ── Learning Streak ───────────────────────────────────
    learning_streak_days = 0
    check_date = today_start
    while True:
        day_sessions = [
            s for s in sessions
            if s.created_at and _naive(s.created_at).date() == check_date.date()
        ]
        if day_sessions:
            learning_streak_days += 1
            check_date -= timedelta(days=1)
        else:
            break

    return AnalyticsResponse(
        total_sessions=total_sessions,
        total_messages=total_messages,
        total_quizzes=total_quizzes,
        total_concepts=total_concepts,
        active_sessions=active_sessions,
        average_messages_per_session=average_messages_per_session,
        quizzes_completed=quizzes_completed,
        average_quiz_score=average_quiz_score,
        highest_quiz_score=highest_quiz_score,
        quiz_streak=quiz_streak,
        mastered_concepts=mastered_concepts,
        learning_concepts=learning_concepts,
        undiscovered_concepts=undiscovered_concepts,
        average_confidence=average_confidence,
        top_subject=top_subject,
        subjects=subjects_data,
        recent_quizzes=recent_quizzes_data,
        concept_mastery=concept_mastery_data,
        activity_timeline=activity_timeline,
        learning_streak_days=learning_streak_days,
        session_count_today=session_count_today,
        is_active_today=is_active_today,
        first_learning_date=first_learning_date,
        total_mistakes=total_mistakes,
        weakest_topics=weakest_topics,
        recent_mistakes=recent_mistakes,
    )
