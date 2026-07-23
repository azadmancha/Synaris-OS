"""
Message model.

Represents a single message in a learning session.
Can be from the user, the AI assistant, or the system.
Supports rich content types: text, math, code, diagram, mixed.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        primary_key=True,
        default=uuid.uuid4,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("learning_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Content
    role: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(String(20), default="text")

    # Structured content for rich rendering (future: math, code, diagrams)
    structured_content: Mapped[dict | None] = mapped_column(JSON)

    # AI metadata (for assistant messages)
    model_used: Mapped[str | None] = mapped_column(String(100))
    evaluation_score: Mapped[float | None] = mapped_column(Float)

    # Context
    topic: Mapped[str | None] = mapped_column(String(100))

    # Ordering
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )

    # SQLAlchemy 2.0 style relationship
    session = relationship("LearningSession", back_populates="messages")

    def __repr__(self) -> str:
        return f"<Message {self.role}:{self.content[:50]}...>"
