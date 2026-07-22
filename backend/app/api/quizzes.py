"""
Quiz Generation API.

Endpoints for generating, retrieving, and answering AI-powered quizzes.
Quizzes are associated with a learning session and use the existing
AI routing infrastructure for generation.
"""

import json
import uuid

import re
import structlog
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db, async_session_factory
from app.models.quiz import Quiz
from app.models.learning_session import LearningSession
from app.api.dependencies import get_current_user_id, check_rate_limit, verify_session
from app.ai.prompts import get_quiz_prompt, get_quiz_system_prompt
from app.orchestration.router import route_request, route_request_stream
from app.security import check_input, check_output

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/sessions/{session_id}/quizzes", tags=["quizzes"])


# ─── Schemas ───────────────────────────────────────────────


class QuizGenerate(BaseModel):
    topic: str
    difficulty: str = "balanced"
    question_count: int = 5


class QuestionAnswer(BaseModel):
    question_id: str
    user_answer: str


class QuizAnswerSubmit(BaseModel):
    answers: list[QuestionAnswer]


class QuizResponse(BaseModel):
    id: str
    session_id: str
    topic: str
    difficulty: str
    question_count: int
    status: str
    score: int | None
    total_points: int | None
    correct_count: int
    answered_count: int
    is_complete: bool
    questions: list[dict[str, Any]] | None  # Questions with correct_answer redacted for in-progress
    model_used: str | None
    created_at: str
    completed_at: str | None


class QuizListResponse(BaseModel):
    quizzes: list[QuizResponse]
    total: int


class PracticeQuizRequest(BaseModel):
    topic: str | None = None  # If None, picks the weakest topic
    difficulty: str = "balanced"
    question_count: int = 5


# ─── Helpers ───────────────────────────────────────────────


def _strip_answers(questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Remove correct answers from questions for client-side display.

    Keeps questions viewable while preventing answer spoofing.
    When the user has answered a question, include their answer + correctness.
    """
    stripped = []
    for q in questions:
        entry = {
            "id": q.get("id"),
            "question": q.get("question"),
            "type": q.get("type"),
            "options": q.get("options"),
            "explanation": q.get("explanation") if q.get("user_answer") is not None else None,
        }
        # Include the user's answer and correctness if answered
        if q.get("user_answer") is not None:
            entry["user_answer"] = q.get("user_answer")
            entry["correct_answer"] = q.get("correct_answer")
            entry["is_correct"] = q.get("user_answer") == q.get("correct_answer")
        else:
            entry["user_answer"] = None
            entry["correct_answer"] = None
            entry["is_correct"] = None
        stripped.append(entry)
    return stripped


def _serialize_quiz(quiz: Quiz, strip_answers: bool = True) -> dict[str, Any]:
    """Serialize a quiz to a response dict."""
    questions = quiz.questions or []
    return {
        "id": str(quiz.id),
        "session_id": str(quiz.session_id),
        "topic": quiz.topic,
        "difficulty": quiz.difficulty,
        "question_count": quiz.question_count,
        "status": quiz.status,
        "score": quiz.score,
        "total_points": quiz.total_points,
        "correct_count": quiz.correct_count,
        "answered_count": quiz.answered_count,
        "is_complete": quiz.is_complete,
        "questions": _strip_answers(questions) if strip_answers else questions,
        "model_used": quiz.model_used,
        "created_at": quiz.created_at.isoformat(),
        "completed_at": quiz.completed_at.isoformat() if quiz.completed_at else None,
    }


def _parse_quiz_json(raw_content: str, topic: str, difficulty: str) -> list[dict[str, Any]]:
    """Parse the AI response into a list of question dicts.

    The AI might wrap JSON in markdown code blocks or include extra text.
    This function handles both cases gracefully.
    """
    content = raw_content.strip()

    # Strip markdown code blocks if present
    if content.startswith("```"):
        # Remove opening ```json or ```
        lines = content.split("\n")
        # Find the first code fence
        start = 0
        for i, line in enumerate(lines):
            if line.strip().startswith("```"):
                start = i + 1
                break
        # Find the closing code fence
        end = len(lines)
        for i in range(len(lines) - 1, start - 1, -1):
            if lines[i].strip().startswith("```"):
                end = i
                break
        content = "\n".join(lines[start:end]).strip()

    # Try to parse JSON
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                raise ValueError("AI response did not contain valid JSON")
        else:
            raise ValueError("AI response did not contain valid JSON")

    questions = data.get("questions", [])
    if not questions or not isinstance(questions, list):
        raise ValueError("AI response missing 'questions' array")

    # Validate and normalize questions
    valid_types = {"multiple_choice", "true_false", "short_answer"}
    validated = []
    for i, q in enumerate(questions):
        q_id = q.get("id", f"q{i + 1}")
        q_type = q.get("type", "multiple_choice")
        if q_type not in valid_types:
            q_type = "multiple_choice"

        entry = {
            "id": q_id,
            "question": q.get("question", ""),
            "type": q_type,
            "options": q.get("options") if q_type in ("multiple_choice", "true_false") else None,
            "correct_answer": q.get("correct_answer", ""),
            "explanation": q.get("explanation", ""),
            "user_answer": None,  # Not yet answered
        }

        # Ensure true_false questions have correct options
        if q_type == "true_false" and not entry["options"]:
            entry["options"] = ["True", "False"]

        validated.append(entry)

    return validated


# ─── Endpoints ─────────────────────────────────────────────


@router.post("/generate/stream")
async def generate_quiz_stream(
    session_id: uuid.UUID,
    request: QuizGenerate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
    _: int = Depends(check_rate_limit),
):
    """
    Generate a quiz and stream the AI response via SSE.

    Returns a Server-Sent Events stream with:
    - `token`: A content token from the AI (accumulate to see the JSON being built)
    - `done`: Quiz generation complete, includes the full quiz data
    - `error`: An error occurred

    The quiz is created and saved to the database once streaming completes.
    """
    user_id_str = str(user_id)
    session_id_str = str(session_id)

    # ── Input Security Check ────────────────────────────────
    input_result = await check_input(
        f"Generate a quiz about: {request.topic}",
        user_id=user_id_str,
    )
    if input_result.blocked:
        raise HTTPException(
            status_code=400,
            detail={
                "message": input_result.message,
                "code": "content_blocked",
                "category": input_result.categories[0] if input_result.categories else "unknown",
            },
        )

    session = await verify_session(session_id, user_id, db)

    prompt = get_quiz_prompt(
        topic=request.topic,
        difficulty=request.difficulty,
        question_count=request.question_count,
    )
    system_prompt = get_quiz_system_prompt(
        difficulty=request.difficulty,
        question_count=request.question_count,
    )

    async def event_generator():
        """Stream AI tokens via SSE, then save the quiz."""
        full_content = ""
        model_used = ""

        try:
            async for chunk in route_request_stream(
                prompt=prompt,
                system_prompt=system_prompt,
                mode="balanced",
            ):
                if chunk.content:
                    full_content += chunk.content
                    yield f"event: token\ndata: {json.dumps(chunk.content)}\n\n"

                if chunk.model_used and chunk.model_used != "unknown":
                    model_used = chunk.model_used

                if chunk.done:
                    break

        except Exception as e:
            logger.error("Quiz generation streaming failed", error=str(e))
            yield f"event: error\ndata: {json.dumps('Failed to generate quiz: ' + str(e))}\n\n"
            return

        # ── Output Security Check ───────────────────────────
        output_result = await check_output(
            full_content,
            user_id=user_id_str,
            session_id=session_id_str,
        )
        if output_result.blocked:
            yield f"event: error\ndata: {json.dumps('The generated quiz was flagged by content safety filters.')}\n\n"
            return

        # ── Parse AI Response ───────────────────────────────
        try:
            questions = _parse_quiz_json(full_content, request.topic, request.difficulty)
        except ValueError as e:
            logger.error("Failed to parse quiz JSON from AI stream", error=str(e))
            yield f"event: error\ndata: {json.dumps('Failed to parse quiz. Please try again.')}\n\n"
            return

        # ── Save Quiz to DB ────────────────────────────────
        async with async_session_factory() as save_session:
            try:
                now = datetime.now(timezone.utc)
                quiz = Quiz(
                    id=uuid.uuid4(),
                    session_id=session_id,
                    user_id=user_id,
                    topic=request.topic,
                    difficulty=request.difficulty,
                    question_count=len(questions),
                    questions=questions,
                    status="generated",
                    total_points=len(questions),
                    model_used=model_used or None,
                )
                save_session.add(quiz)

                # Update session's updated_at
                session_result = await save_session.execute(
                    select(LearningSession).where(
                        LearningSession.id == session_id,
                        LearningSession.user_id == user_id,
                    )
                )
                saved_session = session_result.scalar_one_or_none()
                if saved_session:
                    saved_session.updated_at = now

                await save_session.commit()

                logger.info(
                    "Quiz generated via stream",
                    quiz_id=str(quiz.id),
                    topic=request.topic,
                    question_count=len(questions),
                )

                # Send done event with the full quiz data
                done_data = {
                    "quiz": _serialize_quiz(quiz, strip_answers=True),
                }
                yield f"event: done\ndata: {json.dumps(done_data)}\n\n"

            except Exception as save_err:
                await save_session.rollback()
                logger.error("Failed to save streamed quiz", error=str(save_err))
                yield f"event: error\ndata: {json.dumps('Failed to save quiz. Please try again.')}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/generate", response_model=QuizResponse, status_code=201)
async def generate_quiz(
    session_id: uuid.UUID,
    request: QuizGenerate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
    _: int = Depends(check_rate_limit),
):
    """Generate a quiz on a given topic using AI.

    Creates a Quiz record, sends a generation prompt to the AI,
    parses the structured JSON response, and returns the quiz
    with correct answers stripped for the client.

    For a streaming alternative with live token updates, use
    POST .../generate/stream instead.
    """
    user_id_str = str(user_id)

    # ── Input Security Check ────────────────────────────────
    input_result = await check_input(
        f"Generate a quiz about: {request.topic}",
        user_id=user_id_str,
    )
    if input_result.blocked:
        raise HTTPException(
            status_code=400,
            detail={
                "message": input_result.message,
                "code": "content_blocked",
                "category": input_result.categories[0] if input_result.categories else "unknown",
            },
        )

    session = await verify_session(session_id, user_id, db)

    # ── Generate Quiz via AI ────────────────────────────────
    prompt = get_quiz_prompt(
        topic=request.topic,
        difficulty=request.difficulty,
        question_count=request.question_count,
    )
    system_prompt = get_quiz_system_prompt(
        difficulty=request.difficulty,
        question_count=request.question_count,
    )

    ai_response = await route_request(
        prompt=prompt,
        system_prompt=system_prompt,
        mode="balanced",
    )

    # ── Output Security Check ───────────────────────────────
    output_result = await check_output(
        ai_response.content,
        user_id=user_id_str,
        session_id=str(session_id),
    )
    if output_result.blocked:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "The generated quiz was flagged by content safety filters.",
                "code": "content_blocked",
            },
        )

    # ── Parse AI Response ───────────────────────────────────
    try:
        questions = _parse_quiz_json(ai_response.content, request.topic, request.difficulty)
    except ValueError as e:
        logger.error("Failed to parse quiz JSON from AI: %s", e)
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to generate valid quiz. Please try again.",
                "code": "parse_error",
            },
        )

    # ── Create Quiz Record ──────────────────────────────────
    quiz = Quiz(
        id=uuid.uuid4(),
        session_id=session_id,
        user_id=user_id,
        topic=request.topic,
        difficulty=request.difficulty,
        question_count=len(questions),
        questions=questions,
        status="generated",
        total_points=len(questions),
        model_used=ai_response.model_used,
    )
    db.add(quiz)
    await db.flush()
    await db.commit()

    logger.info(
        "Quiz generated",
        quiz_id=str(quiz.id),
        topic=request.topic,
        question_count=len(questions),
    )

    return QuizResponse(**_serialize_quiz(quiz, strip_answers=True))


@router.post("/practice", response_model=QuizResponse, status_code=201)
async def generate_practice_quiz(
    session_id: uuid.UUID,
    request: PracticeQuizRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
    _: int = Depends(check_rate_limit),
):
    """Generate a practice quiz focusing on previously missed topics.

    If no topic is specified, picks the user's weakest topic based on
    past quiz mistakes. The prompt instructs the AI to focus on concepts
    the user has historically struggled with.
    """
    user_id_str = str(user_id)
    session_id_str = str(session_id)

    session = await verify_session(session_id, user_id, db)

    # Determine topic — pick weakest if not specified
    topic = request.topic
    mistakes_context = ""

    if not topic:
        # Gather all completed quizzes and find weakest topic
        quizzes_result = await db.execute(
            select(Quiz).where(
                Quiz.user_id == user_id,
                Quiz.status == "completed",
            ).order_by(desc(Quiz.completed_at))
        )
        all_quizzes = quizzes_result.scalars().all()

        topic_mistakes: dict[str, dict[str, int]] = {}
        for q in all_quizzes:
            t = q.topic or "general"
            if t not in topic_mistakes:
                topic_mistakes[t] = {"mistakes": 0, "total": 0}
            for question in (q.questions or []):
                if question.get("user_answer") is not None:
                    topic_mistakes[t]["total"] += 1
                    if question["user_answer"] != question.get("correct_answer"):
                        topic_mistakes[t]["mistakes"] += 1

        # Pick topic with lowest accuracy (most mistakes)
        if topic_mistakes:
            topic = min(
                topic_mistakes,
                key=lambda t: (
                    (topic_mistakes[t]["total"] - topic_mistakes[t]["mistakes"]) / topic_mistakes[t]["total"]
                    if topic_mistakes[t]["total"] > 0 else 0
                ),
            )

        # Build mistakes context for the prompt
        if topic and all_quizzes:
            wrong_questions = []
            for q in all_quizzes:
                if q.topic == topic:
                    for question in (q.questions or []):
                        if (question.get("user_answer") is not None
                                and question["user_answer"] != question.get("correct_answer")):
                            wrong_questions.append(question.get("question", ""))

            if wrong_questions:
                mistakes_context = (
                    "\nThe user previously got these questions wrong on this topic. "
                    "Generate DIFFERENT questions that test the SAME underlying concepts:\n"
                    + "\n".join(f"- {wq}" for wq in wrong_questions[:5])
                )

    if not topic:
        topic = request.topic or "general knowledge"

    # ── Input Security Check ──
    input_result = await check_input(
        f"Generate a practice quiz about: {topic}",
        user_id=user_id_str,
    )
    if input_result.blocked:
        raise HTTPException(
            status_code=400,
            detail={"message": input_result.message, "code": "content_blocked", "category": input_result.categories[0] if input_result.categories else "unknown"},
        )

    prompt = (
        f"Generate a practice quiz about: {topic}\n\n"
        f"Number of questions: {request.question_count}\n"
        f"Difficulty: {request.difficulty}\n"
        f"This is a PRACTICE quiz — focus on the concepts the user has struggled with."
        f"{mistakes_context}"
    )
    system_prompt = get_quiz_system_prompt(
        difficulty=request.difficulty,
        question_count=request.question_count,
    )

    ai_response = await route_request(
        prompt=prompt,
        system_prompt=system_prompt,
        mode="balanced",
    )

    # ── Output Security Check ──
    output_result = await check_output(
        ai_response.content,
        user_id=user_id_str,
        session_id=session_id_str,
    )
    if output_result.blocked:
        raise HTTPException(
            status_code=400,
            detail={"message": "The generated quiz was flagged by content safety filters.", "code": "content_blocked"},
        )

    # ── Parse AI Response ──
    try:
        questions = _parse_quiz_json(ai_response.content, topic, request.difficulty)
    except ValueError as e:
        logger.error("Failed to parse practice quiz JSON", error=str(e))
        raise HTTPException(
            status_code=502,
            detail={"message": "Failed to generate valid quiz. Please try again.", "code": "parse_error"},
        )

    # ── Create Quiz Record ──
    quiz = Quiz(
        id=uuid.uuid4(),
        session_id=session_id,
        user_id=user_id,
        topic=f"Practice: {topic}",
        difficulty=request.difficulty,
        question_count=len(questions),
        questions=questions,
        status="generated",
        total_points=len(questions),
        model_used=ai_response.model_used,
    )
    db.add(quiz)
    await db.flush()
    await db.commit()

    logger.info(
        "Practice quiz generated",
        quiz_id=str(quiz.id),
        topic=topic,
        question_count=len(questions),
    )

    return QuizResponse(**_serialize_quiz(quiz, strip_answers=True))


@router.get("", response_model=QuizListResponse)
async def list_quizzes(
    session_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """List quizzes for a session."""
    # Verify session ownership
    session = await verify_session(session_id, user_id, db)

    result = await db.execute(
        select(Quiz)
        .where(
            Quiz.session_id == session_id,
            Quiz.user_id == user_id,
        )
        .order_by(desc(Quiz.created_at))
        .offset(offset)
        .limit(limit)
    )
    quizzes = result.scalars().all()

    return QuizListResponse(
        quizzes=[QuizResponse(**_serialize_quiz(q, strip_answers=True)) for q in quizzes],
        total=len(quizzes),
    )


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    session_id: uuid.UUID,
    quiz_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Get a specific quiz with questions (answers stripped if not yet answered)."""
    # Verify session ownership
    session = await verify_session(session_id, user_id, db)

    result = await db.execute(
        select(Quiz).where(
            Quiz.id == quiz_id,
            Quiz.session_id == session_id,
            Quiz.user_id == user_id,
        )
    )
    quiz = result.scalar_one_or_none()
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    return QuizResponse(**_serialize_quiz(quiz, strip_answers=True))


@router.post("/{quiz_id}/answer", response_model=QuizResponse)
async def submit_answers(
    session_id: uuid.UUID,
    quiz_id: uuid.UUID,
    request: QuizAnswerSubmit,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Submit answers for a quiz and get scored results.

    Each question is evaluated: the user's answer is compared to
    the correct answer. For short_answer questions, a case-insensitive
    substring match is used. Returns the quiz with full results.
    """
    session = await verify_session(session_id, user_id, db)

    result = await db.execute(
        select(Quiz).where(
            Quiz.id == quiz_id,
            Quiz.session_id == session_id,
            Quiz.user_id == user_id,
        )
    )
    quiz = result.scalar_one_or_none()
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.is_complete:
        raise HTTPException(
            status_code=400,
            detail={"message": "This quiz has already been completed.", "code": "quiz_complete"},
        )

    # Build a lookup by question ID
    answer_map = {a.question_id: a.user_answer for a in request.answers}

    # Update each question with the user's answer
    questions = quiz.questions or []
    for q in questions:
        q_id = q.get("id")
        if q_id in answer_map:
            q["user_answer"] = answer_map[q_id]

    # Calculate score
    correct = sum(
        1 for q in questions
        if q.get("user_answer") is not None
        and _check_answer(
            user_answer=q["user_answer"],
            correct_answer=q.get("correct_answer", ""),
            question_type=q.get("type", "multiple_choice"),
        )
    )

    quiz.score = correct
    quiz.total_points = len(questions)
    quiz.status = "completed"
    quiz.completed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()

    logger.info(
        "Quiz completed",
        quiz_id=str(quiz.id),
        score=correct,
        total=len(questions),
    )

    # Return full results with correct answers shown
    return QuizResponse(**_serialize_quiz(quiz, strip_answers=False))


def _check_answer(user_answer: str, correct_answer: str, question_type: str) -> bool:
    """Check if a user's answer matches the correct answer.

    For multiple_choice and true_false: exact match (case-insensitive).
    For short_answer: case-insensitive substring match of key concepts.
    """
    if not user_answer or not correct_answer:
        return False

    ua = user_answer.strip().lower()
    ca = correct_answer.strip().lower()

    if question_type in ("multiple_choice", "true_false"):
        # Exact match on the option text
        return ua == ca or ua == ca.strip(".") or ca == ua.strip(".")

    # short_answer: check for key phrase containment
    # Also exact-ish match for short phrases
    if len(ca) <= 50:
        return ca in ua or ua in ca
    # For longer expected answers, check the user's answer contains key words
    key_words = set(ca.split()) - {"the", "a", "an", "is", "are", "was", "were", "to", "of", "in", "for", "on", "with", "by", "at", "from", "as"}
    if not key_words:
        return ca in ua or ua in ca
    matched = sum(1 for w in key_words if w in ua)
    return matched / len(key_words) >= 0.5
