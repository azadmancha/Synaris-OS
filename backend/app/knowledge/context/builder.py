"""Context Builder Implementation.

Takes raw search results from knowledge sources and formats them
into structured context that the LLM can use effectively.
Manages token budgets and adds citation instructions.
"""

import logging

from app.knowledge.context import ContextDocument, LLMContext
from app.knowledge.citation import Citation, CitationEngine, CitationGroup

logger = logging.getLogger(__name__)


class ContextBuilder:
    """Builds compressed, structured context for LLM prompts."""

    MAX_CONTEXT_TOKENS = 4000
    MAX_DOCUMENTS = 5
    MAX_CONTENT_LENGTH = 2000  # Characters per document

    def __init__(self):
        self._citation_engine = CitationEngine()

    async def build_context(
        self,
        query: str,
        documents: list,
        max_tokens: int = MAX_CONTEXT_TOKENS,
    ) -> LLMContext:
        """Build a structured context from search results.

        Takes SourceAdapter search results and formats them
        into context documents with citations.
        """
        context_docs = []
        citations = []
        total_chars = 0

        for doc in documents[:self.MAX_DOCUMENTS]:
            content = doc.document.content[:self.MAX_CONTENT_LENGTH]
            total_chars += len(content)

            # Create citation for this document
            citation = self._citation_engine.build_citation(
                source=doc.document.source,
                title=doc.document.title,
                url=doc.document.url,
                confidence=doc.score,
            )
            citations.append(citation)

            # Create context document
            context_doc = ContextDocument(
                content=content,
                source=doc.document.source,
                citation=citation.markdown(),
                confidence=doc.score,
            )
            context_docs.append(context_doc)

            if total_chars > max_tokens * 4:  # Rough char-to-token estimate
                break

        # Build the system prompt part that includes context
        system_prompt = self._build_context_prompt(context_docs)

        return LLMContext(
            system_prompt=system_prompt,
            documents=context_docs,
            token_count=len(system_prompt.split()),
            query=query,
        )

    def _build_context_prompt(self, documents: list[ContextDocument]) -> str:
        """Build the context section of the system prompt."""
        if not documents:
            return ""

        parts = [
            "\n\n---",
            "## Knowledge Context",
            "The following information has been retrieved from knowledge sources to help answer the user's question.",
            "Use this information to provide accurate, source-backed answers.",
            "CRITICAL: After your answer, include a 'Learn More' section with citations for each source you referenced.",
            "---",
        ]

        for i, doc in enumerate(documents, 1):
            parts.append(f"\n### Source {i}: {doc.source}")
            parts.append(f"Confidence: {doc.confidence:.0%}")
            parts.append(f"Citation: {doc.citation}")
            parts.append(doc.content[:1500])  # Truncate for token budget

        parts.append("\n---")
        parts.append("Using the above context, provide a clear educational answer.")
        parts.append("If the context doesn't contain enough information, say so clearly.")
        parts.append("Always cite sources using the 'Learn More' format at the end.\n")

        return "\n".join(parts)


# Singleton
_builder: ContextBuilder | None = None


def get_context_builder() -> ContextBuilder:
    """Get or create the singleton context builder."""
    global _builder
    if _builder is None:
        _builder = ContextBuilder()
    return _builder


__all__ = ["ContextBuilder", "get_context_builder"]
