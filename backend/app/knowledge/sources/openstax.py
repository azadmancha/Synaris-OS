"""
OpenStax Knowledge Source Connector.

Fetches educational content from OpenStax's free, peer-reviewed textbooks.
OpenStax provides college-level textbooks across STEM and social sciences
under Creative Commons licensing.

API: https://openstax.org/api/
All content is free, no API key required.
"""

import logging

import httpx

from app.knowledge.cleaning import DocumentCleaner
from app.knowledge.sources import SearchResult, SourceAdapter, SourceDocument

logger = logging.getLogger(__name__)


class OpenStaxSource(SourceAdapter):
    """Connector for OpenStax open textbook content."""

    name = "openstax"

    # OpenStax API base URL
    API_BASE = "https://openstax.org/api"

    # Popular OpenStax books indexed by subject
    POPULAR_BOOKS: dict[str, list[dict[str, str]]] = {
        "physics": [
            {"slug": "physics", "title": "College Physics"},
            {"slug": "university-physics-volume-1", "title": "University Physics Volume 1"},
            {"slug": "university-physics-volume-2", "title": "University Physics Volume 2"},
            {"slug": "university-physics-volume-3", "title": "University Physics Volume 3"},
        ],
        "mathematics": [
            {"slug": "calculus-volume-1", "title": "Calculus Volume 1"},
            {"slug": "calculus-volume-2", "title": "Calculus Volume 2"},
            {"slug": "calculus-volume-3", "title": "Calculus Volume 3"},
            {"slug": "college-algebra", "title": "College Algebra"},
            {"slug": "statistics", "title": "Introductory Statistics"},
        ],
        "chemistry": [
            {"slug": "chemistry-2e", "title": "Chemistry 2e"},
            {"slug": "organic-chemistry", "title": "Organic Chemistry"},
        ],
        "biology": [
            {"slug": "biology-2e", "title": "Biology 2e"},
            {"slug": "anatomy-and-physiology-2e", "title": "Anatomy and Physiology"},
            {"slug": "microbiology", "title": "Microbiology"},
        ],
        "economics": [
            {"slug": "principles-economics-2e", "title": "Principles of Economics 2e"},
            {"slug": "principles-microeconomics-2e", "title": "Principles of Microeconomics"},
        ],
        "psychology": [
            {"slug": "psychology-2e", "title": "Psychology 2e"},
        ],
        "computer science": [
            {"slug": "ap-computer-science-a", "title": "AP Computer Science A"},
        ],
    }

    def __init__(self) -> None:
        self._cleaner = DocumentCleaner()
        self._client: httpx.AsyncClient | None = None
        self._init_client()

    def _init_client(self) -> None:
        """Initialize the HTTP client."""
        self._client = httpx.AsyncClient(
            base_url=self.API_BASE,
            timeout=15.0,
            follow_redirects=True,
            headers={"User-Agent": "Synaris/0.1 (learning-platform)"},
        )
        logger.info("OpenStax source connector initialized")

    @property
    def is_available(self) -> bool:
        return self._client is not None

    async def search(self, query: str, limit: int = 5) -> list[SearchResult]:
        """Search OpenStax content by topic."""
        if not self._client:
            return []

        try:
            # Try to find relevant books by subject matching
            results: list[SearchResult] = []
            query_lower = query.lower()

            # Check which subjects match the query
            matched_subjects = []
            for subject, books in self.POPULAR_BOOKS.items():
                if any(kw in query_lower for kw in [subject] + subject.split()):
                    matched_subjects.append((subject, books))

            # If no subject match, search in all books
            if not matched_subjects:
                for subject, books in self.POPULAR_BOOKS.items():
                    for book in books:
                        title_lower = book["title"].lower()
                        if any(word in title_lower for word in query_lower.split()):
                            matched_subjects.append((subject, [book]))
                            break

            # Fetch content from matching books
            for subject, books in matched_subjects:
                for book in books[:2]:  # Limit to 2 books per subject
                    content = await self._fetch_book_content(book["slug"])
                    if content:
                        doc = SourceDocument(
                            id=f"openstax:{book['slug']}",
                            title=book["title"],
                            content=content[:3000],  # Limit content length
                            source="openstax",
                            url=f"https://openstax.org/books/{book['slug']}",
                            subject=subject,
                            difficulty="intermediate",
                            language="en",
                            license="CC-BY 4.0",
                        )
                        results.append(SearchResult(
                            document=doc,
                            score=0.85,
                            snippet=content[:300],
                        ))

            if not results:
                logger.info(f"OpenStax: no content found for '{query[:40]}'")

            return results[:limit]

        except Exception as e:
            logger.error(f"OpenStax search failed: {e}")
            return []

    async def fetch(self, url: str) -> SourceDocument | None:
        """Fetch OpenStax content by URL."""
        if not self._client:
            return None

        try:
            # Extract slug from URL
            slug = url.rstrip("/").split("/")[-1]
            if "/books/" in url:
                slug = url.split("/books/")[-1].split("/")[0]

            content = await self._fetch_book_content(slug)
            if not content:
                return None

            return SourceDocument(
                id=f"openstax:{slug}",
                title=slug.replace("-", " ").title(),
                content=content,
                source="openstax",
                url=f"https://openstax.org/books/{slug}",
                subject="general",
                difficulty="intermediate",
                language="en",
                license="CC-BY 4.0",
            )

        except Exception as e:
            logger.error(f"OpenStax fetch failed for {url}: {e}")
            return None

    async def _fetch_book_content(self, slug: str) -> str | None:
        """Fetch a book's content via the OpenStax API.

        Uses OpenStax's Books API to get book metadata and then fetches
        the HTML content of each chapter/section.
        """
        if not self._client:
            return None

        try:
            # First, get book details to find the table of contents
            response = await self._client.get(f"/v0/books?slug={slug}")
            response.raise_for_status()
            books_data = response.json()

            if not books_data or not isinstance(books_data, list) or len(books_data) == 0:
                return None

            book = books_data[0]
            title = book.get("title", slug)

            # Try to get the book's full text via the loading page
            # OpenStax provides entire books as single HTML pages
            text_response = await self._client.get(f"/books/{slug}")
            if text_response.status_code == 200:
                html = text_response.text
                # Extract readable text from HTML
                cleaned = self._cleaner.clean_html(html)
                if len(cleaned) > 100:
                    return f"{title}\n\n{cleaned}"

            # Fallback: return book description/metadata
            description = book.get("description", "")
            return f"{title}: {description}" if description else title

        except httpx.HTTPError as e:
            logger.warning(f"OpenStax HTTP error for slug '{slug}': {e}")
            return None
        except Exception as e:
            logger.warning(f"OpenStax fetch error for slug '{slug}': {e}")
            return None


# Singleton
_source: OpenStaxSource | None = None


def get_openstax_source() -> OpenStaxSource:
    """Get or create the OpenStax source connector."""
    global _source
    if _source is None:
        _source = OpenStaxSource()
    return _source


__all__ = ["OpenStaxSource", "get_openstax_source"]
