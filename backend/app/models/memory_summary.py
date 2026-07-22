"""
MemorySummary model.

Stores AI-generated summaries of learning sessions so the system
can recall what was learned across sessions. Each summary captures:

- What topics were discussed
- Key concepts the user encountered
- What the user struggled with or did well on
- The overall session narrative

Used by the Long-Term Memory system (Phase 1: Session Summaries).
These summaries are semantically searchable (via pgvector) for
cross-session recall (Phase 2) and spaced repetition (Phase 3).
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


class MemorySummary(Base):
    """AI-generated summary of a learning session or session segment."""

    __tablename__ = "memory_summaries"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), primary_key=True, default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        ForeignKey("learning_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Summary Content ──────────────────────────────────
    # The AI-generated narrative of what was learned
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)

    # Key concepts extracted from the session (JSON array of strings)
    # Example: ["derivatives", "chain rule", "limit definition"]
    key_concepts: Mapped[list | None] = mapped_column(JSON)

    # Topics discussed (JSON array of strings)
    topics: Mapped[list | None] = mapped_column(JSON)

    # What the user struggled with (JSON array of strings)
    struggles: Mapped[list | None] = mapped_column(JSON)

    # What the user did well on (JSON array of strings)
    strengths: Mapped[list | None] = mapped_column(JSON)

    # ── Metadata ─────────────────────────────────────────
    # How many messages were covered in this summary
    message_count: Mapped[int] = mapped_column(Integer, default=0)

    # The model used to generate the summary
    model_used: Mapped[str | None] = mapped_column(String(100))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        concepts = f"{len(self.key_concepts)} concepts" if self.key_concepts else "no concepts"
        return f"<MemorySummary {self.id}: {concepts}>"
