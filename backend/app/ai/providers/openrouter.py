"""OpenRouter AI Provider.

Provides access to 200+ models through a single API.
OpenRouter serves as a unified gateway to models from
OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, and more.

Base URL: https://openrouter.ai/api/v1 (OpenAI-compatible)
API key environment variable: OPENROUTER_API_KEY
Get one at: https://openrouter.ai/keys
"""

import logging
from collections.abc import AsyncGenerator

from app.ai.providers.base import AIProvider, AIResponse, AIStreamChunk
from app.infrastructure.config import settings

logger = logging.getLogger(__name__)

try:
    from openai import AsyncOpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    logger.warning("openai not installed. Install with: pip install openai")


class OpenRouterProvider(AIProvider):
    """Provider for OpenRouter's multi-model gateway."""

    name = "openrouter"

    _DEFAULT_MODELS = {
        "fast": "openrouter/free",
        "balanced": "openrouter/free",
        "deep": "openrouter/free",
        "code": "openrouter/free",
        "research": "google/gemini-2.0-flash-001",
    }

    def __init__(self) -> None:
        self._client = None
        self._configured = False
        self._init_client()

    def _init_client(self) -> None:
        """Initialize the OpenRouter client if API key is available."""
        if not HAS_OPENAI:
            self._configured = False
            return

        api_key = settings.openrouter_api_key
        if not api_key:
            self._configured = False
            return

        try:
            self._client = AsyncOpenAI(
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1",
                timeout=30.0,
                default_headers={
                    "HTTP-Referer": "https://synaris.app",
                    "X-Title": "Synaris",
                },
            )
            self._configured = True
            logger.info("OpenRouter provider configured successfully")
        except Exception as e:
            self._configured = False
            logger.warning(f"Failed to configure OpenRouter: {e}")

    def _get_model_name(self, mode: str = "balanced") -> str:
        """Resolve the model name for a given mode."""
        slot_key = f"openrouter_{mode}_model"
        slot_val = getattr(settings, slot_key, None)
        if slot_val:
            return slot_val

        if settings.openrouter_model:
            return settings.openrouter_model

        return self._DEFAULT_MODELS.get(mode, self._DEFAULT_MODELS["balanced"])

    def is_available(self) -> bool:
        return self._configured and HAS_OPENAI

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        mode: str = "balanced",
    ) -> AIResponse:
        if not self.is_available():
            return AIResponse(
                content=self._get_setup_message(),
                content_type="text",
                model_used="none",
                provider=self.name,
            )

        try:
            model_name = self._get_model_name(mode)

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = await self._client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            return AIResponse(
                content=response.choices[0].message.content or "",
                content_type="text",
                model_used=model_name,
                provider=self.name,
            )

        except Exception as e:
            error_msg = str(e).lower()

            if "rate" in error_msg or "429" in error_msg or "too many" in error_msg:
                return AIResponse(
                    content="I've reached my rate limit for the moment. Give me a few seconds and try again.",
                    content_type="text",
                    model_used=self.name,
                    provider=self.name,
                    error_type="rate_limit",
                )

            if "401" in error_msg or "unauthorized" in error_msg or "403" in error_msg:
                return AIResponse(
                    content=self._get_setup_message(),
                    content_type="text",
                    model_used="none",
                    provider=self.name,
                )

            if "insufficient" in error_msg or "balance" in error_msg or "credit" in error_msg:
                return AIResponse(
                    content="My OpenRouter credits are running low. I'll switch to another provider for now.",
                    content_type="text",
                    model_used=self.name,
                    provider=self.name,
                )

            if "404" in error_msg or "no endpoints" in error_msg:
                return AIResponse(
                    content="That model isn't available on my current account. I'll use a different provider.",
                    content_type="text",
                    model_used=self.name,
                    provider=self.name,
                )

            logger.error(f"OpenRouter error: {e}")
            return AIResponse(
                content=f"I'm having trouble connecting: {str(e)[:200]}",
                content_type="text",
                model_used=self.name,
                provider=self.name,
            )

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        mode: str = "balanced",
    ) -> AsyncGenerator[AIStreamChunk, None]:
        if not self.is_available():
            yield AIStreamChunk(
                content=self._get_setup_message(),
                model_used="none",
                provider=self.name,
                done=True,
            )
            return

        try:
            model_name = self._get_model_name(mode)

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            stream = await self._client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        yield AIStreamChunk(
                            content=delta.content,
                            model_used=model_name,
                            provider=self.name,
                            done=False,
                        )

            yield AIStreamChunk(
                content="",
                model_used=model_name,
                provider=self.name,
                done=True,
            )

        except Exception as e:
            logger.error(f"OpenRouter streaming error: {e}")
            yield AIStreamChunk(
                content=f"\n\n[Error: {str(e)[:200]}]",
                model_used=self.name,
                provider=self.name,
                done=True,
            )

    def _get_setup_message(self) -> str:
        return (
            "I'm Synaris, your AI learning assistant.\n\n"
            "OpenRouter provides access to 200+ models. To enable it:\n\n"
            "1. Go to https://openrouter.ai/keys\n"
            "2. Create a free API key\n"
            "3. Add it to your `.env`:\n"
            "   OPENROUTER_API_KEY=your-key-here\n"
            "4. Restart the server\n\n"
            "Alternatively, Gemini or Groq may already be configured."
        )


# Singleton instance
provider = OpenRouterProvider()
