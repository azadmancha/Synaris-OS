"""AI Provider interface.

All AI providers implement this interface.
The Orchestrator routes requests to the appropriate provider.

Adding a new provider:
1. Create a new file in ai/providers/
2. Implement the AIProvider interface
3. Register it in orchestration/router.py
"""

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from dataclasses import dataclass


@dataclass
class AIResponse:
    """Standard response from any AI provider."""
    content: str
    content_type: str = "text"
    model_used: str = "unknown"
    evaluation_score: float | None = None
    provider: str = "unknown"
    raw_response: dict | None = None
    error_type: str | None = None  # "rate_limit", "setup_required", or None for success


@dataclass
class AIStreamChunk:
    """A single chunk from a streaming AI response."""
    content: str
    model_used: str = "unknown"
    provider: str = "unknown"
    done: bool = False
    error_type: str | None = None  # "rate_limit", "setup_required", or None for success


class AIProvider(ABC):
    """Abstract base class for AI providers.

    Every provider must implement `generate()`.
    The orchestrator calls this method and receives
    a standardized AIResponse.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name (e.g., 'gemini', 'groq')."""
        ...

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        mode: str = "balanced",
    ) -> AIResponse:
        """Send a prompt to the AI model and return the response.

        Args:
            prompt: The user's message or prompt.
            system_prompt: Optional system instructions.
            temperature: Creativity (0.0 = deterministic, 1.0 = creative).
            max_tokens: Maximum response length.
            mode: Learning mode (quick, balanced, deep_dive, expert, research).

        Returns:
            AIResponse with the generated content.
        """
        ...

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        mode: str = "balanced",
    ) -> AsyncGenerator[AIStreamChunk, None]:
        """Stream tokens from the AI model.

        Default implementation falls back to `generate()`
        and yields the full response as a single chunk.
        Override in subclasses that support true streaming.
        """
        response = await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            mode=mode,
        )
        yield AIStreamChunk(
            content=response.content,
            model_used=response.model_used,
            provider=self.name,
            done=True,
        )

    def is_available(self) -> bool:
        """Check if this provider is configured and available.

        Returns True if the provider has the necessary
        API keys and configuration to make requests.
        """
        return False
