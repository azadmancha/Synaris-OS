"""
AI Evaluator — evaluates AI response quality for educational contexts.

Provides quality scoring, benchmarking, and improvement suggestions
for AI responses. Designed to help improve the tutoring system over time.

Architecture:
    Response + Context → Evaluation Criteria → Quality Scores → Feedback

Evaluation dimensions:
    1. Accuracy — Is the information factually correct?
    2. Clarity — Is the explanation clear and understandable?
    3. Educational Value — Does it teach rather than just answer?
    4. Safety — Does the response follow safety guidelines?
    5. Citation Quality — Are sources properly cited?
"""

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime

logger = logging.getLogger(__name__)


@dataclass
class EvaluationScore:
    """Score for a single evaluation dimension."""

    dimension: str
    score: float  # 0.0 to 1.0
    reasoning: str  # Why this score was given
    suggestions: list[str] = field(default_factory=list)


@dataclass
class EvaluationResult:
    """Complete evaluation result for a single AI response."""

    overall_score: float  # 0.0 to 1.0
    scores: list[EvaluationScore]  # Per-dimension scores
    response_summary: str = ""  # Brief summary of what was evaluated
    improvement_suggestions: list[str] = field(default_factory=list)
    evaluated_at: str = ""
    model_used: str = ""

    def __post_init__(self) -> None:
        if not self.evaluated_at:
            self.evaluated_at = datetime.now(UTC).isoformat()


# ─── Pattern-based evaluation (fast, no AI call) ──────────────


def _evaluate_length(response: str, expected_min: int = 50) -> EvaluationScore:
    """Evaluate if the response length is appropriate."""
    length = len(response)
    if length < expected_min:
        return EvaluationScore(
            dimension="completeness",
            score=0.3,
            reasoning=f"Response is too short ({length} chars, expected min {expected_min})",
            suggestions=["Provide a more complete explanation", "Add examples to clarify"],
        )
    elif length < expected_min * 2:
        return EvaluationScore(
            dimension="completeness",
            score=0.6,
            reasoning=f"Response is adequate ({length} chars)",
            suggestions=["Consider adding more detail or examples"],
        )
    else:
        return EvaluationScore(
            dimension="completeness",
            score=0.9,
            reasoning=f"Response has good length ({length} chars)",
        )


def _evaluate_citations(response: str) -> EvaluationScore:
    """Evaluate citation usage in the response."""
    has_citation_markers = any(
        marker in response
        for marker in [
            "📖",
            "Source:",
            "Confidence:",
            "Learn More",
            "Citation:",
        ]
    )

    has_urls = "http" in response and ("openstax" in response or "wikipedia" in response or "wikibooks" in response)

    if has_citation_markers and has_urls:
        return EvaluationScore(
            dimension="citation_quality",
            score=0.9,
            reasoning="Response includes proper citations with sources and URLs",
        )
    elif has_citation_markers:
        return EvaluationScore(
            dimension="citation_quality",
            score=0.6,
            reasoning="Response has citation markers but could include direct URLs",
            suggestions=["Add source URLs for verifiability"],
        )
    else:
        return EvaluationScore(
            dimension="citation_quality",
            score=0.3,
            reasoning="Response lacks citations",
            suggestions=["Include source citations when presenting factual information"],
        )


def _evaluate_educational_quality(response: str) -> EvaluationScore:
    """Evaluate the educational quality of a response."""
    educational_markers = [
        "example",
        "analogy",
        "imagine",
        "think of it as",
        "step",
        "first",
        "next",
        "finally",
        "understand",
        "concept",
        "explain",
        "practice",
        "try",
        "exercise",
    ]

    positive_score = sum(2 for m in educational_markers if m in response.lower())

    if positive_score >= 10:
        return EvaluationScore(
            dimension="educational_quality",
            score=0.9,
            reasoning="Response uses multiple teaching techniques (examples, structure, analogies)",
        )
    elif positive_score >= 5:
        return EvaluationScore(
            dimension="educational_quality",
            score=0.6,
            reasoning="Response has some educational elements",
            suggestions=["Add examples or analogies to improve understanding"],
        )
    else:
        return EvaluationScore(
            dimension="educational_quality",
            score=0.3,
            reasoning="Response lacks educational structure",
            suggestions=["Use examples, break down steps, and connect to prior knowledge"],
        )


# ─── Main Evaluator ───────────────────────────────────────────


class AIEvaluator:
    """Evaluates AI responses for quality and educational value.

    Provides both fast pattern-based evaluation and optional
    AI-powered deep evaluation using the orchestrator.
    """

    def __init__(self) -> None:
        self._evaluation_history: list[EvaluationResult] = []

    @property
    def evaluation_count(self) -> int:
        return len(self._evaluation_history)

    async def evaluate(
        self,
        response: str,
        context: str | None = None,
        use_deep_eval: bool = False,
    ) -> EvaluationResult:
        """Evaluate an AI response.

        Args:
            response: The AI-generated response to evaluate.
            context: Optional context (user query, knowledge context, etc.).
            use_deep_eval: If True, uses AI-powered evaluation via the orchestrator.

        Returns:
            EvaluationResult with scores and suggestions.
        """
        if not response or not response.strip():
            return EvaluationResult(
                overall_score=0.0,
                scores=[
                    EvaluationScore(
                        dimension="completeness",
                        score=0.0,
                        reasoning="Empty response",
                    )
                ],
                response_summary="Empty response",
                improvement_suggestions=["Response was empty"],
            )

        # Run all evaluation checks
        scores: list[EvaluationScore] = [
            _evaluate_length(response),
            _evaluate_citations(response),
            _evaluate_educational_quality(response),
        ]

        # Optionally run deep AI-powered evaluation
        if use_deep_eval:
            try:
                ai_scores = await self._deep_evaluate(response, context or "")
                scores.extend(ai_scores)
            except Exception as e:
                logger.warning(f"Deep evaluation failed: {e}")

        # Calculate overall score (weighted average)
        weights = {
            "completeness": 0.25,
            "citation_quality": 0.20,
            "educational_quality": 0.35,
            "accuracy": 0.20,
        }

        total_weight = 0.0
        weighted_sum = 0.0
        for s in scores:
            w = weights.get(s.dimension, 0.2)
            weighted_sum += s.score * w
            total_weight += w

        overall = weighted_sum / total_weight if total_weight > 0 else 0.0

        # Collect improvement suggestions
        all_suggestions: list[str] = []
        for s in scores:
            all_suggestions.extend(s.suggestions)

        # Generate response summary
        summary = response[:150].replace("\n", " ") + "..." if len(response) > 150 else response

        result = EvaluationResult(
            overall_score=round(overall, 3),
            scores=scores,
            response_summary=summary,
            improvement_suggestions=all_suggestions[:5],  # Top 5 suggestions
        )

        self._evaluation_history.append(result)
        return result

    async def _deep_evaluate(self, response: str, context: str) -> list[EvaluationScore]:
        """Use AI to perform deeper evaluation of response quality.

        This is experimental and currently disabled by default.
        """
        # TODO(v3): Implement AI-powered deep evaluation
        # This would use the orchestrator to have another AI model
        # evaluate the response for accuracy, clarity, and educational value.
        #
        # Example prompt:
        #   "Evaluate this educational response. Score each dimension 0-1:
        #    - accuracy: Is it factually correct?
        #    - clarity: Is it easy to understand?
        #    - educational_value: Does it teach effectively?
        #
        #    Response: {response}
        #    Context: {context}"
        return []

    def get_statistics(self) -> dict:
        """Get summary statistics of all evaluations."""
        if not self._evaluation_history:
            return {"total_evaluations": 0, "average_score": 0.0}

        scores = [r.overall_score for r in self._evaluation_history]
        return {
            "total_evaluations": len(scores),
            "average_score": sum(scores) / len(scores),
            "highest_score": max(scores),
            "lowest_score": min(scores),
        }


# Singleton
_evaluator: AIEvaluator | None = None


def get_evaluator() -> AIEvaluator:
    """Get or create the singleton AI evaluator."""
    global _evaluator
    if _evaluator is None:
        _evaluator = AIEvaluator()
    return _evaluator


async def evaluate_response(
    response: str,
    context: str | None = None,
) -> EvaluationResult:
    """Convenience function: evaluate a single AI response."""
    return await get_evaluator().evaluate(response, context=context)


__all__ = [
    "AIEvaluator",
    "EvaluationResult",
    "EvaluationScore",
    "evaluate_response",
    "get_evaluator",
]
