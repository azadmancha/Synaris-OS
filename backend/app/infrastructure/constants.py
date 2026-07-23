"""Shared constants for the Synaris backend.

Centralizes values used across multiple modules
to prevent drift and make them easy to change.
"""

import uuid

# ── Development Mode ──────────────────────────────────
# In development, users are created on-demand via /auth/login.
# This UUID is used as a fallback when no auth header is sent.
# Required by test infrastructure (client fixture in conftest.py).
DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEV_USER_EMAIL = "dev@synaris.local"
