"""
Embedding Service.

Generates vector embeddings from text using:
1. Gemini Embedding API (primary — uses `output_dimensionality=768` via MRL)
2. Lightweight local fallback (character n-gram hashing, works offline)

Architecture:
    Input Text → Gemini API → 768-dim Vector (MRL-truncated from 3072)
              ↘ Local Fallback → 384-dim Vector (compatible dim)

Why 768:
    gemini-embedding-001 natively outputs 3072 dimensions, but we request
    768 via `output_dimensionality` (Matryoshka Representation Learning).
    The first 768 dimensions of a 3072-vector are optimized for quality,
    so this preserves most of the fidelity while halving storage costs.
"""

import asyncio
import hashlib
import logging
import math
from collections.abc import Sequence

from app.infrastructure.config import settings

logger = logging.getLogger(__name__)

# ── Try Gemini SDK ────────────────────────────────────────

try:
    from google import genai
    from google.genai import errors as genai_errors
    from google.genai import types as genai_types

    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    genai_types = None
    logger.warning("google-genai not installed. Install with: pip install google-genai")


# ── Results ────────────────────────────────────────────────


class EmbeddingResult:
    """Result of embedding a single text."""

    def __init__(self, text: str, vector: list[float], model: str, dimension: int) -> None:
        self.text = text
        self.vector = vector
        self.model = model
        self.dimension = dimension

    def __repr__(self) -> str:
        return f"<Embedding dim={self.dimension} model={self.model}>"


# ── Constants ──────────────────────────────────────────────

# Gemini's native output is 3072, but we request 768 via MRL.
# This is the dimension used for the Qdrant collection schema.
GEMINI_EMBEDDING_DIM = 768
GEMINI_EMBEDDING_MODEL = "models/gemini-embedding-001"
LOCAL_EMBEDDING_DIM = 768
MAX_CHARS_PER_CHUNK = 8000

# Rate-limit backoff config
_MAX_RETRIES = 3
_INITIAL_BACKOFF = 2.0  # seconds


# ── Service ────────────────────────────────────────────────


class EmbeddingService:
    """Generates vector embeddings from text.

    Designed for the Knowledge Engine:
    - Batches texts for efficient API usage
    - Falls back gracefully when API is unavailable or rate-limited
    - Returns consistent dimension embeddings regardless of source
    """

    def __init__(self, api_key: str | None = None) -> None:
        self._gemini_client = None
        self._has_gemini = False

        if api_key and HAS_GEMINI:
            try:
                self._gemini_client = genai.Client(api_key=api_key)
                self._has_gemini = True
                logger.info("Gemini embedding service initialized (dim=%d)", GEMINI_EMBEDDING_DIM)
            except Exception as e:
                logger.warning("Failed to init Gemini embedding client: %s", e)

        if not self._has_gemini:
            logger.info("Using local embedding fallback (character n-gram hashing)")

    @property
    def is_available(self) -> bool:
        return self._has_gemini

    @property
    def dimension(self) -> int:
        """Return the embedding dimension used by this service.

        We always return GEMINI_EMBEDDING_DIM (768) for consistency,
        so both Gemini and local fallback generate vectors of the same size.
        """
        return GEMINI_EMBEDDING_DIM

    async def embed(self, text: str) -> EmbeddingResult:
        """Embed a single text string."""
        if self._has_gemini and len(text) <= MAX_CHARS_PER_CHUNK:
            return await self._gemini_embed_with_retry(text)
        return self._local_embed(text)

    async def embed_batch(self, texts: Sequence[str]) -> list[EmbeddingResult]:
        """Embed multiple texts in a single API call (if supported).

        Falls back to individual embeddings with backoff when
        rate-limited or when texts exceed the chunk size limit.
        """
        if not texts:
            return []

        if self._has_gemini:
            api_texts = [t for t in texts if len(t) <= MAX_CHARS_PER_CHUNK]
            local_texts = [t for t in texts if len(t) > MAX_CHARS_PER_CHUNK]

            results: list[EmbeddingResult] = []

            if api_texts:
                batch = await self._gemini_embed_batch_with_retry(api_texts)
                results.extend(batch)

            for t in local_texts:
                results.append(self._local_embed(t))

            # Preserve original order
            text_to_result = {r.text: r for r in results}
            return [text_to_result[t] for t in texts]

        return [self._local_embed(t) for t in texts]

    # ── Gemini embedding with retry ──────────────────────

    async def _gemini_embed_with_retry(self, text: str) -> EmbeddingResult:
        """Embed via Gemini API with exponential backoff on rate limits."""
        for attempt in range(_MAX_RETRIES + 1):
            try:
                response = self._gemini_client.models.embed_content(
                    model=GEMINI_EMBEDDING_MODEL,
                    contents=text,
                    config=genai_types.EmbedContentConfig(
                        output_dimensionality=GEMINI_EMBEDDING_DIM,
                    )
                    if genai_types
                    else None,
                )
                vector = response.embeddings[0].values
                return EmbeddingResult(
                    text=text,
                    vector=vector,
                    model=GEMINI_EMBEDDING_MODEL,
                    dimension=len(vector),
                )
            except genai_errors.ClientError as e:
                if "429" in str(e) or "rate" in str(e).lower():
                    if attempt < _MAX_RETRIES:
                        backoff = _INITIAL_BACKOFF * (2**attempt)
                        logger.warning(
                            "Gemini embedding rate-limited (attempt %d/%d), retrying in %.1fs...",
                            attempt + 1,
                            _MAX_RETRIES + 1,
                            backoff,
                        )
                        await asyncio.sleep(backoff)
                        continue
                else:
                    logger.warning("Gemini embedding API error: %s", e)
                    return self._local_embed(text)
            except Exception as e:
                logger.warning("Gemini embedding unexpected error: %s", e)
                return self._local_embed(text)

        # All retries exhausted — fall back to local
        logger.warning(
            "Gemini embedding rate-limited after %d retries, falling back to local",
            _MAX_RETRIES + 1,
        )
        return self._local_embed(text)

    async def _gemini_embed_batch_with_retry(
        self,
        texts: Sequence[str],
    ) -> list[EmbeddingResult]:
        """Embed multiple texts via Gemini API with retry on rate limits."""
        for attempt in range(_MAX_RETRIES + 1):
            try:
                response = self._gemini_client.models.embed_content(
                    model=GEMINI_EMBEDDING_MODEL,
                    contents=list(texts),
                    config=genai_types.EmbedContentConfig(
                        output_dimensionality=GEMINI_EMBEDDING_DIM,
                    )
                    if genai_types
                    else None,
                )
                results = []
                for i, embedding in enumerate(response.embeddings):
                    results.append(
                        EmbeddingResult(
                            text=texts[i],
                            vector=embedding.values,
                            model=GEMINI_EMBEDDING_MODEL,
                            dimension=len(embedding.values),
                        )
                    )
                return results
            except genai_errors.ClientError as e:
                if "429" in str(e) or "rate" in str(e).lower():
                    if attempt < _MAX_RETRIES:
                        backoff = _INITIAL_BACKOFF * (2**attempt)
                        logger.warning(
                            "Gemini batch embedding rate-limited (attempt %d/%d), retrying in %.1fs...",
                            attempt + 1,
                            _MAX_RETRIES + 1,
                            backoff,
                        )
                        await asyncio.sleep(backoff)
                        continue
                else:
                    logger.warning("Gemini batch embedding API error: %s", e)
                    # Fall back to individual embeddings
                    return [await self._gemini_embed_with_retry(t) for t in texts]
            except Exception as e:
                logger.warning("Gemini batch embedding unexpected error: %s", e)
                return [await self._gemini_embed_with_retry(t) for t in texts]

        # All retries exhausted — fall back to individual (which will then local-fallback)
        logger.warning(
            "Gemini batch embedding rate-limited after %d retries, falling back to individual embeds",
            _MAX_RETRIES + 1,
        )
        return [await self._gemini_embed_with_retry(t) for t in texts]

    # ── Local fallback ─────────────────────────────────────

    def _local_embed(self, text: str) -> EmbeddingResult:
        """Lightweight local embedding using character n-gram hashing.

        Not as accurate as Gemini, but works offline and has no rate limits.
        Uses 384-dimensional vectors with L2-normalization.
        """
        dim = LOCAL_EMBEDDING_DIM
        vector = [0.0] * dim

        if not text:
            return EmbeddingResult(text=text, vector=vector, model="local-ngram", dimension=dim)

        text = text.lower()
        total_ngrams = 0

        for n in (2, 3):
            for i in range(len(text) - n + 1):
                ngram = text[i : i + n]
                hash_val = int(hashlib.md5(ngram.encode()).hexdigest(), 16)
                idx = hash_val % dim
                vector[idx] += 1.0
                total_ngrams += 1

        # L2-normalize
        if total_ngrams > 0:
            magnitude = math.sqrt(sum(v * v for v in vector))
            if magnitude > 0:
                vector = [v / magnitude for v in vector]

        return EmbeddingResult(
            text=text,
            vector=vector,
            model="local-ngram",
            dimension=dim,
        )


# Singleton
_service: EmbeddingService | None = None


def get_embedding_service(api_key: str | None = None) -> EmbeddingService:
    """Get or create the singleton embedding service."""
    global _service
    if _service is None:
        _service = EmbeddingService(api_key=api_key or settings.gemini_api_key)
    return _service
