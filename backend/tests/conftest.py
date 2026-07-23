"""
Shared test fixtures for Synaris backend tests.

Provides:
- In-memory SQLite async database engine
- Test database session (transaction-isolated per test)
- Test user fixtures
- FastAPI TestClient with dependency overrides
- Mocked AI providers (no real API calls)
- Security bypass overrides
"""

import asyncio
import uuid
from collections.abc import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.infrastructure.constants import DEV_USER_EMAIL, DEV_USER_ID
from app.infrastructure.database import Base, get_db
from app.models.learning_session import LearningSession
from app.models.message import Message
from app.models.user import User

# ═══════════════════════════════════════════════════════════════
# Database Fixtures
# ═══════════════════════════════════════════════════════════════


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    """Create an in-memory SQLite engine for testing.

    Uses StaticPool so each connection gets the same in-memory DB,
    allowing table creation and test data to persist across sessions.
    """
    test_engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield test_engine
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test.

    Each test gets its own session with a transaction that is
    rolled back after the test, ensuring test isolation.
    """
    connection = await engine.connect()
    transaction = await connection.begin()

    session_factory = async_sessionmaker(
        bind=connection,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        yield session

    await transaction.rollback()
    await connection.close()


# ═══════════════════════════════════════════════════════════════
# Mock AI Router
# ═══════════════════════════════════════════════════════════════


from unittest.mock import patch

from app.ai.classifier import QuestionClass
from app.ai.providers.base import AIResponse, AIStreamChunk
from app.security.guardrails import GuardrailResult

# ── Mock functions used by all test clients (defined once) ─────
# The patch objects themselves are created INSIDE the client fixture
# so each test gets fresh patches (patch objects can only be started once).


async def _mock_route_request(
    prompt: str,
    system_prompt: str | None = None,
    mode: str = "balanced",
):
    """Mock AI response — returns a canned educational response."""
    return AIResponse(
        content=(
            "That's an excellent question! Here's what I can tell you:\n\n"
            "The concept you're asking about is fundamental to understanding this topic. "
            "Think of it as a building block that everything else is built upon.\n\n"
            "## Key Points\n"
            "1. It's all about understanding the underlying principles\n"
            "2. Practice makes perfect — try applying this to different scenarios\n"
            "3. Don't hesitate to ask follow-up questions\n\n"
            "## Follow-up Questions\n"
            "1. Would you like a real-world example?\n"
            "2. Should I break this down further?\n"
        ),
        content_type="text",
        model_used="test-model",
        provider="test",
    )


async def _mock_route_request_stream(
    prompt: str,
    system_prompt: str | None = None,
    mode: str = "balanced",
):
    """Mock AI streaming response — yields tokens like a real stream."""
    response_text = (
        "Let me explain this step by step. "
        "Think of it like a series of interconnected ideas. "
        "Each one builds on the last."
    )
    words = response_text.split(" ")
    for word in words:
        yield AIStreamChunk(
            content=word + " ",
            model_used="test-model",
            provider="test",
            done=False,
        )
    yield AIStreamChunk(
        content="",
        model_used="test-model",
        provider="test",
        done=True,
    )


async def _mock_classify_question(question: str):
    """Mock question classifier — always returns general category."""
    return QuestionClass(
        category="general",
        needs_rag=False,
        needs_latex=False,
        complexity="medium",
        subject="general",
        confidence=0.5,
    )


async def _mock_augment_with_knowledge(prompt: str) -> tuple[str, str]:
    """Mock knowledge augmentation — returns prompt unchanged."""
    return prompt, ""


async def _mock_check_input(content: str, user_id: str = "unknown"):
    """Mock input guardrail — always passes."""
    return GuardrailResult.safe()


async def _mock_check_output(content: str, user_id: str = "unknown", session_id: str = "unknown"):
    """Mock output guardrail — always passes."""
    return GuardrailResult.safe()


def _create_mock_patches() -> list[patch]:
    """Create a fresh list of mock patches.

    Each call creates new patch objects that can be safely started and stopped.
    This is critical because unittest.mock.patch objects can only be started ONCE.
    Creating them in a fixture ensures each test gets fresh patches.

    Patches target the POINT OF USE in each module, NOT the source module.
    This is because Python stores imported references locally in each module's
    namespace. For example: messages.py does
    `from app.orchestration.router import route_request`, so we must patch
    `app.api.messages.route_request`, not `app.orchestration.router.route_request`.
    """
    return [
        # Messages module — uses route_request, route_request_stream, etc.
        patch("app.api.messages.route_request", _mock_route_request),
        patch("app.api.messages.route_request_stream", _mock_route_request_stream),
        patch("app.api.messages.classify_question", _mock_classify_question),
        patch("app.api.messages.augment_with_knowledge", _mock_augment_with_knowledge),
        patch("app.api.messages.check_input", _mock_check_input),
        patch("app.api.messages.check_output", _mock_check_output),
        # NOTE: classifier.py does `from app.orchestration.router import route_request`
        # INSIDE the classify_question function body, so there's no module-level
        # attribute to patch. We skip it since _mock_classify_question is already
        # patched at app.api.messages.classify_question, which is the caller.
    ]


# ═══════════════════════════════════════════════════════════════
# App & TestClient Fixtures
# ═══════════════════════════════════════════════════════════════


@pytest_asyncio.fixture
async def override_get_db(engine) -> AsyncGenerator[AsyncSession, None]:
    """Override for get_db dependency — uses the test database session."""
    connection = await engine.connect()
    transaction = await connection.begin()

    session_factory = async_sessionmaker(
        bind=connection,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        yield session

    await transaction.rollback()
    await connection.close()


@pytest_asyncio.fixture
async def client(override_get_db: AsyncSession) -> Generator[TestClient, None, None]:
    """Create a TestClient with all dependencies overridden for testing.

    Uses unittest.mock.patch to mock at the point-of-use in each module.
    This correctly intercepts already-imported function references.

    Overrides:
    - get_db → test database
    - get_current_user_id → DEV_USER_ID
    - route_request → mocked (no real AI calls)
    - route_request_stream → mocked
    - classify_question → mocked
    - augment_with_knowledge → mocked
    - check_input → passes everything
    - check_output → passes everything
    - check_rate_limit → allows everything
    """
    from app.api.dependencies import check_rate_limit, get_current_user_id
    from app.main import app

    # Override all dependencies
    app.dependency_overrides[get_db] = lambda: override_get_db
    app.dependency_overrides[get_current_user_id] = lambda: DEV_USER_ID
    app.dependency_overrides[check_rate_limit] = lambda: 999  # Unlimited

    # Seed the DEV_USER_ID user in the test database so profile/session endpoints work
    from sqlalchemy import select

    from app.models.user import User

    result = await override_get_db.execute(select(User).where(User.id == DEV_USER_ID))
    if not result.scalar_one_or_none():
        dev_user = User(
            id=DEV_USER_ID,
            email=DEV_USER_EMAIL,
            display_name="Test Developer",
            onboarding_completed=True,
        )
        override_get_db.add(dev_user)
        await override_get_db.flush()

    # Reset rate limiter for each test
    from app.security.rate_limit import reset_rate_limiter

    reset_rate_limiter()

    # Create and start fresh mock patches for this test
    mock_patches = _create_mock_patches()
    for p in mock_patches:
        p.start()

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        # Stop patches in reverse order
        for p in reversed(mock_patches):
            p.stop()

        app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client_with_auth(client: TestClient) -> tuple[TestClient, dict]:
    """Create a TestClient with a real auth token.

    Returns (client, headers) where headers include a valid
    dev-token authorization header.
    """
    headers = {"Authorization": f"Bearer dev-token-{DEV_USER_ID}"}
    return client, headers


# ═══════════════════════════════════════════════════════════════
# Data Fixtures
# ═══════════════════════════════════════════════════════════════


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user in the database."""
    user = User(
        id=uuid.uuid4(),
        email="test@synaris.app",
        display_name="Test User",
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def test_session(db_session: AsyncSession, test_user: User) -> LearningSession:
    """Create a test learning session."""
    session = LearningSession(
        id=uuid.uuid4(),
        user_id=test_user.id,
        mode="balanced",
        subject="physics",
        title="Test Session",
        status="active",
    )
    db_session.add(session)
    await db_session.flush()
    return session


@pytest_asyncio.fixture
async def test_messages(
    db_session: AsyncSession,
    test_session: LearningSession,
) -> list[Message]:
    """Create a pair of test messages (user + assistant)."""
    user_msg = Message(
        id=uuid.uuid4(),
        session_id=test_session.id,
        role="user",
        content="What is entropy?",
        content_type="text",
        sequence_number=1,
    )
    ai_msg = Message(
        id=uuid.uuid4(),
        session_id=test_session.id,
        role="assistant",
        content="Entropy is a measure of disorder in a system.",
        content_type="text",
        sequence_number=2,
    )
    db_session.add(user_msg)
    db_session.add(ai_msg)
    await db_session.flush()
    return [user_msg, ai_msg]


@pytest.fixture
def dev_user_id() -> uuid.UUID:
    """Return the development fallback user ID."""
    return DEV_USER_ID


@pytest.fixture
def any_uuid() -> uuid.UUID:
    """Return a random UUID for testing."""
    return uuid.uuid4()
