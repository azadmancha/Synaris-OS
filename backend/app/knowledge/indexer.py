"""
Document Indexer — indexes knowledge sources into the vector store.

Handles scheduled indexing of educational content from registered
knowledge sources (Wikipedia, OpenStax, Wikibooks) into the Qdrant
vector store for fast semantic retrieval.

Architecture:
    Indexer.on_startup() → for each source → fetch topics → chunk → embed → store in Qdrant

Can run on:
    1. Application startup (indexes popular topics automatically)
    2. On-demand via API (for specific topics)
    3. Scheduled re-indexing (for content freshness)
"""

import logging

from app.knowledge.search.vector_store import get_vector_store
from app.knowledge.sources import SourceAdapter, SourceDocument
from app.knowledge.sources.openstax import get_openstax_source
from app.knowledge.sources.wikibooks import get_wikibooks_source
from app.knowledge.sources.wikipedia import get_wikipedia_source

logger = logging.getLogger(__name__)


class DocumentIndexer:
    """Indexes documents from knowledge sources into the vector store.

    Manages the full indexing pipeline:
    1. Fetch documents from a knowledge source
    2. Chunk documents into smaller pieces
    3. Embed each chunk
    4. Store embeddings in Qdrant
    5. Track indexing status per source
    """

    def __init__(self) -> None:
        self._vector_store = get_vector_store()
        self._sources: dict[str, SourceAdapter] = {}
        self._indexed_counts: dict[str, int] = {}  # source_name -> chunk count
        self._register_sources()

    def _register_sources(self) -> None:
        """Register all available knowledge sources for indexing."""
        sources_to_register = [
            ("wikipedia", get_wikipedia_source),
            ("openstax", get_openstax_source),
            ("wikibooks", get_wikibooks_source),
        ]

        for name, getter in sources_to_register:
            try:
                source = getter()
                if source.is_available:
                    self._sources[name] = source
                    logger.info(f"Indexer: registered source '{name}'")
                else:
                    logger.info(f"Indexer: source '{name}' not available (skip indexing)")
            except Exception as e:
                logger.warning(f"Indexer: failed to register source '{name}': {e}")

    @property
    def indexed_sources(self) -> list[str]:
        """Return names of sources that have been indexed."""
        return list(self._indexed_counts.keys())

    @property
    def total_indexed(self) -> int:
        """Return total number of chunks indexed."""
        return sum(self._indexed_counts.values())

    async def index_source(self, source_name: str, topics: list[str] | None = None) -> int:
        """Index documents from a specific knowledge source.

        Args:
            source_name: Name of the source to index (e.g. 'wikipedia').
            topics: Specific topics to index. If None, uses the source's
                   default popular topics list.

        Returns:
            Number of chunks indexed.
        """
        if source_name not in self._sources:
            logger.warning(f"Indexer: source '{source_name}' not registered")
            return 0

        source = self._sources[source_name]
        logger.info(f"Indexer: starting indexing of '{source_name}'")

        # Get the topics to index
        topics_to_index = topics or self._get_default_topics(source_name)
        if not topics_to_index:
            logger.info(f"Indexer: no topics to index for '{source_name}'")
            return 0

        total_chunks = 0
        for topic in topics_to_index:
            try:
                chunks = await self._index_topic(source, topic)
                total_chunks += chunks
            except Exception as e:
                logger.warning(f"Indexer: failed to index topic '{topic}' from '{source_name}': {e}")
                continue

        self._indexed_counts[source_name] = total_chunks
        logger.info(f"Indexer: finished indexing '{source_name}' — {total_chunks} chunks total")
        return total_chunks

    async def index_all(self) -> dict[str, int]:
        """Index all registered sources with their default topics.

        Returns:
            Dictionary mapping source name to number of chunks indexed.
        """
        results: dict[str, int] = {}
        for source_name in self._sources:
            count = await self.index_source(source_name)
            results[source_name] = count

        self._indexed_counts = results
        return results

    async def index_query(self, query: str, source_name: str | None = None) -> int:
        """Index content related to a specific query (on-demand).

        Useful for indexing specific topics the user asks about
        that aren't in the pre-indexed set.

        Args:
            query: The topic or query to index.
            source_name: Optional source to use. If None, tries all.

        Returns:
            Number of chunks indexed.
        """
        if source_name and source_name in self._sources:
            return await self._index_topic(self._sources[source_name], query)

        total = 0
        for name, source in self._sources.items():
            chunks = await self._index_topic(source, query)
            total += chunks

        return total

    async def _index_topic(self, source: SourceAdapter, topic: str) -> int:
        """Index a single topic from a source."""
        try:
            # Search the source for this topic
            results = await source.search(topic, limit=3)
            if not results:
                return 0

            # Extract documents from search results
            documents: list[SourceDocument] = [r.document for r in results]

            # Index into vector store
            chunks = await self._vector_store.index_documents(
                documents=documents,
                source=source.name,
            )

            if chunks > 0:
                logger.debug(f"Indexer: indexed {chunks} chunks for topic '{topic}' from '{source.name}'")

            return chunks

        except Exception as e:
            logger.warning(f"Indexer: topic indexing failed for '{topic}' from '{source.name}': {e}")
            return 0

    def _get_default_topics(self, source_name: str) -> list[str]:
        """Get the default topics to index for a source."""
        from app.knowledge.sources.openstax import OpenStaxSource
        from app.knowledge.sources.wikibooks import WikibooksSource
        from app.knowledge.sources.wikipedia import WikipediaSource

        topic_mapping = {
            "wikipedia": WikipediaSource.COMMON_TOPICS,
            "openstax": list(OpenStaxSource.POPULAR_BOOKS.keys()),
            "wikibooks": WikibooksSource.COMMON_BOOKS,
        }

        return topic_mapping.get(source_name, [])


# Singleton
_indexer: DocumentIndexer | None = None


def get_indexer() -> DocumentIndexer:
    """Get or create the singleton document indexer."""
    global _indexer
    if _indexer is None:
        _indexer = DocumentIndexer()
    return _indexer


async def index_on_startup() -> None:
    """Run initial indexing of all sources on application startup.

    Called from main.py during startup to pre-populate the vector store
    with educational content from all registered sources.
    """
    indexer = get_indexer()

    if not indexer._sources:
        logger.info("Indexer: no sources available on startup — skipping initial indexing")
        return

    logger.info(f"Indexer: starting initial indexing of {len(indexer._sources)} source(s)")

    try:
        results = await indexer.index_all()
        for source, count in results.items():
            logger.info(f"Indexer: startup indexing complete for '{source}' — {count} chunks")
        logger.info(f"Indexer: startup indexing complete — {indexer.total_indexed} total chunks")
    except Exception as e:
        logger.error(f"Indexer: startup indexing failed: {e}")


__all__ = [
    "DocumentIndexer",
    "get_indexer",
    "index_on_startup",
]
