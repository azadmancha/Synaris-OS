"""Knowledge Source Connectors.

Each source implements the SourceAdapter interface.
Add a new source by creating a new adapter class.

Sources:
- Wikipedia (free API)
- OpenStax (open textbooks)
- Wikibooks (wiki textbooks)
- NCERT (Indian curriculum)
- Khan Academy (free lessons)
- arXiv (research papers)
- CK12 (STEM resources)
- LibreTexts (open textbooks)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class SourceDocument:
    """A document retrieved from a knowledge source."""
    id: str
    title: str
    content: str
    source: str
    url: str
    subject: str = ""
    chapter: str = ""
    difficulty: str = "intermediate"
    language: str = "en"
    license: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass
class SearchResult:
    """A single search result from a knowledge source."""
    document: SourceDocument
    score: float = 0.0
    snippet: str = ""


class SourceAdapter(ABC):
    """Base class for knowledge source adapters.

    Each source (Wikipedia, OpenStax, etc.) implements
    this interface so the Knowledge Engine can query
    them uniformly.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable source name (e.g., 'Wikipedia')."""
        ...

    @abstractmethod
    async def search(self, query: str, limit: int = 5) -> list[SearchResult]:
        """Search this knowledge source for the given query."""
        ...

    @abstractmethod
    async def fetch(self, url: str) -> SourceDocument | None:
        """Fetch a specific document by its URL."""
        ...


__all__ = [
    "SourceDocument",
    "SearchResult",
    "SourceAdapter",
]
