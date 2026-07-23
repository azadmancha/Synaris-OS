"""
Memory API — serves session summaries for the Long-Term Memory system.

Endpoints:
- GET  /user/memory                     → List all session summaries
- GET  /user/memory/concepts-due        → List concepts due for spaced repetition review
- POST /user/memory/concepts/review     → Record a review for a concept (updates SM-2 interval)
- GET  /sessions/{id}/memory            → Get memory summary for a session
- POST /sessions/{id}/memory            → Force-regenerate a session summary
"""

import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.spaced_repetition import (
    calculate_confidence_score,
    calculate_review_update,
    get_days_until_review,
)
from app.ai.summarizer import generate_session_summary
from app.api.dependencies import get_current_user_id
from app.infrastructure.database import get_db
from app.models.concept_mastery import ConceptMastery
from app.models.memory_summary import MemorySummary

logger = logging.getLogger(__name__)

router = APIRouter(tags=["memory"])


# ─── Schemas ───────────────────────────────────────────────


class ConceptForReview(BaseModel):
    """A concept due for spaced repetition review."""
    concept_name: str
    subject: str
    mastery_level: str
    confidence_score: float | None
    times_encountered: int
    next_review_at: str | None
    days_until_review: int | None


class ConceptsDueResponse(BaseModel):
    concepts: list[ConceptForReview]
    total_due: int


class ConceptReviewRequest(BaseModel):
    """Record a review result for a concept."""
    concept_name: str
    subject: str
    correct: bool
    response_time_seconds: float | None = None
    requested_hint: bool = False


class ConceptReviewResponse(BaseModel):
    """Result of recording a concept review."""
    concept_name: str
    subject: str
    quality: float
    new_mastery_level: str
    new_confidence_score: float
    next_review_at: str
    next_interval_days: int
    passed: bool


class MemorySummaryResponse(BaseModel):
    id: str
    session_id: str
    summary_text: str
    key_concepts: list[str]
    topics: list[str]
    struggles: list[str]
    strengths: list[str]
    message_count: int
    model_used: str | None
    created_at: str


class MemoryListResponse(BaseModel):
    summaries: list[MemorySummaryResponse]
    total: int


# ─── Helpers ───────────────────────────────────────────────


def _serialize(summary: MemorySummary) -> MemorySummaryResponse:
    return MemorySummaryResponse(
        id=str(summary.id),
        session_id=str(summary.session_id),
        summary_text=summary.summary_text,
        key_concepts=summary.key_concepts or [],
        topics=summary.topics or [],
        struggles=summary.struggles or [],
        strengths=summary.strengths or [],
        message_count=summary.message_count,
        model_used=summary.model_used,
        created_at=summary.created_at.isoformat(),
    )


# ─── Endpoints ─────────────────────────────────────────────


@router.get("/user/memory", response_model=MemoryListResponse)
async def list_memory_summaries(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """List session summaries for the current user, newest first.

    These summaries power the Long-Term Memory system — each one
    captures what was learned, key concepts, struggles, and strengths
    from a learning session.
    """
    result = await db.execute(
        select(MemorySummary)
        .where(MemorySummary.user_id == user_id)
        .order_by(desc(MemorySummary.created_at))
        .offset(offset)
        .limit(limit)
    )
    summaries = result.scalars().all()

    return MemoryListResponse(
        summaries=[_serialize(s) for s in summaries],
        total=len(summaries),
    )


@router.get("/user/memory/concepts-due", response_model=ConceptsDueResponse)
async def get_concepts_due_for_review(
    limit: int = 20,
    include_upcoming_days: int = 0,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Get concepts due for spaced repetition review.

    Returns concepts where `next_review_at` is in the past (overdue)
    or due within the next `include_upcoming_days` days.

    Concepts are sorted by urgency: most overdue first.

    Args:
        limit: Maximum number of concepts to return (default 20).
        include_upcoming_days: Also include concepts due within this
                               many days (0 = overdue only).
    """
    now = datetime.now(UTC)

    # Calculate the cutoff: now + upcoming days
    from datetime import timedelta
    cutoff = now + timedelta(days=include_upcoming_days)

    # Query concepts where next_review_at is due
    result = await db.execute(
        select(ConceptMastery)
        .where(
            ConceptMastery.user_id == user_id,
            ConceptMastery.next_review_at <= cutoff,
            ConceptMastery.next_review_at.isnot(None),
        )
        .order_by(ConceptMastery.next_review_at.asc())
        .limit(limit)
    )
    concepts = result.scalars().all()

    due_list = []
    for c in concepts:
        days_until = get_days_until_review(c.next_review_at)
        due_list.append(
            ConceptForReview(
                concept_name=c.concept_name,
                subject=c.subject,
                mastery_level=c.mastery_level,
                confidence_score=c.confidence_score,
                times_encountered=c.times_encountered,
                next_review_at=c.next_review_at.isoformat() if c.next_review_at else None,
                days_until_review=days_until,
            )
        )

    return ConceptsDueResponse(
        concepts=due_list,
        total_due=len(due_list),
    )


@router.post("/user/memory/concepts/review", response_model=ConceptReviewResponse)
async def record_concept_review(
    request: ConceptReviewRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Record a review result for a concept and update its spaced repetition schedule.

    Uses the SM-2 algorithm to calculate:
    - Next review interval (1d → 6d → interval × ease_factor)
    - Updated mastery level (introduced → practicing → familiar → mastered)
    - Updated confidence score
    - Next review date

    If the concept doesn't exist yet in the user's mastery profile,
    it will be created automatically.
    """
    # Find or create the concept mastery record
    result = await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.user_id == user_id,
            ConceptMastery.concept_name == request.concept_name,
            ConceptMastery.subject == request.subject,
        )
    )
    concept = result.scalar_one_or_none()

    if concept is None:
        concept = ConceptMastery(
            id=uuid.uuid4(),
            user_id=user_id,
            concept_name=request.concept_name,
            subject=request.subject,
            mastery_level="introduced",
            confidence_score=0.0,
            times_encountered=0,
            times_correct=0,
            times_incorrect=0,
            last_reviewed_at=None,
            next_review_at=None,
        )
        db.add(concept)

    # Determine current interval by looking at next_review_at
    now = datetime.now(UTC)
    if concept.last_reviewed_at and concept.next_review_at:
        # Calculate the current interval from the last review to next_review
        interval = (concept.next_review_at - concept.last_reviewed_at).days
        interval_days = max(interval, 0)
    else:
        interval_days = 0

    # Determine ease factor from confidence score
    # Map confidence 0.0-1.0 to ease 1.3-2.5
    if concept.confidence_score is not None and concept.confidence_score > 0:
        ease_factor = 1.3 + (concept.confidence_score * 1.2)
    else:
        ease_factor = 2.5

    # Track correct/incorrect counts
    if request.correct:
        concept.times_correct = (concept.times_correct or 0) + 1
    else:
        concept.times_incorrect = (concept.times_incorrect or 0) + 1

    concept.times_encountered += 1

    # Run the SM-2 algorithm
    # total_reviews = count BEFORE this review (times_encountered already includes current)
    update = calculate_review_update(
        correct=request.correct,
        current_mastery_level=concept.mastery_level,
        current_interval_days=interval_days,
        current_ease_factor=ease_factor,
        consecutive_correct=concept.times_correct or 0,
        total_reviews=concept.times_encountered - 1,
        response_time_seconds=request.response_time_seconds,
        requested_hint=request.requested_hint,
    )

    # Apply the update
    concept.mastery_level = update["new_mastery_level"]
    concept.last_reviewed_at = now
    concept.next_review_at = update["next_review_at"]
    concept.confidence_score = calculate_confidence_score(
        mastery_level=update["new_mastery_level"],
        ease_factor=update["new_ease_factor"],
        consecutive_correct=concept.times_correct or 0,
    )
    concept.updated_at = now

    await db.flush()
    await db.commit()

    return ConceptReviewResponse(
        concept_name=concept.concept_name,
        subject=concept.subject,
        quality=update["quality"],
        new_mastery_level=update["new_mastery_level"],
        new_confidence_score=concept.confidence_score,
        next_review_at=update["next_review_at"].isoformat(),
        next_interval_days=update["next_interval_days"],
        passed=update["passed"],
    )


@router.get("/sessions/{session_id}/memory", response_model=MemorySummaryResponse)
async def get_session_memory(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Get the latest memory summary for a specific session."""
    result = await db.execute(
        select(MemorySummary)
        .where(
            MemorySummary.session_id == session_id,
            MemorySummary.user_id == user_id,
        )
        .order_by(desc(MemorySummary.created_at))
        .limit(1)
    )
    summary = result.scalar_one_or_none()

    if summary is None:
        raise HTTPException(
            status_code=404,
            detail="No memory summary found for this session. "
                   "Summaries are generated after a few messages are exchanged.",
        )

    return _serialize(summary)


@router.post("/sessions/{session_id}/memory", response_model=MemorySummaryResponse)
async def refresh_session_memory(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Force-regenerate the summary for a session.

    Useful after continuing a conversation — generates a fresh
    summary incorporating the latest messages.
    """
    # Verify the session belongs to the user
    from app.api.dependencies import verify_session
    await verify_session(session_id, user_id, db)

    summary = await generate_session_summary(
        user_id=user_id,
        session_id=session_id,
        db=db,
        force=True,
    )

    if summary is None:
        raise HTTPException(
            status_code=400,
            detail="Could not generate summary. The session may have too few messages.",
        )

    await db.commit()
    return _serialize(summary)
