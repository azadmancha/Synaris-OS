"""
Rate Limiter — per-user request rate limiting.

Implements a sliding window rate limiter using an in-memory dictionary.
This is suitable for single-instance deployments and development.
For production multi-instance deployments, replace with Redis-based
rate limiting.

The rate limit configuration comes from the existing settings:
    rate_limit_requests: int = 60   (max requests per window)
    rate_limit_window: int = 60     (window in seconds)

Usage:
    from app.security.rate_limit import rate_limiter

    result = await rate_limiter.check(user_id)
    if result.blocked:
        raise HTTPException(status_code=429, detail=result.message)
"""

import json
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from app.infrastructure.config import settings

logger = logging.getLogger(__name__)


# ─── Types ───────────────────────────────────────────────────

@dataclass
class RateLimitResult:
    """Result of a rate limit check."""
    blocked: bool = False
    remaining: int = 0
    reset_at: float = 0.0
    message: str = ""

    @classmethod
    def allowed(cls, remaining: int, reset_at: float) -> "RateLimitResult":
        return cls(blocked=False, remaining=remaining, reset_at=reset_at)

    @classmethod
    def denied(cls, reset_at: float) -> "RateLimitResult":
        return cls(
            blocked=True,
            remaining=0,
            reset_at=reset_at,
            message="Too many requests. Please slow down and try again in a moment.",
        )


# ─── Sliding Window Rate Limiter ──────────────────────────────

class SlidingWindowRateLimiter:
    """Sliding window rate limiter using in-memory timestamps.

    Each user's request timestamps are stored in a dict. Old timestamps
    outside the window are pruned on each check. This is O(n) in the
    number of requests per window per user, which is fine for moderate
    traffic (60 requests/window = 60 entries at most).
    """

    def __init__(
        self,
        max_requests: int | None = None,
        window_seconds: int | None = None,
    ):
        self._max_requests = max_requests if max_requests is not None else settings.rate_limit_requests
        self._window = window_seconds if window_seconds is not None else settings.rate_limit_window
        # user_id -> list of timestamps
        self._buckets: dict[str, list[float]] = defaultdict(list)
        # Last cleanup time (avoids scanning entire dict on every request)
        self._last_cleanup: float = time.monotonic()

    @property
    def max_requests(self) -> int:
        return self._max_requests

    @property
    def window_seconds(self) -> int:
        return self._window

    async def check(self, user_id: str) -> RateLimitResult:
        """Check if a user has exceeded their rate limit.

        Args:
            user_id: Unique identifier for the user (UUID string).

        Returns:
            RateLimitResult with blocked status and remaining count.
        """
        now = time.monotonic()
        window_start = now - self._window

        # Periodically clean up stale entries (every 10th check)
        self._maybe_cleanup(now)

        # Handle zero-limit edge case (blocks everything immediately)
        if self._max_requests <= 0:
            return RateLimitResult.denied(reset_at=now + self._window)

        # Get and prune the user's request history
        timestamps = self._buckets[user_id]
        # Keep only timestamps within the current window
        self._buckets[user_id] = [t for t in timestamps if t > window_start]

        # Update after pruning
        timestamps = self._buckets[user_id]

        if len(timestamps) >= self._max_requests:
            # Rate limited — calculate when the window resets
            # (oldest timestamp + window duration)
            oldest = min(timestamps)
            reset_at = oldest + self._window
            retry_after = max(0, reset_at - now)

            logger.warning(
                "Rate limit exceeded for user %s: %d requests in %ds window, "
                "retry after %.1fs",
                user_id[:12],
                len(timestamps),
                self._window,
                retry_after,
            )

            return RateLimitResult.denied(reset_at=reset_at)

        # Record this request
        timestamps.append(now)

        return RateLimitResult.allowed(
            remaining=self._max_requests - len(timestamps),
            reset_at=now + self._window,
        )

    def _maybe_cleanup(self, now: float):
        """Periodically clean up stale entries from all buckets."""
        # Cleanup every ~10 seconds to avoid excessive scanning
        if now - self._last_cleanup < 10.0:
            return

        self._last_cleanup = now
        window_start = now - self._window
        stale_users = []

        for user_id, timestamps in self._buckets.items():
            # Keep only recent timestamps
            fresh = [t for t in timestamps if t > window_start]
            if fresh:
                self._buckets[user_id] = fresh
            else:
                stale_users.append(user_id)

        # Remove users with no recent activity
        for user_id in stale_users:
            del self._buckets[user_id]

    def get_remaining(self, user_id: str) -> int:
        """Get the number of requests remaining for a user (without consuming)."""
        now = time.monotonic()
        window_start = now - self._window
        timestamps = [t for t in self._buckets.get(user_id, []) if t > window_start]
        return max(0, self._max_requests - len(timestamps))


# Singleton
_limiter: SlidingWindowRateLimiter | None = None


def get_rate_limiter() -> SlidingWindowRateLimiter:
    """Get or create the singleton rate limiter."""
    global _limiter
    if _limiter is None:
        _limiter = SlidingWindowRateLimiter()
    return _limiter


def reset_rate_limiter():
    """Reset the rate limiter (for testing)."""
    global _limiter
    _limiter = None


__all__ = [
    "RateLimitResult",
    "SlidingWindowRateLimiter",
    "get_rate_limiter",
    "reset_rate_limiter",
]
