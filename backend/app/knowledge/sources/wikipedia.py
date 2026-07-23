"""Wikipedia Knowledge Source Connector.

Fetches educational content from Wikipedia via the Wikipedia API.
Used for both live search and pre-indexing popular topics.

API: https://en.wikipedia.org/w/api.php
Library: wikipedia-api (free, no API key needed)
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


class WikipediaSource(SourceAdapter):
    """Connector for Wikipedia knowledge source."""

    name = "wikipedia"

    # Topics to pre-index for popular educational content
    COMMON_TOPICS = [
        "Physics",
        "Mathematics",
        "Chemistry",
        "Biology",
        "Computer science",
        "Calculus",
        "Quantum mechanics",
        "Thermodynamics",
        "Genetics",
        "Machine learning",
        "Artificial intelligence",
        "Economics",
        "Psychology",
        "Philosophy",
        "Astronomy",
        "Geology",
        "Organic chemistry",
        "Linear algebra",
        "Statistics",
        "Electromagnetism",
    ]

    def __init__(self, language: str = "en") -> None:
        self._api = None
        self._cleaner = DocumentCleaner()
        self._language = language
        self._init_api()

    def _init_api(self) -> None:
        """Initialize the Wikipedia API client."""
        if HAS_WIKIPEDIA:
            self._api = wikipediaapi.Wikipedia(
                language=self._language,
                user_agent="Synaris/0.1 (learning-platform; contact@synaris.app)",
                extract_format=wikipediaapi.ExtractFormat.WIKI,
            )
            logger.info("Wikipedia source connector initialized")

    @property
    def is_available(self) -> bool:
        return self._api is not None

    async def search(self, query: str, limit: int = 5) -> list[SearchResult]:
        """Search Wikipedia for the given query."""
        if not self.is_available:
            logger.warning("Wikipedia API not available")
            return []

        try:
            # First, try to find pages via Wikipedia search API
            # (more reliable for natural language queries than exact title match)
            related = await self._search_related(query, limit)
            results = list(related)

            # If no results from search, try exact page title match as fallback
            if not results:
                page = await self._fetch_page_async(query)
                if page is not None:
                    doc = self._page_to_document(page)
                    snippet = doc.content[:300] if doc.content else ""
                    results.append(
                        SearchResult(
                            document=doc,
                            score=0.95,
                            snippet=snippet,
                        )
                    )

            return results

        except Exception as e:
            logger.error(f"Wikipedia search failed: {e}")
            return []

    async def fetch(self, url: str) -> SourceDocument | None:
        """Fetch a Wikipedia page by URL."""
        if not self.is_available:
            return None

        try:
            title = url.split("/wiki/")[-1] if "/wiki/" in url else url
            title = title.replace("_", " ")

            page = await self._fetch_page_async(title)
            if page is None:
                return None

            return self._page_to_document(page)

        except Exception as e:
            logger.error(f"Wikipedia fetch failed for {url}: {e}")
            return None

    async def _fetch_page_async(self, title: str) -> object | None:
        """Fetch a Wikipedia page (runs sync API in executor)."""
        import asyncio

        loop = asyncio.get_running_loop()

        def _fetch():
            page = self._api.page(title)
            if not page.exists():
                return None
            return page

        return await loop.run_in_executor(None, _fetch)

    async def _search_related(self, query: str, limit: int) -> list[SearchResult]:
        """Find pages related to the query via Wikipedia's search API."""
        import asyncio

        loop = asyncio.get_running_loop()

        def _search():
            import requests

            headers = {
                "User-Agent": "Synaris/0.1 (learning-platform; contact@synaris.app)",
                "Accept": "application/json",
            }
            params = {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "format": "json",
                "srlimit": limit + 5,
            }
            try:
                response = requests.get(
                    "https://en.wikipedia.org/w/api.php",
                    params=params,
                    headers=headers,
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()
                return [r["title"] for r in data.get("query", {}).get("search", [])]
            except Exception as e:
                logger.warning(f"Wikipedia search API call failed: {e}")
                return []

        try:
            titles = await loop.run_in_executor(None, _search)
            if not titles:
                return []

            results = []
            for title in titles[:limit]:
                page = await self._fetch_page_async(title)
                if page is None:
                    continue

                doc = self._page_to_document(page)
                results.append(
                    SearchResult(
                        document=doc,
                        score=0.7 if len(results) > 0 else 0.95,
                        snippet=doc.content[:300] if doc.content else "",
                    )
                )

            return results

        except Exception as e:
            logger.warning(f"Wikipedia related search failed: {e}")
            return []

    def _page_to_document(self, page) -> SourceDocument:
        """Convert a Wikipedia page to a SourceDocument."""
        content = page.text or ""
        cleaned = self._cleaner.normalize(content)

        # Determine subject from categories or summary
        subject = self._guess_subject(page.title, page.summary or "")

        return SourceDocument(
            id=f"wikipedia:{page.title}",
            title=page.title,
            content=cleaned,
            source="wikipedia",
            url=(
                page.fullurl
                if hasattr(page, "fullurl")
                else f"https://en.wikipedia.org/wiki/{page.title.replace(' ', '_')}"
            ),
            subject=subject,
            difficulty="intermediate",
            language=self._language,
            license="CC-BY-SA 3.0",
        )

    def _guess_subject(self, title: str, summary: str) -> str:
        """Guess the subject area from title and summary."""
        subjects = {
            "physics": ["physics", "mechanics", "thermodynamics", "electromagnetism", "quantum", "relativity"],
            "mathematics": ["mathematics", "calculus", "algebra", "geometry", "statistics", "trigonometry"],
            "chemistry": ["chemistry", "chemical", "element", "molecule", "reaction", "organic"],
            "biology": ["biology", "cell", "genetics", "evolution", "ecology", "organism"],
            "computer science": [
                "computer",
                "algorithm",
                "programming",
                "data structure",
                "software",
                "machine learning",
                "ai",
            ],
            "economics": ["economics", "economy", "market", "supply", "demand", "finance"],
            "psychology": ["psychology", "behavior", "cognitive", "neuroscience", "personality"],
            "philosophy": ["philosophy", "logic", "ethics", "metaphysics", "epistemology"],
            "astronomy": ["astronomy", "star", "planet", "galaxy", "cosmology", "solar"],
        }

        text_lower = (title + " " + summary).lower()
        for subject, keywords in subjects.items():
            if any(kw in text_lower for kw in keywords):
                return subject

        return "general"


# Singleton
_source: WikipediaSource | None = None


def get_wikipedia_source() -> WikipediaSource:
    """Get or create the Wikipedia source connector."""
    global _source
    if _source is None:
        _source = WikipediaSource()
    return _source


__all__ = ["WikipediaSource", "get_wikipedia_source"]
