"""
Tests for the Learning Session API endpoints.

Covers:
- POST /v1/sessions — create session
- GET /v1/sessions — list sessions
- GET /v1/sessions/{id} — get session
- PATCH /v1/sessions/{id} — update session
- DELETE /v1/sessions/{id} — delete session
"""

import uuid

from fastapi.testclient import TestClient


class TestCreateSession:
    """Tests for creating learning sessions."""

    def test_create_session_returns_201(self, client: TestClient) -> None:
        """POST /v1/sessions should return 201 Created."""
        response = client.post(
            "/v1/sessions",
            json={"mode": "balanced", "subject": "physics"},
        )
        assert response.status_code == 201

    def test_create_session_has_required_fields(self, client: TestClient) -> None:
        """Created session should have all required fields."""
        response = client.post(
            "/v1/sessions",
            json={"mode": "balanced", "subject": "mathematics"},
        )
        data = response.json()
        assert "id" in data
        assert "title" in data
        assert "mode" in data
        assert "subject" in data
        assert "status" in data
        assert "message_count" in data
        assert "created_at" in data

    def test_create_session_default_mode_is_balanced(self, client: TestClient) -> None:
        """Without specifying mode, should default to 'balanced'."""
        response = client.post(
            "/v1/sessions",
            json={"subject": "physics"},
        )
        data = response.json()
        assert data["mode"] == "balanced"

    def test_create_session_default_status_is_active(self, client: TestClient) -> None:
        """New sessions should have 'active' status."""
        response = client.post(
            "/v1/sessions",
            json={"subject": "chemistry"},
        )
        data = response.json()
        assert data["status"] == "active"

    def test_create_session_default_title_from_subject(self, client: TestClient) -> None:
        """Title should default to the subject name."""
        response = client.post(
            "/v1/sessions",
            json={"subject": "biology"},
        )
        data = response.json()
        assert data["title"] == "biology"

    def test_create_session_with_custom_title(self, client: TestClient) -> None:
        """Should be able to set a custom title."""
        response = client.post(
            "/v1/sessions",
            json={"subject": "physics", "title": "My Custom Session"},
        )
        data = response.json()
        assert data["title"] == "My Custom Session"

    def test_create_session_default_title_without_subject(self, client: TestClient) -> None:
        """Without subject or title, should default to 'New Session'."""
        response = client.post(
            "/v1/sessions",
            json={},
        )
        data = response.json()
        assert data["title"] == "New Session"

    def test_create_session_initial_message_count_zero(self, client: TestClient) -> None:
        """New sessions should have 0 messages."""
        response = client.post(
            "/v1/sessions",
            json={"subject": "physics"},
        )
        data = response.json()
        assert data["message_count"] == 0

    def test_create_session_id_is_uuid(self, client: TestClient) -> None:
        """Session ID should be a valid UUID string."""
        response = client.post(
            "/v1/sessions",
            json={"subject": "physics"},
        )
        data = response.json()
        uuid.UUID(data["id"])  # Should not raise

    def test_create_session_with_all_modes(self, client: TestClient) -> None:
        """Should be able to create sessions with different modes."""
        for mode in ["quick", "balanced", "deep_dive", "expert"]:
            response = client.post(
                "/v1/sessions",
                json={"mode": mode, "subject": "physics"},
            )
            assert response.status_code == 201
            assert response.json()["mode"] == mode


class TestListSessions:
    """Tests for listing learning sessions."""

    def test_list_sessions_returns_empty_list_initially(self, client: TestClient) -> None:
        """With no sessions created, list should be empty."""
        response = client.get("/v1/sessions")
        assert response.status_code == 200
        data = response.json()
        assert data["sessions"] == []
        assert data["total"] == 0

    def test_list_sessions_returns_created_sessions(self, client: TestClient) -> None:
        """Created sessions should appear in the list."""
        client.post("/v1/sessions", json={"subject": "physics"})
        client.post("/v1/sessions", json={"subject": "mathematics"})

        response = client.get("/v1/sessions")
        data = response.json()
        assert data["total"] == 2
        assert len(data["sessions"]) == 2

    def test_list_sessions_ordered_by_newest_first(self, client: TestClient) -> None:
        """Sessions should be ordered with newest first."""
        r1 = client.post("/v1/sessions", json={"subject": "first"})
        r2 = client.post("/v1/sessions", json={"subject": "second"})

        response = client.get("/v1/sessions")
        sessions = response.json()["sessions"]
        # Second should be first in the list
        assert sessions[0]["id"] == r2.json()["id"]
        assert sessions[1]["id"] == r1.json()["id"]

    def test_list_sessions_respects_limit(self, client: TestClient) -> None:
        """List should respect the limit parameter."""
        for i in range(5):
            client.post("/v1/sessions", json={"subject": f"topic-{i}"})

        response = client.get("/v1/sessions", params={"limit": 2})
        data = response.json()
        assert len(data["sessions"]) == 2
        assert data["total"] == 2

    def test_list_sessions_respects_offset(self, client: TestClient) -> None:
        """List should respect the offset parameter."""
        for i in range(3):
            client.post("/v1/sessions", json={"subject": f"topic-{i}"})

        # Get with offset
        response = client.get("/v1/sessions", params={"offset": 1})
        data = response.json()
        assert len(data["sessions"]) == 2  # topics 2, 1 (newest first)

    def test_list_sessions_has_message_count(self, client: TestClient) -> None:
        """Listed sessions should include message counts."""
        client.post("/v1/sessions", json={"subject": "physics"})
        response = client.get("/v1/sessions")
        session = response.json()["sessions"][0]
        assert "message_count" in session
        assert session["message_count"] == 0


class TestGetSession:
    """Tests for getting a single session."""

    def test_get_session_returns_session(self, client: TestClient) -> None:
        """GET /v1/sessions/{id} should return the session."""
        create_resp = client.post("/v1/sessions", json={"subject": "physics"})
        session_id = create_resp.json()["id"]

        response = client.get(f"/v1/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
        assert data["subject"] == "physics"

    def test_get_session_returns_404_for_nonexistent(self, client: TestClient) -> None:
        """Getting a non-existent session should return 404."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/v1/sessions/{fake_id}")
        assert response.status_code == 404

    def test_get_session_returns_422_for_invalid_uuid(self, client: TestClient) -> None:
        """Getting a session with an invalid UUID should return 422."""
        response = client.get("/v1/sessions/not-a-uuid")
        assert response.status_code == 422


class TestUpdateSession:
    """Tests for updating a session."""

    def test_update_title(self, client: TestClient) -> None:
        """PATCH /v1/sessions/{id} should update the title."""
        create_resp = client.post("/v1/sessions", json={"subject": "physics"})
        session_id = create_resp.json()["id"]

        response = client.patch(
            f"/v1/sessions/{session_id}",
            json={"title": "Updated Title"},
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    def test_update_subject(self, client: TestClient) -> None:
        """PATCH should update the subject."""
        create_resp = client.post("/v1/sessions", json={"subject": "physics"})
        session_id = create_resp.json()["id"]

        response = client.patch(
            f"/v1/sessions/{session_id}",
            json={"subject": "chemistry"},
        )
        assert response.status_code == 200
        assert response.json()["subject"] == "chemistry"

    def test_update_partial_no_side_effects(self, client: TestClient) -> None:
        """Updating only title should not change other fields."""
        create_resp = client.post("/v1/sessions", json={"subject": "physics"})
        session_id = create_resp.json()["id"]

        response = client.patch(
            f"/v1/sessions/{session_id}",
            json={"title": "New Title"},
        )
        data = response.json()
        assert data["title"] == "New Title"
        assert data["subject"] == "physics"  # Should be unchanged

    def test_update_returns_404_for_nonexistent(self, client: TestClient) -> None:
        """Updating a non-existent session should return 404."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.patch(
            f"/v1/sessions/{fake_id}",
            json={"title": "Nope"},
        )
        assert response.status_code == 404

    def test_update_with_empty_body(self, client: TestClient) -> None:
        """Updating with an empty body should return the session unchanged."""
        create_resp = client.post("/v1/sessions", json={"subject": "physics"})
        session_id = create_resp.json()["id"]

        response = client.patch(
            f"/v1/sessions/{session_id}",
            json={},
        )
        assert response.status_code == 200


class TestDeleteSession:
    """Tests for deleting a session."""

    def test_delete_session_returns_success(self, client: TestClient) -> None:
        """DELETE /v1/sessions/{id} should return success."""
        create_resp = client.post("/v1/sessions", json={"subject": "physics"})
        session_id = create_resp.json()["id"]

        response = client.delete(f"/v1/sessions/{session_id}")
        assert response.status_code == 200
        assert response.json()["message"] == "Session deleted"

    def test_delete_session_removes_from_list(self, client: TestClient) -> None:
        """After deletion, the session should not appear in the list."""
        create_resp = client.post("/v1/sessions", json={"subject": "physics"})
        session_id = create_resp.json()["id"]

        client.delete(f"/v1/sessions/{session_id}")

        response = client.get("/v1/sessions")
        ids = [s["id"] for s in response.json()["sessions"]]
        assert session_id not in ids

    def test_delete_returns_404_for_nonexistent(self, client: TestClient) -> None:
        """Deleting a non-existent session should return 404."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.delete(f"/v1/sessions/{fake_id}")
        assert response.status_code == 404
