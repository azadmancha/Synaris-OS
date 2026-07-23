"""
Spaced Repetition Engine — SM-2 Algorithm.

Part of the Long-Term Memory system (Phase 3).
Calculates optimal review intervals using the SM-2 algorithm
(SuperMemo 2 by Piotr Wozniak).

The engine determines:
- When to next review a concept (next_review_at)
- How the mastery level should evolve based on performance
- The quality score from a review session

SM-2 Algorithm Parameters:
    Quality (0-5):
        0 = Complete blackout
        1 = Incorrect; correct answer remembered upon seeing it
        2 = Incorrect; correct answer seemed easy to recall
        3 = Correct with serious difficulty
        4 = Correct after hesitation
        5 = Perfect response

    Interval calculation:
        First review:  1 day
        Second review:  6 days
        Subsequent:    previous_interval * ease_factor
        Where ease_factor defaults to 2.5, min 1.3
"""

import logging
from datetime import UTC, datetime, timedelta

logger = logging.getLogger(__name__)

# ─── SM-2 Constants ──────────────────────────────────────

_DEFAULT_EASE_FACTOR = 2.5
_MIN_EASE_FACTOR = 1.3
_MAX_EASE_FACTOR = 5.0

# Intervals in days for first two reviews
_FIRST_INTERVAL_DAYS = 1
_SECOND_INTERVAL_DAYS = 6

# Quality threshold for passing a review
_PASS_QUALITY = 3.0

# ─── SM-2 Algorithm ──────────────────────────────────────


def calculate_quality(
    correct: bool,
    response_time_seconds: float | None = None,
    requested_hint: bool = False,
) -> float:
    """Calculate a quality score (0.0–5.0) from a single review.

    Uses a blend of correctness, response time, and whether hints
    were needed to derive an SM-2-compatible quality score.

    Args:
        correct: Whether the user answered correctly.
        response_time_seconds: How long the user took to respond (optional).
        requested_hint: Whether the user needed a hint.

    Returns:
        Quality score from 0.0 to 5.0.
    """
    if not correct:
        # Completely incorrect
        if requested_hint:
            return 1.0  # Recalled after hint
        return 0.0  # Complete blackout

    # Correct — start at 5.0 and penalize
    quality = 5.0

    # Penalize for hints
    if requested_hint:
        quality -= 2.0  # Correct but needed a hint → ~3.0

    # Penalize for slow response time
    if response_time_seconds is not None:
        if response_time_seconds > 30:
            quality -= 1.0  # Correct with serious difficulty
        elif response_time_seconds > 15:
            quality -= 0.5  # Correct after hesitation

    return max(0.0, min(5.0, quality))


def _calculate_next_interval(
    interval_days: int,
    ease_factor: float,
    quality: float,
    repetition_count: int,
) -> tuple[int, float]:
    """Calculate the next review interval using the SM-2 algorithm.

    Args:
        interval_days: The current interval in days (0 for new).
        ease_factor: The current ease factor (default 2.5).
        quality: The quality score for this review (0.0–5.0).
        repetition_count: How many times this concept has been reviewed.

    Returns:
        Tuple of (next_interval_days, new_ease_factor).
    """
    # Determine if the review was a pass or fail
    passed = quality >= _PASS_QUALITY

    if not passed:
        # Reset repetitions — user needs to re-learn
        return _FIRST_INTERVAL_DAYS, ease_factor

    # Passed — calculate next interval
    if repetition_count == 0:
        next_interval = _FIRST_INTERVAL_DAYS
    elif repetition_count == 1:
        next_interval = _SECOND_INTERVAL_DAYS
    else:
        # Subsequent reviews: interval * ease_factor (always >= 1)
        next_interval = round(interval_days * ease_factor)

    # Update ease factor (SM-2 formula)
    new_ease = ease_factor + (0.1 - (5.0 - quality) * (0.08 + (5.0 - quality) * 0.02))
    new_ease = max(_MIN_EASE_FACTOR, min(_MAX_EASE_FACTOR, new_ease))

    return next_interval, new_ease


def _determine_mastery_level(
    quality: float,
    total_reviews: int,
    interval_days: int,
) -> str:
    """Determine the mastery level based on review performance.

    Uses a progression model based on review interval rather than
    consecutive correct count (which isn't persisted separately):
        discovered → introduced → practicing → familiar → mastered

    The interval serves as a proxy for streak because SM-2 only
    extends intervals on consecutive correct answers.

    Args:
        quality: The quality score (0.0–5.0).
        total_reviews: Total number of reviews performed.
        interval_days: The NEW interval that was calculated.
    """
    if quality < _PASS_QUALITY:
        return "practicing"

    # Interval is the best proxy for mastery: SM-2 only grows intervals
    # on consecutive correct answers, so longer interval = more mastered
    if interval_days >= 30 and total_reviews >= 5 and quality >= 4.0:
        return "mastered"
    elif interval_days >= 7 and total_reviews >= 3:
        return "familiar"
    elif total_reviews >= 1:
        return "practicing"
    else:
        return "introduced"


def calculate_review_update(
    correct: bool,
    current_mastery_level: str = "introduced",
    current_interval_days: int = 0,
    current_ease_factor: float = _DEFAULT_EASE_FACTOR,
    consecutive_correct: int = 0,
    total_reviews: int = 0,
    response_time_seconds: float | None = None,
    requested_hint: bool = False,
) -> dict:
    """Calculate the full update for a concept after a review.

    This is the main entry point for the spaced repetition engine.
    It combines quality calculation, interval computation, and
    mastery level determination into one call.

    Args:
        correct: Whether the user answered correctly.
        current_mastery_level: Current mastery level string.
        current_interval_days: Current review interval in days.
        current_ease_factor: Current SM-2 ease factor.
        consecutive_correct: Current streak of correct reviews.
        total_reviews: Total number of reviews so far.
        response_time_seconds: Optional response time for quality scoring.
        requested_hint: Whether the user needed a hint.

    Returns:
        Dict with:
            quality: float (0.0–5.0)
            next_interval_days: int
            new_ease_factor: float
            new_mastery_level: str
            new_consecutive_correct: int
            new_total_reviews: int
            next_review_at: datetime
            passed: bool
    """
    quality = calculate_quality(correct, response_time_seconds, requested_hint)
    passed = quality >= _PASS_QUALITY

    # Classic SM-2: on failure, reset repetition count to 0
    if not passed:
        new_total = 0
    else:
        new_total = total_reviews + 1

    next_interval_days, new_ease_factor = _calculate_next_interval(
        interval_days=current_interval_days,
        ease_factor=current_ease_factor,
        quality=quality,
        repetition_count=total_reviews,
    )

    new_mastery = _determine_mastery_level(
        quality=quality,
        total_reviews=new_total,
        interval_days=next_interval_days,
    )

    # Calculate next review datetime
    next_review_at = datetime.now(UTC) + timedelta(days=next_interval_days)

    return {
        "quality": round(quality, 2),
        "next_interval_days": next_interval_days,
        "new_ease_factor": round(new_ease_factor, 2),
        "new_mastery_level": new_mastery,
        "new_total_reviews": new_total,
        "next_review_at": next_review_at,
        "passed": passed,
    }


def calculate_confidence_score(
    mastery_level: str,
    ease_factor: float,
    consecutive_correct: int,
) -> float:
    """Calculate a confidence score (0.0–1.0) from mastery state.

    Used for the ConceptMastery.confidence_score field.
    Higher is more confident.

    Args:
        mastery_level: Current mastery level string.
        ease_factor: SM-2 ease factor.
        consecutive_correct: Consecutive correct reviews.

    Returns:
        Confidence score from 0.0 to 1.0.
    """
    mastery_base = {
        "undiscovered": 0.0,
        "introduced": 0.2,
        "practicing": 0.4,
        "familiar": 0.6,
        "mastered": 0.85,
    }.get(mastery_level, 0.0)

    # Ease factor contributes: 2.5 → 1.0, 1.3 → 0.5
    ease_norm = (ease_factor - _MIN_EASE_FACTOR) / (_MAX_EASE_FACTOR - _MIN_EASE_FACTOR)

    # Consecutive correct contributes incrementally
    streak_bonus = min(consecutive_correct * 0.05, 0.15)

    score = mastery_base + (ease_norm * 0.1) + streak_bonus
    return min(1.0, round(score, 2))


def get_days_until_review(next_review_at: datetime | None) -> int | None:
    """Calculate days until the next review is due.

    Negative means the review is overdue.

    Args:
        next_review_at: The datetime of the next scheduled review.

    Returns:
        Number of days until review (negative if overdue), or None.
    """
    if next_review_at is None:
        return None

    now = datetime.now(UTC)
    if next_review_at.tzinfo is None:
        next_review_at = next_review_at.replace(tzinfo=UTC)

    delta = next_review_at - now
    return delta.days
