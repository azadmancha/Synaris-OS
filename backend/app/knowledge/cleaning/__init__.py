"""Document Cleaning for the Knowledge Engine.

Cleans and normalizes content from various sources before chunking.
Handles HTML stripping, whitespace normalization, encoding fixes,
and educational content polishing.
"""

import re
from dataclasses import dataclass


@dataclass
class CleanedDocument:
    """A cleaned document ready for chunking."""
    title: str
    content: str
    original_source: str
    cleaning_steps: list[str]


class DocumentCleaner:
    """Cleans and normalizes documents from various sources.

    Removes HTML tags, normalizes whitespace, fixes common encoding
    issues, and preserves document structure markers.
    """

    def clean_html(self, html: str) -> str:
        """Strip HTML tags while preserving structure."""
        # Remove script and style blocks
        text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
        # Replace block tags with newlines
        text = re.sub(r'</?(?:p|div|h[1-6]|li|tr|blockquote|br)[^>]*>', '\n', text)
        # Remove remaining tags
        text = re.sub(r'<[^>]+>', '', text)
        # Decode common HTML entities
        text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        text = text.replace('&quot;', '"').replace('&#39;', "'")
        return self.normalize(text)

    def normalize(self, text: str) -> str:
        """Normalize whitespace and fix common issues."""
        # Replace multiple newlines with double newline
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Replace multiple spaces with single space
        text = re.sub(r'[ \t]+', ' ', text)
        # Remove leading/trailing whitespace per line
        text = '\n'.join(line.strip() for line in text.split('\n'))
        # Remove empty lines at start and end
        text = text.strip()
        return text

    def clean_document(self, title: str, content: str, source: str) -> CleanedDocument:
        """Full cleaning pipeline."""
        steps = []
        cleaned = content

        if '<' in content and '>' in content:
            cleaned = self.clean_html(cleaned)
            steps.append("html_stripped")
        else:
            cleaned = self.normalize(cleaned)
            steps.append("whitespace_normalized")

        return CleanedDocument(
            title=title,
            content=cleaned,
            original_source=source,
            cleaning_steps=steps,
        )


__all__ = [
    "CleanedDocument",
    "DocumentCleaner",
]
