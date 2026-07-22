"""
Knowledge Indexer — Pre-fetches and indexes educational content.

At startup (or on demand), this module:
1. Fetches pages from Wikipedia for common educational topics
2. Chunks them into semantic sections
3. Embeds each chunk
4. Stores them in the Qdrant vector store

After indexing, the knowledge pipeline can query the vector store
INSTEAD of making live Wikipedia API calls — much faster and more reliable.

Health Note:
    Indexing errors (rate limits, dimension mismatches, network issues)
    are caught and logged — they never crash the server. The pipeline
    falls back to live Wikipedia search when the vector store is empty.
"""

import asyncio
import logging
import time

from app.knowledge.search.vector_store import get_vector_store
from app.knowledge.sources.wikipedia import get_wikipedia_source

logger = logging.getLogger(__name__)

# ── Topics to pre-index ────────────────────────────────────

# Core educational topics that cover most student questions
# Ordered by expected frequency of student queries
PRIORITY_TOPICS = [
    # Biology (most common learning queries)
    "Photosynthesis", "DNA", "Evolution", "Cell (biology)", "Genetics",
    "Protein", "Enzyme", "Virus", "Immune system", "Ecosystem",

    # Physics
    "Quantum mechanics", "Thermodynamics", "Electromagnetism",
    "Newton's laws of motion", "Theory of relativity", "Gravity",
    "Speed of light", "Force", "Energy", "Black hole",

    # Mathematics (first 10)
    "Calculus", "Linear algebra", "Probability", "Statistics",
    "Geometry", "Algebra", "Trigonometry", "Logarithm",
    "Set theory", "Graph theory",

    # Chemistry (first 10)
    "Periodic table", "Chemical bond", "Chemical reaction",
    "Organic chemistry", "Molecule", "Atom", "pH",
    "Stoichiometry", "Catalysis", "Chemical equilibrium",

    # Computer Science (first 10)
    "Algorithm", "Data structure", "Machine learning",
    "Artificial intelligence", "Time complexity",
    "Computer network", "Database", "Cryptography",
    "Recursion", "Object-oriented programming",
]


async def index_knowledge_base(
    topics: list[str] | None = None,
    reindex: bool = False,
) -> int:
    """Fetch and index educational content into the Qdrant vector store.

    Gracefully handles errors per-topic so a single failure
    (rate limit, network issue, dimension mismatch) doesn't
    block the rest of the index.

    Args:
        topics: List of Wikipedia topics to index. Defaults to PRIORITY_TOPICS.
        reindex: If True, clears the existing index first.

    Returns:
        Number of chunks indexed.
    """
    topics = topics or PRIORITY_TOPICS
    store = get_vector_store()
    wikipedia = get_wikipedia_source()

    if not wikipedia.is_available:
        logger.warning("Wikipedia source not available — skipping knowledge indexing")
        return 0

    if reindex:
        try:
            await store.reset_collection()
            logger.info("Collection reset for re-indexing")
        except Exception as e:
            logger.warning(f"Failed to reset collection (continuing anyway): {e}")

    logger.info("Starting knowledge indexing: %d topics", len(topics))
    start_time = time.monotonic()

    total_chunks = 0
    indexed_count = 0
    error_count = 0
    skip_count = 0

    for i, topic in enumerate(topics, 1):
        try:
            # Fetch document from Wikipedia
            docs = await wikipedia.search(topic, limit=1)
            if not docs:
                skip_count += 1
                logger.debug(f"[{i}/{len(topics)}] No results for '{topic}'")
                await asyncio.sleep(0.3)
                continue

            # Index the document
            try:
                chunk_count = await store.index_documents(
                    [docs[0].document],
                    source="wikipedia",
                )
            except Exception as store_err:
                error_count += 1
                logger.warning(f"[%d/%d] Store indexing failed for '%s': %s",
                               i, len(topics), topic, store_err)
                await asyncio.sleep(1.0)
                continue

            if chunk_count > 0:
                indexed_count += 1
                total_chunks += chunk_count
                logger.info(
                    "[%d/%d] Indexed '%s' → %d chunks (%d total)",
                    i, len(topics), topic, chunk_count, total_chunks,
                )
            else:
                skip_count += 1
                logger.debug(f"[{i}/{len(topics)}] No chunks for '{topic}'")

            # Be polite to Wikipedia API — 500ms delay between requests
            await asyncio.sleep(0.5)

        except Exception as e:
            error_count += 1
            logger.warning(
                "[%d/%d] Failed to index '%s': %s",
                i, len(topics), topic, e,
            )
            await asyncio.sleep(1.0)
            continue

    elapsed = time.monotonic() - start_time
    summary = (
        f"Knowledge indexing: {indexed_count}/{len(topics)} topics indexed, "
        f"{total_chunks} chunks, "
        f"{error_count} errors, "
        f"{skip_count} skipped, "
        f"in {elapsed:.1f}s"
    )

    if error_count > 0:
        logger.warning(summary)
    else:
        logger.info(summary)

    return total_chunks


async def quick_index() -> int:
    """Quick index — indexes only the first 5 topics for fast startup.

    Used during local development to get a working index quickly.
    The full index can be triggered later via API or CLI.

    Why 5: Prevents Gemini API quota exhaustion (100 embeds/min free tier)
    during startup while still providing a working vector store for
    common queries.
    """
    return await index_knowledge_base(topics=PRIORITY_TOPICS[:5])


__all__ = [
    "PRIORITY_TOPICS",
    "index_knowledge_base",
    "quick_index",
]
