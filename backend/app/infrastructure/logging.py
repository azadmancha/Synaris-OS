"""
Synaris Logging Configuration.

Bridges structlog with the stdlib logging module so that ALL loggers
(including third-party ones like uvicorn, httpx, sqlalchemy) produce
structured, JSON-formatted logs with consistent context.

Architecture:
    stdlib logging → structlog.stdlib.ProcessorFormatter → structlog processors → output

    Each module creates loggers via `logging.getLogger(__name__)`, which is the
    standard Python pattern. The ProcessorFormatter intercepts these log records
    and runs them through structlog's processor chain, adding timestamps, log
    levels, thread/process info, and request context (bound via middleware).

Usage:
    # In main.py — configure once at startup:
        from app.infrastructure.logging import configure_logging
        configure_logging()

    # In any module — use the standard pattern:
        import logging
        logger = logging.getLogger(__name__)
        logger.info("User signed in", extra={"user_id": user.id})

    # For request-scoped context (via middleware):
        from structlog.contextvars import bind_contextvars, clear_contextvars
        bind_contextvars(request_id=req_id, user_id=user_id)
        # ... request handling ...
        clear_contextvars()
"""

import logging
import os
import sys
from typing import Any

import structlog


def configure_logging(*, json_format: bool | None = None) -> None:
    """Configure structured logging for the entire application.

    Call this once at startup (in main.py or before the app is created).
    All subsequent loggers (stdlib or structlog) will produce structured output.

    Args:
        json_format: If True, output JSON lines (for production).
                     If False, output colored console (for development).
                     If None (default), auto-detect from env:
                       - JSON if SENTRY_DSN is set (production) or LOG_FORMAT=json
                       - Console if LOG_FORMAT=console or in development
    """
    if json_format is None:
        json_format = os.environ.get("LOG_FORMAT", "").lower() == "json"

    timestamper = structlog.processors.TimeStamper(fmt="iso")

    # ─── Shared processor chain (used by both structlog and stdlib) ───
    shared_processors: list[Any] = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.PositionalArgumentsFormatter(),
        timestamper,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]

    if json_format:
        # Production: JSON lines → stdout
        renderer: Any = structlog.processors.JSONRenderer()
    else:
        # Development: colored human-readable → stderr
        renderer = structlog.dev.ConsoleRenderer(
            sort_keys=False,
            colors=True,
        )

    # ─── Configure structlog ───────────────────────────────────────
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # ─── Configure stdlib logging to use structlog formatter ───────
    formatter = structlog.stdlib.ProcessorFormatter(
        processor=renderer,
        foreign_pre_chain=shared_processors,  # applied to third-party loggers
    )

    handler = logging.StreamHandler(sys.stdout if json_format else sys.stderr)
    handler.setFormatter(formatter)

    # Replace the root logger's handlers with our structured handler
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Set root level from env, default to INFO
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    root_logger.setLevel(getattr(logging, log_level, logging.INFO))

    # Quiet down noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("aiosqlite").setLevel(logging.WARNING)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Get a structlog bound logger.

    This is a convenience wrapper. Most modules should continue using the
    standard ``import logging; logger = logging.getLogger(__name__)`` pattern,
    which will produce structured output through the configured formatter.

    Use this only when you need structlog-specific features like:
        - Binding context variables (.bind(user_id=...))
        - Using .log(), .msg(), or keyword-argument logging

    Args:
        name: Logger name (typically __name__). Defaults to the root logger name.

    Returns:
        A structlog BoundLogger that writes through stdlib logging.
    """
    return structlog.get_logger(name)


__all__ = [
    "configure_logging",
    "get_logger",
]
