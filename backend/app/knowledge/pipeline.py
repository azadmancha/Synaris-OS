"""
Knowledge Pipeline.

Orchestrates the full knowledge retrieval flow:
    User Query → (Vector Search → Wikipedia Fallback) → Build Context → Inject into AI Prompt

Retrieval strategy (tiered):
    1. Vector Store (Qdrant) — fast semantic search over pre-indexed content
    2. Live Wikipedia — fallback for topics not in the index

The pipeline is designed to be:
    - Fast: Uses cached vector index for most queries
    - Graceful: Falls back gracefully when sources fail
    - Extensible: New sources and backends can be added
"""

import logging
from typing import Optional

from app.knowledge.sources import SourceAdapter, SourceDocument, SearchResult as SourceSearchResult
from app.knowledge.sources.wikipedia import get_wikipedia_source
from app.knowledge.context import LLMContext
from app.knowledge.context.builder import get_context_builder
from app.knowledge.cache import get_cache
from app.knowledge.search.vector_store import get_vector_store

logger = logging.getLogger(__name__)


class KnowledgePipeline:
    """Orchestrates the knowledge retrieval and context-building process.

    Flow:
    1. Check cache for identical query
    2. Search vector store (Qdrant) — fast semantic search over pre-indexed content
    3. If no results, fall back to live Wikipedia search
    4. Build structured context with citations
    5. Return context for injection into AI prompt
    """

    def __init__(self):
        self._sources: list[SourceAdapter] = []
        self._context_builder = get_context_builder()
        self._cache = get_cache()
        self._vector_store = get_vector_store()
        self._init_sources()

    def _init_sources(self):
        """Initialize all available knowledge sources."""
        wikipedia = get_wikipedia_source()
        if wikipedia.is_available:
            self._sources.append(wikipedia)
            logger.info("Wikipedia source registered in pipeline")

    @property
    def has_sources(self) -> bool:
        """Check if at least one source is configured."""
        return len(self._sources) > 0

    async def process(self, query: str) -> "KnowledgeResult":
        """Process a user query through the knowledge pipeline.

        Uses a two-tier retrieval strategy:
        1. Vector store first (fast, semantic, pre-indexed)
        2. Live Wikipedia fallback (comprehensive, always up-to-date)

        Args:
            query: The user's question or search query.

        Returns:
            KnowledgeResult with context and citations.
        """
        if not self.has_sources:
            return KnowledgeResult.empty()

        # Check cache first
        cache_key = f"knowledge:{query.lower().strip()}"
        cached = await self._cache.get(cache_key)
        if cached is not None:
            logger.info(f"Cache hit for query: {query[:50]}")
            return KnowledgeResult.from_dict(cached)

        all_results = []

        # ── Tier 1: Vector Store (Qdrant) ─────────────────
        try:
            vector_results = await self._vector_store.search_by_text(query, limit=5)
            if vector_results:
                logger.info(
                    f"Vector store returned {len(vector_results)} results "
                    f"(top score: {vector_results[0].score:.3f})"
                )
                # Normalize vector store results to SourceSearchResult format
                # ContextBuilder expects doc.document with .content, .title, .source, .url
                for r in vector_results:
                    doc = SourceDocument(
                        id=r.chunk_id,
                        title=r.heading or query,
                        content=r.content,
                        source=r.source,
                        url=r.source_url,
                        subject=r.subject,
                        difficulty=r.difficulty,
                        language="en",
                        license="",
                    )
                    all_results.append(SourceSearchResult(
                        document=doc,
                        score=r.score,
                        snippet=r.content[:300],
                    ))
        except Exception as e:
            logger.warning(f"Vector store search failed: {e}")

        # ── Tier 2: Live Wikipedia ────────────────────────
        # Only search if vector store didn't have enough results
        if len(all_results) < 2:
            for source in self._sources:
                try:
                    source_results = await source.search(query, limit=3)
                    if source_results:
                        logger.info(
                            f"Source '{source.name}' returned {len(source_results)} results"
                        )
                        all_results.extend(source_results)
                except Exception as e:
                    logger.warning(f"Source '{source.name}' failed: {e}")

        if not all_results:
            logger.info(f"No results found for query: {query[:50]}")
            return KnowledgeResult.empty()

        # Build context from results
        try:
            llm_context = await self._context_builder.build_context(
                query=query,
                documents=all_results,
            )
        except Exception as e:
            logger.error(f"Context building failed: {e}")
            return KnowledgeResult.empty()

        result = KnowledgeResult(
            has_context=True,
            context=llm_context.system_prompt if llm_context else "",
            document_count=len(all_results),
            query=query,
        )

        # Cache the result (short TTL — content may update)
        await self._cache.set(cache_key, result.to_dict(), ttl=300)

        return result


class KnowledgeResult:
    """Result from a knowledge pipeline query."""

    def __init__(
        self,
        has_context: bool = False,
        context: str = "",
        document_count: int = 0,
        query: str = "",
    ):
        self.has_context = has_context
        self.context = context
        self.document_count = document_count
        self.query = query

    @classmethod
    def empty(cls) -> "KnowledgeResult":
        """Return an empty result (no knowledge found)."""
        return cls()

    def to_dict(self) -> dict:
        """Serialize to dict for caching."""
        return {
            "has_context": self.has_context,
            "context": self.context,
            "document_count": self.document_count,
            "query": self.query,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "KnowledgeResult":
        """Deserialize from cached dict."""
        return cls(
            has_context=data.get("has_context", False),
            context=data.get("context", ""),
            document_count=data.get("document_count", 0),
            query=data.get("query", ""),
        )


# Singleton
_pipeline: KnowledgePipeline | None = None


def get_knowledge_pipeline() -> KnowledgePipeline:
    """Get or create the singleton knowledge pipeline."""
    global _pipeline
    if _pipeline is None:
        _pipeline = KnowledgePipeline()
    return _pipeline


async def augment_with_knowledge(prompt: str) -> tuple[str, str]:
    """Augment a prompt with knowledge context.

    This is the main entry point for the Knowledge Engine.
    Call this before sending a prompt to the AI.

    Args:
        prompt: The user's original prompt.

    Returns:
        Tuple of (augmented_prompt, knowledge_context).
        The knowledge_context can be used for logging/debugging.
    """
    pipeline = get_knowledge_pipeline()

    if not pipeline.has_sources:
        return prompt, ""

    result = await pipeline.process(prompt)

    if not result.has_context:
        return prompt, ""

    # Augment the prompt with knowledge context
    augmented_prompt = f"{prompt}\n\n{result.context}"

    return augmented_prompt, result.context


__all__ = [
    "KnowledgePipeline",
    "KnowledgeResult",
    "get_knowledge_pipeline",
    "augment_with_knowledge",
]
