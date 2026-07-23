"""LiteLLM AI Provider.

Unified provider for 100+ LLM models through LiteLLM.
Replaces individual SDK-based providers (Gemini, Groq, OpenRouter)
with a single interface that routes to any model.

Usage:
    # Just change the model name in .env to switch providers:
    LITELLM_BALANCED_MODEL=gemini/gemini-2.0-flash
    LITELLM_BALANCED_MODEL=groq/llama-3.3-70b-versatile
    LITELLM_BALANCED_MODEL=openrouter/free
    LITELLM_BALANCED_MODEL=openai/gpt-4o
    LITELLM_BALANCED_MODEL=deepseek/deepseek-chat
    LITELLM_BALANCED_MODEL=anthropic/claude-3-opus-20240229

Provider prefix format:
    <provider>/<model_name>
    Example: gemini/gemini-2.0-flash, groq/llama3-70b-8192

Requires the appropriate API key for whatever provider you use.
"""

import logging
from collections.abc import AsyncGenerator

from app.ai.providers.base import AIProvider, AIResponse, AIStreamChunk
from app.ai.providers.key_manager import get_env_var_for_provider, get_key_manager
from app.infrastructure.config import settings


class ProviderRetryError(Exception):
    """Raised when a provider should be skipped and the next one tried.

    Used for retryable errors like rate limits, model not found,
    or insufficient credits — cases where another provider
    might succeed where this one failed.

    The router catches this exception and automatically tries
    the next available provider in the priority chain.
    """
    def __init__(self, message: str, error_type: str = "retryable") -> None:
        self.error_type = error_type
        super().__init__(message)

logger = logging.getLogger(__name__)

# Try to import LiteLLM
try:
    import litellm
    from litellm import acompletion
    HAS_LITELLM = True
    # Disable LiteLLM's internal logging by default
    litellm.suppress_debug_info = True
    litellm.set_verbose = False
except ImportError:
    HAS_LITELLM = False
    logger.warning("litellm not installed. Install with: pip install litellm")


def _get_provider_prefix(model: str) -> str:
    """Extract the provider prefix from a LiteLLM model name.

    Examples:
        "groq/llama-3.3-70b-versatile" → "groq"
        "gemini/gemini-2.0-flash" → "gemini"
        "openrouter/free" → "openrouter"
    """
    return model.split("/")[0] if "/" in model else ""


def _setup_key_for_model(model: str) -> str | None:
    """Set up the API key for a model's provider.

    If the provider has multiple keys configured (comma-separated in .env),
    this activates key rotation by setting the env var to the current key.

    Returns the provider name if key was set, None if all keys exhausted.
    """
    provider = _get_provider_prefix(model)
    if not provider:
        return None

    km = get_key_manager(provider)
    if km is None or km.key_count == 0:
        # No key manager — keys will be read from env by LiteLLM directly
        return provider

    env_var = get_env_var_for_provider(provider)
    if km.set_env_var(env_var):
        return provider

    # All keys exhausted for this provider
    return None


class LiteLLMProvider(AIProvider):
    """Unified AI provider powered by LiteLLM.

    Supports 100+ models through a single interface.
    Model selection, provider switching, and API keys
    are all managed through environment variables.

    LiteLLM reads API keys from standard env vars:
        GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY,
        GROQ_API_KEY, DEEPSEEK_API_KEY, etc.

    So no additional key mapping needed — just set the
    env vars you already have.
    """

    name = "litellm"

    # Default models per mode — override via .env:
    # LITELLM_FAST_MODEL, LITELLM_BALANCED_MODEL, LITELLM_DEEP_MODEL, etc.
    _DEFAULT_MODELS = {
        "fast": "groq/llama-3.1-8b-instant",
        "balanced": "groq/llama-3.3-70b-versatile",
        "deep": "gemini/gemini-2.0-flash",
        "research": "gemini/gemini-2.0-flash",
        "code": "groq/llama-3.1-8b-instant",
    }

    # Standard env vars LiteLLM checks for API keys
    # We don't need to pass them — litellm reads from env automatically
    _REQUIRED_ENV_VARS = {
        "gemini": "GEMINI_API_KEY",
        "groq": "GROQ_API_KEY",
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "deepseek": "DEEPSEEK_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
    }

    def __init__(self) -> None:
        self._configured = HAS_LITELLM
        if self._configured:
            logger.info("LiteLLM provider initialized (reads API keys from env)")
        else:
            logger.warning("LiteLLM provider unavailable — litellm not installed")

    def _get_model_name(self, mode: str = "balanced") -> str:
        """Resolve the model name for a given mode.

        Priority (highest first):
        1. Per-slot env var  (e.g. LITELLM_DEEP_MODEL)
        2. LiteLLM global model env var (LITELLM_MODEL)
        3. Hardcoded default (from _DEFAULT_MODELS dict)
        """
        slot_key = f"litellm_{mode}_model"
        slot_val = getattr(settings, slot_key, None)
        if slot_val:
            logger.debug(f"LiteLLM using per-slot model for '{mode}': {slot_val}")
            return slot_val

        if settings.litellm_model:
            logger.debug(f"LiteLLM using global model for '{mode}': {settings.litellm_model}")
            return settings.litellm_model

        model = self._DEFAULT_MODELS.get(mode, self._DEFAULT_MODELS["balanced"])
        logger.debug(f"LiteLLM using default model for '{mode}': {model}")
        return model

    def _check_provider_key(self, model: str) -> bool:
        """Check if the API key is set for the model's provider.

        Extracts the provider prefix from the model name
        and checks if the corresponding env var is set.
        """
        provider = model.split("/")[0] if "/" in model else ""
        env_var = self._REQUIRED_ENV_VARS.get(provider)

        if not env_var:
            # Unknown provider — assume key might be set
            return True

        key = getattr(settings, env_var.lower(), None)
        if not key:
            logger.info(f"API key not set for {provider} (needs {env_var})")
            return False

        return True

    def is_available(self) -> bool:
        """Check if LiteLLM is installed.

        Note: is_available returns True even without any API keys set,
        because LiteLLM itself is installed. The individual model
        availability is checked per-request.
        """
        return self._configured and HAS_LITELLM

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        mode: str = "balanced",
    ) -> AIResponse:
        """Generate a response using LiteLLM.

        Routes to the appropriate model based on mode.
        Supports automatic API key rotation: if multiple keys are configured
        (comma-separated in .env), the provider will rotate through them
        on rate limits before falling through to the router's next provider.
        """
        if not self.is_available():
            return AIResponse(
                content="LiteLLM is not installed. Run: pip install litellm",
                content_type="text",
                model_used="none",
                provider=self.name,
            )

        model_name = self._get_model_name(mode)

        # Check if the provider's API key is set
        if not self._check_provider_key(model_name):
            provider = model_name.split("/")[0] if "/" in model_name else model_name
            env_var = self._REQUIRED_ENV_VARS.get(provider, f"{provider.upper()}_API_KEY")
            return AIResponse(
                content=self._get_setup_message(provider, env_var),
                content_type="text",
                model_used="none",
                provider=self.name,
                error_type="setup_required",
            )

        provider_name = _get_provider_prefix(model_name)
        env_var = get_env_var_for_provider(provider_name) if provider_name else ""
        km = get_key_manager(provider_name)
        has_multi_key = km is not None and km.key_count > 1

        # Set up initial key (if multi-key, rotates through pool)
        if _setup_key_for_model(model_name) is None:
            raise ProviderRetryError(
                f"All API keys exhausted for {provider_name}",
                error_type="rate_limit",
            )

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Retry loop: tries each key once before giving up
        max_attempts = km.key_count if has_multi_key else 1

        for attempt in range(1, max_attempts + 1):
            try:
                key_hint = f" (key {attempt}/{max_attempts})" if has_multi_key else ""
                logger.info(f"LiteLLM calling {model_name} (mode={mode}){key_hint}")

                response = await acompletion(
                    model=model_name,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

                content = response.choices[0].message.content or ""

                return AIResponse(
                    content=content,
                    content_type="text",
                    model_used=model_name,
                    provider=self.name,
                )

            except Exception as e:
                # Check if this is a rate limit that we can retry with a different key
                error_msg = str(e).lower()
                is_rate_limit = any(
                    x in error_msg for x in ["rate", "429", "too many", "resource_exhausted"]
                )

                if is_rate_limit and has_multi_key:
                    logger.warning(
                        f"LiteLLM rate limit on {model_name} (attempt {attempt}/{max_attempts})"
                        f" — rotating to next key..."
                    )
                    # Mark current key exhausted and rotate
                    if km.handle_rate_limit(env_var):
                        continue  # Retry with next key
                    else:
                        # All keys exhausted — let router try next provider
                        logger.warning(f"All {max_attempts} Groq keys exhausted — falling through to next provider")
                        raise ProviderRetryError(
                            f"Rate limited on {model_name} (all {max_attempts} keys exhausted)",
                            error_type="rate_limit",
                        )

                # Non-rate-limit error or single-key mode: handle normally
                return self._handle_error(e, model_name, mode)

        # All attempts exhausted with key rotation
        raise ProviderRetryError(
            f"Rate limited on {model_name} (all {max_attempts} keys exhausted)",
            error_type="rate_limit",
        )

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        mode: str = "balanced",
    ) -> AsyncGenerator[AIStreamChunk, None]:
        """Stream a response using LiteLLM with automatic key rotation."""
        if not self.is_available():
            yield AIStreamChunk(
                content="LiteLLM is not installed. Run: pip install litellm",
                model_used="none",
                provider=self.name,
                done=True,
            )
            return

        model_name = self._get_model_name(mode)

        if not self._check_provider_key(model_name):
            provider = model_name.split("/")[0] if "/" in model_name else model_name
            env_var = self._REQUIRED_ENV_VARS.get(provider, f"{provider.upper()}_API_KEY")
            yield AIStreamChunk(
                content=self._get_setup_message(provider, env_var),
                model_used="none",
                provider=self.name,
                done=True,
            )
            return

        provider_name = _get_provider_prefix(model_name)
        env_var = get_env_var_for_provider(provider_name) if provider_name else ""
        km = get_key_manager(provider_name)
        has_multi_key = km is not None and km.key_count > 1

        # Set up initial key (if multi-key, rotates through pool)
        if _setup_key_for_model(model_name) is None:
            raise ProviderRetryError(
                f"All API keys exhausted for {provider_name}",
                error_type="rate_limit",
            )

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Retry loop: tries each key once before giving up
        max_attempts = km.key_count if has_multi_key else 1

        for attempt in range(1, max_attempts + 1):
            try:
                key_hint = f" (key {attempt}/{max_attempts})" if has_multi_key else ""
                logger.info(f"LiteLLM streaming {model_name} (mode={mode}){key_hint}")

                stream = await acompletion(
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
                return  # Success — exit the retry loop

            except Exception as e:
                error_msg = str(e).lower()
                is_rate_limit = any(
                    x in error_msg for x in ["rate", "429", "too many", "resource_exhausted"]
                )

                if is_rate_limit and has_multi_key:
                    logger.warning(
                        f"LiteLLM rate limit on {model_name} streaming (attempt {attempt}/{max_attempts})"
                        f" — rotating to next key..."
                    )
                    if km.handle_rate_limit(env_var):
                        continue  # Retry with next key
                    else:
                        logger.warning(f"All {max_attempts} keys exhausted — falling through")
                        raise ProviderRetryError(
                            f"Rate limited on {model_name} (all {max_attempts} keys exhausted)",
                            error_type="rate_limit",
                        )

                # Non-rate-limit error: handle normally
                logger.error(f"LiteLLM streaming error: {e}")
                error_response = self._handle_error(e, model_name, mode)
                yield AIStreamChunk(
                    content=error_response.content,
                    model_used=error_response.model_used,
                    provider=self.name,
                    done=True,
                    error_type=error_response.error_type,
                )
                return

        # All attempts exhausted
        raise ProviderRetryError(
            f"Rate limited on {model_name} (all {max_attempts} keys exhausted)",
            error_type="rate_limit",
        )

    def _handle_error(
        self,
        error: Exception,
        model_name: str,
        mode: str,
    ) -> AIResponse:
        """Handle errors from LiteLLM calls.

        For retryable errors (rate limit, model not found, insufficient credits),
        raises ProviderRetryError so the router can try the next provider.

        For non-retryable errors (auth, context length, generic),
        returns an AIResponse with a user-friendly message.
        """
        error_msg = str(error).lower()

        # ── Retryable: raise exception → router tries next provider ──

        # Rate limit errors (e.g. Groq 429, Gemini quota exhausted)
        if any(x in error_msg for x in ["rate", "429", "too many", "resource_exhausted"]):
            logger.warning(f"LiteLLM rate limit hit for {model_name} — router will try next provider")
            raise ProviderRetryError(
                f"Rate limited on {model_name}",
                error_type="rate_limit",
            )

        # Model not found (e.g. wrong model name, provider removed it)
        if any(x in error_msg for x in ["404", "not found", "model", "endpoint"]):
            logger.warning(f"LiteLLM model not found: {model_name} — router will try next provider")
            raise ProviderRetryError(
                f"Model {model_name} not available",
                error_type="model_not_found",
            )

        # Insufficient credits (common on OpenRouter)
        if any(x in error_msg for x in ["insufficient", "balance", "credit", "quota"]):
            logger.warning(f"LiteLLM insufficient credits for {model_name} — router will try next provider")
            raise ProviderRetryError(
                f"Insufficient credits for {model_name}",
                error_type="insufficient_credits",
            )

        # ── Non-retryable: return user-friendly message ──

        # Authentication errors (bad API key, wrong provider config)
        if any(x in error_msg for x in ["401", "unauthorized", "403", "api_key",
                                         "invalid key", "authentication", "auth"]):
            logger.error(f"LiteLLM auth error for {model_name}: {error}")
            provider = model_name.split("/")[0] if "/" in model_name else model_name
            return AIResponse(
                content=self._get_setup_message(provider),
                content_type="text",
                model_used="none",
                provider=self.name,
                error_type="setup_required",
            )

        # Context length exceeded (prompt too long for model)
        if any(x in error_msg for x in ["context", "length", "token", "too large"]):
            logger.warning(f"LiteLLM context length exceeded for {model_name}")
            return AIResponse(
                content="That question was too long for me to process. Could you break it into smaller parts?",
                content_type="text",
                model_used=model_name,
                provider=self.name,
            )

        # Generic error (fallback for unexpected errors)
        logger.error(f"LiteLLM error for {model_name}: {error}")
        return AIResponse(
            content=f"I encountered an error: {str(error)[:300]}",
            content_type="text",
            model_used=model_name,
            provider=self.name,
        )

    def _get_setup_message(self, provider: str, env_var: str = "") -> str:
        """Generate a setup message for a specific provider."""
        hints = {
            "gemini": ("Gemini API key", "https://aistudio.google.com/apikey", "GEMINI_API_KEY"),
            "groq": ("Groq API key", "https://console.groq.com/keys", "GROQ_API_KEY"),
            "openai": ("OpenAI API key", "https://platform.openai.com/api-keys", "OPENAI_API_KEY"),
            "anthropic": ("Anthropic API key", "https://console.anthropic.com/", "ANTHROPIC_API_KEY"),
            "deepseek": ("DeepSeek API key", "https://platform.deepseek.com/", "DEEPSEEK_API_KEY"),
            "openrouter": ("OpenRouter API key", "https://openrouter.ai/keys", "OPENROUTER_API_KEY"),
        }

        fallback = (f"{provider.upper()}_API_KEY", "", env_var or f"{provider.upper()}_API_KEY")
        provider_info = hints.get(provider, fallback)
        name, url, key_var = provider_info

        setup = (
            f"I'm Synaris, your AI learning assistant.\n\n"
            f"To use {provider}, you need a {name}:\n\n"
            f"1. Go to {url}\n"
            f"2. Create a free API key\n"
            f"3. Add it to your `.env` file:\n"
            f"   {key_var}=your-key-here\n"
            f"4. Restart the server\n\n"
            f"Once configured, I'll be ready to help you learn anything."
        )
        return setup


# Singleton instance
provider = LiteLLMProvider()


__all__ = ["LiteLLMProvider", "provider"]
