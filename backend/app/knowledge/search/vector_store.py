"""
Qdrant Vector Store — Semantic search over knowledge chunks.

Wraps the Qdrant client (in-memory or server mode) for storing
document embeddings and retrieving them by similarity.

Architecture:
    index_documents(docs)  → chunk → embed → upsert to Qdrant
    search(query, limit)   → embed query → vector search → return results

Switching to production:
    Set QDRANT_URL in .env (e.g. http://localhost:6333)
    The client auto-connects to the server instead of in-memory.
"""

import logging
import uuid
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models
from qdrant_client.http.exceptions import UnexpectedResponse

from app.infrastructure.config import settings
from app.knowledge.chunking.semantic import get_chunker
from app.knowledge.embeddings import get_embedding_service
from app.knowledge.search import SearchResult

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────

COLLECTION_NAME = "synaris_knowledge"
DEFAULT_LIMIT = 5
MIN_SCORE = 0.45


# ── Vector Store ──────────────────────────────────────────


class VectorStore:
    """
    Qdrant-backed vector store for educational content.

    In-memory mode (default, no Docker needed):
        store = VectorStore()  # Uses local in-memory Qdrant

    Production mode (with Docker Qdrant server):
        store = VectorStore(url="http://localhost:6333")

    The store handles:
    - Collection creation with proper schema (dimension inferred from embedding service)
    - Document indexing (chunk → embed → upsert)
    - Semantic search with score thresholding
    - Collection reset for re-indexing
    """

    def __init__(self, url: str | None = None, api_key: str | None = None) -> None:
        """
        Initialize the vector store.

        Args:
            url: Qdrant server URL. If None, uses in-memory mode.
            api_key: Optional API key for Qdrant Cloud.
        """
        self._url = url
        self._api_key = api_key
        self._client: QdrantClient | None = None
        self._embedding_service = get_embedding_service()
        self._chunker = get_chunker()
        self._collection_initialized = False

    @property
    def _embedding_dim(self) -> int:
        """Infer the embedding dimension from the embedding service.

        This is used at collection creation time to ensure the vector
        store schema matches the actual embedding output dimension.
        """
        return self._embedding_service.dimension

    # ── Initialization ───────────────────────────────────

    async def _ensure_client(self) -> QdrantClient:
        """Get or create the Qdrant client."""
        if self._client is not None:
            return self._client

        if self._url:
            logger.info(f"Connecting to Qdrant server: {self._url}")
            self._client = QdrantClient(
                url=self._url,
                api_key=self._api_key,
                timeout=30,
            )
        else:
            logger.info("Initializing in-memory Qdrant (no server needed)")
            self._client = QdrantClient(location=":memory:")

        await self._ensure_collection(self._client)
        return self._client

    async def _ensure_collection(self, client: QdrantClient) -> None:
        """Create the collection if it doesn't exist.

        Uses the dimension from the embedding service so the schema
        matches regardless of which backend (Gemini or local) is active.
        """
        if self._collection_initialized:
            return

        dim = self._embedding_dim

        try:
            collections = client.get_collections().collections
            exists = any(c.name == COLLECTION_NAME for c in collections)

            if not exists:
                client.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=qdrant_models.VectorParams(
                        size=dim,
                        distance=qdrant_models.Distance.COSINE,
                    ),
                    optimizers_config=qdrant_models.OptimizersConfigDiff(
                        indexing_threshold=100,
                    ),
                )
                logger.info(f"Created Qdrant collection '{COLLECTION_NAME}' (dim={dim})")
            else:
                logger.info(f"Using existing Qdrant collection '{COLLECTION_NAME}'")

            self._collection_initialized = True

        except UnexpectedResponse as e:
            # Collection might exist with a different dimension — attempt recreation
            if "doesn't match" in str(e).lower() or "dimension" in str(e).lower():
                logger.warning(f"Dimension mismatch in existing collection: {e}")
                logger.info(f"Attempting to drop and recreate collection with dim={dim}...")
                try:
                    client.delete_collection(collection_name=COLLECTION_NAME)
                    client.create_collection(
                        collection_name=COLLECTION_NAME,
                        vectors_config=qdrant_models.VectorParams(
                            size=dim,
                            distance=qdrant_models.Distance.COSINE,
                        ),
                    )
                    logger.info(f"Recreated collection with dim={dim}")
                    self._collection_initialized = True
                    return
                except Exception as recreate_err:
                    logger.error(f"Failed to recreate collection: {recreate_err}")
                    raise
            else:
                logger.error(f"Failed to initialize Qdrant collection: {e}")
                raise

    @property
    async def is_ready(self) -> bool:
        """Check if the vector store is initialized."""
        try:
            client = await self._ensure_client()
            client.get_collections()
            return True
        except Exception:
            return False

    @property
    async def document_count(self) -> int:
        """Return the number of indexed documents (points)."""
        try:
            client = await self._ensure_client()
            count_result = client.count(
                collection_name=COLLECTION_NAME,
                exact=True,
            )
            return count_result.count or 0
        except Exception:
            return 0

    # ── Indexing ──────────────────────────────────────────

    async def index_documents(
        self,
        documents: list[Any],
        source: str = "wikipedia",
    ) -> int:
        """
        Index a list of source documents into the vector store.

        Each document is:
        1. Split into semantic chunks
        2. Each chunk is embedded
        3. The chunk + embedding is upserted to Qdrant

        Args:
            documents: List of SourceDocument objects to index.
            source: Source identifier (e.g. 'wikipedia', 'openstax').

        Returns:
            Number of chunks indexed.
        """
        try:
            client = await self._ensure_client()
        except Exception as e:
            logger.warning(f"Cannot index documents (vector store unavailable): {e}")
            return 0

        all_points: list[qdrant_models.PointStruct] = []

        for doc in documents:
            try:
                # Chunk the document
                chunks = self._chunker.chunk_document(
                    title=doc.title or "",
                    content=doc.content or "",
                    source=source,
                    source_url=getattr(doc, "url", ""),
                    subject=getattr(doc, "subject", "general"),
                    difficulty=getattr(doc, "difficulty", "intermediate"),
                )

                if not chunks:
                    continue

                # Embed each chunk
                texts = [c.content for c in chunks]
                try:
                    embedding_results = await self._embedding_service.embed_batch(texts)
                except Exception as e:
                    logger.warning(f"Embedding failed for '{getattr(doc, 'title', '?')}': {e}")
                    continue

                for chunk, emb_result in zip(chunks, embedding_results):
                    point_id = str(uuid.uuid4())
                    payload = {
                        "chunk_id": chunk.id or point_id,
                        "content": chunk.content,
                        "heading": chunk.heading,
                        "subheading": chunk.subheading,
                        "source": chunk.source or source,
                        "source_url": chunk.source_url or getattr(doc, "url", ""),
                        "subject": chunk.subject or "general",
                        "difficulty": chunk.difficulty or "intermediate",
                        "document_title": doc.title or "",
                        "chunk_type": (
                chunk.chunk_type.value
                if hasattr(chunk.chunk_type, "value")
                else str(chunk.chunk_type)
            ),
                        "sequence": chunk.sequence,
                    }

                    all_points.append(qdrant_models.PointStruct(
                        id=point_id,
                        vector=emb_result.vector,
                        payload=payload,
                    ))

            except Exception as e:
                logger.warning(
                    "Failed to index document '%s': %s",
                    getattr(doc, "title", "?"), e,
                )
                continue

        if all_points:
            try:
                client.upsert(
                    collection_name=COLLECTION_NAME,
                    points=all_points,
                    wait=True,
                )
                logger.info(f"Indexed {len(all_points)} chunks from {len(documents)} documents")
            except Exception as e:
                logger.warning(f"Failed to upsert points to Qdrant: {e}")
                return 0
        else:
            logger.info("No chunks to index")

        return len(all_points)

    async def index_text(
        self,
        text: str,
        title: str = "",
        source: str = "inline",
        source_url: str = "",
        subject: str = "general",
    ) -> int:
        """Index a single text string (useful for ad-hoc content).

        Args:
            text: The text content to index.
            title: Document title.
            source: Source identifier.
            source_url: URL of the source.
            subject: Subject area.

        Returns:
            Number of chunks indexed.
        """
        from app.knowledge.sources import SourceDocument

        doc = SourceDocument(
            id=f"inline:{uuid.uuid4()}",
            title=title,
            content=text,
            source=source,
            url=source_url,
            subject=subject,
            difficulty="intermediate",
            language="en",
            license="",
        )
        return await self.index_documents([doc], source=source)

    # ── Search ────────────────────────────────────────────

    async def search(
        self,
        query: str,
        limit: int = DEFAULT_LIMIT,
        subject: str | None = None,
        score_threshold: float = MIN_SCORE,
    ) -> list[SearchResult]:
        """Search for documents similar to the query.

        Args:
            query: The search query text.
            limit: Maximum number of results.
            subject: Optional subject filter.
            score_threshold: Minimum similarity score (0-1).

        Returns:
            List of SearchResult objects, ranked by relevance.
        """
        if not query or not query.strip():
            return []

        client = await self._ensure_client()

        # Embed the query
        try:
            embedding_result = await self._embedding_service.embed(query)
        except Exception as e:
            logger.warning(f"Failed to embed search query: {e}")
            return []

        if not embedding_result or not embedding_result.vector:
            logger.warning("Failed to embed search query")
            return []

        # Build search filter
        query_filter = None
        if subject:
            query_filter = qdrant_models.Filter(
                must=[
                    qdrant_models.FieldCondition(
                        key="subject",
                        match=qdrant_models.MatchValue(value=subject),
                    )
                ]
            )

        try:
            if hasattr(client, "query_points"):
                query_response = client.query_points(
                    collection_name=COLLECTION_NAME,
                    query=embedding_result.vector,
                    limit=limit,
                    query_filter=query_filter,
                    score_threshold=score_threshold,
                    with_payload=True,
                )
                points = query_response.points
            else:
                points = client.search(
                    collection_name=COLLECTION_NAME,
                    query_vector=embedding_result.vector,
                    limit=limit,
                    query_filter=query_filter,
                    score_threshold=score_threshold,
                    with_payload=True,
                )

            results = []
            for i, scored_point in enumerate(points):
                payload = scored_point.payload or {}
                results.append(SearchResult(
                    chunk_id=payload.get("chunk_id", str(scored_point.id)),
                    content=payload.get("content", ""),
                    heading=payload.get("heading", ""),
                    source=payload.get("source", ""),
                    source_url=payload.get("source_url", ""),
                    subject=payload.get("subject", "general"),
                    difficulty=payload.get("difficulty", "intermediate"),
                    score=scored_point.score,
                    rank=i + 1,
                ))

            if results:
                logger.info(
                    f"Vector search for '{query[:40]}...': "
                    f"{len(results)} results (top score: {results[0].score:.3f})"
                )
            else:
                logger.info(f"Vector search for '{query[:40]}...': no results")
            return results

        except Exception as e:
            logger.error("Vector search failed: %s", e)
            return []

    async def search_by_text(
        self,
        query: str,
        limit: int = DEFAULT_LIMIT,
        subject: str | None = None,
    ) -> list[SearchResult]:
        """Alias for search() — queries by text, returns ranked results.

        This is the main method used by the knowledge pipeline.
        """
        return await self.search(
            query=query,
            limit=limit,
            subject=subject,
        )

    # ── Management ────────────────────────────────────────

    async def reset_collection(self) -> None:
        """Delete and recreate the collection (for re-indexing)."""
        try:
            client = await self._ensure_client()
            client.delete_collection(collection_name=COLLECTION_NAME)
            self._collection_initialized = False
            logger.info(f"Deleted collection '{COLLECTION_NAME}'")
        except Exception as e:
            logger.warning(f"Failed to delete collection: {e}")

    async def delete_chunks_by_source(self, source: str) -> int:
        """Delete all chunks from a specific source.

        Args:
            source: Source identifier (e.g. 'wikipedia').

        Returns:
            Number of points deleted.
        """
        try:
            client = await self._ensure_client()
            count_before = await self.document_count

            client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=qdrant_models.FilterSelector(
                    filter=qdrant_models.Filter(
                        must=[
                            qdrant_models.FieldCondition(
                                key="source",
                                match=qdrant_models.MatchValue(value=source),
                            )
                        ]
                    )
                ),
            )

            count_after = await self.document_count
            deleted = count_before - count_after
            logger.info(f"Deleted {deleted} chunks from source '{source}'")
            return deleted

        except Exception as e:
            logger.error(f"Failed to delete chunks by source: {e}")
            return 0


# ── Singleton ──────────────────────────────────────────────

_store: VectorStore | None = None


def get_vector_store() -> VectorStore:
    """Get or create the singleton vector store."""
    global _store
    if _store is None:
        _store = VectorStore(
            url=settings.qdrant_url if settings.qdrant_url != "http://localhost:6333" else None,
            api_key=settings.qdrant_api_key,
        )
        logger.info("Vector store singleton created")
    return _store


__all__ = [
    "VectorStore",
    "get_vector_store",
]
