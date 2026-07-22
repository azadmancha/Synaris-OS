"""
Chat messages API.

The core interaction endpoint — sends a user message to the AI
Orchestrator and returns the AI's response.
Supports both regular (request/response) and streaming (SSE) modes.
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db, async_session_factory
from app.models.learning_session import LearningSession
from app.models.message import Message
from app.ai.prompts import get_system_prompt
from app.ai.classifier import classify_question
from app.knowledge.pipeline import augment_with_knowledge
from app.orchestration.router import route_request, route_request_stream
from app.api.dependencies import get_current_user_id, check_rate_limit, verify_session
from app.security import check_input, check_output
from app.ai.summarizer import generate_session_summary

router = APIRouter(prefix="/sessions/{session_id}/messages", tags=["messages"])


# ─── Schemas ───────────────────────────────────────────────


class MessageSend(BaseModel):
    content: str
    mode: str = "balanced"


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


# Number of previous messages to include as AI conversation context
# This lets the AI remember what was discussed earlier
_CONTEXT_MESSAGE_COUNT = 12


async def _build_conversation_context(
    session_id: uuid.UUID,
    db: AsyncSession,
    include_last: int = _CONTEXT_MESSAGE_COUNT,
    existing_message_count: int | None = None,
) -> str:
    """Fetch recent messages from a session and format them as conversation context.

    Builds a transcript of the last N messages so the AI can reference
    earlier parts of the conversation. Returns an empty string if there
    are fewer than 2 messages (no real conversation yet).

    Args:
        session_id: The session to fetch messages from.
        db: Database session.
        include_last: Max number of messages to include.
        existing_message_count: If provided, skips the DB query entirely
            when <= 1 (no history to show). Saves a DB round-trip.
    """
    # Fast path: no need to query DB if there's no conversation history
    if existing_message_count is not None and existing_message_count <= 1:
        return ""

    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.sequence_number.desc())
        .limit(include_last)
    )
    recent = list(result.scalars().all())
    recent.reverse()  # Oldest first

    if len(recent) < 2:
        return ""

    lines = ["## Previous Conversation Context\n"]
    for msg in recent:
        role_label = "User" if msg.role == "user" else "Assistant"
        # Truncate very long messages to avoid token overflow
        content = msg.content[:2000] if len(msg.content) > 2000 else msg.content
        lines.append(f"{role_label}: {content}")
        lines.append("")

    lines.append("## Current Question\n")
    return "\n".join(lines)


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
        import logging
        logging.getLogger(__name__).warning(
            f"Background summarization failed for session {session_id}: {e}"
        )


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
    now = datetime.now(timezone.utc)

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
    system_prompt = get_system_prompt(request.mode, classification)

    # Build the prompt: start with the user's question
    augmented_prompt = request.content

    # 1. Always add conversation history so the AI knows what was discussed
    #    (Skips DB query only if this is the very first message — no history to show)
    conversation_context = await _build_conversation_context(
        session_id, db,
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
    now_ai = datetime.now(timezone.utc)
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
    now = datetime.now(timezone.utc)

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
        session_id, db,
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
        system_prompt = get_system_prompt(request.mode, classification)
        augmented_prompt = request.content

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
            yield f"event: token\ndata: {json.dumps('I apologize, but the response was flagged by our content safety filters and cannot be displayed.')}\n\n"
            full_content = "I apologize, but the response was flagged by our content safety filters and cannot be displayed."

        # 4. Save the complete AI response to the database.
        #    Use a dedicated session since the generator outlives
        #    the request-scoped DB session from get_db().
        async with async_session_factory() as save_session:
            try:
                now_ai = datetime.now(timezone.utc)
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
    session = await verify_session(session_id, user_id, db)
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
