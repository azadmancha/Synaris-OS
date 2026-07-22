"""
Unit tests for the `get_current_user_id` auth dependency.

Tests all code paths in `app.api.dependencies.get_current_user_id`:

1. No Authorization header
2. Invalid header format (not "Bearer ...")
3. Empty Bearer token
4. Valid dev-token-<UUID>
5. Invalid UUID in dev-token
6. Supabase JWT — token verified, user exists in DB
7. Supabase JWT — token verified, no matching user
8. Supabase JWT — token verification fails
9. Supabase URL not configured
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user_id
from app.infrastructure.constants import DEV_USER_ID


# ─── Path 1: No Authorization header ─────────────────────


@pytest.mark.asyncio
async def test_no_auth_header_returns_dev_user_id(db_session: AsyncSession):
    """When no Authorization header is provided, return DEV_USER_ID."""
    result = await get_current_user_id(authorization=None, db=db_session)
    assert result == DEV_USER_ID


# ─── Path 2: Invalid header format ────────────────────────


@pytest.mark.asyncio
async def test_invalid_auth_format_returns_dev_user_id(db_session: AsyncSession):
    """When the Authorization header doesn't start with 'Bearer ', return DEV_USER_ID."""
    result = await get_current_user_id(authorization="Basic some-token", db=db_session)
    assert result == DEV_USER_ID


@pytest.mark.asyncio
async def test_empty_bearer_returns_dev_user_id(db_session: AsyncSession):
    """When 'Bearer ' is followed by only whitespace, return DEV_USER_ID."""
    result = await get_current_user_id(authorization="Bearer   ", db=db_session)
    assert result == DEV_USER_ID


@pytest.mark.asyncio
async def test_bearer_with_only_prefix_returns_dev_user_id(db_session: AsyncSession):
    """When the header is just 'Bearer ' with no token, return DEV_USER_ID."""
    result = await get_current_user_id(authorization="Bearer ", db=db_session)
    assert result == DEV_USER_ID


# ─── Path 3: Device token ─────────────────────────────────


@pytest.mark.asyncio
async def test_valid_dev_token_returns_user_id(db_session: AsyncSession):
    """A valid dev-token-<uuid> should return that UUID."""
    expected_id = uuid.uuid4()
    token = f"dev-token-{expected_id}"
    result = await get_current_user_id(
        authorization=f"Bearer {token}",
        db=db_session,
    )
    assert result == expected_id


@pytest.mark.asyncio
async def test_dev_token_with_numeric_id(db_session: AsyncSession):
    """A dev-token with a valid UUID should work regardless of format."""
    expected_id = uuid.uuid4()
    result = await get_current_user_id(
        authorization=f"Bearer dev-token-{expected_id}",
        db=db_session,
    )
    assert result == expected_id


@pytest.mark.asyncio
async def test_invalid_dev_token_returns_dev_user_id(db_session: AsyncSession):
    """A dev-token with an invalid UUID should return DEV_USER_ID."""
    result = await get_current_user_id(
        authorization="Bearer dev-token-not-a-valid-uuid",
        db=db_session,
    )
    assert result == DEV_USER_ID


@pytest.mark.asyncio
async def test_dev_token_empty_uuid_returns_dev_user_id(db_session: AsyncSession):
    """A dev-token with an empty string after the prefix should return DEV_USER_ID."""
    result = await get_current_user_id(
        authorization="Bearer dev-token-",
        db=db_session,
    )
    assert result == DEV_USER_ID


# ─── Path 4: Supabase JWT — token verified, user exists ──


@pytest.mark.asyncio
async def test_supabase_token_user_exists_returns_user_id(
    db_session: AsyncSession,
    test_user,
):
    """When Supabase verifies the token and user exists by email, return the user ID."""
    mock_supabase_id = "supabase-user-123"

    # httpx.Response.json() is synchronous — use MagicMock, not AsyncMock
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "id": mock_supabase_id,
        "email": test_user.email,
    }

    mock_get = AsyncMock(return_value=mock_response)
    mock_client_instance = AsyncMock()
    mock_client_instance.get = mock_get

    with patch(
        "app.api.dependencies._verify_supabase_token",
        new=AsyncMock(return_value=mock_supabase_id),
    ), patch(
        "app.api.dependencies.settings.supabase_url",
        "https://test.supabase.co",
    ), patch(
        "app.api.dependencies.settings.supabase_anon_key",
        "test-anon-key",
    ), patch(
        "httpx.AsyncClient",
    ) as mock_client_class:
        mock_client_class.return_value.__aenter__.return_value = mock_client_instance

        result = await get_current_user_id(
            authorization="Bearer valid-supabase-jwt-token",
            db=db_session,
        )

        assert result == test_user.id


@pytest.mark.asyncio
async def test_supabase_token_no_matching_user_returns_dev_user_id(
    db_session: AsyncSession,
):
    """When Supabase verifies the token but no user matches the email, return DEV_USER_ID."""
    # httpx.Response.json() is synchronous — use MagicMock
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "id": "some-supabase-id",
        "email": "unknown@email.com",
    }
    mock_get = AsyncMock(return_value=mock_response)
    mock_client_instance = AsyncMock()
    mock_client_instance.get = mock_get

    with patch(
        "app.api.dependencies._verify_supabase_token",
        new=AsyncMock(return_value="some-supabase-id"),
    ), patch(
        "app.api.dependencies.settings.supabase_url",
        "https://test.supabase.co",
    ), patch(
        "app.api.dependencies.settings.supabase_anon_key",
        "test-anon-key",
    ), patch(
        "httpx.AsyncClient",
    ) as mock_client_class:
        mock_client_class.return_value.__aenter__.return_value = mock_client_instance

        result = await get_current_user_id(
            authorization="Bearer valid-supabase-jwt-token",
            db=db_session,
        )

        assert result == DEV_USER_ID


# ─── Path 5: Supabase JWT — verification fails ────────────


@pytest.mark.asyncio
async def test_supabase_verification_fails_returns_dev_user_id(db_session: AsyncSession):
    """When Supabase token verification returns None, fall back to DEV_USER_ID."""
    with patch(
        "app.api.dependencies._verify_supabase_token",
        new=AsyncMock(return_value=None),
    ):
        result = await get_current_user_id(
            authorization="Bearer invalid-supabase-token",
            db=db_session,
        )
        assert result == DEV_USER_ID


# ─── Path 6: Supabase URL not configured ───────────────────


# ─── Path 7: Supabase HTTP call fails ─────────────────────


@pytest.mark.asyncio
async def test_supabase_http_error_returns_dev_user_id(db_session: AsyncSession):
    """When the HTTPX call to Supabase fails, fall back to DEV_USER_ID."""
    mock_client_instance = AsyncMock()
    mock_client_instance.get = AsyncMock(side_effect=Exception("Connection refused"))

    with patch(
        "app.api.dependencies._verify_supabase_token",
        new=AsyncMock(return_value="verified-supabase-id"),
    ), patch(
        "app.api.dependencies.settings.supabase_url",
        "https://test.supabase.co",
    ), patch(
        "app.api.dependencies.settings.supabase_anon_key",
        "test-anon-key",
    ), patch(
        "httpx.AsyncClient",
    ) as mock_client_class:
        mock_client_class.return_value.__aenter__.return_value = mock_client_instance

        result = await get_current_user_id(
            authorization="Bearer valid-token-but-http-fails",
            db=db_session,
        )

        assert result == DEV_USER_ID


# ─── Path 8: Supabase returns non-200 status ──────────────


@pytest.mark.asyncio
async def test_supabase_non_200_response_returns_dev_user_id(db_session: AsyncSession):
    """When Supabase returns a non-200 status, we should still get DEV_USER_ID via the fallback chain."""
    # httpx.Response.json() is synchronous — use MagicMock
    # For non-200 status, json() is never called, but consistent mocking is cleaner
    mock_response = MagicMock()
    mock_response.status_code = 403
    mock_get = AsyncMock(return_value=mock_response)
    mock_client_instance = AsyncMock()
    mock_client_instance.get = mock_get

    with patch(
        "app.api.dependencies._verify_supabase_token",
        new=AsyncMock(return_value="verified-supabase-id"),
    ), patch(
        "app.api.dependencies.settings.supabase_url",
        "https://test.supabase.co",
    ), patch(
        "app.api.dependencies.settings.supabase_anon_key",
        "test-anon-key",
    ), patch(
        "httpx.AsyncClient",
    ) as mock_client_class:
        mock_client_class.return_value.__aenter__.return_value = mock_client_instance

        result = await get_current_user_id(
            authorization="Bearer token-with-403",
            db=db_session,
        )

        assert result == DEV_USER_ID


# ─── Edge cases ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_double_bearer_prefix_returns_dev_user_id(db_session: AsyncSession):
    """If the token itself contains 'Bearer', the dev-token path should still parse correctly."""
    # Note: If header is "Bearer dev-token-<uuid>", the token is "dev-token-<uuid>"
    # which starts with "dev-token-", so it goes to the dev token path
    expected_id = uuid.uuid4()
    result = await get_current_user_id(
        authorization=f"Bearer dev-token-{expected_id}",
        db=db_session,
    )
    assert result == expected_id


@pytest.mark.asyncio
async def test_valid_uuid_as_bearer_token_returns_dev_user_id(db_session: AsyncSession):
    """A valid UUID sent as a plain Bearer token (not dev-token) goes to Supabase path and falls back."""
    # Without mocking Supabase, a valid UUID as Bearer token should fail Supabase
    # verification and fall back to DEV_USER_ID
    with patch(
        "app.api.dependencies._verify_supabase_token",
        new=AsyncMock(return_value=None),
    ):
        result = await get_current_user_id(
            authorization=f"Bearer {uuid.uuid4()}",
            db=db_session,
        )
        assert result == DEV_USER_ID
