"""Gemini AI Provider.

Uses Google's Gemini API for deep reasoning and tutoring.
Uses the new google.genai SDK (async client via client.aio).

Requires: GEMINI_API_KEY environment variable.
Get one at: https://aistudio.google.com/apikey
"""

import logging
from collections.abc import AsyncGenerator

from app.ai.providers.base import AIProvider, AIResponse, AIStreamChunk
from app.infrastructure.config import settings

logger = logging.getLogger(__name__)

# Try to import the new Gemini SDK
try:
    from google import genai
    from google.genai import errors as genai_errors
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    logger.warning("google.genai not installed. Install with: pip install google-genai")


class GeminiProvider(AIProvider):
    """Provider for Google's Gemini models using the new google.genai SDK."""

    name = "gemini"

    _DEFAULT_MODELS = {
        "fast": "gemini-2.0-flash",
        "balanced": "gemini-2.0-flash",
        "deep": "gemini-2.5-flash",
        "research": "gemini-2.5-pro",
    }

    def __init__(self) -> None:
        self._client = None
        self._configured = False
        self._init_client()

    def _init_client(self) -> None:
        """Initialize the Gemini client if API key is available."""
        if not HAS_GEMINI:
            self._configured = False
            return

        api_key = settings.gemini_api_key
        if not api_key:
            self._configured = False
            return

        try:
            self._client = genai.Client(api_key=api_key)
            self._configured = True
            logger.info("Gemini provider configured successfully")
        except Exception as e:
            self._configured = False
            logger.warning(f"Failed to configure Gemini: {e}")

    def _get_model_name(self, mode: str = "balanced") -> str:
        """Resolve the model name for a given mode."""
        slot_key = f"gemini_{mode}_model"
        slot_val = getattr(settings, slot_key, None)
        if slot_val:
            return slot_val

        if settings.gemini_model:
            return settings.gemini_model

        return self._DEFAULT_MODELS.get(mode, self._DEFAULT_MODELS["balanced"])

    def is_available(self) -> bool:
        return self._configured and HAS_GEMINI

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
            contents = prompt
            if system_prompt:
                contents = f"{system_prompt}\n\n{prompt}"

            response = await self._client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                },
            )

            return AIResponse(
                content=response.text,
                content_type="text",
                model_used=model_name,
                provider=self.name,
            )

        except genai_errors.ClientError as e:
            error_msg = str(e)
            if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
                logger.warning("Gemini rate limit hit")
                return AIResponse(
                    content=("I've reached my rate limit for the moment. "
                             "Give me a few seconds and try again."),
                    content_type="text",
                    model_used=self.name,
                    provider=self.name,
                    error_type="rate_limit",
                )
            elif "API_KEY_INVALID" in error_msg or "API key not found" in error_msg:
                return AIResponse(
                    content=self._get_setup_message(),
                    content_type="text",
                    model_used="none",
                    provider=self.name,
                    error_type="setup_required",
                )
            else:
                logger.error(f"Gemini client error: {e}")
                return AIResponse(
                    content=f"I'm having trouble connecting: {str(e)[:200]}",
                    content_type="text",
                    model_used=self.name,
                    provider=self.name,
                )

        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            return AIResponse(
                content=f"I encountered an error: {str(e)[:300]}",
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
            contents = prompt
            if system_prompt:
                contents = f"{system_prompt}\n\n{prompt}"

            stream = await self._client.aio.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                },
            )

            async for chunk in stream:
                if chunk.text:
                    yield AIStreamChunk(
                        content=chunk.text,
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
            logger.error(f"Gemini streaming error: {e}")
            yield AIStreamChunk(
                content=f"\n\n[Error: {str(e)[:200]}]",
                model_used=self.name,
                provider=self.name,
                done=True,
            )

    def _get_setup_message(self) -> str:
        return (
            "I'm Synaris, your AI learning assistant.\n\n"
            "To get started with AI responses, you'll need a Gemini API key:\n\n"
            "1. Go to https://aistudio.google.com/apikey\n"
            "2. Create a free API key\n"
            "3. Add it to your `.env` file:\n"
            "   GEMINI_API_KEY=your-key-here\n"
            "4. Restart the server\n\n"
            "Once configured, I'll be ready to help you learn anything."
        )


# Singleton instance
provider = GeminiProvider()
