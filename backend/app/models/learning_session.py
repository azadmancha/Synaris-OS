"""
Learning Session model.

Tracks a single learning interaction session.
A session contains many messages and represents
a continuous learning experience.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Session metadata
    title: Mapped[str | None] = mapped_column(String(200))
    mode: Mapped[str] = mapped_column(
        String(20),
        default="balanced",
    )
    subject: Mapped[str | None] = mapped_column(String(50))
    topics: Mapped[list | None] = mapped_column(JSON)

    # Status
    status: Mapped[str] = mapped_column(
        String(20),
        default="active",
    )

    # Timing
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)

    # Metrics
    message_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships — SQLAlchemy 2.0 style with back_populates
    user = relationship("User", back_populates="sessions")
    messages = relationship(
        "Message",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Message.sequence_number",
    )

    def __repr__(self) -> str:
        return f"<Session {self.title or self.id}>"
