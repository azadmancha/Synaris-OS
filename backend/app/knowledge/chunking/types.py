"""
Shared types for the chunking module.

Extracted to a separate module to break the circular import
between __init__.py and semantic.py (both need DocumentChunk and ChunkType).
"""

from dataclasses import dataclass, field
from enum import Enum


class ChunkType(Enum):
    """The type of content in a chunk."""
    CHAPTER = "chapter"
    SECTION = "section"
    SUBSECTION = "subsection"
    PARAGRAPH = "paragraph"
    FORMULA = "formula"
    EXAMPLE = "example"
    EXERCISE = "exercise"
    DEFINITION = "definition"
    THEOREM = "theorem"
    CODE = "code"
    TABLE = "table"


@dataclass
class DocumentChunk:
    """A single chunk of a document with rich metadata."""
    id: str = ""
    document_id: str = ""
    content: str = ""
    chunk_type: ChunkType = ChunkType.PARAGRAPH
    heading: str = ""
    subheading: str = ""
    subject: str = ""
    chapter: str = ""
    difficulty: str = "intermediate"
    source: str = ""
    source_url: str = ""
    license: str = ""
    language: str = "en"
    embedding_version: str = ""
    token_count: int = 0
    sequence: int = 0
    metadata: dict = field(default_factory=dict)

    def __repr__(self) -> str:
        return f"<Chunk {self.chunk_type.value}: {self.heading or self.content[:40]}...>"


__all__ = [
    "ChunkType",
    "DocumentChunk",
]
