"""Context Builder for the Knowledge Engine.

Takes retrieved documents and compresses them into a structured
context that the LLM can use effectively. Controls what information
is included and how it's formatted.
"""

from dataclasses import dataclass


@dataclass
class ContextDocument:
    """A document prepared for LLM context."""
    content: str
    source: str
    citation: str  # Formatted citation string
    confidence: float


@dataclass
class LLMContext:
    """The complete context to inject into an LLM prompt."""
    system_prompt: str
    documents: list[ContextDocument]
    token_count: int
    query: str


# Import AFTER dataclass definitions to avoid circular import loading order issues
# builder.py imports ContextDocument/LLMContext from this module
from app.knowledge.context.builder import ContextBuilder, get_context_builder  # noqa: E402


__all__ = [
    "ContextDocument",
    "LLMContext",
    "ContextBuilder",
    "get_context_builder",
]
