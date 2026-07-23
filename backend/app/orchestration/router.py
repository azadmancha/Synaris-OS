"""AI Request Router.

Routes requests to the optimal available provider based on
task type, mode, and availability.

Routing architecture (LiteLLM-first):
    LiteLLM (primary) → handles 100+ models via unified API
    Fallback SDK providers (Gemini, Groq, OpenRouter) if LiteLLM is down

Switching models is now a config change, not a code change.
Set LITELLM_<MODE>_MODEL in .env to switch providers.
"""

import logging
from collections.abc import AsyncGenerator

from app.ai.providers.base import AIProvider, AIResponse, AIStreamChunk
from app.ai.providers.gemini import provider as gemini_provider
from app.ai.providers.groq import provider as groq_provider
from app.ai.providers.litellm import provider as litellm_provider
from app.ai.providers.openrouter import provider as openrouter_provider

logger = logging.getLogger(__name__)


class RequestRouter:
    """Routes AI requests to the best available provider.

    LiteLLM is tried first. If it fails, we fall back to
    individual SDK providers (Gemini, Groq, OpenRouter).
    """

    def __init__(self) -> None:
        self._providers: dict[str, AIProvider] = {}
        self._register_providers()

    def _register_providers(self) -> None:
        """Register all available providers on startup.

        LiteLLM is registered first and is the primary provider.
        SDK providers are fallbacks.
        """
        self._register(litellm_provider)
        self._register(gemini_provider)
        self._register(groq_provider)
        self._register(openrouter_provider)
        # TODO(v3): Register Ollama provider (local)

    def _register(self, provider: AIProvider) -> None:
        """Register a provider by name."""
        self._providers[provider.name] = provider
        logger.info(f"Registered provider: {provider.name}")

    def get_available_providers(self) -> list[AIProvider]:
        """Get all providers that are configured and available."""
        return [p for p in self._providers.values() if p.is_available()]

    async def _try_providers_stream(
        self,
        available: list[AIProvider],
        prompt: str,
        system_prompt: str | None,
        mode: str,
    ) -> AsyncGenerator[AIStreamChunk, None]:
        """Try providers in priority order with streaming."""
        for provider in self._get_priority_order(available, mode):
            try:
                saw_error = False
                async for chunk in provider.generate_stream(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    mode=mode,
                ):
                    if chunk.error_type:
                        logger.info(f"Provider {provider.name} streaming returned {chunk.error_type}, trying next")
                        saw_error = True
                        break
                    yield chunk
                    if chunk.done:
                        return
                if saw_error:
                    continue
                return
            except Exception as e:
                logger.warning(f"Provider {provider.name} streaming failed: {e}")
                continue

        yield AIStreamChunk(
            content="I'm having trouble connecting to my AI services. Please check your API keys and try again.",
            model_used="none",
            provider="none",
            done=True,
        )

    async def route(
        self,
        prompt: str,
        system_prompt: str | None = None,
        mode: str = "balanced",
    ) -> AIResponse:
        """Route a request to the best available provider.

        Priority: LiteLLM → Gemini → Groq → OpenRouter
        Falls through to the next provider if one fails.
        """
        available = self.get_available_providers()

        if not available:
            return AIResponse(
                content=self._get_setup_guide(),
                content_type="text",
                model_used="none",
            )

        errors = []
        for provider in self._get_priority_order(available, mode):
            try:
                response = await provider.generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    mode=mode,
                )
                if response.error_type:
                    logger.info(f"Provider {provider.name} returned {response.error_type}, trying next")
                    errors.append(f"{provider.name}: {response.error_type}")
                    continue
                if response.content:
                    return response
            except Exception as e:
                logger.warning(f"Provider {provider.name} failed: {e}")
                errors.append(f"{provider.name}: {str(e)}")
                continue

        error_detail = "; ".join(errors)
        logger.error(f"All providers failed: {error_detail}")
        return AIResponse(
            content=f"I'm having trouble connecting to my AI services. Details: {error_detail}",
            content_type="text",
            model_used="none",
        )

    async def route_stream(
        self,
        prompt: str,
        system_prompt: str | None = None,
        mode: str = "balanced",
    ) -> AsyncGenerator[AIStreamChunk, None]:
        """Route a request to the best available provider and stream the response."""
        available = self.get_available_providers()

        if not available:
            yield AIStreamChunk(
                content=self._get_setup_guide(),
                model_used="none",
                provider="none",
                done=True,
            )
            return

        async for chunk in self._try_providers_stream(available, prompt, system_prompt, mode):
            yield chunk

    def _get_priority_order(
        self,
        available: list[AIProvider],
        mode: str,
    ) -> list[AIProvider]:
        """Sort providers by priority for the given mode.

        LiteLLM is always first (it handles 100+ models).
        If LiteLLM fails, fall back to SDK providers.
        """
        providers_by_name = {p.name: p for p in available}

        # LiteLLM always first, then SDK providers by mode preference
        if mode in ("deep_dive", "expert", "research"):
            order = ["litellm", "gemini", "openrouter", "groq", "ollama"]
        elif mode == "quick":
            order = ["litellm", "groq", "gemini", "openrouter", "ollama"]
        else:
            order = ["litellm", "gemini", "groq", "openrouter", "ollama"]

        return [providers_by_name[name] for name in order if name in providers_by_name]

    def _get_setup_guide(self) -> str:
        """Return a setup guide when no providers are available."""
        return (
            "Welcome to Synaris!\n\n"
            "I'm your AI learning assistant. To get started, add an API key to your `.env` file:\n\n"
            "• Gemini:   https://aistudio.google.com/apikey   → GEMINI_API_KEY\n"
            "• Groq:     https://console.groq.com/keys       → GROQ_API_KEY\n"
            "• OpenRouter: https://openrouter.ai/keys         → OPENROUTER_API_KEY\n"
            "• Anthropic: https://console.anthropic.com/      → ANTHROPIC_API_KEY\n"
            "• OpenAI:   https://platform.openai.com/api-keys → OPENAI_API_KEY\n\n"
            "You only need one. Then restart the server."
        )


# Singleton router
router = RequestRouter()


async def route_request(
    prompt: str,
    system_prompt: str | None = None,
    mode: str = "balanced",
) -> AIResponse:
    """Convenience function to route a request through the orchestrator."""
    return await router.route(
        prompt=prompt,
        system_prompt=system_prompt,
        mode=mode,
    )


async def route_request_stream(
    prompt: str,
    system_prompt: str | None = None,
    mode: str = "balanced",
) -> AsyncGenerator[AIStreamChunk, None]:
    """Convenience function to route a streaming request through the orchestrator."""
    async for chunk in router.route_stream(
        prompt=prompt,
        system_prompt=system_prompt,
        mode=mode,
    ):
        yield chunk
