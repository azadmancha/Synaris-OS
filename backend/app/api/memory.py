"""
Memory API — serves session summaries for the Long-Term Memory system.

Endpoints:
- GET  /user/memory          → List all session summaries for the current user
- GET  /sessions/{id}/memory → Get memory summary for a specific session
- POST /sessions/{id}/memory → Force-regenerate the summary for a session
"""

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.models.memory_summary import MemorySummary
from app.api.dependencies import get_current_user_id
from app.ai.summarizer import generate_session_summary

logger = logging.getLogger(__name__)

router = APIRouter(tags=["memory"])


# ─── Schemas ───────────────────────────────────────────────


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
