"""
Tests for the Auth API endpoints.

Covers:
- POST /v1/auth/login — development login
- POST /v1/auth/supabase — Supabase OAuth login
- POST /v1/auth/logout — logout
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


class TestDevLogin:
    """Tests for the development login endpoint."""

    def test_login_creates_new_user(self, client: TestClient):
        """POST /v1/auth/login with a new email should create a user."""
        response = client.post(
            "/v1/auth/login",
            json={"email": "newuser@test.com", "display_name": "New User"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@test.com"
        assert data["display_name"] == "New User"
        assert data["user_id"] is not None
        assert data["token"] is not None
        assert data["token"].startswith("dev-token-")

    def test_login_returns_existing_user(self, client: TestClient):
        """POST /v1/auth/login with an existing email should return the same user."""
        # Create user
        response1 = client.post(
            "/v1/auth/login",
            json={"email": "existing@test.com", "display_name": "Existing"},
        )
        user_id1 = response1.json()["user_id"]

        # Login again
        response2 = client.post(
            "/v1/auth/login",
            json={"email": "existing@test.com", "display_name": "Existing"},
        )
        user_id2 = response2.json()["user_id"]

        assert user_id1 == user_id2

    def test_login_without_display_name_uses_email_prefix(self, client: TestClient):
        """Without display_name, should use email username as display name."""
        response = client.post(
            "/v1/auth/login",
            json={"email": "john.doe@test.com"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "john.doe"

    def test_login_email_is_required(self, client: TestClient):
        """Email field should be required."""
        response = client.post(
            "/v1/auth/login",
            json={},
        )
        assert response.status_code == 422  # Validation error

    def test_login_updates_display_name(self, client: TestClient):
        """Logging in with a different display name should update it."""
        # Create
        client.post(
            "/v1/auth/login",
            json={"email": "updatable@test.com", "display_name": "Original"},
        )
        # Update
        response = client.post(
            "/v1/auth/login",
            json={"email": "updatable@test.com", "display_name": "Updated"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "Updated"

    def test_login_response_has_all_fields(self, client: TestClient):
        """Login response should contain all required fields."""
        response = client.post(
            "/v1/auth/login",
            json={"email": "complete@test.com", "display_name": "Complete"},
        )
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "display_name" in data
        assert "token" in data
        assert "created_at" in data

    def test_token_format(self, client: TestClient):
        """Token should be a valid dev-token-<uuid> format."""
        response = client.post(
            "/v1/auth/login",
            json={"email": "tokenformat@test.com", "display_name": "Token"},
        )
        token = response.json()["token"]
        assert token.startswith("dev-token-")
        # Extract the UUID portion
        uid_str = token.removeprefix("dev-token-")
        uuid.UUID(uid_str)  # Should not raise

    def test_login_different_emails_get_different_users(self, client: TestClient):
        """Different emails should create different user IDs."""
        r1 = client.post("/v1/auth/login", json={"email": "alice@test.com"})
        r2 = client.post("/v1/auth/login", json={"email": "bob@test.com"})
        assert r1.json()["user_id"] != r2.json()["user_id"]


class TestSupabaseAuth:
    """Tests for the Supabase OAuth login endpoint."""

    def test_supabase_auth_with_valid_token_creates_user(self, client: TestClient):
        """A valid Supabase token should create a user."""
        # Mock _verify_supabase_token to return a valid ID
        with patch(
            "app.api.auth._verify_supabase_token",
            new=AsyncMock(return_value="supabase-user-123"),
        ):
            response = client.post(
                "/v1/auth/supabase",
                json={
                    "access_token": "valid-token",
                    "email": "google@test.com",
                    "name": "Google User",
                    "avatar_url": "https://example.com/avatar.jpg",
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert data["email"] == "google@test.com"
            assert data["display_name"] == "Google User"
            assert data["avatar_url"] == "https://example.com/avatar.jpg"
            assert data["token"] == "valid-token"

    def test_supabase_auth_with_verified_token_user_exists(self, client: TestClient):
        """If user already exists by external_id, return existing user."""
        with patch(
            "app.api.auth._verify_supabase_token",
            new=AsyncMock(return_value="existing-supabase-id"),
        ):
            # First call creates
            r1 = client.post(
                "/v1/auth/supabase",
                json={
                    "access_token": "token-1",
                    "email": "returning@test.com",
                    "name": "Returning User",
                },
            )
            uid1 = r1.json()["user_id"]

            # Second call with same supabase ID should return same user
            r2 = client.post(
                "/v1/auth/supabase",
                json={
                    "access_token": "token-2",
                    "email": "returning@test.com",
                    "name": "Returning User",
                },
            )
            uid2 = r2.json()["user_id"]

            assert uid1 == uid2

    def test_supabase_auth_fails_with_invalid_token(self, client: TestClient):
        """An invalid Supabase token should return 401."""
        with patch(
            "app.api.auth._verify_supabase_token",
            new=AsyncMock(return_value=None),
        ):
            response = client.post(
                "/v1/auth/supabase",
                json={
                    "access_token": "invalid-token",
                    "email": "invalid@test.com",
                },
            )
            assert response.status_code == 401
            data = response.json()
            assert "detail" in data

    def test_supabase_auth_requires_access_token(self, client: TestClient):
        """access_token field should be required."""
        response = client.post(
            "/v1/auth/supabase",
            json={"email": "test@test.com"},
        )
        assert response.status_code == 422

    def test_supabase_auth_requires_email(self, client: TestClient):
        """email field should be required."""
        response = client.post(
            "/v1/auth/supabase",
            json={"access_token": "some-token"},
        )
        assert response.status_code == 422

    def test_supabase_auth_updates_avatar_url(self, client: TestClient):
        """Logging in again with a new avatar URL should update it."""
        with patch(
            "app.api.auth._verify_supabase_token",
            new=AsyncMock(return_value="updatable-avatar-id"),
        ):
            # Create
            client.post(
                "/v1/auth/supabase",
                json={
                    "access_token": "token-1",
                    "email": "avatar@test.com",
                    "name": "Avatar User",
                    "avatar_url": "https://example.com/old.jpg",
                },
            )
            # Update avatar
            r = client.post(
                "/v1/auth/supabase",
                json={
                    "access_token": "token-2",
                    "email": "avatar@test.com",
                    "name": "Avatar User",
                    "avatar_url": "https://example.com/new.jpg",
                },
            )
            assert r.json()["avatar_url"] == "https://example.com/new.jpg"


class TestLogout:
    """Tests for the logout endpoint."""

    def test_logout_returns_success(self, client: TestClient):
        """POST /v1/auth/logout should return success."""
        response = client.post("/v1/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Logged out successfully"

    def test_logout_does_not_require_auth(self, client: TestClient):
        """Logout should work without authentication."""
        response = client.post("/v1/auth/logout")
        assert response.status_code == 200
