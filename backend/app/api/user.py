"""User Profile API.

Manages user settings, profile data, and preferences.
Integrates with Supabase Auth for user identity.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.models.user import User
from app.api.dependencies import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["user"])


# ─── Schemas ───────────────────────────────────────────────


class UserProfileResponse(BaseModel):
    id: str
    email: str
    display_name: str | None
    avatar_url: str | None
    bio: str | None
    theme_preference: str
    default_mode: str
    onboarding_completed: bool
    created_at: str


class UserProfileUpdate(BaseModel):
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    theme_preference: str | None = None
    default_mode: str | None = None
    onboarding_completed: bool | None = None


# ─── Helpers ───────────────────────────────────────────────


def _serialize_profile(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        theme_preference=user.theme_preference,
        default_mode=user.default_mode,
        onboarding_completed=user.onboarding_completed,
        created_at=user.created_at.isoformat(),
    )


# ─── Endpoints ─────────────────────────────────────────────


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Get the current user's profile."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return _serialize_profile(user)


@router.patch("/profile", response_model=UserProfileResponse)
async def update_profile(
    request: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Update the current user's profile fields."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Update only the provided fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    user.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.commit()

    logger.info(f"Updated profile for user {user.id}")
    return _serialize_profile(user)
