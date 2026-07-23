"""
Wikibooks Knowledge Source Connector.

Fetches educational content from Wikibooks — a Wikimedia project
for open-content textbooks that anyone can edit. Covers the same
subjects as Wikipedia but in a textbook format with chapters and
structured lessons.

API: Uses the same MediaWiki API as Wikipedia.
No API key required (respects Wikimedia's user-agent policy).
"""

import logging

from app.knowledge.cleaning import DocumentCleaner
from app.knowledge.sources import SearchResult, SourceAdapter, SourceDocument

logger = logging.getLogger(__name__)

try:
    import wikipediaapi

    HAS_WIKIPEDIA = True
except ImportError:
    HAS_WIKIPEDIA = False
    logger.warning("wikipedia-api not installed. Install with: pip install wikipedia-api")


class WikibooksSource(SourceAdapter):
    """Connector for Wikibooks open textbook content."""

    name = "wikibooks"

    # Popular Wikibooks subjects to pre-index
    COMMON_BOOKS = [
        "Calculus",
        "Linear Algebra",
        "Statistics",
        "Abstract Algebra",
        "General Chemistry",
        "Organic Chemistry",
        "Biochemistry",
        "Physics",
        "Classical Mechanics",
        "Quantum Mechanics",
        "Electrodynamics",
        "Cell Biology",
        "Genetics",
        "Neuroscience",
        "Python Programming",
        "Java Programming",
        "Data Structures",
        "Microeconomics",
        "Macroeconomics",
        "Introduction to Philosophy",
        "Cognitive Psychology",
        "Astronomy",
        "Climatology",
    ]

    def __init__(self, language: str = "en") -> None:
        self._api = None
        self._cleaner = DocumentCleaner()
        self._language = language
        self._init_api()

    def _init_api(self) -> None:
        """Initialize the Wikibooks API client."""
        if HAS_WIKIPEDIA:
            self._api = wikipediaapi.Wikipedia(
                language=self._language,
                user_agent="Synaris/0.1 (learning-platform; contact@synaris.app)",
                extract_format=wikipediaapi.ExtractFormat.WIKI,
            )
            logger.info("Wikibooks source connector initialized")

    @property
    def is_available(self) -> bool:
        return self._api is not None

    async def search(self, query: str, limit: int = 5) -> list[SearchResult]:
        """Search Wikibooks for the given query."""
        if not self.is_available:
            return []

        try:
            # Wikibooks uses the same Wikipedia API but with a different project prefix
            # Search via MediaWiki API
            results = await self._search_books(query, limit)

            # If no search results, try exact title match
            if not results:
                page = await self._fetch_book_page(query)
                if page is not None:
                    results.append(page)

            return results

        except Exception as e:
            logger.error(f"Wikibooks search failed: {e}")
            return []

    async def fetch(self, url: str) -> SourceDocument | None:
        """Fetch a Wikibooks page by URL."""
        if not self.is_available:
            return None

        try:
            # Extract book title from wikibooks URL
            if "/wikibooks.org/wiki/" in url:
                title = url.split("/wiki/")[-1]
            elif "/wikibooks.org/" in url:
                title = url.split("/wikibooks.org/")[-1]
            else:
                title = url.replace("_", " ")

            title = title.replace("_", " ")
            page = await self._fetch_book_page(title)
            return page.document if page else None

        except Exception as e:
            logger.error(f"Wikibooks fetch failed for {url}: {e}")
            return None

    async def _fetch_book_page(self, title: str) -> SearchResult | None:
        """Fetch a single Wikibooks page and return as SearchResult."""
        import asyncio

        loop = asyncio.get_running_loop()

        def _fetch() -> object | None:
            """Fetch page synchronously in executor."""
            page = self._api.page(title)
            if not page.exists():
                # Try with "Book" prefix for Wikibooks
                page = self._api.page(f"{title} (book)")
                if not page.exists():
                    return None
            return page

        try:
            page = await loop.run_in_executor(None, _fetch)
            if page is None:
                return None

            content = page.text or ""
            cleaned = self._cleaner.normalize(content)

            doc = SourceDocument(
                id=f"wikibooks:{title}",
                title=title,
                content=cleaned,
                source="wikibooks",
                url=f"https://en.wikibooks.org/wiki/{title.replace(' ', '_')}",
                subject=self._guess_subject(title, page.summary or ""),
                difficulty="intermediate",
                language=self._language,
                license="CC-BY-SA 3.0",
            )

            return SearchResult(
                document=doc,
                score=0.95,
                snippet=cleaned[:300],
            )

        except Exception as e:
            logger.warning(f"Failed to fetch Wikibooks page '{title}': {e}")
            return None

    async def _search_books(self, query: str, limit: int) -> list[SearchResult]:
        """Search Wikibooks using the MediaWiki API."""
        import asyncio

        loop = asyncio.get_running_loop()

        def _search() -> list[str]:
            """Search Wikibooks synchronously using requests."""
            import requests

            headers = {
                "User-Agent": "Synaris/0.1 (learning-platform; contact@synaris.app)",
            }
            params = {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srwhat": "text",
                "format": "json",
                "srlimit": limit + 5,
                "srnamespace": "0",  # Main namespace (books)
            }
            try:
                response = requests.get(
                    "https://en.wikibooks.org/w/api.php",
                    params=params,
                    headers=headers,
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()
                return [r["title"] for r in data.get("query", {}).get("search", [])]
            except Exception as e:
                logger.warning(f"Wikibooks search API call failed: {e}")
                return []

        try:
            titles = await loop.run_in_executor(None, _search)
            if not titles:
                return []

            results = []
            for title in titles[:limit]:
                result = await self._fetch_book_page(title)
                if result:
                    results.append(result)

            return results

        except Exception as e:
            logger.warning(f"Wikibooks search failed: {e}")
            return []

    def _guess_subject(self, title: str, summary: str) -> str:
        """Guess the subject area from the book title."""
        subjects = {
            "physics": ["physics", "mechanics", "thermodynamics", "electrodynamics", "quantum"],
            "mathematics": ["calculus", "algebra", "geometry", "statistics", "mathematics", "trigonometry"],
            "chemistry": ["chemistry", "chemical", "organic", "biochemistry"],
            "biology": ["biology", "cell", "genetics", "neuroscience", "evolution"],
            "computer science": ["programming", "python", "java", "algorithms", "data structures", "computer"],
            "economics": ["economics", "microeconomics", "macroeconomics"],
            "psychology": ["psychology", "cognitive", "behavioral"],
            "philosophy": ["philosophy", "logic", "ethics"],
            "astronomy": ["astronomy", "climatology", "geology"],
        }

        text_lower = (title + " " + summary).lower()
        for subject, keywords in subjects.items():
            if any(kw in text_lower for kw in keywords):
                return subject

        return "general"


# Singleton
_source: WikibooksSource | None = None


def get_wikibooks_source() -> WikibooksSource:
    """Get or create the Wikibooks source connector."""
    global _source
    if _source is None:
        _source = WikibooksSource()
    return _source


__all__ = ["WikibooksSource", "get_wikibooks_source"]
