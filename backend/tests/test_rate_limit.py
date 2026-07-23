"""
Unit tests for the Rate Limiter.

Tests the SlidingWindowRateLimiter class directly (not via API)
for correctness of the sliding window algorithm.

Covers:
- Basic allow/deny behavior
- Window sliding
- Cleanup of stale entries
- Configurable limits
- Edge cases
"""
import asyncio
import time

import pytest

from app.security.rate_limit import SlidingWindowRateLimiter, reset_rate_limiter


@pytest.fixture(autouse=True)
def reset():
    """Reset the rate limiter singleton before each test."""
    reset_rate_limiter()
    yield


class TestRateLimiterBasics:
    """Basic tests for the rate limiter."""

    @pytest.mark.asyncio
    async def test_first_request_allowed(self) -> None:
        """The first request from a user should always be allowed."""
        limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60)
        result = await limiter.check("user-1")
        assert result.blocked is False
        assert result.remaining == 9

    @pytest.mark.asyncio
    async def test_within_limit_allows_requests(self) -> None:
        """Requests within the limit should be allowed."""
        limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=60)

        for i in range(5):
            result = await limiter.check("user-1")
            assert result.blocked is False, f"Request {i+1} should be allowed"
            assert result.remaining == 5 - (i + 1)

    @pytest.mark.asyncio
    async def test_exceeding_limit_blocks(self) -> None:
        """Requests exceeding the limit should be blocked."""
        limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=60)

        for _ in range(3):
            await limiter.check("user-1")

        result = await limiter.check("user-1")
        assert result.blocked is True
        assert result.remaining == 0

    @pytest.mark.asyncio
    async def test_different_users_have_independent_limits(self) -> None:
        """Different users should have independent rate limits."""
        limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=60)

        # User A uses 2 requests
        await limiter.check("user-a")
        await limiter.check("user-a")

        # User A should be blocked
        assert (await limiter.check("user-a")).blocked is True

        # User B should still have 2 requests
        assert (await limiter.check("user-b")).blocked is False
        assert (await limiter.check("user-b")).blocked is False

        # User B's third request should be blocked
        assert (await limiter.check("user-b")).blocked is True


class TestRateLimiterWindow:
    """Tests for the sliding window behavior."""

    @pytest.mark.asyncio
    async def test_window_slides_allowing_new_requests(self) -> None:
        """After the window passes, new requests should be allowed."""
        limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=0.1)

        await limiter.check("user-1")
        await limiter.check("user-1")
        assert (await limiter.check("user-1")).blocked is True

        # Wait for window to pass
        await _wait(0.15)

        # Should be allowed again
        result = await limiter.check("user-1")
        assert result.blocked is False

    @pytest.mark.asyncio
    async def test_old_requests_expire_from_window(self) -> None:
        """Old requests outside the window should not count."""
        limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=0.1)

        # Make 2 requests, wait, then make 3 more (exhaust limit)
        await limiter.check("user-1")
        await limiter.check("user-1")

        await _wait(0.15)

        # Old requests expired; make 3 to exhaust the new window
        assert (await limiter.check("user-1")).blocked is False  # 1st in window
        assert (await limiter.check("user-1")).blocked is False  # 2nd in window
        assert (await limiter.check("user-1")).blocked is False  # 3rd in window

        # 4th post-wait request should be blocked (3 requests in current window)
        result = await limiter.check("user-1")
        assert result.blocked is True


class TestRateLimiterConfig:
    """Tests for configurable rate limiter parameters."""

    @pytest.mark.asyncio
    async def test_custom_max_requests(self) -> None:
        """Should respect custom max_requests."""
        limiter = SlidingWindowRateLimiter(max_requests=100, window_seconds=60)
        for _ in range(100):
            await limiter.check("user-1")
        # 101st request should be blocked
        assert (await limiter.check("user-1")).blocked is True

    @pytest.mark.asyncio
    async def test_very_restrictive_limit(self) -> None:
        """Should work with very restrictive limits."""
        limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
        assert (await limiter.check("user-1")).blocked is False
        assert (await limiter.check("user-1")).blocked is True

    @pytest.mark.asyncio
    async def test_zero_limit_blocks_everything(self) -> None:
        """A limit of zero should block all requests."""
        limiter = SlidingWindowRateLimiter(max_requests=0, window_seconds=60)
        result = await limiter.check("user-1")
        assert result.blocked is True

    @pytest.mark.asyncio
    async def test_properties_are_correct(self) -> None:
        """Properties should return the configured values."""
        limiter = SlidingWindowRateLimiter(max_requests=42, window_seconds=99)
        assert limiter.max_requests == 42
        assert limiter.window_seconds == 99


class TestRateLimiterCleanup:
    """Tests for stale entry cleanup."""

    @pytest.mark.asyncio
    async def test_stale_users_are_cleaned(self) -> None:
        """Users with no recent activity should be cleaned up.

        Note: _maybe_cleanup has a 10-second guard clause (avoids excessive scanning).
        We set _last_cleanup = 0 to bypass it and verify the cleanup logic.
        """
        limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=0.05)

        await limiter.check("stale-user")
        assert "stale-user" in limiter._buckets

        # Wait for window to pass
        await _wait(0.15)

        # Bypass the 10-second guard clause and trigger cleanup
        limiter._last_cleanup = 0
        limiter._maybe_cleanup(time.monotonic())

        assert "stale-user" not in limiter._buckets

    @pytest.mark.asyncio
    async def test_active_users_persist_after_cleanup(self) -> None:
        """Active users should not be cleaned up."""
        limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=60)

        await limiter.check("active-user")
        await limiter.check("other-user")

        limiter._maybe_cleanup(time.monotonic())

        assert "active-user" in limiter._buckets
        assert "other-user" in limiter._buckets


class TestRateLimiterEdgeCases:
    """Edge cases for the rate limiter."""

    @pytest.mark.asyncio
    async def test_empty_user_id(self) -> None:
        """Should handle empty user IDs."""
        limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=60)
        result = await limiter.check("")
        assert result.blocked is False

    @pytest.mark.asyncio
    async def test_get_remaining_without_consuming(self) -> None:
        """get_remaining should not consume a request."""
        limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60)

        await limiter.check("user-1")
        remaining = limiter.get_remaining("user-1")
        assert remaining == 9

        # get_remaining should not have consumed a request
        remaining_again = limiter.get_remaining("user-1")
        assert remaining_again == 9

    @pytest.mark.asyncio
    async def test_many_users_dont_interfere(self) -> None:
        """Many different users should not interfere with each other."""
        limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=60)
        for i in range(100):
            user_id = f"user-{i}"
            result = await limiter.check(user_id)
            assert result.blocked is False
            assert result.remaining == 2


async def _wait(seconds: float) -> None:
    """Helper to wait asynchronously."""
    await asyncio.sleep(seconds)
