"""
Learning Session API.

Manages the lifecycle of learning sessions.
Uses a shared dev user constant until real auth is implemented.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user_id
from app.infrastructure.database import get_db
from app.models.learning_session import LearningSession

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ─── Schemas ───────────────────────────────────────────────


class SessionCreate(BaseModel):
    mode: str = "balanced"
    subject: str | None = None
    title: str | None = None


class SessionUpdate(BaseModel):
    title: str | None = None
    subject: str | None = None


class SessionResponse(BaseModel):
    id: str
    title: str | None
    mode: str
    subject: str | None
    status: str
    message_count: int
    created_at: str
    topics: list[str] | None


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]
    total: int


# ─── Helpers ───────────────────────────────────────────────


def _serialize_session(session: LearningSession) -> SessionResponse:
    return SessionResponse(
        id=str(session.id),
        title=session.title,
        mode=session.mode,
        subject=session.subject,
        status=session.status,
        message_count=session.message_count,
        created_at=session.created_at.isoformat(),
        topics=session.topics or [],
    )


# ─── Endpoints ─────────────────────────────────────────────


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(
    request: SessionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Create a new learning session."""
    session = LearningSession(
        id=uuid.uuid4(),
        user_id=user_id,
        mode=request.mode,
        subject=request.subject,
        title=request.title or request.subject or "New Session",
        status="active",
        started_at=datetime.now(UTC),
    )
    db.add(session)
    await db.flush()
    return _serialize_session(session)


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """List recent learning sessions for the current user."""
    result = await db.execute(
        select(LearningSession)
        .where(LearningSession.user_id == user_id)
        .order_by(desc(LearningSession.created_at))
        .offset(offset)
        .limit(limit)
    )
    sessions = result.scalars().all()
    return SessionListResponse(
        sessions=[_serialize_session(s) for s in sessions],
        total=len(sessions),
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Get a specific session by ID."""
    result = await db.execute(
        select(LearningSession).where(
            LearningSession.id == session_id,
            LearningSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return _serialize_session(session)


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: uuid.UUID,
    request: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Update a session's title or subject."""
    result = await db.execute(
        select(LearningSession).where(
            LearningSession.id == session_id,
            LearningSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if request.title is not None:
        session.title = request.title
    if request.subject is not None:
        session.subject = request.subject

    session.updated_at = datetime.now(UTC)
    await db.flush()
    await db.commit()
    return _serialize_session(session)


@router.delete("/{session_id}")
async def delete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Delete a session and all its messages."""
    result = await db.execute(
        select(LearningSession).where(
            LearningSession.id == session_id,
            LearningSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
    return {"message": "Session deleted"}
