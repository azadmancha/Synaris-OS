"""Database engine and session management.

Synaris uses async SQLAlchemy with PostgreSQL + pgvector.
The engine is created once at startup and reused across requests.
"""

from contextlib import suppress

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.infrastructure.config import settings

# ── Auto-fix DATABASE_URL ──────────────────────────────────
# Railway injects DATABASE_URL in postgres:// format (sync driver),
# but async SQLAlchemy needs postgresql+asyncpg://. We normalize
# the URL here so users don't need to manually add the suffix.

_db_url = settings.database_url
if _db_url and _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)


# Async engine — created once, used for the lifetime of the app
engine = create_async_engine(
    _db_url,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,  # Verify connections before using them
    pool_recycle=3600,  # Recycle connections after 1 hour
    echo=settings.debug,  # SQL logging in debug mode
)


# ── SQLite-specific optimizations ───────────────────────
# Enable WAL mode for SQLite to allow concurrent reads + writes.
# This prevents "database is locked" errors during streaming
# when multiple sessions try to write simultaneously.


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record) -> None:
    """Enable WAL mode for SQLite to allow concurrent access.

    WAL (Write-Ahead Logging) is essential for the SSE streaming
    endpoint where the event_generator uses its own DB session.
    Without WAL, the second session hits "database is locked".

    Only applies to SQLite — PostgreSQL/pgvector connections
    are unaffected.
    """
    # Only apply to SQLite connections
    if engine.name == "sqlite":
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging
        cursor.execute("PRAGMA busy_timeout=5000")  # Wait 5s instead of failing
        cursor.execute("PRAGMA synchronous=NORMAL")  # Balance speed vs durability
        cursor.execute("PRAGMA cache_size=-8000")  # 8MB cache
        cursor.execute("PRAGMA foreign_keys=ON")  # Enforce FK constraints
        cursor.close()


# Session factory — creates new sessions on demand
# Each request gets its own session via dependency injection
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Keep objects usable after commit
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that provides a database session.

    Each request gets its own session. The session is closed
    when the request completes, even if an error occurs.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize the database on startup.

    1. Enable pgvector extension (PostgreSQL only — safe to call on SQLite)
    2. Create all tables from SQLAlchemy models

    In production, use Alembic migrations instead of auto-create.
    """
    async with engine.begin() as conn:
        # Enable pgvector extension (PostgreSQL only — silently ignored on SQLite)
        with suppress(Exception):
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        await conn.run_sync(Base.metadata.create_all)

    # Seed the dev user in development mode
    if settings.app_env in ("development", "test", "testing"):
        from sqlalchemy import select

        from app.infrastructure.constants import DEV_USER_EMAIL, DEV_USER_ID
        from app.models.user import User

        async with async_session_factory() as session:
            try:
                result = await session.execute(select(User).where(User.id == DEV_USER_ID))
                dev_user = result.scalar_one_or_none()
                if not dev_user:
                    dev_user = User(
                        id=DEV_USER_ID, email=DEV_USER_EMAIL, display_name="Developer", onboarding_completed=True
                    )
                    session.add(dev_user)
                    await session.commit()
            except Exception as e:
                await session.rollback()
                import logging

                logging.getLogger(__name__).warning(f"Failed to seed dev user: {e}")


async def close_db() -> None:
    """Dispose of the engine on shutdown."""
    await engine.dispose()
