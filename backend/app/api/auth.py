"""Authentication router.

Manages Google OAuth (via Supabase) and dev login.
Provides JWT validation for Supabase sessions.

Flow:
1. Frontend signs in with Google via Supabase
2. Frontend sends access_token to POST /auth/supabase
3. Backend verifies the JWT against Supabase's API
4. Backend creates/returns user by Supabase user ID (not email)
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from httpx import AsyncClient
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.infrastructure.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


# ─── Schemas ───────────────────────────────────────────────


class LoginRequest(BaseModel):
    """Development login — no real auth needed."""
    email: str
    display_name: str | None = None


class SupabaseAuthRequest(BaseModel):
    """Supabase Google OAuth login."""
    access_token: str
    email: str
    name: str | None = None
    avatar_url: str | None = None


class LoginResponse(BaseModel):
    user_id: str
    email: str
    display_name: str | None
    avatar_url: str | None = None
    token: str
    created_at: str


# ─── Dev Login ─────────────────────────────────────────────


@router.post("/login", response_model=LoginResponse)
async def dev_login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Development login — creates or retrieves a user by email.

    Each dev email gets its own user ID so multiple dev sessions
    don't share the same chat history.

    TODO(v2): Deprecate when real auth is fully rolled out.
    """
    # Find or create user by email (unique per email)
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if user is None:
        display_name = (
            request.display_name
            or (request.email.split("@")[0] if request.email else "Developer")
        )
        user = User(
            id=uuid.uuid4(),
            email=request.email or "dev@synaris.local",
            display_name=display_name,
        )
        db.add(user)
        await db.flush()
        logger.info(f"Created dev user: {request.email} (id={user.id})")
    else:
        if request.display_name:
            user.display_name = request.display_name

    return LoginResponse(
        user_id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        token=f"dev-token-{user.id}",
        created_at=user.created_at.isoformat(),
    )


# ─── Supabase Auth (Google OAuth) ──────────────────────────


@router.post("/supabase", response_model=LoginResponse)
async def supabase_auth(
    request: SupabaseAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with a Supabase JWT from Google OAuth.

    Verifies the JWT against Supabase's API, then creates
    or retrieves the user in our database.
    """
    # Verify the token with Supabase
    supabase_user_id = await _verify_supabase_token(request.access_token)

    if not supabase_user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Create or update user in our database — lookup by Supabase user ID (stored in external_id)
    # This ensures the same Google account maps to the same local user even if email changes
    result = await db.execute(
        select(User).where(User.external_id == supabase_user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        # Also try by email as fallback (for users created before external_id was stored)
        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()

    if user is None:
        user = User(
            external_id=supabase_user_id,
            email=request.email,
            display_name=request.name or request.email.split("@")[0],
            avatar_url=request.avatar_url,
        )
        db.add(user)
        await db.flush()
        logger.info(f"Created user from Google: {request.email} (id={user.id})")
    else:
        # Update external_id if not set (migration from old accounts)
        if not user.external_id:
            user.external_id = supabase_user_id
        if request.name and user.display_name != request.name:
            user.display_name = request.name
        if request.avatar_url:
            user.avatar_url = request.avatar_url

    return LoginResponse(
        user_id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        token=request.access_token,  # Pass through Supabase token
        created_at=user.created_at.isoformat(),
    )


async def _verify_supabase_token(access_token: str) -> str | None:
    """Verify a Supabase JWT and return the user ID.

    Calls Supabase's auth API to verify the token.
    Falls back to local JWT decoding if available.
    """
    if not settings.supabase_url:
        logger.warning("Supabase URL not configured")
        return None

    try:
        async with AsyncClient() as client:
            resp = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "apikey": settings.supabase_anon_key or "",
                },
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("id")
            else:
                logger.warning(f"Supabase token verification failed: {resp.status_code}")
                return None
    except Exception as e:
        logger.error(f"Supabase verification error: {e}")
        return None


# ─── Logout ────────────────────────────────────────────────


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
