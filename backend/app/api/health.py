"""
Health check endpoints.

Provides monitoring with individual service checks:
- Overall API health
- Database connectivity
- AI provider availability
- Redis connectivity (future)
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.orchestration.router import router as request_router
from app.infrastructure.config import settings

router = APIRouter(tags=["health"])


def _check_api_key(name: str, value: str | None) -> str:
    """Check if an API key is configured and return a human-readable status."""
    if not value:
        return "missing"
    # Detect placeholder values or very short strings
    stripped = value.strip()
    if len(stripped) < 8:
        return "configured (verify key — seems too short)"
    placeholders = ["your-key-here", "changeme", "sk-your-key", "your_api_key", "none", "null"]
    if any(p in stripped.lower() for p in placeholders):
        return "configured (verify key — looks like a placeholder)"
    return "configured"


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Comprehensive health check.

    Returns the status of the API and its AI providers.
    Used by monitoring systems and Docker health checks.
    """
    checks = {}
    is_healthy = True

    # Check database
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
        is_healthy = False

    # Check AI providers
    available_providers = request_router.get_available_providers()
    checks["ai_providers"] = {
        "available": [p.name for p in available_providers],
        "count": len(available_providers),
        "requires_setup": len(available_providers) == 0,
    }

    # Check API key configuration
    checks["api_keys"] = {
        "gemini": _check_api_key("Gemini", settings.gemini_api_key),
        "groq": _check_api_key("Groq", settings.groq_api_key),
        "openrouter": _check_api_key("OpenRouter", settings.openrouter_api_key),
    }

    # Overall health — degraded if no AI providers are available
    if len(available_providers) == 0:
        is_healthy = False

    return {
        "status": "healthy" if is_healthy else "degraded",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
        "uptime_seconds": None,  # TODO(v2): Track server start time
        "setup_guide": (
            None if len(available_providers) > 0
            else {
                "message": "No AI providers configured. Add at least one API key to your .env file.",
                "providers": {
                    "groq": {
                        "env_var": "GROQ_API_KEY",
                        "url": "https://console.groq.com/keys",
                        "free": True,
                    },
                    "gemini": {
                        "env_var": "GEMINI_API_KEY",
                        "url": "https://aistudio.google.com/apikey",
                        "free": True,
                    },
                    "openrouter": {
                        "env_var": "OPENROUTER_API_KEY",
                        "url": "https://openrouter.ai/keys",
                        "free": True,
                    },
                },
            }
        ),
    }


@router.get("/health/ping")
async def ping():
    """
    Minimal ping endpoint.

    For load balancers and quick health checks.
    No database dependency — pure API responsiveness.
    """
    return {"pong": True, "timestamp": datetime.now(timezone.utc).isoformat()}
