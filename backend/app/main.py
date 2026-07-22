"""
Synaris Backend — FastAPI Application Entry Point.

Lifespan manages startup and shutdown events:
- Startup: Initialize database tables, register AI providers
- Shutdown: Close database connections gracefully
"""

import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from structlog.contextvars import bind_contextvars, clear_contextvars

from app.infrastructure.config import settings
from app.infrastructure.database import init_db, close_db
from    app.infrastructure.logging import configure_logging
import structlog
from app.api import api_router

# ─── Configure structured logging ─────────────────────

# Log format detection: JSON if SENTRY_DSN is set (assumes production), else console
_json_format = settings.log_format == "json" or (
    settings.sentry_dsn is not None and settings.log_format != "console"
)
configure_logging(json_format=_json_format)
# Use structlog's bound logger to support keyword-argument logging
# (e.g., logger.info("message", user_id=..., duration_ms=...)).
# Other modules can continue using `logging.getLogger(__name__)` for
# simple message-only logging, which also flows through structlog.
logger = structlog.get_logger(__name__)

# ─── Sentry Initialization ────────────────────────────

_sentry_initialized = False


def init_sentry():
    """Initialize Sentry SDK for error monitoring and performance tracing.

    Safe to call even if SENTRY_DSN is not configured (skips init gracefully).
    Must be called before the FastAPI app is created so that middleware wraps
    the entire request cycle.
    """
    global _sentry_initialized
    if _sentry_initialized:
        return

    dsn = settings.sentry_dsn
    if not dsn:
        logger.info("Sentry not configured — skipping initialization (set SENTRY_DSN to enable)")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        from sentry_sdk.integrations.httpx import HttpxIntegration

        sentry_logging = LoggingIntegration(
            level=logging.WARNING,       # Send warnings and above breadcrumbs
            event_level=logging.ERROR,   # Send errors and above as events
        )

        sentry_sdk.init(
            dsn=dsn,
            environment=settings.app_env,
            release="synaris@0.1.0",
            traces_sample_rate=settings.sentry_traces_sample_rate,
            profiles_sample_rate=settings.sentry_profiles_sample_rate,
            integrations=[
                StarletteIntegration(),
                FastApiIntegration(),
                sentry_logging,
                HttpxIntegration(),
            ],
            # Send only relevant request data (no raw bodies with PII)
            send_default_pii=False,
            # Attach stack traces to all logged errors
            attach_stacktrace=True,
        )

        logger.info(
            "Sentry initialized",
            environment=settings.app_env,
            traces_sample_rate=settings.sentry_traces_sample_rate,
        )
        _sentry_initialized = True
    except ImportError:
        logger.warning(
            "sentry-sdk not installed — install with: pip install sentry-sdk"
        )
    except Exception as e:
        logger.warning("Failed to initialize Sentry", error=str(e))


# ─── Lifespan ──────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle manager.

    Runs on startup and shutdown to manage resources
    like database connections and AI provider clients.
    """
    # Startup
    logger.info("Synaris starting up...", environment=settings.app_env)
    await init_db()
    logger.info("Database initialized", tables=["users", "learning_sessions", "messages", "concept_mastery"])

    # Log AI provider status
    try:
        from app.orchestration.router import router as request_router
        available_providers = request_router.get_available_providers()
        if not available_providers:
            logger.warning(
                "No AI providers configured! Add at least one API key to your `.env` file.\n"
                "  • Groq:       https://console.groq.com/keys       → GROQ_API_KEY\n"
                "  • Gemini:     https://aistudio.google.com/apikey   → GEMINI_API_KEY\n"
                "  • OpenRouter: https://openrouter.ai/keys         → OPENROUTER_API_KEY\n"
                "Then restart the server.",
            )
        else:
            provider_names = [p.name for p in available_providers]
            logger.info("AI providers available", providers=provider_names)
    except Exception as e:
        logger.warning("Could not check AI provider status", error=str(e))

    # Log Sentry status
    if _sentry_initialized:
        logger.info("Sentry error monitoring enabled", environment=settings.app_env)

    # Initialize knowledge engine — index Wikipedia content in background
    try:
        from app.knowledge.indexer import quick_index

        async def _index_background():
            try:
                logger.info("Starting knowledge base indexing in background...")
                indexed = await quick_index()
                if indexed > 0:
                    logger.info("Knowledge base indexing complete", chunks=indexed)
                else:
                    logger.warning("Knowledge base indexing returned 0 chunks")
            except Exception as e:
                logger.warning("Knowledge background indexing failed", error=str(e))

        import asyncio
        asyncio.ensure_future(_index_background())
    except Exception as e:
        logger.warning("Knowledge indexing module not available, skipping", error=str(e))

    yield

    # Shutdown
    logger.info("Synaris shutting down...")
    await close_db()
    logger.info("Database connections closed")


# ─── Initialize Sentry (before app creation) ────────────

init_sentry()


# ─── App Initialization ────────────────────────────────────


app = FastAPI(
    title="Synaris API",
    description="AI-powered personalized learning platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ─── Middleware ─────────────────────────────────────────────


# Combine default CORS origins with extra (production) origins
_cors_origins = settings.cors_origins.split(",")
if settings.cors_origins_extra:
    _cors_origins.extend(settings.cors_origins_extra.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.middleware("http")
async def inject_request_context(request: Request, call_next):
    """Bind structured logging context vars for every request.

    This injects request_id, method, path, and user_id (if available)
    into structlog's context vars so that ALL log entries within this
    request's lifecycle automatically include these fields.

    The context is cleared after the response is sent.
    """
    request_id = str(uuid.uuid4())[:8]
    bind_contextvars(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    )

    start = datetime.now(timezone.utc)
    status_code = 500  # default if handler crashes
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        duration = (datetime.now(timezone.utc) - start).total_seconds()
        logger.info(
            "request completed",
            status_code=status_code,
            duration_ms=round(duration * 1000),
        )
        clear_contextvars()


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# ─── Routes ────────────────────────────────────────────────


app.include_router(api_router)


@app.get("/")
async def root():
    """Root endpoint — API overview."""
    return {
        "name": "Synaris API",
        "version": "0.1.0",
        "status": "running",
        "environment": settings.app_env,
        "docs": "/docs",
        "redoc": "/redoc",
    }
