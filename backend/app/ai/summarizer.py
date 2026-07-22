"""
Session Summarizer — generates summaries of learning sessions.

Part of the Long-Term Memory system (Phase 1).
Uses the AI orchestrator to generate concise summaries of what was
learned, extracting key concepts, struggles, and strengths.

These summaries feed into cross-session recall (Phase 2) and
spaced repetition (Phase 3).
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.config import settings
from app.models.message import Message
from app.models.memory_summary import MemorySummary
from app.orchestration.router import route_request

logger = logging.getLogger(__name__)

# How many recent messages to include in a single summary
_SUMMARY_WINDOW = 10

# Only generate summaries for sessions with at least this many messages
_MIN_MESSAGES_FOR_SUMMARY = 3

# System prompt for the summarizer AI
_SUMMARIZER_SYSTEM_PROMPT = """You are a learning session summarizer. Your job is to analyze a conversation between a student (User) and an AI tutor (Assistant) and produce a concise, structured summary.

Analyze the conversation and extract:
1. **Summary**: 2-3 sentences describing what was covered
2. **Key Concepts**: The main concepts the student encountered (list of 1-5 items)
3. **Topics**: The subject areas discussed (list of 1-3 items)
4. **Struggles**: Specific things the student was confused about or needed help with (list of 0-3 items)
5. **Strengths**: Things the student demonstrated understanding of (list of 0-3 items)

Be concise. Focus on the student's learning journey, not the AI's responses.

Respond ONLY in valid JSON format, no other text:
{
  "summary": "The student learned about...",
  "key_concepts": ["concept1", "concept2"],
  "topics": ["topic1"],
  "struggles": ["area they found difficult"],
  "strengths": ["area they understood well"]
}

If the conversation has fewer than 3 meaningful exchanges or no real learning content, set summary to an empty string and all lists to empty arrays."""


async def generate_session_summary(
    user_id,
    session_id,
    db: AsyncSession,
    force: bool = False,
) -> Optional[MemorySummary]:
    """Generate or retrieve a summary for a session.

    If a summary already exists for the latest message window, returns it.
    If force=True, always generates a fresh summary.

    Args:
        user_id: The user's UUID.
        session_id: The session's UUID.
        db: Database session.
        force: If True, generates a new summary even if one exists.

    Returns:
        A MemorySummary instance, or None if the session has too few messages.
    """
    # Check if a recent summary already exists (skip if forcing)
    if not force:
        result = await db.execute(
            select(MemorySummary)
            .where(MemorySummary.session_id == session_id)
            .order_by(MemorySummary.created_at.desc())
            .limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

    # Fetch recent messages
    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.sequence_number.desc())
        .limit(_SUMMARY_WINDOW)
    )
    messages = list(result.scalars().all())
    messages.reverse()  # Oldest first

    if len(messages) < _MIN_MESSAGES_FOR_SUMMARY:
        logger.debug(f"Session {session_id}: too few messages ({len(messages)}) for summary")
        return None

    # Build the conversation transcript
    transcript_parts = []
    for msg in messages:
        label = "User" if msg.role == "user" else "Assistant"
        content = msg.content[:1500] if len(msg.content) > 1500 else msg.content
        transcript_parts.append(f"{label}: {content}")

    transcript = "\n\n".join(transcript_parts)

    logger.info(f"Generating session summary for {session_id} ({len(messages)} messages)")

    try:
        response = await route_request(
            prompt=transcript,
            system_prompt=_SUMMARIZER_SYSTEM_PROMPT,
            mode="fast",
        )

        if not response.content or response.error_type:
            logger.warning(f"Summarization returned no content for session {session_id}")
            return None

        # Parse the JSON response
        import json

        # Try to extract JSON from the response (handle markdown-wrapped JSON)
        content = response.content.strip()
        if content.startswith("```"):
            # Strip markdown code blocks
            lines = content.split("\n")
            content = "\n".join(
                line for line in lines
                if not line.startswith("```")
            ).strip()

        data = json.loads(content)

        summary = MemorySummary(
            user_id=user_id,
            session_id=session_id,
            summary_text=data.get("summary", ""),
            key_concepts=data.get("key_concepts", []),
            topics=data.get("topics", []),
            struggles=data.get("struggles", []),
            strengths=data.get("strengths", []),
            message_count=len(messages),
            model_used=response.model_used,
        )
        db.add(summary)
        await db.flush()

        concept_count = len(summary.key_concepts) if summary.key_concepts else 0
        logger.info(f"Session summary generated for {session_id}: {concept_count} concepts")
        return summary

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse summarizer JSON for session {session_id}: {e}")
        logger.debug(f"Raw response: {response.content[:200]}")
        return None
    except Exception as e:
        logger.error(f"Summarization failed for session {session_id}: {e}")
        return None
