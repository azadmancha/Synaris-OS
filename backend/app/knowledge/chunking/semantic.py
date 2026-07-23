"""Semantic Document Chunker.

Splits documents by their natural structure (headings, paragraphs)
rather than by fixed token counts. This preserves semantic boundaries
and produces much better retrieval results.

Strategy:
1. Parse document into structural elements (headings, paragraphs, etc.)
2. Group elements into chunks with context
3. Enrich each chunk with metadata

Heuristic fallback:
- If no structure is detected, split by paragraphs into fixed-size groups
"""

import logging
import re
import uuid

from app.knowledge.chunking.types import ChunkType, DocumentChunk

logger = logging.getLogger(__name__)


class SemanticChunker:
    """Splits documents into semantic chunks based on document structure.

    Handles:
    - Markdown headings (# ## ###)
    - Wikipedia-style headings (== ==)
    - Plain text paragraphs
    - Lists and numbered items
    """

    # Maximum tokens per chunk (approximate, based on word count)
    MAX_TOKENS = 512
    # Overlap between chunks (in characters)
    CHUNK_OVERLAP = 100

    def chunk_document(
        self,
        title: str,
        content: str,
        source: str = "",
        source_url: str = "",
        subject: str = "",
        difficulty: str = "intermediate",
        **metadata,
    ) -> list[DocumentChunk]:
        """Split a document into semantic chunks.

        Preserves heading hierarchy and creates self-contained chunks
        that each include their section heading for context.
        """
        if not content.strip():
            return []

        # Try to detect and split by structure
        chunks = self._split_by_headings(content, title, source, source_url, subject, difficulty)

        if not chunks:
            # Fallback: split by paragraphs into groups
            chunks = self._split_by_paragraphs(content, title, source, source_url, subject, difficulty)

        # Assign IDs and sequence
        for i, chunk in enumerate(chunks):
            chunk.id = str(uuid.uuid4())
            chunk.sequence = i
            chunk.token_count = self._estimate_tokens(chunk.content)

        return chunks

    def chunk_text(self, text: str, max_tokens: int = 512) -> list[DocumentChunk]:
        """Fallback: split plain text into fixed-size chunks."""
        if not text.strip():
            return []

        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks: list[DocumentChunk] = []
        current_chunk = ""
        current_count = 0

        for para in paragraphs:
            para_tokens = self._estimate_tokens(para)
            if current_count + para_tokens > max_tokens and current_chunk:
                chunks.append(DocumentChunk(content=current_chunk.strip()))
                current_chunk = para
                current_count = para_tokens
            else:
                current_chunk += "\n\n" + para if current_chunk else para
                current_count += para_tokens

        if current_chunk:
            chunks.append(DocumentChunk(content=current_chunk.strip()))

        return chunks

    def _split_by_headings(
        self,
        content: str,
        title: str,
        source: str,
        source_url: str,
        subject: str,
        difficulty: str,
    ) -> list[DocumentChunk]:
        """Split content by heading structure.

        Supports:
        - Markdown: # ## ###
        - Wikipedia: == Section ==
        - Plain headings: UNDERLINED WITH ===
        """
        chunks: list[DocumentChunk] = []
        current_heading = title
        current_subheading = ""
        current_sections: list[str] = []
        current_content: list[str] = []

        lines = content.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            # Detect headings
            heading_match = self._detect_heading(stripped)
            if heading_match:
                # Save previous section
                if current_content:
                    chunk_content = "\n".join(current_content)
                    chunks.append(
                        self._make_chunk(
                            content=chunk_content,
                            heading=current_heading,
                            subheading=current_subheading,
                            chunk_type=ChunkType.SECTION if current_subheading else ChunkType.CHAPTER,
                            source=source,
                            source_url=source_url,
                            subject=subject,
                            difficulty=difficulty,
                        )
                    )
                    current_content = []

                # Update hierarchy
                heading_level, heading_text = heading_match
                if heading_level == 1:
                    current_heading = heading_text
                    current_subheading = ""
                    current_sections = [heading_text]
                elif heading_level == 2:
                    current_subheading = heading_text
                    current_sections = current_sections[:1] + [heading_text]
                else:
                    current_subheading = heading_text
                    current_sections = current_sections[:2] + [heading_text]

                i += 1
                continue

            # Accumulate content
            if stripped:
                current_content.append(stripped)
            elif current_content:
                # Empty line = paragraph break
                current_content.append("")

            i += 1

        # Save last section
        if current_content:
            chunk_content = "\n".join(current_content)
            chunks.append(
                self._make_chunk(
                    content=chunk_content,
                    heading=current_heading,
                    subheading=current_subheading,
                    chunk_type=ChunkType.SECTION,
                    source=source,
                    source_url=source_url,
                    subject=subject,
                    difficulty=difficulty,
                )
            )

        # Split large chunks that exceed token limit
        final_chunks: list[DocumentChunk] = []
        for chunk in chunks:
            if self._estimate_tokens(chunk.content) > self.MAX_TOKENS:
                sub_chunks = self._split_large_chunk(chunk)
                final_chunks.extend(sub_chunks)
            else:
                final_chunks.append(chunk)

        return final_chunks

    def _split_by_paragraphs(
        self,
        content: str,
        title: str,
        source: str,
        source_url: str,
        subject: str,
        difficulty: str,
    ) -> list[DocumentChunk]:
        """Fallback: group paragraphs into chunks."""
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        chunks: list[DocumentChunk] = []
        current_paras: list[str] = []
        current_tokens = 0

        for para in paragraphs:
            para_tokens = self._estimate_tokens(para)
            if current_tokens + para_tokens > self.MAX_TOKENS and current_paras:
                chunk_content = "\n\n".join(current_paras)
                chunks.append(
                    self._make_chunk(
                        content=chunk_content,
                        heading=title,
                        chunk_type=ChunkType.PARAGRAPH,
                        source=source,
                        source_url=source_url,
                        subject=subject,
                        difficulty=difficulty,
                    )
                )
                # Overlap: keep last paragraph
                overlap = current_paras[-1] if current_paras else ""
                current_paras = [overlap] if overlap else []
                current_tokens = self._estimate_tokens(overlap) if overlap else 0

            current_paras.append(para)
            current_tokens += para_tokens

        if current_paras:
            chunk_content = "\n\n".join(current_paras)
            chunks.append(
                self._make_chunk(
                    content=chunk_content,
                    heading=title,
                    chunk_type=ChunkType.PARAGRAPH,
                    source=source,
                    source_url=source_url,
                    subject=subject,
                    difficulty=difficulty,
                )
            )

        return chunks

    def _split_large_chunk(self, chunk: DocumentChunk) -> list[DocumentChunk]:
        """Split a chunk that exceeds the token limit into sub-chunks."""
        paragraphs = chunk.content.split("\n\n")
        sub_chunks: list[DocumentChunk] = []
        current: list[str] = []
        current_tokens = 0

        for para in paragraphs:
            para_tokens = self._estimate_tokens(para)
            if current_tokens + para_tokens > self.MAX_TOKENS and current:
                sub_chunks.append(
                    self._make_chunk(
                        content="\n\n".join(current),
                        heading=chunk.heading,
                        subheading=chunk.subheading,
                        chunk_type=ChunkType.PARAGRAPH,
                        source=chunk.source,
                        source_url=chunk.source_url,
                        subject=chunk.subject,
                        difficulty=chunk.difficulty,
                    )
                )
                # Keep last paragraph for overlap context
                overlap = current[-1] if len(current) > 0 else ""
                current = [overlap] if overlap else []
                current_tokens = self._estimate_tokens(overlap) if overlap else 0

            current.append(para)
            current_tokens += para_tokens

        if current:
            sub_chunks.append(
                self._make_chunk(
                    content="\n\n".join(current),
                    heading=chunk.heading,
                    subheading=chunk.subheading,
                    chunk_type=ChunkType.PARAGRAPH,
                    source=chunk.source,
                    source_url=chunk.source_url,
                    subject=chunk.subject,
                    difficulty=chunk.difficulty,
                )
            )

        return sub_chunks

    def _detect_heading(self, line: str) -> tuple[int, str] | None:
        """Detect if a line is a heading and return (level, text)."""
        # Markdown: # ## ### ####
        md_match = re.match(r"^(#{1,4})\s+(.+)$", line)
        if md_match:
            level = len(md_match.group(1))
            text = md_match.group(2).strip()
            return (level, text)

        # Wikipedia: == Section ==  or  === Subsection ===
        wiki_match = re.match(r"^(={2,4})\s*(.+?)\s*\1$", line)
        if wiki_match:
            level = len(wiki_match.group(1)) - 1  # == is level 1
            text = wiki_match.group(2).strip()
            return (level, text)

        return None

    def _make_chunk(
        self,
        content: str,
        heading: str,
        chunk_type: ChunkType,
        source: str,
        source_url: str,
        subject: str,
        difficulty: str,
        subheading: str = "",
    ) -> DocumentChunk:
        """Create a DocumentChunk with common metadata."""
        return DocumentChunk(
            content=content.strip(),
            chunk_type=chunk_type,
            heading=heading,
            subheading=subheading,
            source=source,
            source_url=source_url,
            subject=subject,
            difficulty=difficulty,
        )

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count for a text string.

        A rough estimate: ~4 characters per token for English text.
        Falls back to word count * 1.3 if tiktoken is not available.
        """
        try:
            import tiktoken

            enc = tiktoken.get_encoding("cl100k_base")
            return len(enc.encode(text))
        except ImportError:
            # Fallback: ~1.3 tokens per word
            word_count = len(text.split())
            return max(1, int(word_count * 1.3))


# Singleton
_chunker: SemanticChunker | None = None


def get_chunker() -> SemanticChunker:
    """Get or create the singleton semantic chunker."""
    global _chunker
    if _chunker is None:
        _chunker = SemanticChunker()
    return _chunker


__all__ = ["SemanticChunker", "get_chunker"]
