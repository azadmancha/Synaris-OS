"""
Chat messages API.

The core interaction endpoint — sends a user message to the AI
Orchestrator and returns the AI's response.
Supports both regular (request/response) and streaming (SSE) modes.
"""

import asyncio
import json
import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.classifier import classify_question
from app.ai.prompts import get_system_prompt
from app.ai.summarizer import generate_session_summary
from app.api.dependencies import check_rate_limit, get_current_user_id, verify_session
from app.infrastructure.database import async_session_factory, engine, get_db
from app.knowledge.embeddings import get_embedding_service
from app.knowledge.pipeline import augment_with_knowledge
from app.models.learning_session import LearningSession
from app.models.memory_summary import MemorySummary
from app.models.message import Message
from app.orchestration.router import route_request, route_request_stream
from app.security import check_input, check_output

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions/{session_id}/messages", tags=["messages"])


# ─── Schemas ───────────────────────────────────────────────


class MessageSend(BaseModel):
    content: str
    mode: str = "balanced"
    answer_mode: str = "teach"


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    content_type: str
    model_used: str | None = None
    sequence_number: int
    created_at: str


class ChatResponse(BaseModel):
    user_message: MessageResponse
    ai_message: MessageResponse
    mode: str


# ─── Helpers ───────────────────────────────────────────────


# Answer mode prefixes injected into the user prompt (not system prompt)
# so the AI sees them immediately before the question and can't ignore them.
# Kept in prompts.py alongside the full mode prompts for single-source-of-truth.
from app.ai.prompts import get_answer_mode_prefix


def _inject_answer_mode(content: str, answer_mode: str) -> str:
    """Prepend an answer mode directive to the user's message.

    For specialized modes (hint, exam, socratic), this injects a short
    instruction directly into the conversation text so the AI sees it
    right before the user's question and can't ignore it like it might
    with system prompt instructions alone.

    For teach and simplify modes, returns the content unchanged.
    """
    prefix = get_answer_mode_prefix(answer_mode)
    return prefix + content if prefix else content


# Number of previous messages to include as AI conversation context
# This lets the AI remember what was discussed earlier
_CONTEXT_MESSAGE_COUNT = 12


_SUMMARY_RECALL_COUNT = 3  # Number of past session summaries to inject


async def _get_due_concepts_notice(
    user_id: uuid.UUID,
    db: AsyncSession,
    limit: int = 5,
) -> str:
    """Build a 'Last time you studied X...' notice from due concepts.

    Phase 3: When starting a new session, check if any concepts are
    due for spaced repetition review. If so, inject a notice into the
    conversation context so the AI can greet the user with a review prompt.

    Args:
        user_id: The current user.
        db: Database session.
        limit: Max due concepts to mention.

    Returns:
        A formatted notice string, or empty string if nothing is due.
    """
    from datetime import UTC, datetime, timedelta
    from app.infrastructure.database import engine
    from app.models.concept_mastery import ConceptMastery

    # Skip on SQLite (pgvector concepts table may not exist in test/embedded DB)
    if engine.name == "sqlite":
        return ""

    now = datetime.now(UTC)
    try:
        result = await db.execute(
            select(ConceptMastery)
            .where(
                ConceptMastery.user_id == user_id,
                ConceptMastery.next_review_at <= now,
                ConceptMastery.next_review_at.isnot(None),
            )
            .order_by(ConceptMastery.next_review_at.asc())
            .limit(limit)
        )
        due_concepts = result.scalars().all()

        if not due_concepts:
            return ""

        parts = [
            "## Concepts Due for Review",
            "The following concepts are due for spaced repetition review. "
            "Begin the session by reviewing them if the user is receptive.",
            "",
        ]
        for c in due_concepts:
            days_overdue = (now - c.next_review_at).days if c.next_review_at else 0
            overdue_str = f"{days_overdue}d overdue" if days_overdue > 0 else "due today"
            parts.append(
                f"- {c.concept_name} ({c.subject}) — {overdue_str} "
                f"Mastery: {c.mastery_level}, "
                f"Confidence: {c.confidence_score or 0:.0%}"
            )

        parts.append("")
        parts.append(
            "Start the session by briefly asking: '" +
            "Last time you studied X... Let's review. Can you tell me what you remember?'"
        )
        parts.append("---")
        return "\n".join(parts)

    except Exception as e:
        logger.debug(f"Failed to check due concepts: {e}")
        return ""


async def _get_relevant_past_summaries(
    user_id: uuid.UUID,
    current_session_id: uuid.UUID,
    query: str,
    db: AsyncSession,
    limit: int = _SUMMARY_RECALL_COUNT,
) -> list[MemorySummary]:
    """Find semantically relevant past session summaries using pgvector.

    Phase 2: Cross-session recall. Embeds the current query and searches
    MemorySummary by cosine similarity to find relevant past learning.

    Args:
        user_id: The current user.
        current_session_id: Exclude this session (don't recall from current).
        query: The user's current question — used as the search query.
        db: Database session.
        limit: Max summaries to return.

    Returns:
        List of MemorySummary objects ranked by relevance, newest first for ties.
    """
    if not query or not query.strip():
        return []

    # Skip pgvector search on SQLite (pgvector is PostgreSQL-only)
    if engine.name == "sqlite":
        return []

    try:
        # Embed the query
        embedding_service = get_embedding_service()
        emb_result = await embedding_service.embed(query)
        if not emb_result or not emb_result.vector:
            return []

        query_vec = json.dumps(emb_result.vector)

        # pgvector cosine similarity search (<=> operator)
        # Excludes current session and null embeddings
        sql = text("""
            SELECT id, summary_text, key_concepts, topics, struggles, strengths,
                   message_count, model_used, created_at,
                   1 - (summary_embedding <=> :query_vec::vector) AS similarity
            FROM memory_summaries
            WHERE user_id = :user_id
              AND session_id != :session_id
              AND summary_embedding IS NOT NULL
            ORDER BY summary_embedding <=> :query_vec::vector
            LIMIT :limit
        """)

        result = await db.execute(sql, {
            "query_vec": query_vec,
            "user_id": user_id,
            "session_id": current_session_id,
            "limit": limit,
        })
        rows = result.fetchall()

        if not rows:
            return []

        summaries = []
        for row in rows:
            s = MemorySummary(
                id=row[0],
                summary_text=row[1],
                key_concepts=row[2],
                topics=row[3],
                struggles=row[4],
                strengths=row[5],
                message_count=row[6],
                model_used=row[7],
            )
            s.created_at = row[8]
            summaries.append(s)

        logger.debug(
            f"Cross-session recall: {len(summaries)} past summaries relevant to '{query[:40]}'"
        )
        return summaries

    except Exception as e:
        logger.warning(f"Cross-session recall failed for query '{query[:40]}': {e}")
        return []


async def _build_conversation_context(
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
    query: str = "",
    include_last: int = _CONTEXT_MESSAGE_COUNT,
    existing_message_count: int | None = None,
) -> str:
    """Build full conversation context with past learning recall.

    Phase 2: Injects relevant past session summaries BEFORE the current
    conversation, so the AI can reference what the user studied before.

    Context structure:
        1. Past Learning Context (cross-session recall, if any)
        2. Previous Conversation Context (current session)
        3. Current Question (marker)

    Args:
        session_id: Current session.
        user_id: Current user (for cross-session recall).
        db: Database session.
        query: Current user question (for embedding search).
        include_last: Max current-session messages.
        existing_message_count: Fast-path check.
    """
    # Fast path: no need to query if there's no conversation history
    if existing_message_count is not None and existing_message_count <= 1:
        return ""

    context_parts = []

    # ── Phase 2: Cross-session recall ──────────────────────
    if query:
        past_summaries = await _get_relevant_past_summaries(
            user_id=user_id,
            current_session_id=session_id,
            query=query,
            db=db,
        )
        if past_summaries:
            parts = ["## Past Learning Context (from your previous study sessions)", ""]
            for s in past_summaries:
                concepts = ", ".join(s.key_concepts) if s.key_concepts else ""
                struggles = ", ".join(s.struggles) if s.struggles else "none"
                strengths = ", ".join(s.strengths) if s.strengths else "none"
                summary_preview = s.summary_text[:200] if s.summary_text else ""

                parts.append(f"📖 **Session**: {summary_preview}")
                if concepts:
                    parts.append(f"   Concepts: {concepts}")
                parts.append(f"   Struggled with: {struggles}")
                parts.append(f"   Did well on: {strengths}")
                parts.append("")

            parts.append("---")
            context_parts.append("\n".join(parts))

    # ── Current session messages ───────────────────────────
    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.sequence_number.desc())
        .limit(include_last)
    )
    recent = list(result.scalars().all())
    recent.reverse()

    if len(recent) < 2:
        # ── Phase 3: New session with due concepts ────────────
        # If this is the start of a session (few or no messages) and
        # there are concepts due for review, inject a notice so the
        # AI can begin with "Last time you studied X..."
        has_due_concepts = await _get_due_concepts_notice(user_id, db)
        if has_due_concepts:
            return has_due_concepts
        return ""

    lines = ["## Previous Conversation Context\n"]
    for msg in recent:
        role_label = "User" if msg.role == "user" else "Assistant"
        content = msg.content[:2000] if len(msg.content) > 2000 else msg.content
        lines.append(f"{role_label}: {content}")
        lines.append("")

    lines.append("## Current Question\n")
    context_parts.append("\n".join(lines))

    return "\n".join(context_parts)


async def _summarize_session_in_background(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
) -> None:
    """Generate a session summary in the background.

    Uses its own database session to avoid lifecycle conflicts.
    Called by the auto-summarize trigger every 5 message pairs.
    """
    from app.infrastructure.database import async_session_factory
    try:
        async with async_session_factory() as bg_db:
            await generate_session_summary(
                user_id=user_id,
                session_id=session_id,
                db=bg_db,
                force=True,
            )
            await bg_db.commit()
    except Exception as e:
        logger.warning(f"Background summarization failed for session {session_id}: {e}")


def _serialize_message(msg: Message) -> MessageResponse:
    return MessageResponse(
        id=str(msg.id),
        role=msg.role,
        content=msg.content,
        content_type=msg.content_type,
        model_used=msg.model_used,
        sequence_number=msg.sequence_number,
        created_at=msg.created_at.isoformat(),
    )


# ─── Endpoints ─────────────────────────────────────────────


@router.post("", response_model=ChatResponse)
async def send_message(
    session_id: uuid.UUID,
    request: MessageSend,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
    _: int = Depends(check_rate_limit),
):
    """
    Send a message to the AI tutor and get a response.

    Flow: Security check → Save user message → Route to AI → Security check → Save AI response → Return both.
    """
    user_id_str = str(user_id)

    # ── Step 1: Input Security Check ────────────────────────
    input_result = await check_input(request.content, user_id=user_id_str)
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

    next_seq = session.message_count + 1
    now = datetime.now(UTC)

    # Save user message
    user_msg = Message(
        id=uuid.uuid4(),
        session_id=session_id,
        role="user",
        content=request.content,
        content_type="text",
        sequence_number=next_seq,
        created_at=now,
    )
    db.add(user_msg)

    # Classify the question to determine routing and RAG needs
    classification = await classify_question(request.content)
    system_prompt = get_system_prompt(request.mode, classification, request.answer_mode)

    # Build the prompt: start with the user's question
    # Inject mode directive into the user prompt itself (not just system prompt)
    # see _inject_answer_mode docstring for why this is necessary.
    augmented_prompt = _inject_answer_mode(request.content, request.answer_mode)

    # 1. Build conversation context with Phase 2 cross-session recall
    #    Includes both current conversation history AND relevant past summaries
    conversation_context = await _build_conversation_context(
        session_id=session_id,
        user_id=user_id,
        db=db,
        query=request.content,
        existing_message_count=session.message_count,
    )
    if conversation_context:
        augmented_prompt = f"{conversation_context}{augmented_prompt}"

    # 2. Only augment with knowledge for questions that need external context
    #    Simple questions (definitions, calculations) skip RAG for speed
    if classification.needs_rag:
        augmented_prompt, _ = await augment_with_knowledge(augmented_prompt)

    ai_response = await route_request(
        prompt=augmented_prompt,
        system_prompt=system_prompt,
        mode=request.mode,
    )

    # ── Step 4: Output Security Check ───────────────────────
    output_result = await check_output(
        ai_response.content,
        user_id=user_id_str,
        session_id=str(session_id),
    )
    if output_result.blocked:
        # Replace the AI response with a safe message
        ai_response.content = (
                "I apologize, but I cannot provide that response "
                "as it was flagged by our content safety filters."
        )

    # Save AI response
    now_ai = datetime.now(UTC)
    ai_msg = Message(
        id=uuid.uuid4(),
        session_id=session_id,
        role="assistant",
        content=ai_response.content,
        content_type=ai_response.content_type,
        model_used=ai_response.model_used,
        sequence_number=next_seq + 1,
        created_at=now_ai,
    )
    db.add(ai_msg)

    await db.flush()

    # Update session metrics
    session.message_count = next_seq + 1
    session.updated_at = now_ai

    await db.commit()

    # ── Step 5: Auto-Summarize (every 5 message pairs) ───
    # Fire off a background task to generate a session summary.
    # This powers the Long-Term Memory system (Phase 1).
    if (next_seq + 1) % 10 == 0:
        asyncio.ensure_future(
            _summarize_session_in_background(user_id, session_id)
        )

    return ChatResponse(
        user_message=_serialize_message(user_msg),
        ai_message=_serialize_message(ai_msg),
        mode=request.mode,
    )


@router.post("/stream")
async def send_message_stream(
    session_id: uuid.UUID,
    request: MessageSend,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
    _: int = Depends(check_rate_limit),
):
    """
    Send a message to the AI tutor and stream the response via SSE.

    Returns a Server-Sent Events stream with the following events:
    - `token`: A content token from the AI response
    - `done`: Signal that streaming is complete (includes metadata)
    - `error`: An error occurred

    The user message is saved immediately, and the AI response is
    saved once streaming is complete via its own database session
    to avoid lifecycle conflicts with the StreamingResponse.
    """
    user_id_str = str(user_id)
    session_id_str = str(session_id)

    # ── Step 1: Input Security Check ────────────────────────
    input_result = await check_input(request.content, user_id=user_id_str)
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

    next_seq = session.message_count + 1
    now = datetime.now(UTC)

    # Save user message immediately (using the request-scoped session)
    user_msg = Message(
        id=uuid.uuid4(),
        session_id=session_id,
        role="user",
        content=request.content,
        content_type="text",
        sequence_number=next_seq,
        created_at=now,
    )
    db.add(user_msg)
    await db.flush()
    await db.commit()  # Release the lock before StreamingResponse starts

    user_msg_data = _serialize_message(user_msg).model_dump(mode="json")

    # Classify and fetch context before the generator starts
    classification = await classify_question(request.content)
    conversation_context = await _build_conversation_context(
        session_id=session_id,
        user_id=user_id,
        db=db,
        query=request.content,
        existing_message_count=session.message_count,
    )

    async def event_generator():
        """
        Async generator that yields SSE-formatted events.

        Uses its own DB session to avoid lifecycle conflicts —
        the request-scoped session from `get_db` closes when the
        handler returns its StreamingResponse, but the generator
        runs lazily and needs a session later to save the AI response.
        """
        full_content = ""
        model_used = ""

        # 1. Send the user message event so the client can display it
        yield f"event: user_message\ndata: {json.dumps(user_msg_data)}\n\n"

        # 2. Build the prompt using pre-classified result
        system_prompt = get_system_prompt(request.mode, classification, request.answer_mode)
        # Inject mode directive into the user prompt — see _inject_answer_mode docstring
        augmented_prompt = _inject_answer_mode(request.content, request.answer_mode)

        # Add conversation context (pre-fetched, empty for simple questions)
        if conversation_context:
            augmented_prompt = f"{conversation_context}{augmented_prompt}"

        # Only augment with knowledge for questions that need external context
        if classification.needs_rag:
            augmented_prompt, _ = await augment_with_knowledge(augmented_prompt)
        try:
            async for chunk in route_request_stream(
                prompt=augmented_prompt,
                system_prompt=system_prompt,
                mode=request.mode,
            ):
                if chunk.content:
                    full_content += chunk.content
                    yield f"event: token\ndata: {json.dumps(chunk.content)}\n\n"

                if chunk.model_used and chunk.model_used != "unknown":
                    model_used = chunk.model_used

                if chunk.done:
                    break

        except Exception as e:
            yield f"event: error\ndata: {json.dumps(str(e))}\n\n"
            return

        # 3. Output Security Check ───────────────────────────
        # Run the output guardrail on the complete AI response
        output_result = await check_output(
            full_content,
            user_id=user_id_str,
            session_id=session_id_str,
        )
        if output_result.blocked:
            # Send a replacement response event instead of the original content
            blocked_msg = "I apologize, but the response was flagged by our content safety filters and cannot be displayed."  # noqa: E501
            yield f"event: token\ndata: {json.dumps(blocked_msg)}\n\n"
            full_content = blocked_msg

        # 4. Save the complete AI response to the database.
        #    Use a dedicated session since the generator outlives
        #    the request-scoped DB session from get_db().
        async with async_session_factory() as save_session:
            try:
                now_ai = datetime.now(UTC)
                ai_msg = Message(
                    id=uuid.uuid4(),
                    session_id=session_id,
                    role="assistant",
                    content=full_content,
                    content_type="text",
                    model_used=model_used or None,
                    sequence_number=next_seq + 1,
                    created_at=now_ai,
                )
                save_session.add(ai_msg)

                # Update session metrics via a separate query
                session_result = await save_session.execute(
                    select(LearningSession).where(
                        LearningSession.id == session_id,
                        LearningSession.user_id == user_id,
                    )
                )
                saved_session = session_result.scalar_one_or_none()
                if saved_session:
                    saved_session.message_count = next_seq + 1
                    saved_session.updated_at = now_ai

                await save_session.commit()

                # ── Auto-Summarize (every 5 message pairs) ───
                if (next_seq + 1) % 10 == 0:
                    asyncio.ensure_future(
                        _summarize_session_in_background(user_id, session_id)
                    )

                # 5. Send the done event with the AI message metadata
                done_data = {
                    "ai_message": _serialize_message(ai_msg).model_dump(mode="json"),
                    "mode": request.mode,
                }
                yield f"event: done\ndata: {json.dumps(done_data)}\n\n"
            except Exception as save_err:
                await save_session.rollback()
                yield f"event: error\ndata: {json.dumps(str(save_err))}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("")
async def get_messages(
    session_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Get messages for a session, ordered by sequence."""
    # Verify session ownership first
    await verify_session(session_id, user_id, db)
    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.sequence_number)
        .offset(offset)
        .limit(limit)
    )
    messages = result.scalars().all()
    return {
        "messages": [_serialize_message(m) for m in messages],
        "total": len(messages),
    }
