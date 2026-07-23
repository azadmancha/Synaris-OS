"""
Concept Mastery model.

Tracks the learner's understanding of individual concepts.
Used for spaced repetition, weak area detection, and personalization.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


class ConceptMastery(Base):
    __tablename__ = "concept_mastery"

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

    # Concept identification
    concept_name: Mapped[str] = mapped_column(String(200), nullable=False)
    subject: Mapped[str] = mapped_column(String(50), nullable=False)

    # Mastery tracking
    mastery_level: Mapped[str] = mapped_column(
        String(20),
        default="undiscovered",
    )
    confidence_score: Mapped[float | None] = mapped_column(Float)

    # Learning history
    times_encountered: Mapped[int] = mapped_column(Integer, default=0)
    times_correct: Mapped[int | None] = mapped_column(Integer)
    times_incorrect: Mapped[int | None] = mapped_column(Integer)

    # Spaced repetition
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_review_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )

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

    def __repr__(self) -> str:
        return f"<Concept {self.concept_name} ({self.mastery_level})>"
