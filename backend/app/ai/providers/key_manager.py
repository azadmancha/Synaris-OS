"""API Key Rotation Manager.

Handles multiple API keys per provider with automatic rotation on rate limits.
When one key hits its rate limit, the manager marks it as exhausted (with a
cooldown timer) and rotates to the next available key.

Usage in .env:
    # Single key (unchanged):
    GROQ_API_KEY=gsk_abc123

    # Multiple keys for rotation (comma-separated):
    GROQ_API_KEY=gsk_abc123,gsk_def456,gsk_ghi789

    GEMINI_API_KEY=key1,key2
    OPENROUTER_API_KEY=key1,key2

KeyManager will:
1. Use keys in order
2. On rate limit: mark key as exhausted → rotate to next → retry
3. After cooldown (default 60s): exhausted keys become available again
4. If all keys exhausted: return None (caller should switch providers)
"""

import logging
import os
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class KeyState:
    """Tracks a single API key's state."""
    key: str
    exhausted_at: float = 0.0  # timestamp when rate-limited, 0 = active


class KeyManager:
    """Manages a pool of API keys for a single provider.

    Thread-safe key rotation with cooldown-based exhaustion tracking.
    Designed to work with LiteLLM's env-var-based key lookup.
    """

    def __init__(self, cooldown_seconds: float = 60.0) -> None:
        self._cooldown = cooldown_seconds
        self._keys: list[KeyState] = []
        self._current_index: int = 0

    @property
    def key_count(self) -> int:
        """Number of registered keys."""
        return len(self._keys)

    @property
    def active_key_count(self) -> int:
        """Number of keys that are not currently exhausted."""
        now = time.monotonic()
        return sum(1 for k in self._keys if now >= k.exhausted_at)

    def add_key(self, key: str) -> None:
        """Register a key. Strips whitespace, skips empties."""
        key = key.strip()
        if not key:
            return
        # Avoid duplicates
        if any(k.key == key for k in self._keys):
            return
        self._keys.append(KeyState(key=key))
        logger.debug(f"KeyManager: registered key (total: {len(self._keys)})")

    def add_keys(self, keys: list[str]) -> None:
        """Register multiple keys at once."""
        for key in keys:
            self.add_key(key)

    def _find_next_available(self, start_index: int) -> int | None:
        """Find the next available (non-exhausted) key index starting from start_index."""
        if not self._keys:
            return None

        now = time.monotonic()
        n = len(self._keys)

        for offset in range(n):
            idx = (start_index + offset) % n
            ks = self._keys[idx]
            if now >= ks.exhausted_at:
                return idx

        return None  # All keys exhausted

    def get_current_key(self) -> str | None:
        """Get the currently active key. Returns None if all keys exhausted."""
        idx = self._find_next_available(self._current_index)
        if idx is None:
            return None
        self._current_index = idx
        return self._keys[idx].key

    def mark_exhausted(self, key: str) -> None:
        """Mark a key as rate-limited. It will be unavailable for the cooldown period."""
        now = time.monotonic()
        for ks in self._keys:
            if ks.key == key:
                ks.exhausted_at = now + self._cooldown
                logger.info(
                    f"KeyManager: marked key as exhausted (cooldown: {self._cooldown}s, "
                    f"active keys remaining: {self.active_key_count}/{self.key_count})"
                )
                return
        logger.warning("KeyManager: tried to mark unknown key as exhausted")

    def reset_all(self) -> None:
        """Reset all keys to active (e.g., after a global rate limit window passes)."""
        for ks in self._keys:
            ks.exhausted_at = 0.0
        self._current_index = 0
        logger.info(f"KeyManager: reset all {len(self._keys)} keys to active")

    def set_env_var(self, env_var: str) -> bool:
        """Set the environment variable to the current key.

        This is how we inject the rotating key into LiteLLM — it reads
        API keys from the environment.

        Returns True if a key was set, False if all keys are exhausted.
        """
        key = self.get_current_key()
        if key is None:
            return False
        os.environ[env_var] = key
        return True

    def handle_rate_limit(self, env_var: str) -> bool:
        """Handle a rate limit for the current key.

        1. Mark the current key as exhausted
        2. Try to rotate to the next available key
        3. Set the env var to the new key

        Returns True if a fallback key was activated, False if all keys exhausted.
        """
        # Mark the failed key
        current = os.environ.get(env_var, "")
        if current:
            self.mark_exhausted(current)

        # Try next key
        return self.set_env_var(env_var)


# Singleton key managers per provider
_groq: KeyManager | None = None
_gemini: KeyManager | None = None
_openrouter: KeyManager | None = None


def get_key_manager(provider_name: str) -> KeyManager | None:
    """Get or create the KeyManager for a provider.

    Parses the comma-separated API keys from settings and registers them.
    """
    from app.infrastructure.config import settings

    manager = None

    if provider_name == "groq":
        global _groq
        if _groq is None:
            _groq = KeyManager()
            raw = settings.groq_api_key or ""
            keys = [k.strip() for k in raw.split(",") if k.strip()]
            _groq.add_keys(keys)
            n = len(keys)
            if n > 1:
                logger.info(f"KeyManager: loaded {n} Groq API keys (multi-key rotation active)")
        manager = _groq

    elif provider_name == "gemini":
        global _gemini
        if _gemini is None:
            _gemini = KeyManager()
            raw = settings.gemini_api_key or ""
            keys = [k.strip() for k in raw.split(",") if k.strip()]
            _gemini.add_keys(keys)
            n = len(keys)
            if n > 1:
                logger.info(f"KeyManager: loaded {n} Gemini API keys (multi-key rotation active)")
        manager = _gemini

    elif provider_name == "openrouter":
        global _openrouter
        if _openrouter is None:
            _openrouter = KeyManager()
            raw = settings.openrouter_api_key or ""
            keys = [k.strip() for k in raw.split(",") if k.strip()]
            _openrouter.add_keys(keys)
            n = len(keys)
            if n > 1:
                logger.info(f"KeyManager: loaded {n} OpenRouter API keys (multi-key rotation active)")
        manager = _openrouter

    return manager


def get_env_var_for_provider(provider_name: str) -> str:
    """Get the environment variable name for a provider."""
    mapping = {
        "gemini": "GEMINI_API_KEY",
        "groq": "GROQ_API_KEY",
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "deepseek": "DEEPSEEK_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
    }
    return mapping.get(provider_name, f"{provider_name.upper()}_API_KEY")
