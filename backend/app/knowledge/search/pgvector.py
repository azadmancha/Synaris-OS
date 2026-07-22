"""pgvector Search Service.

Provides semantic search over document chunks using
PostgreSQL + pgvector for efficient similarity search.

Architecture:
    Query Embedding → pgvector cosine similarity → Hybrid rank → SearchResults

Requires PostgreSQL with pgvector extension installed.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.knowledge.models import KnowledgeDocument, KnowledgeChunk
from app.knowledge.embeddings import EmbeddingService, get_embedding_service
from app.knowledge.search import SearchResult

logger = logging.getLogger(__name__)


class PgVectorSearch:
    """pgvector-powered semantic search over knowledge chunks."""

    # Number of candidates to retrieve before reranking
    TOP_K = 20
    # Number of results to return after reranking
    TOP_N = 5
    # Minimum similarity score (0-1) to include a result
    MIN_SCORE = 0.5

    def __init__(self, embedding_service: Optional[EmbeddingService] = None):
        self._embeddings = embedding_service or get_embedding_service()

    async def search(
        self,
        query_embedding: list[float],
        db: AsyncSession,
        limit: int = 20,
        subject: str | None = None,
        difficulty: str | None = None,
    ) -> list[SearchResult]:
        """Search for similar chunks by embedding vector similarity.

        Uses pgvector's <=> operator for cosine distance.
        """
        if not query_embedding:
            return []

        try:
            # Build the pgvector query
            embedding_json = json.dumps(query_embedding)
            conditions = []
            params = {
                "embedding": embedding_json,
                "limit": limit,
            }

            if subject:
                conditions.append("kc.subject = :subject")
                params["subject"] = subject
            if difficulty:
                conditions.append("kc.difficulty = :difficulty")
                params["difficulty"] = difficulty

            where_clause = " AND ".join(conditions) if conditions else "TRUE"

            sql = text(f"""
                SELECT
                    kc.id,
                    kc.content,
                    kc.heading,
                    kc.source,
                    kc.source_url,
                    kc.subject,
                    kc.difficulty,
                    1 - (kc.embedding <=> :embedding::vector) AS similarity
                FROM knowledge_chunks kc
                WHERE {where_clause}
                    AND kc.embedding IS NOT NULL
                ORDER BY kc.embedding <=> :embedding::vector
                LIMIT :limit
            """)

            result = await db.execute(sql, params)
            rows = result.fetchall()

            return [
                SearchResult(
                    chunk_id=str(row[0]),
                    content=row[1],
                    heading=row[2],
                    source=row[3],
                    source_url=row[4],
                    subject=row[5],
                    difficulty=row[6],
                    score=float(row[7]) if row[7] else 0.0,
                    rank=i + 1,
                )
                for i, row in enumerate(rows)
                if row[7] and float(row[7]) >= self.MIN_SCORE
            ]

        except Exception as e:
            logger.error(f"pgvector search failed: {e}")
            return []

    async def hybrid_search(
        self,
        query: str,
        query_embedding: list[float],
        db: AsyncSession,
        limit: int = 20,
    ) -> list[SearchResult]:
        """Combine vector similarity with full-text keyword matching.

        Uses PostgreSQL's built-in full-text search combined with
        pgvector similarity for hybrid ranking.
        """
        if not query_embedding:
            return []

        try:
            embedding_json = json.dumps(query_embedding)
            # Simple keyword query for full-text search
            tsquery = " & ".join(query.split()[:10])  # Use first 10 words

            sql = text(f"""
                SELECT
                    kc.id,
                    kc.content,
                    kc.heading,
                    kc.source,
                    kc.source_url,
                    kc.subject,
                    kc.difficulty,
                    1 - (kc.embedding <=> :embedding::vector) AS vector_score,
                    ts_rank(
                        to_tsvector('english', kc.content || ' ' || kc.heading),
                        plainto_tsquery('english', :tsquery)
                    ) AS text_score
                FROM knowledge_chunks kc
                WHERE kc.embedding IS NOT NULL
                ORDER BY (
                    0.7 * (1 - (kc.embedding <=> :embedding::vector)) +
                    0.3 * ts_rank(
                        to_tsvector('english', kc.content || ' ' || kc.heading),
                        plainto_tsquery('english', :tsquery)
                    )
                ) DESC
                LIMIT :limit
            """)

            result = await db.execute(sql, {
                "embedding": embedding_json,
                "tsquery": tsquery,
                "limit": limit,
            })
            rows = result.fetchall()

            return [
                SearchResult(
                    chunk_id=str(row[0]),
                    content=row[1],
                    heading=row[2],
                    source=row[3],
                    source_url=row[4],
                    subject=row[5],
                    difficulty=row[6],
                    score=float(row[7]) if row[7] else 0.0,
                    rank=i + 1,
                )
                for i, row in enumerate(rows)
                if row[7] and float(row[7]) >= self.MIN_SCORE
            ]

        except Exception as e:
            logger.error(f"Hybrid search failed: {e}")
            return []

    async def store_chunk(
        self,
        chunk,
        embedding: list[float],
        db: AsyncSession,
    ) -> str:
        """Store a single chunk with its embedding."""
        try:
            chunk_id = str(uuid.uuid4())
            db_chunk = KnowledgeChunk(
                id=uuid.UUID(chunk_id),
                document_id=chunk.document_id if hasattr(chunk, "document_id") and chunk.document_id else uuid.uuid4(),
                content=chunk.content,
                chunk_type=chunk.chunk_type.value if hasattr(chunk.chunk_type, "value") else str(chunk.chunk_type),
                heading=chunk.heading,
                subheading=chunk.subheading,
                source=chunk.source,
                source_url=chunk.source_url,
                subject=chunk.subject,
                difficulty=chunk.difficulty,
                language=chunk.language,
                sequence=chunk.sequence,
                token_count=chunk.token_count,
                embedding=json.dumps(embedding),
            )
            db.add(db_chunk)
            await db.flush()
            return chunk_id

        except Exception as e:
            logger.error(f"Failed to store chunk: {e}")
            raise

    async def store_chunks(
        self,
        chunks: list,
        embeddings: list[list[float]],
        db: AsyncSession,
    ) -> list[str]:
        """Batch store chunks with their embeddings."""
        chunk_ids = []
        for chunk, embedding in zip(chunks, embeddings):
            chunk_id = await self.store_chunk(chunk, embedding, db)
            chunk_ids.append(chunk_id)
        return chunk_ids

    async def remove_document_chunks(self, document_id: str, db: AsyncSession) -> None:
        """Remove all chunks for a given document."""
        from sqlalchemy import delete
        stmt = delete(KnowledgeChunk).where(
            KnowledgeChunk.document_id == uuid.UUID(document_id)
        )
        await db.execute(stmt)


# Singleton
_search: PgVectorSearch | None = None


def get_vector_search(embedding_service: Optional[EmbeddingService] = None) -> PgVectorSearch:
    """Get or create the singleton vector search."""
    global _search
    if _search is None:
        _search = PgVectorSearch(embedding_service=embedding_service)
    return _search


__all__ = ["PgVectorSearch", "get_vector_search"]
