"""Citation Engine for the Knowledge Engine.

Generates structured citations for every piece of knowledge used
in an AI response. Citations include source, section, URL, and
confidence score.

Example:
    Newton's Second Law
    ──────────────────
    Source: OpenStax Physics
    Chapter: 4
    Section: 4.2
    URL: https://openstax.org/books/physics/pages/4-2
    Confidence: 97%
"""

from dataclasses import dataclass
from datetime import UTC, datetime


@dataclass
class Citation:
    """A structured citation for a knowledge source."""
    source: str
    title: str
    url: str
    chapter: str = ""
    section: str = ""
    paragraph: str = ""
    confidence: float = 0.0
    accessed_at: str = ""

    def __post_init__(self):
        if not self.accessed_at:
            self.accessed_at = datetime.now(UTC).isoformat()

    def formatted(self) -> str:
        """Format the citation as a readable string."""
        parts = [f"Source: {self.source}"]
        if self.title:
            parts.append(f"Title: {self.title}")
        if self.chapter:
            parts.append(f"Chapter: {self.chapter}")
        if self.section:
            parts.append(f"Section: {self.section}")
        if self.url:
            parts.append(f"URL: {self.url}")
        if self.confidence > 0:
            parts.append(f"Confidence: {self.confidence:.0%}")
        return "\n".join(parts)

    def markdown(self) -> str:
        """Format the citation as markdown."""
        lines = [f"📖 **{self.title}**" if self.title else ""]
        lines.append(f"   Source: `{self.source}`")
        if self.chapter:
            lines.append(f"   Chapter: {self.chapter}")
        if self.confidence > 0:
            lines.append(f"   Confidence: {self.confidence:.0%}")
        return "\n".join(line for line in lines if line)


@dataclass
class CitationGroup:
    """A group of citations for a single response."""
    citations: list[Citation]
    source_count: int = 0

    def __post_init__(self):
        self.source_count = len(self.citations)

    def formatted(self) -> str:
        """Format all citations."""
        parts = ["\n\n**Learn More**\n"]
        for c in self.citations:
            parts.append(c.markdown())
        return "\n".join(parts)


class CitationEngine:
    """Generates structured citations for knowledge sources."""

    def build_citation(
        self,
        source: str,
        title: str,
        url: str,
        chapter: str = "",
        section: str = "",
        confidence: float = 0.0,
    ) -> Citation:
        """Build a single citation."""
        return Citation(
            source=source,
            title=title,
            url=url,
            chapter=chapter,
            section=section,
            confidence=confidence,
        )

    def build_group(self, citations: list[Citation]) -> CitationGroup:
        """Build a group of citations."""
        return CitationGroup(citations=citations)

    def add_citations_to_response(self, response: str, citations: CitationGroup) -> str:
        """Append citations to an AI response."""
        if citations.citations:
            return response + citations.formatted()
        return response


__all__ = [
    "Citation",
    "CitationGroup",
    "CitationEngine",
]
