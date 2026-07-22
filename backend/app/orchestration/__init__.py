"""Orchestration Layer — intent detection and AI routing.

The Orchestrator determines what the user needs, routes to the
right AI provider, augments with knowledge retrieval when needed,
and returns a structured response.

Architecture:
    User Input → Intent Detection → Need Retrieval? → Provider Selection → Response
"""

from app.orchestration.router import (
    RequestRouter,
    route_request,
    route_request_stream,
    router as request_router,
)

__all__ = [
    "RequestRouter",
    "route_request",
    "route_request_stream",
    "request_router",
]
