"""Semantic Document Chunking.

Chunks documents by their natural structure (chapter → heading → paragraph)
rather than by fixed token counts. This preserves semantic boundaries
and produces much better retrieval results.

Architecture:
    Raw Document → Structural Parser → Semantic Chunks → Metadata Enrichment

Types (DocumentChunk, ChunkType) are in types.py to avoid circular imports.
"""

from app.knowledge.chunking.types import ChunkType, DocumentChunk
from app.knowledge.chunking.semantic import SemanticChunker, get_chunker


__all__ = [
    "ChunkType",
    "DocumentChunk",
    "SemanticChunker",
    "get_chunker",
]
