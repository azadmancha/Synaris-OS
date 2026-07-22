"""Knowledge Engine — Knowledge retrieval, search, and citation.

Part of the Synaris AI Learning Platform.

Architecture:
    Sources → Chunking → Embeddings → pgvector Search → Reranking → Context → Citation

Not just RAG — a full Knowledge Engine that learns from multiple
sources and provides structured, citable educational content.
"""

from app.knowledge.embeddings import EmbeddingService, EmbeddingResult
from app.knowledge.context import ContextBuilder, ContextDocument, LLMContext, get_context_builder
from app.knowledge.pipeline import KnowledgePipeline, KnowledgeResult, get_knowledge_pipeline, augment_with_knowledge

__all__ = [
    "EmbeddingService",
    "EmbeddingResult",
    "ContextBuilder",
    "ContextDocument",
    "LLMContext",
    "get_context_builder",
    "KnowledgePipeline",
    "KnowledgeResult",
    "get_knowledge_pipeline",
    "augment_with_knowledge",
]
