"""
Security Guardrails — input validation and output filtering for AI interactions.

This is the core of the Synaris Security Layer, implementing the patterns
described in ARCHITECTURE.md (the dedicated Security Layer that runs on
every request before and after AI processing).

Architecture:
    InputGuardrail  → Checks user input before it reaches the AI
    OutputGuardrail → Checks AI output before it reaches the user
    SecurityAuditor → Logs all security events for audit trails

Usage:
    from app.security.guardrails import input_guardrail, output_guardrail

    # Before AI processing
    result = await input_guardrail.check(user_content)
    if result.blocked:
        return {"error": result.message}

    # After AI processing
    result = await output_guardrail.check(ai_response)
    if result.blocked:
        # Redact or replace the unsafe content
        safe_content = output_guardrail.sanitize(ai_response)
"""

import hashlib
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime

from app.infrastructure.config import settings
from app.security.patterns import (
    INPUT_THREAT_PATTERNS,
    LEAKAGE_SIGNATURES,
    OUTPUT_THREAT_PATTERNS,
    SENSITIVE_DATA_PATTERNS,
)

logger = logging.getLogger(__name__)


# ─── Result Types ─────────────────────────────────────────────


@dataclass
class GuardrailResult:
    """Result of a security guardrail check."""

    passed: bool = True
    blocked: bool = False
    score: float = 0.0  # 0.0 = safe, 1.0 = definitely malicious
    reasons: list[str] = field(default_factory=list)
    categories: list[str] = field(default_factory=list)
    message: str = ""

    @classmethod
    def safe(cls) -> "GuardrailResult":
        return cls()

    @classmethod
    def block(cls, reason: str, category: str = "unknown", score: float = 1.0) -> "GuardrailResult":
        return cls(
            passed=False,
            blocked=True,
            score=score,
            reasons=[reason],
            categories=[category],
            message=reason,
        )


# ─── Security Auditor ─────────────────────────────────────────


class SecurityAuditor:
    """Audit logger for security events.

    Logs all security events (both input and output) to a structured
    audit log. In production, this should feed into a SIEM or
    dedicated audit logging system.
    """

    def __init__(self) -> None:
        self._audit_logger = logging.getLogger("synaris.security.audit")

    def log(
        self,
        event: str,
        user_id: str,
        category: str,
        details: dict | None = None,
        blocked: bool = False,
    ) -> None:
        """Log a security event.

        Args:
            event: Event type (e.g., "input_check", "output_check", "rate_limit")
            user_id: The affected user ID
            category: Threat category (e.g., "prompt_injection", "sensitive_data")
            details: Additional context (e.g., matched patterns, content hash)
            blocked: Whether the request was blocked
        """
        entry = {
            "timestamp": datetime.now(UTC).isoformat(),
            "event": event,
            "user_id": user_id,
            "category": category,
            "blocked": blocked,
            "details": details or {},
        }
        # Always log at WARNING level for security events
        self._audit_logger.warning("SECURITY_EVENT: %s", json.dumps(entry))

        # In production, also write to a dedicated audit log file
        if settings.app_env == "production":
            self._write_audit_log(entry)

    def _write_audit_log(self, entry: dict) -> None:
        """Write audit entry to a dedicated file (production only)."""
        import os

        log_dir = os.path.join(os.path.dirname(__file__), "..", "..", "logs")
        os.makedirs(log_dir, exist_ok=True)
        log_path = os.path.join(log_dir, "security_audit.log")
        try:
            with open(log_path, "a") as f:
                f.write(json.dumps(entry) + "\n")
        except OSError:
            pass  # Fail silently — logging should never break the app


# ─── Singleton Auditor ────────────────────────────────────────

_auditor = SecurityAuditor()


def get_auditor() -> SecurityAuditor:
    """Get the singleton security auditor."""
    return _auditor


# ═══════════════════════════════════════════════════════════════
# INPUT GUARDRAIL — validates user input before AI processing
# ═══════════════════════════════════════════════════════════════


class InputGuardrail:
    """Validates user input before it reaches the AI provider.

    Checks:
        1. Length limits (min/max character counts)
        2. Prompt injection patterns
        3. System prompt extraction attempts
        4. Jailbreak attempts
        5. Encoding evasion (zalgo, unicode confusables)
        6. Repetitive / spam content
    """

    def __init__(self) -> None:
        self._auditor = get_auditor()
        # Maximum content length — well above normal use, below absurd
        self.max_content_length: int = 10_000
        self.min_content_length: int = 1

    async def check(
        self,
        content: str,
        user_id: str = "unknown",
    ) -> GuardrailResult:
        """Run all input safety checks on the given content.

        Args:
            content: The user's input string.
            user_id: User identifier for audit logging.

        Returns:
            GuardrailResult with passed/blocked status and reasons.
        """
        if not content:
            return GuardrailResult.safe()

        # Track all findings
        findings: list[tuple[str, str]] = []  # (category, reason)
        highest_score = 0.0

        # ── 1. Length Checks ─────────────────────────────────
        if len(content) > self.max_content_length:
            return GuardrailResult.block(
                reason=f"Content exceeds maximum length of {self.max_content_length} characters",
                category="length_exceeded",
                score=0.8,
            )

        if len(content.strip()) < self.min_content_length:
            return GuardrailResult.block(
                reason="Content is too short (empty or whitespace only)",
                category="too_short",
                score=0.3,
            )

        # ── 2. Pattern-based Threat Detection ────────────────
        content.lower()

        for category, patterns in INPUT_THREAT_PATTERNS:
            for pattern in patterns:
                match = pattern.search(content)
                if match:
                    matched_text = match.group(0)
                    # Calculate a score based on match quality
                    # (longer matches = higher confidence)
                    match_score = min(0.5 + (len(matched_text) / 200), 1.0)
                    highest_score = max(highest_score, match_score)

                    findings.append(
                        (
                            category,
                            f"Matched {category} pattern: '{matched_text[:100]}'",
                        )
                    )

        # ── 3. Repetitive / Spam Detection ──────────────────
        repetition_score = self._detect_repetition(content)
        if repetition_score > 0.5:
            highest_score = max(highest_score, repetition_score)
            findings.append(
                (
                    "repetitive_content",
                    f"Repetitive content detected (score: {repetition_score:.2f})",
                )
            )

        # ── 4. Evaluate Results ─────────────────────────────
        if highest_score >= 0.8:
            # High confidence — block the request
            reasons = [r for _, r in findings]
            categories = list(set(c for c, _ in findings))

            self._auditor.log(
                event="input_check",
                user_id=user_id,
                category=categories[0] if categories else "unknown",
                details={
                    "score": highest_score,
                    "reasons": reasons,
                    "content_hash": self._hash_content(content),
                    "content_preview": content[:200],
                },
                blocked=True,
            )

            # Record abuse event for blocked content
            from app.security.abuse import mark_abuse_event

            try:
                mark_abuse_event(user_id, "injection_attempt", categories[0] if categories else "unknown")
            except Exception:
                pass

            return GuardrailResult.block(
                reason="I'm unable to process that request. The content was flagged by our safety filters.",
                category=categories[0] if categories else "unknown",
                score=highest_score,
            )

        elif highest_score >= 0.3:
            # Medium confidence — log a warning but allow through
            reasons = [r for _, r in findings]
            categories = list(set(c for c, _ in findings))

            self._auditor.log(
                event="input_check",
                user_id=user_id,
                category=categories[0] if categories else "suspicious",
                details={
                    "score": highest_score,
                    "reasons": reasons,
                    "content_hash": self._hash_content(content),
                    "content_preview": content[:200],
                },
                blocked=False,
            )

            return GuardrailResult(
                passed=True,
                blocked=False,
                score=highest_score,
                reasons=[r for _, r in findings],
                categories=categories,
            )

        # Clean — no issues found
        return GuardrailResult.safe()

    def _detect_repetition(self, content: str) -> float:
        """Detect highly repetitive content (spam, copy-paste abuse).

        Returns a score between 0.0 (not repetitive) and 1.0 (extremely repetitive).
        """
        if len(content) < 100:
            return 0.0

        content_lower = content.lower().strip()

        # Check for repeated phrases (3+ word n-grams appearing many times)
        words = content_lower.split()
        if len(words) < 6:
            return 0.0

        # Count unique 5-grams vs total positions
        n = min(5, len(words) // 2)
        ngrams = set()
        total_ngrams = len(words) - n + 1

        for i in range(total_ngrams):
            ngram = " ".join(words[i : i + n])
            ngrams.add(ngram)

        uniqueness_ratio = len(ngrams) / total_ngrams if total_ngrams > 0 else 1.0

        # Lower uniqueness = more repetitive
        if uniqueness_ratio < 0.1:
            return 0.9
        elif uniqueness_ratio < 0.2:
            return 0.7
        elif uniqueness_ratio < 0.4:
            return 0.4

        return 0.0

    @staticmethod
    def _hash_content(content: str) -> str:
        """Create a hash of the content for audit logging (without storing the full text)."""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


# ═══════════════════════════════════════════════════════════════
# OUTPUT GUARDRAIL — validates AI output before user delivery
# ═══════════════════════════════════════════════════════════════


class OutputGuardrail:
    """Validates AI output before it reaches the user.

    Checks:
        1. System prompt leakage (is the AI revealing its instructions?)
        2. Sensitive data exposure (API keys, PII, credentials)
        3. Harmful content (dangerous instructions)
        4. Educational appropriateness
    """

    def __init__(self) -> None:
        self._auditor = get_auditor()

        # System prompt signatures to detect leakage
        # These should be kept in sync with the actual system prompts in prompts.py
        self._leakage_signatures = LEAKAGE_SIGNATURES

        # Max output length
        self.max_output_length: int = 50_000

    async def check(
        self,
        content: str,
        user_id: str = "unknown",
        session_id: str = "unknown",
    ) -> GuardrailResult:
        """Run all output safety checks on AI-generated content.

        Args:
            content: The AI-generated response content.
            user_id: User identifier for audit logging.
            session_id: Session identifier for audit logging.

        Returns:
            GuardrailResult. If blocked, the content should be sanitized/replaced.
        """
        if not content:
            return GuardrailResult.safe()

        findings: list[tuple[str, str]] = []
        highest_score = 0.0

        # ── 1. Length Check ──────────────────────────────────
        if len(content) > self.max_output_length:
            findings.append(
                (
                    "output_too_long",
                    f"Output exceeds maximum length ({len(content)} > {self.max_output_length})",
                )
            )
            highest_score = max(highest_score, 0.6)

        # ── 2. System Prompt Leakage Detection ───────────────
        content_lower = content.lower()
        sig_matches = 0
        for sig in self._leakage_signatures:
            if sig in content_lower:
                sig_matches += 1
                findings.append(
                    (
                        "prompt_leakage",
                        f"Output contains system prompt signature: '{sig}'",
                    )
                )

        if sig_matches > 0:
            # More signatures matched = higher confidence of leakage
            leakage_score = min(0.4 + (sig_matches * 0.15), 1.0)
            highest_score = max(highest_score, leakage_score)

        # ── 3. Sensitive Data Scanning ───────────────────────
        for category, patterns in OUTPUT_THREAT_PATTERNS:
            for pattern in patterns:
                matches = pattern.findall(content)
                if matches:
                    # Show only first few chars to avoid logging secrets
                    sanitized = [m[:8] + "..." for m in matches[:3]]
                    findings.append(
                        (
                            category,
                            f"Output contains potential {category}: {', '.join(sanitized)}",
                        )
                    )
                    highest_score = max(highest_score, 0.7)

        # ── 4. Evaluate Results ─────────────────────────────
        if highest_score >= 0.7:
            categories = list(set(c for c, _ in findings))

            self._auditor.log(
                event="output_check",
                user_id=user_id,
                category=categories[0] if categories else "unknown",
                details={
                    "score": highest_score,
                    "reasons": [r for _, r in findings],
                    "session_id": session_id,
                    "content_preview": content[:300],
                },
                blocked=highest_score >= 0.7,
            )

            return GuardrailResult.block(
                reason="The AI response was flagged by content safety filters.",
                category=categories[0] if categories else "unknown",
                score=highest_score,
            )

        elif highest_score >= 0.3:
            # Low-confidence findings — log but allow
            self._auditor.log(
                event="output_check_warning",
                user_id=user_id,
                category="low_confidence",
                details={
                    "score": highest_score,
                    "reasons": [r for _, r in findings],
                    "session_id": session_id,
                    "content_preview": content[:300],
                },
                blocked=False,
            )

        return GuardrailResult.safe()

    def sanitize(self, content: str) -> str:
        """Sanitize AI output by redacting sensitive information.

        This is a best-effort sanitization for low-confidence detections.
        For high-confidence detections, the content should be blocked entirely.

        Currently redacts:
            - Email addresses
            - API keys (replaced with [REDACTED])
        """
        sanitized = content

        # Redact emails
        sanitized = re.sub(
            r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
            "[EMAIL REDACTED]",
            sanitized,
        )

        # Redact potential API keys (match key-like patterns and replace)
        for pattern in SENSITIVE_DATA_PATTERNS:
            sanitized = pattern.sub("[REDACTED]", sanitized)

        return sanitized


# ═══════════════════════════════════════════════════════════════
# Convenience API — single functions for quick integration
# ═══════════════════════════════════════════════════════════════

# Singletons
_input_guardrail: InputGuardrail | None = None
_output_guardrail: OutputGuardrail | None = None


def get_input_guardrail() -> InputGuardrail:
    """Get or create the singleton input guardrail."""
    global _input_guardrail
    if _input_guardrail is None:
        _input_guardrail = InputGuardrail()
    return _input_guardrail


def get_output_guardrail() -> OutputGuardrail:
    """Get or create the singleton output guardrail."""
    global _output_guardrail
    if _output_guardrail is None:
        _output_guardrail = OutputGuardrail()
    return _output_guardrail


async def check_input(content: str, user_id: str = "unknown") -> GuardrailResult:
    """Convenience function: check user input for safety."""
    return await get_input_guardrail().check(content, user_id)


async def check_output(content: str, user_id: str = "unknown", session_id: str = "unknown") -> GuardrailResult:
    """Convenience function: check AI output for safety."""
    return await get_output_guardrail().check(content, user_id, session_id)


def sanitize_output(content: str) -> str:
    """Convenience function: sanitize AI output."""
    return get_output_guardrail().sanitize(content)


__all__ = [
    "GuardrailResult",
    "InputGuardrail",
    "OutputGuardrail",
    "SecurityAuditor",
    "check_input",
    "check_output",
    "sanitize_output",
    "get_auditor",
    "get_input_guardrail",
    "get_output_guardrail",
]
