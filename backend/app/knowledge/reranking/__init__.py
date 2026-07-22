"""Result Reranking for the Knowledge Engine.

Retrieve 20 → Rerank → Top 5

Improves retrieval quality by re-scoring initial results
with a more accurate model (cross-encoder or LLM-based).
"""

from dataclasses import dataclass


@dataclass
class RerankedResult:
    """A search result after reranking."""
    chunk_id: str
    content: str
    original_score: float
    reranked_score: float
    delta: float  # Improvement over original score


class Reranker:
    """Re-ranks search results for better quality.

    Strategy:
    1. Retrieve top-K candidates with fast embedding search
    2. Re-score with a more accurate cross-encoder or LLM
    3. Return top-N with improved ordering
    """

    async def rerank(
        self,
        query: str,
        results: list,
        top_n: int = 5,
    ) -> list[RerankedResult]:
        """Re-rank search results given the original query."""
        raise NotImplementedError


__all__ = [
    "RerankedResult",
    "Reranker",
]
