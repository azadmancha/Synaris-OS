"""
Integration tests for the Memory API — spaced repetition endpoints.

Covers:
- GET  /v1/user/memory/concepts-due  → concepts due for review
- POST /v1/user/memory/concepts/review → record a review (SM-2 update)

Uses the shared TestClient fixture from conftest.py with:
- In-memory SQLite database
- Mocked AI providers (no real API calls)
- DEV_USER_ID as the authenticated user

Tests are async def to properly await async fixture methods.
Importing ConceptMastery at module level ensures its table is created
by the session-scoped engine fixture in conftest.py.
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.constants import DEV_USER_ID
from app.models.concept_mastery import ConceptMastery


# ─── Helpers ───────────────────────────────────────────────


async def _seed_concept(
    db: AsyncSession,
    concept_name: str,
    subject: str = "physics",
    mastery_level: str = "practicing",
    next_review_at: datetime | None = None,
    confidence_score: float = 0.5,
    times_encountered: int = 3,
) -> ConceptMastery:
    """Seed a ConceptMastery record directly in the test DB."""
    concept = ConceptMastery(
        id=uuid.uuid4(),
        user_id=DEV_USER_ID,
        concept_name=concept_name,
        subject=subject,
        mastery_level=mastery_level,
        confidence_score=confidence_score,
        times_encountered=times_encountered,
        times_correct=2,
        times_incorrect=1,
        last_reviewed_at=datetime.now(UTC) - timedelta(days=30),
        next_review_at=next_review_at or (datetime.now(UTC) - timedelta(days=1)),
    )
    db.add(concept)
    await db.flush()
    return concept


# ═══════════════════════════════════════════════════════════════
# Concepts Due Endpoint
# ═══════════════════════════════════════════════════════════════


class TestConceptsDue:
    """Tests for GET /v1/user/memory/concepts-due."""

    async def test_no_due_concepts_returns_empty(
        self, client: TestClient, override_get_db: AsyncSession
    ) -> None:
        """No concepts due → empty list, total_due=0."""
        response = client.get("/v1/user/memory/concepts-due")
        assert response.status_code == 200
        data = response.json()
        assert data["concepts"] == []
        assert data["total_due"] == 0

    async def test_due_concepts_returned_sorted_by_urgency(
        self, client: TestClient, override_get_db: AsyncSession
    ) -> None:
        """Overdue concepts returned, most overdue first."""
        await _seed_concept(
            override_get_db, "entropy",
            next_review_at=datetime.now(UTC) - timedelta(days=5),
        )
        await _seed_concept(
            override_get_db, "quantum mechanics",
            next_review_at=datetime.now(UTC) - timedelta(days=1),
        )

        response = client.get("/v1/user/memory/concepts-due")
        assert response.status_code == 200
        data = response.json()
        assert data["total_due"] == 2
        # Most overdue first (entropy: 5d > quantum: 1d)
        assert data["concepts"][0]["concept_name"] == "entropy"
        assert data["concepts"][0]["days_until_review"] is not None
        assert data["concepts"][0]["days_until_review"] < 0
        assert data["concepts"][1]["concept_name"] == "quantum mechanics"

    async def test_concept_fields_match_schema(
        self, client: TestClient, override_get_db: AsyncSession
    ) -> None:
        """Each due concept has the expected response fields."""
        now = datetime.now(UTC)
        await _seed_concept(override_get_db, "gravity", next_review_at=now - timedelta(days=2))

        response = client.get("/v1/user/memory/concepts-due")
        data = response.json()
        concept = data["concepts"][0]
        assert concept["concept_name"] == "gravity"
        assert concept["subject"] == "physics"
        assert concept["mastery_level"] == "practicing"
        assert concept["confidence_score"] == 0.5
        assert concept["times_encountered"] == 3
        assert concept["next_review_at"] is not None
        assert concept["days_until_review"] is not None

    async def test_limit_parameter_respected(
        self, client: TestClient, override_get_db: AsyncSession
    ) -> None:
        """Limit parameter caps the number of returned concepts."""
        for i in range(5):
            await _seed_concept(
                override_get_db, f"concept_{i}",
                next_review_at=datetime.now(UTC) - timedelta(days=i),
            )

        response = client.get("/v1/user/memory/concepts-due?limit=2")
        data = response.json()
        assert data["total_due"] == 2
        assert len(data["concepts"]) == 2

    async def test_include_upcoming_days(
        self, client: TestClient, override_get_db: AsyncSession
    ) -> None:
        """include_upcoming_days includes concepts due within that window."""
        # Concept due in 2 days — not included with default (overdue only)
        await _seed_concept(
            override_get_db, "kinematics",
            next_review_at=datetime.now(UTC) + timedelta(days=2),
        )

        # Without upcoming days → not included (future, not overdue)
        response = client.get("/v1/user/memory/concepts-due")
        assert response.json()["total_due"] == 0

        # With include_upcoming_days=3 → included (due within 3 days)
        response = client.get("/v1/user/memory/concepts-due?include_upcoming_days=3")
        data = response.json()
        assert data["total_due"] == 1
        assert data["concepts"][0]["concept_name"] == "kinematics"

    async def test_not_due_concepts_excluded(
        self, client: TestClient, override_get_db: AsyncSession
    ) -> None:
        """Concepts with far-future review dates are excluded."""
        await _seed_concept(
            override_get_db, "calculus",
            next_review_at=datetime.now(UTC) + timedelta(days=30),
        )

        response = client.get("/v1/user/memory/concepts-due?include_upcoming_days=7")
        assert response.json()["total_due"] == 0

    async def test_only_own_concepts_returned(
        self, client: TestClient, override_get_db: AsyncSession
    ) -> None:
        """Other users' concepts should not appear in the response."""
        other_user_id = uuid.uuid4()

        # Seed a concept for DEV_USER_ID (via override_get_db)
        await _seed_concept(
            override_get_db, "my concept",
            next_review_at=datetime.now(UTC) - timedelta(days=1),
        )

        # Seed a concept for a different user
        other = ConceptMastery(
            id=uuid.uuid4(),
            user_id=other_user_id,
            concept_name="other concept",
            subject="chemistry",
            mastery_level="familiar",
            confidence_score=0.7,
            times_encountered=5,
            times_correct=3,
            times_incorrect=1,
            last_reviewed_at=datetime.now(UTC) - timedelta(days=10),
            next_review_at=datetime.now(UTC) - timedelta(days=3),
        )
        override_get_db.add(other)
        await override_get_db.flush()

        response = client.get("/v1/user/memory/concepts-due")
        data = response.json()
        names = [c["concept_name"] for c in data["concepts"]]
        assert "my concept" in names
        assert "other concept" not in names
        assert data["total_due"] == 1

    async def test_zero_days_until_review(
        self, client: TestClient, override_get_db: AsyncSession
    ) -> None:
        """A concept due right now should show days_until_review <= 0."""
        now = datetime.now(UTC)
        await _seed_concept(override_get_db, "due now", next_review_at=now)

        response = client.get("/v1/user/memory/concepts-due")
        data = response.json()
        assert data["concepts"][0]["days_until_review"] <= 0
        assert data["total_due"] >= 1


# ═══════════════════════════════════════════════════════════════
# Concept Review Endpoint
# ═══════════════════════════════════════════════════════════════


class TestConceptReview:
    """Tests for POST /v1/user/memory/concepts/review."""

    async def test_review_new_concept_creates_it(
        self, client: TestClient
    ) -> None:
        """Reviewing a new concept creates it and returns a valid response."""
        response = client.post(
            "/v1/user/memory/concepts/review",
            json={
                "concept_name": "entropy",
                "subject": "physics",
                "correct": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["concept_name"] == "entropy"
        assert data["subject"] == "physics"
        assert data["quality"] == 5.0
        assert data["new_mastery_level"] == "practicing"
        assert data["next_interval_days"] == 1
        assert data["passed"] is True

    async def test_review_correct_advances_mastery(
        self, client: TestClient, override_get_db: AsyncSession
    ) -> None:
        """Multiple correct reviews advance mastery to familiar."""
        # Seed a concept with a 6-day interval so next correct → familiar
        concept = ConceptMastery(
            id=uuid.uuid4(),
            user_id=DEV_USER_ID,
            concept_name="quantum mechanics",
            subject="physics",
            mastery_level="practicing",
            confidence_score=0.4,
            times_encountered=3,
            times_correct=2,
            times_incorrect=1,
            last_reviewed_at=datetime.now(UTC) - timedelta(days=6),
            next_review_at=datetime.now(UTC) - timedelta(days=1),
        )
        override_get_db.add(concept)
        await override_get_db.flush()

        # Review it correctly
        response = client.post(
            "/v1/user/memory/concepts/review",
            json={
                "concept_name": "quantum mechanics",
                "subject": "physics",
                "correct": True,
                "response_time_seconds": 5.0,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["passed"] is True
        assert data["new_mastery_level"] == "familiar"
        assert data["next_interval_days"] >= 6

    async def test_review_incorrect_resets_interval(
        self, client: TestClient, override_get_db: AsyncSession
    ) -> None:
        """Incorrect review resets interval to 1 day and quality to 0."""
        last_review = datetime.now(UTC) - timedelta(days=15)
        concept = ConceptMastery(
            id=uuid.uuid4(),
            user_id=DEV_USER_ID,
            concept_name="thermodynamics",
            subject="physics",
            mastery_level="familiar",
            confidence_score=0.6,
            times_encountered=4,
            times_correct=3,
            times_incorrect=1,
            last_reviewed_at=last_review,
            next_review_at=datetime.now(UTC) - timedelta(days=1),
        )
        override_get_db.add(concept)
        await override_get_db.flush()

        response = client.post(
            "/v1/user/memory/concepts/review",
            json={
                "concept_name": "thermodynamics",
                "subject": "physics",
                "correct": False,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["passed"] is False
        assert data["quality"] == 0.0
        assert data["new_mastery_level"] == "practicing"
        assert data["next_interval_days"] == 1

    async def test_review_with_hint_lowers_quality(
        self, client: TestClient
    ) -> None:
        """Review with hint should lower quality below 5.0."""
        response = client.post(
            "/v1/user/memory/concepts/review",
            json={
                "concept_name": "calculus",
                "subject": "mathematics",
                "correct": True,
                "requested_hint": True,
                "response_time_seconds": 10.0,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["quality"] == 3.0  # 5.0 - 2.0 hint penalty

    async def test_review_response_has_all_fields(
        self, client: TestClient
    ) -> None:
        """Response should contain all documented fields."""
        response = client.post(
            "/v1/user/memory/concepts/review",
            json={
                "concept_name": "linear algebra",
                "subject": "mathematics",
                "correct": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        expected_keys = {
            "concept_name", "subject", "quality", "new_mastery_level",
            "new_confidence_score", "next_review_at", "next_interval_days", "passed",
        }
        assert set(data.keys()) == expected_keys

    async def test_concept_persisted_after_review(
        self, client: TestClient, override_get_db: AsyncSession
    ) -> None:
        """After review, the concept should be queryable from the DB."""
        # Review a concept
        response = client.post(
            "/v1/user/memory/concepts/review",
            json={
                "concept_name": "persistence check",
                "subject": "testing",
                "correct": True,
            },
        )
        assert response.status_code == 200
        data = response.json()

        # Verify it was saved in the database
        result = await override_get_db.execute(
            select(ConceptMastery).where(
                ConceptMastery.user_id == DEV_USER_ID,
                ConceptMastery.concept_name == "persistence check",
            )
        )
        saved = result.scalar_one_or_none()
        assert saved is not None
        assert saved.mastery_level == data["new_mastery_level"]
        assert saved.confidence_score == data["new_confidence_score"]
        assert saved.times_encountered == 1

    async def test_review_twice_tracks_count(
        self, client: TestClient
    ) -> None:
        """Reviewing the same concept twice increments times_encountered."""
        client.post(
            "/v1/user/memory/concepts/review",
            json={"concept_name": "repeat concept", "subject": "testing", "correct": True},
        )
        response = client.post(
            "/v1/user/memory/concepts/review",
            json={"concept_name": "repeat concept", "subject": "testing", "correct": True},
        )
        data = response.json()
        assert data["quality"] == 5.0
        assert data["passed"] is True

    async def test_review_with_response_time(
        self, client: TestClient
    ) -> None:
        """Slow correct response produces quality 4.0 (hesitation penalty)."""
        response = client.post(
            "/v1/user/memory/concepts/review",
            json={
                "concept_name": "slow concept",
                "subject": "biology",
                "correct": True,
                "response_time_seconds": 45.0,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["quality"] == 4.0  # 5.0 - 1.0 (slow)

    async def test_review_with_slow_and_hint(
        self, client: TestClient
    ) -> None:
        """Slow + hinted correct response produces quality 2.0 (fails threshold)."""
        response = client.post(
            "/v1/user/memory/concepts/review",
            json={
                "concept_name": "struggle concept",
                "subject": "physics",
                "correct": True,
                "response_time_seconds": 60.0,
                "requested_hint": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        # 5.0 - 1.0 (slow) - 2.0 (hint) = 2.0 → below 3.0 pass threshold
        assert data["quality"] == 2.0
        assert data["passed"] is False
