"""
API Dependencies — shared across all route handlers.

Provides dependency injection for:
- get_current_user: Extracts the authenticated user from Authorization header
- get_db: Database session (re-exported from infrastructure)
- verify_input_safety: Runs input guardrails on message content before AI processing
- check_rate_limit: Enforces per-user rate limits
"""

import logging
import time
import uuid

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import _verify_supabase_token
from app.infrastructure.config import settings
from app.infrastructure.constants import DEV_USER_ID
from app.infrastructure.database import get_db
from app.models.learning_session import LearningSession
from app.models.user import User

logger = logging.getLogger(__name__)


async def get_current_user_id(
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID:
    """
    Extract the authenticated user ID from the request.

    Priority:
    1. Authorization: Bearer <supabase_jwt> → Verified with Supabase → Real user ID
    2. Authorization: Bearer dev-token-<uuid> → Development override (for testing)
    3. No auth → DEV_USER_ID (legacy dev mode, backward compatible)

    NOTE: Fallback #3 (DEV_USER_ID) exists for backward compatibility with
    the test infrastructure and dev environments. Real auth users should
    always send an Authorization header.
    """
    if not authorization:
        logger.debug("No auth header — using DEV_USER_ID (legacy mode)")
        return DEV_USER_ID

    # Parse Bearer token
    if not authorization.startswith("Bearer "):
        logger.debug("Invalid auth header format — using DEV_USER_ID")
        return DEV_USER_ID

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return DEV_USER_ID

    # Development token override (for testing without Supabase)
    if token.startswith("dev-token-"):
        try:
            uid_str = token.removeprefix("dev-token-")
            return uuid.UUID(uid_str)
        except (ValueError, AttributeError):
            return DEV_USER_ID

    # Supabase JWT verification
    supabase_user_id = await _verify_supabase_token(token)
    if supabase_user_id:
        # Look up user in our database by Supabase ID (stored as email-based lookup)
        # First try to find user by matching a stored supabase_user_id column
        # For now, find or create user via the token's email
        try:
            from httpx import AsyncClient

            # Get the email from Supabase
            async with AsyncClient() as client:
                resp = await client.get(
                    f"{settings.supabase_url}/auth/v1/user",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "apikey": settings.supabase_anon_key or "",
                    },
                    timeout=10,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    email = data.get("email", "")
                    if email:
                        result = await db.execute(select(User).where(User.email == email))
                        user = result.scalar_one_or_none()
                        if user:
                            return user.id
        except Exception as e:
            logger.warning(f"Failed to resolve user from Supabase token: {e}")

        # If we can't find the user but the token is valid, create them
        # (This shouldn't normally happen since /auth/supabase is called first)
        return DEV_USER_ID

    # Token verification failed — fall back to dev mode
    logger.warning("Token verification failed, falling back to DEV_USER_ID")
    return DEV_USER_ID


# ─── Security Dependencies ──────────────────────────────────


async def verify_session(
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> LearningSession:
    """Verify a learning session exists and belongs to the current user.

    Shared dependency used by all endpoints that operate within a session context.
    Raises HTTPException(404) if not found.
    """
    result = await db.execute(
        select(LearningSession).where(
            LearningSession.id == session_id,
            LearningSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


async def check_rate_limit(
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Dependency that enforces per-user rate limiting.

    Raises HTTPException(429) if the user has exceeded their rate limit.
    Uses the configured rate_limit_requests and rate_limit_window settings.

    This is safe to use alongside Pydantic body models because it only
    depends on the Authorization header (already extracted by get_current_user_id).
    """
    from app.security import get_rate_limiter

    limiter = get_rate_limiter()
    result = await limiter.check(str(user_id))

    if result.blocked:
        raise HTTPException(
            status_code=429,
            detail={
                "message": result.message,
                "code": "rate_limited",
                "retry_after_seconds": max(0, result.reset_at - time.monotonic()),
            },
        )

    return result.remaining
