"""Embedding generation for the Knowledge Engine."""

from app.knowledge.embeddings.service import (
    EmbeddingResult,
    EmbeddingService,
    get_embedding_service,
)

__all__ = ["EmbeddingService", "EmbeddingResult", "get_embedding_service"]
