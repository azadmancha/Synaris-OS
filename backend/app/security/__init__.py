"""
Synaris Security Layer.

Implements the dedicated security layer described in ARCHITECTURE.md.
Runs on every request before and after AI processing.

Components:
    - InputGuardrail:   Validates user input before AI (injection, jailbreak, etc.)
    - OutputGuardrail:  Validates AI output before user (leakage, sensitive data, etc.)
    - RateLimiter:      Per-user sliding window rate limiting
    - SecurityAuditor:  Structured audit logging for all security events

Usage:
    from app.security import check_input, check_output, check_rate_limit

    # Before AI
    result = await check_input(user_content, user_id)
    if result.blocked:
        return {"error": result.message}

    # Before/after AI — rate limit check
    result = await check_rate_limit(user_id)
    if result.blocked:
        return 429 Too Many Requests

    # After AI
    result = await check_output(ai_response, user_id, session_id)
    if result.blocked:
        ai_response = "I apologize, but I cannot provide that response."
"""

from app.security.guardrails import (
    GuardrailResult,
    InputGuardrail,
    OutputGuardrail,
    SecurityAuditor,
    check_input,
    check_output,
    sanitize_output,
    get_auditor,
    get_input_guardrail,
    get_output_guardrail,
)

from app.security.rate_limit import (
    RateLimitResult,
    SlidingWindowRateLimiter,
    get_rate_limiter,
)

__all__ = [
    # Guardrails
    "GuardrailResult",
    "InputGuardrail",
    "OutputGuardrail",
    "check_input",
    "check_output",
    "sanitize_output",
    "get_input_guardrail",
    "get_output_guardrail",
    # Audit
    "SecurityAuditor",
    "get_auditor",
    # Rate Limit
    "RateLimitResult",
    "SlidingWindowRateLimiter",
    "get_rate_limiter",
]
