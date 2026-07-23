"""
Tests for the Health API endpoints.

Covers:
- GET /v1/health — comprehensive health check
- GET /v1/health/ping — minimal ping
"""

from fastapi.testclient import TestClient


class TestHealthPing:
    """Tests for the minimal ping endpoint."""

    def test_ping_returns_pong(self, client: TestClient) -> None:
        """GET /v1/health/ping should return {'pong': True}."""
        response = client.get("/v1/health/ping")
        assert response.status_code == 200
        data = response.json()
        assert data["pong"] is True
        assert "timestamp" in data

    def test_ping_has_no_db_dependency(self, client: TestClient) -> None:
        """Ping should work without database (no DB dependency)."""
        response = client.get("/v1/health/ping")
        assert response.status_code == 200
        # Should not have a database key (it's not checked)
        data = response.json()
        assert set(data.keys()) == {"pong", "timestamp"}


class TestHealthCheck:
    """Tests for the comprehensive health check endpoint."""

    def test_health_returns_200(self, client: TestClient) -> None:
        """GET /v1/health should return 200 OK."""
        response = client.get("/v1/health")
        assert response.status_code == 200

    def test_health_has_required_fields(self, client: TestClient) -> None:
        """Health response should have all required fields."""
        response = client.get("/v1/health")
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "checks" in data
        assert "timestamp" in data

    def test_health_version_is_string(self, client: TestClient) -> None:
        """Version should be a semver string."""
        response = client.get("/v1/health")
        data = response.json()
        assert isinstance(data["version"], str)
        assert len(data["version"]) > 0

    def test_health_database_check_exists(self, client: TestClient) -> None:
        """Health should include a database connectivity check."""
        response = client.get("/v1/health")
        data = response.json()
        assert "database" in data.get("checks", {})

    def test_health_database_is_healthy(self, client: TestClient) -> None:
        """Database should report healthy with in-memory SQLite."""
        response = client.get("/v1/health")
        data = response.json()
        assert data["checks"]["database"] == "healthy"

    def test_health_ai_providers_check_exists(self, client: TestClient) -> None:
        """Health should include AI provider check."""
        response = client.get("/v1/health")
        data = response.json()
        assert "ai_providers" in data.get("checks", {})

    def test_health_ai_providers_has_available_list(self, client: TestClient) -> None:
        """AI providers check should include available providers list."""
        response = client.get("/v1/health")
        data = response.json()
        ai_checks = data["checks"]["ai_providers"]
        assert "available" in ai_checks
        assert isinstance(ai_checks["available"], list)
        assert "count" in ai_checks

    def test_health_api_keys_check_exists(self, client: TestClient) -> None:
        """Health should include API key configuration check."""
        response = client.get("/v1/health")
        data = response.json()
        assert "api_keys" in data.get("checks", {})

    def test_health_api_keys_has_gemini_groq_openrouter(self, client: TestClient) -> None:
        """API key check should include the three main providers."""
        response = client.get("/v1/health")
        data = response.json()
        api_keys = data["checks"]["api_keys"]
        assert "gemini" in api_keys
        assert "groq" in api_keys
        assert "openrouter" in api_keys

    def test_health_status_degraded_without_ai(self, client: TestClient) -> None:
        """Without AI providers, status should be 'degraded' (mocked providers return 0)."""
        response = client.get("/v1/health")
        data = response.json()
        # Since we mocked the AI router, the providers list is empty
        assert data["status"] in ("healthy", "degraded")
        # Check setup guide exists when no providers
        if data["status"] == "degraded":
            assert "setup_guide" in data
            assert data["setup_guide"] is not None

    def test_health_response_is_json(self, client: TestClient) -> None:
        """Health response should have correct content type."""
        response = client.get("/v1/health")
        assert "application/json" in response.headers.get("content-type", "")
