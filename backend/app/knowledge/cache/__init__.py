"""Query Cache for the Knowledge Engine.

Deduplicates identical or similar queries to reduce API costs
and improve response times.

Architecture:
    User Query → Cache Lookup → Hit? → Return cached result
                               → Miss? → Retrieve → Cache → Return
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass
class CachedEntry:
    """A cached query result."""
    query: str
    result: Any
    created_at: str = ""
    ttl_seconds: int = 3600  # 1 hour default

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat()

    @property
    def is_expired(self) -> bool:
        created = datetime.fromisoformat(self.created_at)
        age = (datetime.now(timezone.utc) - created).total_seconds()
        return age > self.ttl_seconds


class QueryCache:
    """In-memory cache for knowledge queries.

    Future: Replace with Redis when available.
    """

    def __init__(self, default_ttl: int = 3600):
        self._cache: dict[str, CachedEntry] = {}
        self._default_ttl = default_ttl

    async def get(self, key: str) -> Any | None:
        """Get a cached result by key. Returns None if miss or expired."""
        entry = self._cache.get(key)
        if entry is None:
            return None
        if entry.is_expired:
            del self._cache[key]
            return None
        return entry.result

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Cache a result."""
        self._cache[key] = CachedEntry(
            query=key,
            result=value,
            ttl_seconds=ttl or self._default_ttl,
        )

    async def clear(self) -> None:
        """Clear all cached entries."""
        self._cache.clear()

    @property
    def size(self) -> int:
        return len(self._cache)


# Singleton
_cache: QueryCache | None = None


def get_cache() -> QueryCache:
    """Get or create the singleton query cache."""
    global _cache
    if _cache is None:
        _cache = QueryCache()
    return _cache


__all__ = [
    "QueryCache",
    "get_cache",
]
