"""API routes for Synaris backend."""

from fastapi import APIRouter

from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.feedback import router as feedback_router
from app.api.health import router as health_router
from app.api.memory import router as memory_router
from app.api.messages import router as messages_router
from app.api.quizzes import router as quizzes_router
from app.api.sessions import router as sessions_router
from app.api.study_plan import router as study_plan_router
from app.api.user import router as user_router

# Main API router — all endpoints are mounted here
api_router = APIRouter(prefix="/v1")

# Include sub-routers
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(sessions_router)
api_router.include_router(messages_router)
api_router.include_router(user_router)
api_router.include_router(feedback_router)
api_router.include_router(quizzes_router)
api_router.include_router(analytics_router)
api_router.include_router(study_plan_router)
api_router.include_router(memory_router)

__all__ = ["api_router"]
