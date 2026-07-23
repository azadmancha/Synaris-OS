"""Vector Search and Retrieval for the Knowledge Engine.

Uses PostgreSQL + pgvector for efficient similarity search.
Stores embeddings alongside rich metadata for hybrid retrieval.

Architecture:
    Query → Embed → pgvector cosine similarity → Hybrid rank → Result
"""

from dataclasses import dataclass


@dataclass
class SearchResult:
    """A single search result from the Knowledge Engine."""

    chunk_id: str
    content: str
    heading: str
    source: str
    source_url: str
    subject: str
    difficulty: str
    score: float
    rank: int = 0


__all__ = [
    "SearchResult",
]
