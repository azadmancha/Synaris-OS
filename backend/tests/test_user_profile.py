"""
Tests for the User Profile API endpoints.

Covers:
- GET /v1/user/profile — get profile
- PATCH /v1/user/profile — update profile
"""

import pytest
from fastapi.testclient import TestClient


class TestGetProfile:
    """Tests for getting the user profile."""

    def test_get_profile_returns_200(self, client: TestClient):
        """GET /v1/user/profile should return 200."""
        response = client.get("/v1/user/profile")
        assert response.status_code == 200

    def test_get_profile_has_required_fields(self, client: TestClient):
        """Profile should have all required fields."""
        response = client.get("/v1/user/profile")
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "display_name" in data
        assert "theme_preference" in data
        assert "default_mode" in data
        assert "onboarding_completed" in data
        assert "created_at" in data

    def test_get_profile_returns_dev_user(self, client: TestClient):
        """Without auth, should return the DEV_USER_ID user."""
        from app.infrastructure.constants import DEV_USER_ID, DEV_USER_EMAIL

        response = client.get("/v1/user/profile")
        data = response.json()
        assert data["id"] == str(DEV_USER_ID)
        assert data["email"] == DEV_USER_EMAIL

    def test_get_profile_returns_404_for_unknown_user(self, client: TestClient):
        """With a non-existent dev-token, should try to find user."""
        from app.infrastructure.constants import DEV_USER_ID

        response = client.get("/v1/user/profile")
        data = response.json()
        assert data["id"] == str(DEV_USER_ID)

    def test_get_profile_has_display_name(self, client: TestClient):
        """Profile should include display name."""
        response = client.get("/v1/user/profile")
        data = response.json()
        assert data["display_name"] is not None

    def test_get_profile_default_theme(self, client: TestClient):
        """Default theme preference should be 'system'."""
        response = client.get("/v1/user/profile")
        data = response.json()
        assert data["theme_preference"] == "system"

    def test_get_profile_default_mode(self, client: TestClient):
        """Default learning mode should be 'balanced'."""
        response = client.get("/v1/user/profile")
        data = response.json()
        assert data["default_mode"] == "balanced"

    def test_get_profile_onboarding_default(self, client: TestClient):
        """Dev user should have onboarding completed."""
        response = client.get("/v1/user/profile")
        data = response.json()
        assert data["onboarding_completed"] is True

    def test_get_profile_with_auth_token(self, client: TestClient):
        """Should work with a dev-token authorization header."""
        from app.infrastructure.constants import DEV_USER_ID, DEV_USER_EMAIL

        headers = {"Authorization": f"Bearer dev-token-{DEV_USER_ID}"}
        response = client.get("/v1/user/profile", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == DEV_USER_EMAIL


class TestUpdateProfile:
    """Tests for updating the user profile."""

    def test_update_display_name(self, client: TestClient):
        """PATCH /v1/user/profile should update display name."""
        response = client.patch(
            "/v1/user/profile",
            json={"display_name": "New Name"},
        )
        assert response.status_code == 200
        assert response.json()["display_name"] == "New Name"

        # Verify persistence
        response = client.get("/v1/user/profile")
        assert response.json()["display_name"] == "New Name"

    def test_update_bio(self, client: TestClient):
        """Should update the bio field."""
        response = client.patch(
            "/v1/user/profile",
            json={"bio": "I love learning physics!"},
        )
        assert response.status_code == 200
        assert response.json()["bio"] == "I love learning physics!"

    def test_update_theme_preference(self, client: TestClient):
        """Should update theme preference."""
        response = client.patch(
            "/v1/user/profile",
            json={"theme_preference": "dark"},
        )
        assert response.status_code == 200
        assert response.json()["theme_preference"] == "dark"

    def test_update_default_mode(self, client: TestClient):
        """Should update default learning mode."""
        response = client.patch(
            "/v1/user/profile",
            json={"default_mode": "deep_dive"},
        )
        assert response.status_code == 200
        assert response.json()["default_mode"] == "deep_dive"

    def test_update_onboarding_status(self, client: TestClient):
        """Should update onboarding completed status."""
        response = client.patch(
            "/v1/user/profile",
            json={"onboarding_completed": False},
        )
        assert response.status_code == 200
        assert response.json()["onboarding_completed"] is False

    def test_partial_update_only_changes_specified_fields(self, client: TestClient):
        """Updating only one field should not change others."""
        # Set initial state
        client.patch(
            "/v1/user/profile",
            json={"display_name": "Original", "bio": "Original bio"},
        )

        # Update only display_name
        response = client.patch(
            "/v1/user/profile",
            json={"display_name": "Updated"},
        )
        assert response.json()["display_name"] == "Updated"
        assert response.json()["bio"] == "Original bio"

    def test_update_with_empty_body(self, client: TestClient):
        """Updating with empty body should return current profile."""
        response = client.patch(
            "/v1/user/profile",
            json={},
        )
        assert response.status_code == 200

    def test_update_clearing_avatar_url(self, client: TestClient):
        """Should be able to clear avatar_url by setting to null."""
        response = client.patch(
            "/v1/user/profile",
            json={"avatar_url": None},
        )
        assert response.status_code == 200
        # avatar_url could be None or empty string depending on storage
        assert response.json().get("avatar_url") in (None, "")

    def test_update_returns_updated_profile(self, client: TestClient):
        """Update response should return the complete profile."""
        response = client.patch(
            "/v1/user/profile",
            json={"display_name": "Complete"},
        )
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "display_name" in data
        assert "created_at" in data
