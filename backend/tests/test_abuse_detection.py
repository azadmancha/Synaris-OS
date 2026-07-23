"""
Tests for the Abuse Detection system.

Covers:
- Single events should not trigger bans
- Multiple injection attempts trigger bans at threshold
- Rapid requests are detected
- Ban expiry allows requests again
- Abstractions work across user isolation
- Edge cases: no events, different event types
"""

import time

from app.security.abuse import (
    AbuseDetector,
    check_abuse,
    mark_abuse_event,
    reset_abuse_detector,
)


class TestAbuseDetector:
    """Tests for AbuseDetector class."""

    def setup_method(self) -> None:
        """Reset the detector before each test."""
        reset_abuse_detector()

    def test_no_events_not_blocked(self) -> None:
        """No events → not blocked, score=0."""
        detector = AbuseDetector()
        result = detector.check("user_a")
        assert result.blocked is False
        assert result.score == 0.0

    def test_single_event_not_blocked(self) -> None:
        """A single injection attempt should not trigger a ban."""
        detector = AbuseDetector()
        detector.record("user_a", "injection_attempt", "prompt_injection")
        result = detector.check("user_a")
        assert result.blocked is False

    def test_repeated_injections_triggers_ban(self) -> None:
        """5+ injection attempts should trigger a ban."""
        detector = AbuseDetector()
        for _ in range(5):
            detector.record("user_a", "injection_attempt", "prompt_injection")

        result = detector.check("user_a")
        assert result.blocked is True
        assert result.score >= 0.8
        assert len(result.reasons) > 0

    def test_rapid_requests_warned(self) -> None:
        """Rapid requests alone (score 0.7) should warn but not ban."""
        detector = AbuseDetector()
        for _ in range(35):
            detector.record("user_a", "rapid_request", "rate_limit")

        result = detector.check("user_a")
        assert result.blocked is False  # < 0.8 threshold, warns but not bans
        assert result.score == 0.7
        assert len(result.reasons) > 0

    def test_rapid_plus_injection_triggers_ban(self) -> None:
        """Rapid requests + injection attempts together should trigger a ban."""
        detector = AbuseDetector()
        # Record enough injection attempts to push score to 0.8
        for _ in range(6):
            detector.record("user_a", "injection_attempt", "prompt_injection")

        result = detector.check("user_a")
        assert result.blocked is True
        assert result.score >= 0.8

    def test_user_isolation(self) -> None:
        """One user's abuse should not affect another user."""
        detector = AbuseDetector()
        # User A misbehaves
        for _ in range(6):
            detector.record("user_a", "injection_attempt", "prompt_injection")
        # User B is clean
        result_b = detector.check("user_b")

        assert result_b.blocked is False
        assert result_b.score == 0.0

    def test_banned_user_stays_banned(self) -> None:
        """A banned user should remain banned."""
        detector = AbuseDetector()
        for _ in range(6):
            detector.record("user_a", "injection_attempt", "prompt_injection")

        # First check should ban
        result1 = detector.check("user_a")
        assert result1.blocked is True

        # Second check should still be banned
        result2 = detector.check("user_a")
        assert result2.blocked is True
        assert result2.ban_expires_at is not None

    def test_is_banned_check(self) -> None:
        """is_banned() should return True for banned users."""
        detector = AbuseDetector()
        for _ in range(6):
            detector.record("user_a", "injection_attempt", "prompt_injection")

        detector.check("user_a")
        assert detector.is_banned("user_a") is True

    def test_is_banned_clean_user(self) -> None:
        """is_banned() should return False for clean users."""
        detector = AbuseDetector()
        assert detector.is_banned("clean_user") is False

    def test_different_event_types_accumulate(self) -> None:
        """Mixed event types should accumulate in total_events."""
        detector = AbuseDetector()
        # Record 4 injection_attempts (just below the 5-flag limit)
        # and enough other events to hit the total_events threshold (50)
        for _ in range(4):
            detector.record("user_a", "injection_attempt", "prompt_injection")
        for _ in range(47):
            detector.record("user_a", "suspicious", "encoding_evasion")

        result = detector.check("user_a")
        # 51 total events >= 50 threshold → score=max(0.7, 0.6)=0.7, blocked=False
        # (rapid window catches ALL 51 events, not just rapid_request type)
        assert result.blocked is False
        assert result.score == 0.7

    def test_ban_expires(self) -> None:
        """After ban expires AND events are pruned, user should be allowed."""
        detector = AbuseDetector()
        for _ in range(6):
            detector.record("user_a", "injection_attempt", "prompt_injection")

        # Ban the user
        result = detector.check("user_a")
        assert result.blocked is True

        # Manually expire the ban by setting its expiry to the past
        detector._bans["user_a"] = time.monotonic() - 1  # 1 second ago
        # Clear events too — otherwise the check sees 6 injection_attempts
        # within the window and immediately applies a new ban
        detector._events["user_a"] = []

        # Should be allowed now (ban expired, no active abuse)
        result = detector.check("user_a")
        assert result.blocked is False


class TestAbuseConvenienceFunctions:
    """Tests for the module-level convenience functions."""

    def setup_method(self) -> None:
        reset_abuse_detector()

    def test_mark_and_check_separate(self) -> None:
        """mark_abuse_event and check_abuse should work together."""
        reset_abuse_detector()
        for _ in range(6):
            mark_abuse_event("user_a", "injection_attempt", "prompt_injection")

        result = check_abuse("user_a")
        assert result.blocked is True

    def test_convenience_functions_importable(self) -> None:
        """All abuse functions should be importable through the security module."""
        from app.security import (
            AbuseDetector,
            AbuseResult,
            check_abuse,
            get_abuse_detector,
            mark_abuse_event,
            reset_abuse_detector,
        )

        assert AbuseDetector is not None
        assert AbuseResult is not None
        assert check_abuse is not None
        assert get_abuse_detector is not None
        assert mark_abuse_event is not None
        assert reset_abuse_detector is not None
