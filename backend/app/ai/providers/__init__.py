"""AI Provider implementations.

Architecture (LiteLLM-first):
    Router → LiteLLM (primary) → 100+ models via unified API
           ↘ Fallback SDK providers (Gemini, Groq, OpenRouter)

LiteLLM is the primary provider. Individual SDK providers
are kept as fallbacks for when LiteLLM is unavailable.
"""

from app.ai.providers.base import AIProvider, AIResponse, AIStreamChunk
from app.ai.providers.gemini import provider as gemini_provider
from app.ai.providers.groq import provider as groq_provider
from app.ai.providers.litellm import provider as litellm_provider
from app.ai.providers.openrouter import provider as openrouter_provider

# Provider registry
# LiteLLM is the primary — it handles 100+ models through one interface.
# SDK providers are fallbacks for specific cases.
AVAILABLE_PROVIDERS: dict[str, AIProvider] = {
    "litellm": litellm_provider,  # Primary — unified interface
    "gemini": gemini_provider,  # Fallback — direct SDK
    "groq": groq_provider,  # Fallback — direct SDK
    "openrouter": openrouter_provider,  # Fallback — direct SDK
    # TODO(v3): Ollama provider (local models)
}

__all__ = [
    "AIProvider",
    "AIResponse",
    "AIStreamChunk",
    "AVAILABLE_PROVIDERS",
    "litellm_provider",
    "gemini_provider",
    "groq_provider",
    "openrouter_provider",
]
