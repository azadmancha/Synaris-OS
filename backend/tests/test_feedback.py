"""
Tests for the Feedback API endpoints.

Covers:
- POST /v1/feedback/message — rate a message
- GET /v1/feedback/message/{id} — get message feedback
"""

import uuid

from fastapi.testclient import TestClient


class TestRateMessage:
    """Tests for rating a message."""

    def _create_session_with_message(self, client: TestClient) -> tuple[str, str]:
        """Helper: create session, send message, return (session_id, ai_message_id)."""
        create_resp = client.post("/v1/sessions", json={"subject": "physics"})
        session_id = create_resp.json()["id"]

        msg_resp = client.post(
            f"/v1/sessions/{session_id}/messages",
            json={"content": "Hello", "mode": "balanced"},
        )
        ai_message_id = msg_resp.json()["ai_message"]["id"]
        return session_id, ai_message_id

    def test_rate_message_positive(self, client: TestClient) -> None:
        """POST /v1/feedback/message with 'positive' should succeed."""
        _, msg_id = self._create_session_with_message(client)

        response = client.post(
            "/v1/feedback/message",
            json={"message_id": msg_id, "rating": "positive"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["rating"] == "positive"

    def test_rate_message_negative(self, client: TestClient) -> None:
        """Rating a message as negative should succeed."""
        _, msg_id = self._create_session_with_message(client)

        response = client.post(
            "/v1/feedback/message",
            json={"message_id": msg_id, "rating": "negative"},
        )
        assert response.status_code == 200
        assert response.json()["rating"] == "negative"

    def test_rate_message_reset(self, client: TestClient) -> None:
        """Resetting a rating should work."""
        _, msg_id = self._create_session_with_message(client)

        # Set positive first
        client.post(
            "/v1/feedback/message",
            json={"message_id": msg_id, "rating": "positive"},
        )

        # Then reset
        response = client.post(
            "/v1/feedback/message",
            json={"message_id": msg_id, "rating": "reset"},
        )
        assert response.status_code == 200
        assert response.json()["rating"] == "reset"

    def test_rate_message_invalid_rating(self, client: TestClient) -> None:
        """An invalid rating value should return 400."""
        _, msg_id = self._create_session_with_message(client)

        response = client.post(
            "/v1/feedback/message",
            json={"message_id": msg_id, "rating": "invalid"},
        )
        assert response.status_code == 400

    def test_rate_message_returns_404_for_nonexistent(self, client: TestClient) -> None:
        """Rating a non-existent message should return 404."""
        fake_id = str(uuid.uuid4())
        response = client.post(
            "/v1/feedback/message",
            json={"message_id": fake_id, "rating": "positive"},
        )
        assert response.status_code == 404

    def test_rate_message_toggle_positive_negative(self, client: TestClient) -> None:
        """Should be able to change rating from positive to negative."""
        _, msg_id = self._create_session_with_message(client)

        client.post(
            "/v1/feedback/message",
            json={"message_id": msg_id, "rating": "positive"},
        )
        response = client.post(
            "/v1/feedback/message",
            json={"message_id": msg_id, "rating": "negative"},
        )
        assert response.json()["rating"] == "negative"

    def test_rate_message_requires_message_id(self, client: TestClient) -> None:
        """message_id should be required."""
        response = client.post(
            "/v1/feedback/message",
            json={"rating": "positive"},
        )
        assert response.status_code == 422

    def test_rate_message_requires_rating(self, client: TestClient) -> None:
        """rating should be required."""
        response = client.post(
            "/v1/feedback/message",
            json={"message_id": str(uuid.uuid4())},
        )
        assert response.status_code == 422


class TestGetMessageFeedback:
    """Tests for getting message feedback."""

    def _create_session_with_message(self, client: TestClient) -> tuple[str, str]:
        """Helper: create session, send message, return (session_id, ai_message_id)."""
        create_resp = client.post("/v1/sessions", json={"subject": "physics"})
        session_id = create_resp.json()["id"]

        msg_resp = client.post(
            f"/v1/sessions/{session_id}/messages",
            json={"content": "Hello", "mode": "balanced"},
        )
        ai_message_id = msg_resp.json()["ai_message"]["id"]
        return session_id, ai_message_id

    def test_get_feedback_no_rating(self, client: TestClient) -> None:
        """A message with no rating should return null rating."""
        _, msg_id = self._create_session_with_message(client)

        response = client.get(f"/v1/feedback/message/{msg_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["rating"] is None

    def test_get_feedback_after_positive(self, client: TestClient) -> None:
        """After rating positive, get should return 'positive'."""
        _, msg_id = self._create_session_with_message(client)

        client.post(
            "/v1/feedback/message",
            json={"message_id": msg_id, "rating": "positive"},
        )

        response = client.get(f"/v1/feedback/message/{msg_id}")
        assert response.json()["rating"] == "positive"

    def test_get_feedback_after_negative(self, client: TestClient) -> None:
        """After rating negative, get should return 'negative'."""
        _, msg_id = self._create_session_with_message(client)

        client.post(
            "/v1/feedback/message",
            json={"message_id": msg_id, "rating": "negative"},
        )

        response = client.get(f"/v1/feedback/message/{msg_id}")
        assert response.json()["rating"] == "negative"

    def test_get_feedback_after_reset(self, client: TestClient) -> None:
        """After reset, get should return null rating."""
        _, msg_id = self._create_session_with_message(client)

        client.post(
            "/v1/feedback/message",
            json={"message_id": msg_id, "rating": "positive"},
        )
        client.post(
            "/v1/feedback/message",
            json={"message_id": msg_id, "rating": "reset"},
        )

        response = client.get(f"/v1/feedback/message/{msg_id}")
        assert response.json()["rating"] is None

    def test_get_feedback_returns_404_for_nonexistent(self, client: TestClient) -> None:
        """Getting feedback for non-existent message should return 404."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/v1/feedback/message/{fake_id}")
        assert response.status_code == 404
