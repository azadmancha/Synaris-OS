"""Simple in-memory cache for Knowledge Engine queries.

Provides a TTL-based cache to avoid redundant Wikipedia lookups
for the same query within a short window.
"""

import time
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class MemoryCache:
    """Simple in-memory cache with TTL support.

    Uses a dict with expiration timestamps.
    Not suitable for multi-process deployments (use Redis in prod).
    """

    def __init__(self, default_ttl: int = 300):
        self._default_ttl = default_ttl
        self._store: dict[str, tuple[float, Any]] = {}

    async def get(self, key: str) -> Any | None:
        """Get a value from cache. Returns None if missing or expired."""
        entry = self._store.get(key)
        if entry is None:
            return None

        expires_at, value = entry
        if time.monotonic() > expires_at:
            del self._store[key]
            return None

        return value

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Set a value in cache with optional TTL (default: 5 min)."""
        expires_at = time.monotonic() + (ttl if ttl is not None else self._default_ttl)
        self._store[key] = (expires_at, value)

    async def delete(self, key: str) -> None:
        """Remove a key from cache."""
        self._store.pop(key, None)

    async def clear(self) -> None:
        """Clear all cached entries."""
        self._store.clear()

    @property
    def size(self) -> int:
        """Number of entries currently in cache."""
        # Clean expired entries on access
        now = time.monotonic()
        expired = [k for k, (exp, _) in self._store.items() if now > exp]
        for k in expired:
            del self._store[k]
        return len(self._store)


# Singleton
_cache: MemoryCache | None = None


def get_cache() -> MemoryCache:
    """Get or create the singleton cache instance."""
    global _cache
    if _cache is None:
        _cache = MemoryCache()
        logger.info("Knowledge Engine cache initialized")
    return _cache


__all__ = ["MemoryCache", "get_cache"]
