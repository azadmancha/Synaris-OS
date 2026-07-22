"""SQLAlchemy models for the Knowledge Engine.

Stores chunked documents and their vector embeddings
using PostgreSQL + pgvector for efficient similarity search.

Tables:
- knowledge_documents: Source documents (chapters, articles, etc.)
- knowledge_chunks: Individual chunks with embeddings and metadata
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, Text, Float, Index, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


class KnowledgeDocument(Base):
    """A source document fetched from a knowledge source."""

    __tablename__ = "knowledge_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), primary_key=True, default=uuid.uuid4
    )
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    source_id: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str | None] = mapped_column(Text)
    subject: Mapped[str] = mapped_column(
        String(100), default="", index=True
    )
    language: Mapped[str] = mapped_column(String(10), default="en")
    license: Mapped[str] = mapped_column(String(50), default="")
    difficulty: Mapped[str] = mapped_column(
        String(20), default="intermediate"
    )
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("idx_doc_source_subject", "source", "subject"),
    )

    def __repr__(self) -> str:
        return f"<KnowledgeDocument {self.source}: {self.title[:50]}>"


class KnowledgeChunk(Base):
    """A single chunk of a knowledge document with its vector embedding."""

    __tablename__ = "knowledge_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), nullable=False, index=True
    )
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )

    # Content
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_type: Mapped[str] = mapped_column(
        String(20), default="paragraph"
    )
    heading: Mapped[str] = mapped_column(String(500), default="")
    subheading: Mapped[str] = mapped_column(String(500), default="")

    # Hierarchical position
    chapter: Mapped[str] = mapped_column(String(200), default="")
    section: Mapped[str] = mapped_column(String(200), default="")
    sequence: Mapped[int] = mapped_column(Integer, default=0)

    # Metadata
    subject: Mapped[str] = mapped_column(
        String(100), default="", index=True
    )
    difficulty: Mapped[str] = mapped_column(
        String(20), default="intermediate"
    )
    language: Mapped[str] = mapped_column(String(10), default="en")
    source_url: Mapped[str | None] = mapped_column(Text)
    license: Mapped[str] = mapped_column(String(50), default="")

    # Token tracking
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    embedding_version: Mapped[str] = mapped_column(
        String(20), default=""
    )

    # Vector embedding — stored as pgvector array
    # The actual Vector(N) type is registered via raw SQL in init_db()
    # We store embeddings as JSON arrays and cast them in queries
    embedding: Mapped[str | None] = mapped_column(
        Text,  # JSON array stored as text, cast to vector in queries
        nullable=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        Index("idx_chunk_source_subject", "source", "subject"),
        Index("idx_chunk_document", "document_id"),
    )

    def __repr__(self) -> str:
        return f"<KnowledgeChunk {self.source}: {self.heading or self.content[:40]}...>"
