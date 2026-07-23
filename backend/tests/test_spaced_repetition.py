"""
Tests for the SM-2 Spaced Repetition Algorithm.

Covers all public functions in app.ai.spaced_repetition:
- calculate_quality() — quality scoring with correctness, hints, response time
- _calculate_next_interval() — SM-2 interval progression
- _determine_mastery_level() — mastery level mapping
- calculate_review_update() — full integration entry point
- calculate_confidence_score() — confidence from mastery state
- get_days_until_review() — days until/overdue calculation
"""

from datetime import UTC, datetime, timedelta

from app.ai.spaced_repetition import (
    _DEFAULT_EASE_FACTOR,
    _MIN_EASE_FACTOR,
    calculate_confidence_score,
    calculate_quality,
    calculate_review_update,
    get_days_until_review,
)


# ═══════════════════════════════════════════════════════════════
# calculate_quality
# ═══════════════════════════════════════════════════════════════


class TestCalculateQuality:
    """Tests for calculate_quality() — quality scoring."""

    def test_correct_no_hint_fast(self) -> None:
        """Correct answer with no hint and fast response → 5.0."""
        q = calculate_quality(correct=True, response_time_seconds=2.0, requested_hint=False)
        assert q == 5.0

    def test_correct_no_hint_moderate(self) -> None:
        """Correct answer within 15s → still 5.0 (no penalty under 15s)."""
        q = calculate_quality(correct=True, response_time_seconds=10.0, requested_hint=False)
        assert q == 5.0

    def test_correct_no_hint_hesitation(self) -> None:
        """Correct answer after 20s hesitation → 4.5."""
        q = calculate_quality(correct=True, response_time_seconds=20.0, requested_hint=False)
        assert q == 4.5

    def test_correct_no_hint_slow(self) -> None:
        """Correct answer after 45s → 4.0 (serious difficulty)."""
        q = calculate_quality(correct=True, response_time_seconds=45.0, requested_hint=False)
        assert q == 4.0

    def test_correct_with_hint_fast(self) -> None:
        """Correct with hint → 3.0 (5.0 - 2.0 hint penalty)."""
        q = calculate_quality(correct=True, response_time_seconds=2.0, requested_hint=True)
        assert q == 3.0

    def test_correct_with_hint_hesitation(self) -> None:
        """Correct with hint + hesitation → 2.5 (5.0 - 2.0 hint - 0.5 time)."""
        q = calculate_quality(correct=True, response_time_seconds=20.0, requested_hint=True)
        assert q == 2.5

    def test_correct_with_hint_slow(self) -> None:
        """Correct with hint + slow → 2.0 (5.0 - 2.0 hint - 1.0 time)."""
        q = calculate_quality(correct=True, response_time_seconds=45.0, requested_hint=True)
        assert q == 2.0

    def test_incorrect_no_hint(self) -> None:
        """Incorrect answer with no hint → 0.0 (complete blackout)."""
        q = calculate_quality(correct=False, response_time_seconds=None, requested_hint=False)
        assert q == 0.0

    def test_incorrect_after_hint(self) -> None:
        """Incorrect answer after hint → 1.0 (recalled after hint)."""
        q = calculate_quality(correct=False, response_time_seconds=None, requested_hint=True)
        assert q == 1.0

    def test_quality_clamped_at_zero(self) -> None:
        """Quality should never go below 0.0."""
        # Correct with hint and very slow → 5.0 - 2.0 - 1.0 = 2.0 (fine, but test edge)
        q = calculate_quality(correct=False, response_time_seconds=None, requested_hint=False)
        assert q >= 0.0

    def test_quality_clamped_at_five(self) -> None:
        """Quality should never exceed 5.0."""
        q = calculate_quality(correct=True, response_time_seconds=1.0, requested_hint=False)
        assert q <= 5.0

    def test_edge_response_time_boundaries(self) -> None:
        """Response time boundaries at exactly 15 and 30 seconds."""
        # Exactly 15s — no penalty (15 > 15 is False)
        q15 = calculate_quality(correct=True, response_time_seconds=15.0, requested_hint=False)
        assert q15 == 5.0

        # Exactly 30s — 0.5 penalty (30 > 15, but 30 > 30 is False)
        q30 = calculate_quality(correct=True, response_time_seconds=30.0, requested_hint=False)
        assert q30 == 4.5


# ═══════════════════════════════════════════════════════════════
# calculate_review_update (integration)
# ═══════════════════════════════════════════════════════════════


class TestCalculateReviewUpdate:
    """Tests for calculate_review_update() — full SM-2 integration."""

    def test_first_correct_review(self) -> None:
        """First correct review → 1d interval, practicing level, passed."""
        result = calculate_review_update(correct=True)
        assert result["quality"] == 5.0
        assert result["next_interval_days"] == 1
        assert result["new_mastery_level"] == "practicing"
        assert result["passed"] is True
        assert result["new_total_reviews"] == 1
        # Perfect quality (5.0) boosts ease factor: 2.5 + 0.1 = 2.6
        assert result["new_ease_factor"] == 2.6

    def test_first_incorrect_review(self) -> None:
        """First incorrect review → 1d interval, practicing, not passed, reps reset to 0."""
        result = calculate_review_update(correct=False)
        assert result["quality"] == 0.0
        assert result["next_interval_days"] == 1  # Reset to 1 day
        assert result["new_mastery_level"] == "practicing"
        assert result["passed"] is False
        # Classic SM-2: failure resets repetition count to 0
        assert result["new_total_reviews"] == 0

    def test_second_correct_review(self) -> None:
        """Second correct review → 6d interval, practicing."""
        result = calculate_review_update(
            correct=True,
            current_interval_days=1,
            current_ease_factor=2.5,
            total_reviews=1,
        )
        assert result["quality"] == 5.0
        assert result["next_interval_days"] == 6
        assert result["new_mastery_level"] == "practicing"
        assert result["new_total_reviews"] == 2

    def test_third_correct_review(self) -> None:
        """Third correct review → 15d (6 * 2.5), familiar (interval >= 7, reviews >= 3)."""
        result = calculate_review_update(
            correct=True,
            current_interval_days=6,
            current_ease_factor=2.5,
            total_reviews=2,
        )
        assert result["quality"] == 5.0
        assert result["next_interval_days"] == 15  # 6 * 2.5
        assert result["new_mastery_level"] == "familiar"
        assert result["new_total_reviews"] == 3

    def test_fourth_correct_review(self) -> None:
        """Fourth correct → 38d (round(15 * 2.5) = 38), familiar."""
        result = calculate_review_update(
            correct=True,
            current_interval_days=15,
            current_ease_factor=2.5,
            total_reviews=3,
        )
        assert result["quality"] == 5.0
        assert result["next_interval_days"] == 38  # round(15 * 2.5) = round(37.5) = 38
        assert result["new_mastery_level"] == "familiar"
        assert result["new_total_reviews"] == 4

    def test_mastered_review(self) -> None:
        """Five correct reviews with long interval → mastered."""
        result = calculate_review_update(
            correct=True,
            current_interval_days=37,
            current_ease_factor=2.5,
            total_reviews=4,
        )
        assert result["quality"] == 5.0
        assert result["next_interval_days"] >= 30  # 37 * 2.5 ≈ 92
        assert result["new_mastery_level"] == "mastered"
        assert result["new_total_reviews"] == 5

    def test_failed_review_resets_interval(self) -> None:
        """Failed review after progress resets interval to 1 day."""
        result = calculate_review_update(
            correct=False,
            current_interval_days=15,
            current_ease_factor=2.5,
            total_reviews=3,
        )
        assert result["quality"] == 0.0
        assert result["next_interval_days"] == 1  # Reset
        assert result["new_mastery_level"] == "practicing"
        assert result["passed"] is False

    def test_hinted_correct_review(self) -> None:
        """Correct with hint → quality ~3.0, interval still grows (passes ≥ 3.0)."""
        result = calculate_review_update(
            correct=True,
            requested_hint=True,
            response_time_seconds=2.0,
            current_interval_days=0,
            current_ease_factor=2.5,
            total_reviews=0,
        )
        assert result["quality"] == 3.0
        assert result["next_interval_days"] == 1  # First review
        assert result["passed"] is True

    def test_hesitation_correct_review(self) -> None:
        """Correct with hesitation → quality > 3, still passes."""
        result = calculate_review_update(
            correct=True,
            response_time_seconds=20.0,
            current_interval_days=1,
            current_ease_factor=2.5,
            total_reviews=1,
        )
        assert result["quality"] == 4.5
        assert result["passed"] is True
        assert result["next_interval_days"] == 6  # Second review interval

    def test_ease_factor_calculation(self) -> None:
        """Perfect quality should boost ease factor to 2.6."""
        result = calculate_review_update(correct=True)
        assert result["new_ease_factor"] == 2.6  # Quality 5.0 → +0.1 boost

        # Quality 4.0 (slow correct) keeps ease at 2.5
        result = calculate_review_update(
            correct=True,
            response_time_seconds=45.0,
            requested_hint=False,
        )
        assert result["new_ease_factor"] == 2.5  # Quality 4.0 → no net change

    def test_low_quality_fails(self) -> None:
        """Quality below 3.0 should not pass."""
        result = calculate_review_update(
            correct=True,
            response_time_seconds=45.0,
            requested_hint=True,
        )
        # 5.0 - 1.0 (slow) - 2.0 (hint) = 2.0
        assert result["quality"] == 2.0
        assert result["passed"] is False
        assert result["next_interval_days"] == 1  # Reset

    def test_next_review_at_is_future(self) -> None:
        """next_review_at should always be in the future for passed reviews."""
        now = datetime.now(UTC)
        result = calculate_review_update(correct=True, current_interval_days=6, total_reviews=2)
        assert result["next_review_at"] > now
        assert (result["next_review_at"] - now).days == result["next_interval_days"]

    def test_empty_consecutive_correct(self) -> None:
        """consecutive_correct=0 should still work."""
        result = calculate_review_update(correct=True, consecutive_correct=0, total_reviews=0)
        assert result["passed"] is True
        assert result["new_mastery_level"] == "practicing"


# ═══════════════════════════════════════════════════════════════
# calculate_confidence_score
# ═══════════════════════════════════════════════════════════════


class TestCalculateConfidenceScore:
    """Tests for calculate_confidence_score()."""

    def test_undiscovered_near_zero(self) -> None:
        """Undiscovered with default ease → ~0.03 (ease factor bonus)."""
        score = calculate_confidence_score("undiscovered", 2.5, 0)
        # 0.0 base + (2.5-1.3)/(5.0-1.3) * 0.1 ease bonus = 0.03
        assert score == 0.03

    def test_introduced_low(self) -> None:
        """Introduced with ease 2.5 → 0.23 (0.2 base + 0.032 ease bonus)."""
        score = calculate_confidence_score("introduced", 2.5, 0)
        # 0.2 + 0.324 * 0.1 = 0.232 → 0.23
        assert score == 0.23

    def test_practicing_medium(self) -> None:
        """Practicing with ease 2.5, streak 1 → 0.48."""
        score = calculate_confidence_score("practicing", 2.5, 1)
        # 0.4 + 0.324 * 0.1 + 0.05 = 0.482 → 0.48
        assert score == 0.48

    def test_familiar_high(self) -> None:
        """Familiar with ease 2.5, streak 3 → 0.78."""
        score = calculate_confidence_score("familiar", 2.5, 3)
        # 0.6 + 0.324 * 0.1 + 0.15 = 0.782 → 0.78
        assert score == 0.78

    def test_mastered_max(self) -> None:
        """Mastered with perfect ease and streak → 1.0 (clamped)."""
        score = calculate_confidence_score("mastered", 2.5, 5)
        # 0.85 + 0.032 + 0.15 = 1.032 → clamped to 1.0
        assert score == 1.0

    def test_high_ease_factor_boosts(self) -> None:
        """Higher ease factor should boost confidence."""
        low_ease = calculate_confidence_score("practicing", _MIN_EASE_FACTOR, 0)
        high_ease = calculate_confidence_score("practicing", 2.5, 0)
        assert high_ease > low_ease

    def test_streak_bonus_capped(self) -> None:
        """Streak bonus capped at 0.15, ease bonus adds 0.032."""
        score = calculate_confidence_score("familiar", 2.5, 10)
        # 0.6 + 0.324 * 0.1 + 0.15 = 0.782 → 0.78
        assert score == 0.78

    def test_unknown_mastery_defaults(self) -> None:
        """Unknown mastery level → 0.0 base + ease bonus."""
        score = calculate_confidence_score("unknown_level", 2.5, 0)
        # 0.0 + 0.324 * 0.1 + 0 = 0.032 → 0.03
        assert score == 0.03

    def test_score_clamped_at_one(self) -> None:
        """Confidence should never exceed 1.0."""
        score = calculate_confidence_score("mastered", 5.0, 100)
        assert score <= 1.0


# ═══════════════════════════════════════════════════════════════
# get_days_until_review
# ═══════════════════════════════════════════════════════════════


class TestGetDaysUntilReview:
    """Tests for get_days_until_review()."""

    def test_none_returns_none(self) -> None:
        """None input should return None."""
        assert get_days_until_review(None) is None

    def test_future_review_positive(self) -> None:
        """Future review date should return positive days."""
        future = datetime.now(UTC) + timedelta(days=5)
        days = get_days_until_review(future)
        assert days is not None
        assert days >= 4  # At least 4 (could be 4 or 5 depending on time)

    def test_past_review_negative(self) -> None:
        """Past review date should return negative days (overdue)."""
        past = datetime.now(UTC) - timedelta(days=3)
        days = get_days_until_review(past)
        assert days is not None
        assert days <= -2  # At most -2 (could be -2 or -3 depending on time)

    def test_review_due_now(self) -> None:
        """Review due now should return 0 (with small buffer)."""
        now = datetime.now(UTC)
        # Use now + 1s to avoid microsecond-race flakiness
        near_future = now + timedelta(seconds=1)
        days = get_days_until_review(near_future)
        assert days is not None
        assert days == 0  # Same calendar day

    def test_naive_datetime_converted(self) -> None:
        """Naive datetime should be treated as UTC."""
        naive = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=2)
        days = get_days_until_review(naive)
        assert days is not None
        assert days >= 1  # At least 1 day away

    def test_aware_datetime(self) -> None:
        """Aware datetime should work as expected."""
        aware = datetime.now(UTC) + timedelta(days=10)
        days = get_days_until_review(aware)
        assert days is not None
        assert days >= 9  # At least 9 days away

    def test_one_day_ahead(self) -> None:
        """1+ day in the future → at least 1 day until review."""
        future = datetime.now(UTC) + timedelta(days=1, hours=6)  # 30h → safely >1 day
        days = get_days_until_review(future)
        assert days is not None
        assert days >= 1


# ═══════════════════════════════════════════════════════════════
# Edge Cases & Integration
# ═══════════════════════════════════════════════════════════════


class TestEdgeCases:
    """Tests for edge cases and full integration scenarios."""

    def test_new_user_zero_reviews(self) -> None:
        """A brand new user with no history should get sensible defaults."""
        result = calculate_review_update(correct=True)
        assert result["passed"] is True
        assert result["next_interval_days"] == 1
        assert isinstance(result["quality"], float)
        assert result["new_mastery_level"] in ("introduced", "practicing")

    def test_full_sm2_progression(self) -> None:
        """Simulate a concept through 6 correct reviews and verify progression."""
        intervals = []
        mastery_levels = []
        ease_factors = []
        ease = _DEFAULT_EASE_FACTOR
        interval = 0
        reviews = 0

        for i in range(6):
            result = calculate_review_update(
                correct=True,
                current_interval_days=interval,
                current_ease_factor=ease,
                total_reviews=reviews,
            )
            interval = result["next_interval_days"]
            ease = result["new_ease_factor"]
            reviews = result["new_total_reviews"]
            intervals.append(interval)
            mastery_levels.append(result["new_mastery_level"])
            ease_factors.append(ease)

        # Each perfect review boosts ease by 0.1: 2.5 → 2.6 → 2.7 → 2.8...
        assert ease_factors == [2.6, 2.7, 2.8, 2.9, 3.0, 3.1]

        # SM-2 progression with growing ease factor:
        # iter 0: rep=0  → 1d
        # iter 1: rep=1  → 6d
        # iter 2: rep=2  → round(6 * 2.7)   = 16
        # iter 3: rep=3  → round(16 * 2.8)   = 45
        # iter 4: rep=4  → round(45 * 2.9)   = 130
        # iter 5: rep=5  → round(130 * 3.0)  = 390
        assert intervals[0] == 1
        assert intervals[1] == 6
        assert intervals[2] == 16  # round(6 * 2.7) = round(16.2) = 16
        assert intervals[3] == 45  # round(16 * 2.8) = round(44.8) = 45
        assert intervals[4] == 130  # round(45 * 2.9) = round(130.5) = 130
        assert intervals[5] >= 30  # Even longer (390)

        # Mastery should progress from practicing → familiar → mastered
        assert "practicing" in mastery_levels[:3]
        assert "familiar" in mastery_levels[2:5]
        assert mastery_levels[4] == "mastered" or mastery_levels[5] == "mastered"

    def test_fail_then_recover(self) -> None:
        """After failing a review, interval resets to 1d and rep count resets to 0."""
        # First, fail — classic SM-2: interval resets to 1d, reps reset to 0
        fail_result = calculate_review_update(correct=False, total_reviews=3, current_interval_days=15)
        assert fail_result["next_interval_days"] == 1
        assert fail_result["new_total_reviews"] == 0  # Classic SM-2: reps reset on failure

        # Recover: rep count 0 → first-review formula: 1 day
        recover_result = calculate_review_update(
            correct=True,
            current_interval_days=fail_result["next_interval_days"],
            current_ease_factor=fail_result["new_ease_factor"],
            total_reviews=fail_result["new_total_reviews"],
        )
        assert recover_result["quality"] == 5.0
        assert recover_result["next_interval_days"] == 1  # First-review: 1 day
        assert recover_result["new_mastery_level"] == "practicing"

    def test_barely_passing_vs_perfect(self) -> None:
        """Barely passing (quality=3.0) vs perfect (quality=5.0) should differ in ease."""
        # Hinted correct = quality 3.0
        barely = calculate_review_update(
            correct=True, requested_hint=True,
            response_time_seconds=2.0,
            current_interval_days=6, total_reviews=2,
        )
        # Perfect
        perfect = calculate_review_update(
            correct=True, requested_hint=False,
            response_time_seconds=1.0,
            current_interval_days=6, total_reviews=2,
        )

        assert barely["passed"] is True
        # Quality 3.0 should decrease ease factor below 2.5
        assert barely["new_ease_factor"] < 2.5
        # Perfect (5.0) should boost ease to 2.6
        assert perfect["new_ease_factor"] == 2.6

    def test_quality_too_low_fails(self) -> None:
        """Quality below 3.0 threshold should not be a pass."""
        # Correct + slow + hint = quality 2.0
        result = calculate_review_update(
            correct=True,
            response_time_seconds=45.0,
            requested_hint=True,
        )
        assert result["passed"] is False
        assert result["next_interval_days"] == 1  # Reset

    def test_many_reviews_high_mastery(self) -> None:
        """After many successful reviews with long intervals, should reach mastered."""
        result = calculate_review_update(
            correct=True,
            current_interval_days=92,
            current_ease_factor=2.5,
            total_reviews=5,
        )
        assert result["new_mastery_level"] == "mastered"
        assert result["next_interval_days"] >= 30
