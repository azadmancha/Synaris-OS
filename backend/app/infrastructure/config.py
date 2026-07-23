"""Application Configuration via Pydantic Settings.

Part of the Infrastructure layer.
All config is loaded from environment variables / .env file.
Looks for .env in the backend/ dir first, then the project root.
"""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings

# Find project root (parent of backend/ directory)
_project_root = Path(__file__).resolve().parent.parent.parent.parent
_env_files = [".env"]
if _project_root.joinpath(".env").exists():
    _env_files.append(str(_project_root / ".env"))


class Settings(BaseSettings):
    # Application
    app_env: str = "development"
    debug: bool = False
    secret_key: str = "change-me-in-production"

    # Database
    database_url: str = "postgresql+asyncpg://synaris:synaris_dev@localhost:5432/synaris"
    db_pool_size: int = 20
    db_max_overflow: int = 10

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Qdrant (legacy — Synaris now uses pgvector)
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None

    # Supabase Auth
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_key: str | None = Field(None, validation_alias="SUPABASE_SERVICE_ROLE_KEY")

    # LLM Providers
    openrouter_api_key: str | None = None
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    deepseek_api_key: str | None = None
    groq_api_key: str | None = None
    gemini_api_key: str | None = None

    # ── Model Configuration ────────────────────────────────
    # Each provider supports a global override (sets all slots) and
    # per-slot overrides for fine-grained control over which model
    # is used for each learning mode.

    # OpenRouter Model Configuration
    openrouter_model: str = "openrouter/free"
    openrouter_fast_model: str | None = None
    openrouter_balanced_model: str | None = None
    openrouter_deep_model: str | None = None
    openrouter_code_model: str | None = None
    openrouter_research_model: str | None = None

    # Gemini Model Configuration
    gemini_model: str = "gemini-2.0-flash"
    gemini_fast_model: str | None = None
    gemini_balanced_model: str | None = None
    gemini_deep_model: str | None = None
    gemini_research_model: str | None = None

    # Groq Model Configuration
    groq_model: str = "llama-3.3-70b-versatile"
    groq_fast_model: str | None = None
    groq_balanced_model: str | None = None
    groq_deep_model: str | None = None
    groq_code_model: str | None = None

    # ── LiteLLM Model Configuration ─────────────────────────
    # LiteLLM is the primary provider layer. Set ONE model per mode
    # using the format: <provider>/<model_name>
    # Examples:
    #   gemini/gemini-2.0-flash
    #   groq/llama-3.3-70b-versatile
    #   openrouter/free
    #   openai/gpt-4o
    #   deepseek/deepseek-chat
    #   anthropic/claude-3-opus-20240229
    litellm_model: str = "groq/llama-3.3-70b-versatile"
    litellm_fast_model: str | None = None
    litellm_balanced_model: str | None = None
    litellm_deep_model: str | None = None
    litellm_code_model: str | None = None
    litellm_research_model: str | None = None

    # Search APIs
    brave_api_key: str | None = None
    tavily_api_key: str | None = None

    # Rate Limiting
    rate_limit_requests: int = 60
    rate_limit_window: int = 60

    # ── Error Monitoring (Sentry) ─────────────────────────
    sentry_dsn: str | None = None
    # Sample rate for performance traces (0.0 to 1.0). 0.1 = 10% in production.
    sentry_traces_sample_rate: float = 1.0
    # Sample rate for profiling (0.0 to 1.0). Requires Sentry profiling.
    sentry_profiles_sample_rate: float = 0.0

    # ── Logging ───────────────────────────────────────────
    # One of: DEBUG, INFO, WARNING, ERROR, CRITICAL
    log_level: str = "INFO"
    # One of: console, json  (console = colored for dev, json = structured for prod)
    log_format: str = "console"

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:8000"
    # Additional CORS origins for production (comma-separated, e.g. https://synaris.vercel.app)
    # Use '*' to allow all origins (not recommended for production with credentials).
    cors_origins_extra: str = ""

    model_config = {
        "env_file": _env_files,
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",  # Allow extra env vars (e.g. NEXT_PUBLIC_*, SUPABASE_PROJECT_REF)
    }


settings = Settings()
