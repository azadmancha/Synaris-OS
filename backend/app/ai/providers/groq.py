"""Groq AI Provider.

Provides fast LLM inference via Groq's LPU hardware.
Ideal for quick responses, simple Q&A, and code generation.

API key environment variable: GROQ_API_KEY
Get one at: https://console.groq.com/keys
"""

from collections.abc import AsyncGenerator
import logging

from app.ai.providers.base import AIProvider, AIResponse, AIStreamChunk
from app.infrastructure.config import settings

logger = logging.getLogger(__name__)

try:
    from groq import AsyncGroq
    from groq import GroqError
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False
    logger.warning("groq not installed. Install with: pip install groq")


class GroqProvider(AIProvider):
    """Provider for Groq's fast LLM inference."""

    name = "groq"

    _DEFAULT_MODELS = {
        "fast": "llama-3.3-70b-versatile",
        "balanced": "llama-3.3-70b-versatile",
        "deep": "llama-3.3-70b-versatile",
        "code": "llama-3.3-70b-versatile",
    }

    def __init__(self):
        self._client = None
        self._configured = False
        self._init_client()

    def _init_client(self):
        """Initialize the Groq client if API key is available."""
        if not HAS_GROQ:
            self._configured = False
            return

        api_key = settings.groq_api_key
        if not api_key:
            self._configured = False
            return

        try:
            self._client = AsyncGroq(api_key=api_key)
            self._configured = True
            logger.info("Groq provider configured successfully")
        except Exception as e:
            self._configured = False
            logger.warning(f"Failed to configure Groq: {e}")

    def _get_model_name(self, mode: str = "balanced") -> str:
        """Resolve the model name for a given mode."""
        slot_key = f"groq_{mode}_model"
        slot_val = getattr(settings, slot_key, None)
        if slot_val:
            return slot_val

        if settings.groq_model:
            return settings.groq_model

        return self._DEFAULT_MODELS.get(mode, self._DEFAULT_MODELS["balanced"])

    def is_available(self) -> bool:
        return self._configured and HAS_GROQ

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

        except GroqError as e:
            error_msg = str(e)
            if "rate_limit" in error_msg.lower() or "429" in error_msg:
                return AIResponse(
                    content="I've reached my rate limit for the moment. Give me a few seconds and try again.",
                    content_type="text",
                    model_used=self.name,
                    provider=self.name,
                    error_type="rate_limit",
                )
            elif "invalid_api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                return AIResponse(
                    content=self._get_setup_message(),
                    content_type="text",
                    model_used="none",
                    provider=self.name,
                    error_type="setup_required",
                )
            else:
                logger.error(f"Groq error: {e}")
                return AIResponse(
                    content=f"I'm having trouble connecting: {str(e)[:200]}",
                    content_type="text",
                    model_used=self.name,
                    provider=self.name,
                )

        except Exception as e:
            logger.error(f"Groq generation failed: {e}")
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
            logger.error(f"Groq streaming error: {e}")
            yield AIStreamChunk(
                content=f"\n\n[Error: {str(e)[:200]}]",
                model_used=self.name,
                provider=self.name,
                done=True,
            )

    def _get_setup_message(self) -> str:
        return (
            "I'm Synaris, your AI learning assistant.\n\n"
            "Groq provides fast AI responses. To enable it:\n\n"
            "1. Go to https://console.groq.com/keys\n"
            "2. Create a free API key\n"
            "3. Add it to your `.env`:\n"
            "   GROQ_API_KEY=your-key-here\n"
            "4. Restart the server\n\n"
            "Alternatively, Gemini is already configured."
        )


# Singleton instance
provider = GroqProvider()
