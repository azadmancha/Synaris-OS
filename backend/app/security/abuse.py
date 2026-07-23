"""
Abuse Detection — suspicious activity monitoring and mitigation.

Part of the Security Layer. Detects patterns of abuse beyond
individual-request guardrails:

    1. Repeated injection attempts — same user hitting injection patterns
    2. Rapid-fire requests — DDoS-like behavior from a single user
    3. Credential stuffing patterns — rapid auth attempts on different accounts
    4. IP-based abuse — same IP hitting multiple endpoints rapidly
    5. Content scraping — sustained high-volume requests

This complements the existing rate limiter (which blocks per-window) and
guardrails (which block per-request). This module looks at MULTIPLE requests
over time to identify coordinated or sustained abuse.

USAGE (via the convenience function):
    from app.security.abuse import check_abuse

    result = check_abuse(user_id, "prompt_injection")
    if.result.blocked:
        # Take action (log out, temporary ban, etc.)
"""

import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime

from app.security.guardrails import get_auditor

logger = logging.getLogger(__name__)


# ─── Config ────────────────────────────────────────────────

# Thresholds — how many events of a type before we flag as abuse
_INJECTION_ATTEMPT_LIMIT = 5           # 5+ injection attempts in the window → flagged
_RAPID_REQUEST_LIMIT = 30              # 30+ rapid requests in the window → flagged
_RAPID_REQUEST_WINDOW = 10             # seconds for rapid request detection
_ABUSE_WINDOW = 300                    # 5-minute sliding window for abuse tracking
_BAN_DURATION = 1800                   # 30-minute temporary ban
_MAX_EVENTS_TOTAL = 50                 # total suspicious events before escalating


# ─── Types ─────────────────────────────────────────────────


@dataclass
class AbuseResult:
    """Result of an abuse check."""
    blocked: bool = False
    score: float = 0.0
    reasons: list[str] = field(default_factory=list)
    ban_expires_at: float | None = None
    message: str = ""


# ─── Abuse Detector ────────────────────────────────────────

class AbuseDetector:
    """Detects abusive behavior patterns across multiple requests.

    Architecture:
        In-memory event tracking with sliding windows.
        Suitable for single-instance deployments.
        For multi-instance, replace with Redis-based tracking.

    Events tracked per user:
        - injection_attempts: Times the input guardrail flagged them
        - rapid_requests: High-volume burst requests (>30 in 10s)
        - suspicious_patterns: Other anomalies (encoding, repetition)
        - total_events: All suspicious events combined
    """

    def __init__(self) -> None:
        self._auditor = get_auditor()
        # user_id -> list of (timestamp, event_type, category)
        self._events: dict[str, list[tuple[float, str, str]]] = defaultdict(list)
        # user_id -> ban_expiry_timestamp
        self._bans: dict[str, float] = {}
        # Last cleanup time
        self._last_cleanup: float = time.monotonic()

    def _prune_user(self, user_id: str, now: float) -> None:
        """Remove events outside the abuse window for a user."""
        cutoff = now - _ABUSE_WINDOW
        self._events[user_id] = [
            e for e in self._events[user_id] if e[0] > cutoff
        ]

    def _prune_rapid(self, user_id: str, now: float) -> list[tuple[float, str, str]]:
        """Return rapid-request events within the rapid window."""
        cutoff = now - _RAPID_REQUEST_WINDOW
        return [e for e in self._events[user_id] if e[0] > cutoff]

    def _cleanup(self, now: float) -> None:
        """Periodically purge stale data."""
        if now - self._last_cleanup < 60.0:
            return
        self._last_cleanup = now
        cutoff = now - _ABUSE_WINDOW

        # Remove old events
        stale_users = []
        for uid, events in self._events.items():
            fresh = [e for e in events if e[0] > cutoff]
            if fresh:
                self._events[uid] = fresh
            else:
                stale_users.append(uid)
        for uid in stale_users:
            del self._events[uid]

        # Remove expired bans
        stale_bans = [uid for uid, exp in self._bans.items() if exp < now]
        for uid in stale_bans:
            del self._bans[uid]

    def record(
        self,
        user_id: str,
        event_type: str,
        category: str = "unknown",
    ) -> None:
        """Record a suspicious event for a user.

        Args:
            user_id: The user ID string.
            event_type: e.g., 'injection_attempt', 'rapid_request', 'suspicious'.
            category: The threat category from the guardrail.
        """
        now = time.monotonic()
        self._events[user_id].append((now, event_type, category))
        self._cleanup(now)

    def check(self, user_id: str) -> AbuseResult:
        """Check if a user should be blocked for abuse.

        Evaluates multiple signals and returns an AbuseResult.
        Called proactively (not just after a guardrail hit) to allow
        preemptive blocking of known abusers.

        Args:
            user_id: The user ID string.

        Returns:
            AbuseResult indicating whether to block and why.
        """
        now = time.monotonic()

        # ── 1. Check for active ban ────────────────────────
        if user_id in self._bans:
            expiry = self._bans[user_id]
            if expiry > now:
                remaining = round(expiry - now)
                return AbuseResult(
                    blocked=True,
                    score=1.0,
                    reasons=["User is temporarily banned for abusive behavior"],
                    ban_expires_at=expiry,
                    message=(
                        f"Your account has been temporarily suspended due "
                        f"to suspicious activity. Please try again in "
                        f"{remaining} seconds."
                    ),
                )
            else:
                # Ban expired — remove and allow
                del self._bans[user_id]

        # Prune old events for this user
        self._prune_user(user_id, now)

        events = self._events.get(user_id, [])
        if not events:
            return AbuseResult()

        # ── 2. Count event types ───────────────────────────
        injection_count = sum(1 for e in events if e[1] == "injection_attempt")
        rapid_requests = self._prune_rapid(user_id, now)
        rapid_count = len(rapid_requests)
        total_count = len(events)

        # ── 3. Evaluate ────────────────────────────────────
        reasons = []
        score = 0.0

        if injection_count >= _INJECTION_ATTEMPT_LIMIT:
            score = max(score, 0.8)
            reasons.append(f"Repeated injection attempts ({injection_count})")

        if rapid_count >= _RAPID_REQUEST_LIMIT:
            score = max(score, 0.7)
            reasons.append(
                f"Suspicious request burst ({rapid_count} in {_RAPID_REQUEST_WINDOW}s)"
            )

        if total_count >= _MAX_EVENTS_TOTAL:
            score = max(score, 0.6)
            reasons.append(f"High volume of suspicious events ({total_count})")

        # ── 4. Escalate if score is high ───────────────────
        if score >= 0.8:
            # Apply a temporary ban
            self._bans[user_id] = now + _BAN_DURATION

            self._auditor.log(
                event="abuse_detected",
                user_id=user_id,
                category="abuse",
                details={
                    "score": score,
                    "reasons": reasons,
                    "injection_count": injection_count,
                    "rapid_count": rapid_count,
                    "total_events": total_count,
                    "ban_duration_seconds": _BAN_DURATION,
                },
                blocked=True,
            )

            return AbuseResult(
                blocked=True,
                score=score,
                reasons=reasons,
                ban_expires_at=now + _BAN_DURATION,
                message=(
                    f"Your account has been temporarily suspended due to "
                    f"suspicious activity. Please try again later."
                ),
            )

        if score > 0.0:
            # Lower-level concerns — log but don't ban yet
            self._auditor.log(
                event="abuse_warning",
                user_id=user_id,
                category="suspicious",
                details={
                    "score": score,
                    "reasons": reasons,
                    "injection_count": injection_count,
                    "rapid_count": rapid_count,
                    "total_events": total_count,
                },
                blocked=False,
            )

        return AbuseResult(
            blocked=False,
            score=score,
            reasons=reasons,
        )

    def is_banned(self, user_id: str) -> bool:
        """Quick check if a user is currently banned (no event recording)."""
        now = time.monotonic()
        expiry = self._bans.get(user_id)
        if expiry and expiry > now:
            return True
        if expiry:
            del self._bans[user_id]
        return False


# ─── Singleton ──────────────────────────────────────────────

_detector: AbuseDetector | None = None


def get_abuse_detector() -> AbuseDetector:
    """Get or create the singleton abuse detector."""
    global _detector
    if _detector is None:
        _detector = AbuseDetector()
    return _detector


def reset_abuse_detector() -> None:
    """Reset the abuse detector (for testing)."""
    global _detector
    _detector = None


def check_abuse(user_id: str) -> AbuseResult:
    """Check if a user should be blocked for abuse.

    Call this alongside guardrail checks to evaluate long-term patterns.
    Does NOT record events — use mark_abuse_event() for that.

    Args:
        user_id: The user ID string.

    Returns:
        AbuseResult with blocked status and reasons.
    """
    detector = get_abuse_detector()
    return detector.check(user_id)


def mark_abuse_event(
    user_id: str,
    event_type: str,
    category: str = "unknown",
) -> None:
    """Record a suspicious event for a user.

    Call this from guardrails when a request is flagged.

    Args:
        user_id: The user ID string.
        event_type: e.g., 'injection_attempt', 'rapid_request'.
        category: The threat category from the guardrail.
    """
    detector = get_abuse_detector()
    detector.record(user_id, event_type, category)


__all__ = [
    "AbuseResult",
    "AbuseDetector",
    "get_abuse_detector",
    "reset_abuse_detector",
    "check_abuse",
    "mark_abuse_event",
]
