"""Result Reranking for the Knowledge Engine.

Retrieve 20 → Rerank → Top 5

Improves retrieval quality by re-scoring initial results
with a more accurate model (cross-encoder or LLM-based).

The reranker uses the orchestration router to score each result
pairwise against the query, providing a relevance score that is
more accurate than pure embedding cosine similarity.
"""

import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RerankedResult:
    """A search result after reranking."""
    chunk_id: str
    content: str
    original_score: float
    reranked_score: float
    delta: float  # Improvement over original score


# Simple keyword-based relevance scoring as a fast pre-filter
_KEYWORD_BONUS = {
    "what": 0.1, "how": 0.1, "why": 0.15, "explain": 0.15,
    "define": 0.1, "example": 0.1, "difference": 0.2,
    "compare": 0.2, "benefits": 0.15, "advantage": 0.15,
    "disadvantage": 0.15, "purpose": 0.1, "function": 0.1,
    "structure": 0.1, "process": 0.1, "cause": 0.15,
    "effect": 0.15, "relationship": 0.2,
}

_TERM_BONUS = {
    "simply": 0.1, "easy": 0.05, "basic": 0.05,
    "key": 0.1, "important": 0.1, "critical": 0.15,
    "essential": 0.15, "fundamental": 0.15,
    "first": 0.05, "primary": 0.1, "main": 0.1,
    "overview": 0.1, "summary": 0.1, "introduction": 0.1,
}


def _keyword_score(query: str, content: str) -> float:
    """Fast keyword overlap scoring as a pre-filter."""
    query_lower = query.lower()
    content_lower = content.lower()

    # Token overlap
    query_tokens = set(re.findall(r'\w+', query_lower))
    content_tokens = set(re.findall(r'\w+', content_lower))
    overlap = query_tokens & content_tokens

    if not overlap:
        return 0.0

    base_score = len(overlap) / max(len(query_tokens), 1)

    # Bonus for query-type keyword matches
    for kw, bonus in _KEYWORD_BONUS.items():
        if kw in query_lower and kw in content_lower:
            base_score += bonus

    # Bonus for explanatory term matches in content
    for term, bonus in _TERM_BONUS.items():
        if term in content_lower:
            base_score += bonus * 0.5

    return min(base_score, 1.0)


class Reranker:
    """Re-ranks search results for better quality.

    Strategy:
    1. Retrieve top-K candidates with fast embedding search (20)
    2. Score each result using keyword overlap + optional LLM scoring
    3. Return top-N with improved ordering (5)

    The reranker combines fast keyword scoring with optional
    LLM-based relevance scoring for the most important queries.
    """

    def __init__(self, use_llm_rerank: bool = False) -> None:
        self._use_llm = use_llm_rerank

    async def rerank(
        self,
        query: str,
        results: list,
        top_n: int = 5,
    ) -> list[RerankedResult]:
        """Re-rank search results given the original query.

        Args:
            query: The original search query.
            results: List of search results (must have .content, .chunk_id, .score).
            top_n: Number of results to return after reranking.

        Returns:
            List of RerankedResult sorted by reranked_score descending.
        """
        if not results:
            return []

        scored = []
        for r in results:
            content = getattr(r, "content", str(r))
            # Flexible ID extraction: try chunk_id → document.id → id → fallback
            doc = getattr(r, "document", None)
            chunk_id = (
                getattr(r, "chunk_id", None)
                or (getattr(doc, "id", None) if doc else None)
                or getattr(r, "id", None)
                or "unknown"
            )
            original_score = getattr(r, "score", 0.0) or 0.0

            # Fast keyword score
            kw_score = _keyword_score(query, content)

            # Compute reranked score as a blend
            # keyword score + original embedding score
            reranked = (kw_score * 0.4) + (original_score * 0.6)

            scored.append(RerankedResult(
                chunk_id=chunk_id,
                content=content[:200],  # Store preview only
                original_score=original_score,
                reranked_score=round(reranked, 4),
                delta=round(reranked - original_score, 4),
            ))

        # Optionally refine with LLM scoring for top candidates
        if self._use_llm and len(scored) > top_n:
            try:
                scored = await self._llm_rerank(query, scored, top_n)
            except Exception as e:
                logger.warning(f"LLM reranking failed, using keyword fallback: {e}")

        # Sort by reranked score descending and take top_n
        scored.sort(key=lambda x: x.reranked_score, reverse=True)
        return scored[:top_n]

    async def _llm_rerank(
        self,
        query: str,
        results: list[RerankedResult],
        top_n: int,
    ) -> list[RerankedResult]:
        """Use an LLM to refine relevance scores for the top candidates.

        Works by asking the AI model to rate each result's relevance
        to the query on a scale of 0-10, then blending that with
        the existing scores.

        Args:
            query: The search query.
            results: Pre-scored results to refine.
            top_n: How many to return.

        Returns:
            Updated list with LLM-refined scores.
        """
        try:
            from app.orchestration.router import route_request
        except ImportError:
            logger.warning("Orchestrator not available for LLM reranking")
            return results

        # Take top candidates by keyword score for LLM evaluation
        candidates = sorted(results, key=lambda x: x.reranked_score, reverse=True)[:top_n * 2]

        # Build a prompt asking the LLM to rate relevance
        parts = [
            f"Query: {query}\n",
            "Rate each result's relevance to the query (0-10).\n",
            "Return ONLY a comma-separated list of scores, one per result.\n\n",
        ]
        for i, r in enumerate(candidates):
            preview = r.content[:150].replace("\n", " ")
            parts.append(f"[{i+1}] {preview}\n")

        parts.append("\nScores: ")

        prompt = "".join(parts)

        response = await route_request(
            prompt=prompt,
            system_prompt=(
                "You are a search relevance rater. Rate each result's relevance "
                "to the query on a scale of 0-10. Return ONLY a comma-separated "
                "list of numbers."
            ),
            mode="quick",
        )

        # Parse LLM scores
        llm_scores = re.findall(r'(\d{1,2}(?:\.\d)?)', response.content)

        score_map = {}
        for i, score_str in enumerate(llm_scores):
            if i < len(candidates):
                score_map[candidates[i].chunk_id] = float(score_str) / 10.0

        # Apply LLM scores as a refinement
        for r in results:
            if r.chunk_id in score_map:
                llm_score = score_map[r.chunk_id]
                # Blend: 40% LLM, 30% keyword, 30% original embedding
                kw_score = r.reranked_score * 0.6 / 0.4 if r.reranked_score > 0 else 0
                blended = (llm_score * 0.4) + (kw_score * 0.3) + (r.original_score * 0.3)
                r.reranked_score = round(blended, 4)
                r.delta = round(r.reranked_score - r.original_score, 4)

        return results

    async def batch_rerank(
        self,
        query: str,
        results_by_source: dict[str, list],
        top_n: int = 5,
    ) -> dict[str, list[RerankedResult]]:
        """Rerank results from multiple sources independently.

        Args:
            query: The search query.
            results_by_source: Dict mapping source name to list of results.
            top_n: Results per source after reranking.

        Returns:
            Dict mapping source name to reranked result lists.
        """
        return {
            source: await self.rerank(query, source_results, top_n)
            for source, source_results in results_by_source.items()
        }


# Singleton
_reranker: Reranker | None = None


def get_reranker(use_llm: bool = False) -> Reranker:
    """Get or create the singleton reranker."""
    global _reranker
    if _reranker is None:
        _reranker = Reranker(use_llm_rerank=use_llm)
    return _reranker


__all__ = [
    "RerankedResult",
    "Reranker",
    "get_reranker",
]
