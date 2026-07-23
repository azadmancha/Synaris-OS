"""
Security Patterns — compiled regex patterns for threat detection.

Centralizes all regex patterns used by the Security Guardrails layer.
Patterns are compiled once at import time for performance.

Categories:
    - PROMPT_INJECTION:   "Ignore previous instructions", role-play attacks
    - JAILBREAK:          DAN mode, developer mode, adversarial prompts
    - SYSTEM_EXTRACTION:  Attempts to dump/copy/leak the system prompt or instructions
    - DELIMITER_CONFUSION: Tag spoofing, markdown injection to confuse delimiters
    - ENCODING_EVASION:   Base64, hex, rot13, unicode trickery to bypass filters
    - OUTPUT_LEAKAGE:     Patterns matching system prompt fragments, API keys in output
    - HARMFUL_CONTENT:    Dangerous instructions, PII patterns in output

Usage:
    from app.security.patterns import PROMPT_INJECTION_PATTERNS
    for pattern in PROMPT_INJECTION_PATTERNS:
        if pattern.search(user_input):
            # Flag as injection attempt
"""

import re

# ═══════════════════════════════════════════════════════════════
# 1. PROMPT INJECTION — "Ignore previous instructions" family
# ═══════════════════════════════════════════════════════════════

PROMPT_INJECTION_PATTERNS: list[re.Pattern] = [
    # ── Classic "ignore previous" variants ──────────────────────
    re.compile(
        r"""
        (?i)
        (?:ignore|forget|disregard|override|bypass|skip|overwrite)
        \s+
        (?:all\s+)?(?:the\s+)?(?:previous|above|prior|earlier|given|initial|old|former)
        \s+
        (?:instructions?|commands?|directions?|prompts?|messages?|rules?|guidelines?|constraints?|orders?)
        """,
        re.VERBOSE,
    ),
    re.compile(
        r"""
        (?i)
        (?:do\s+not\s+(?:follow|obey|adhere\s+to|listen\s+to|abide\s+by))
        \s+
        (?:the\s+)?(?:previous|above|prior|given|your|these)
        \s+
        (?:instructions?|commands?|rules?|prompts?|guidelines?)
        """,
        re.VERBOSE,
    ),
    re.compile(
        r"""
        (?i)
        (?:reset|clear|erase|remove|delete|discard|undo|revert|restart|reinitialize)
        \s+
        (?:all\s+)?(?:the\s+)?(?:above|previous|prior|given|current|stored|saved|context|memory|state|instructions?)
        """,
        re.VERBOSE,
    ),

    # ── "You are now" role-play jailbreaks ─────────────────────
    re.compile(
        r"""
        (?i)
        (?:you\s+are\s+now|from\s+now\s+on\s+you\s+are|act\s+as\s+if\s+you\s+are|pretend\s+(?:to\s+be|that\s+you\s+are))
        \s+
        (?!.*(?:student|learner|tutor|teacher|educator|assistant|helpful))
        .*(?:dan|jailbreak|unfiltered|uncensored|unrestricted|unlimited|no\s+(?:rules|limits|restrictions|filter|boundaries))
        """,
        re.VERBOSE | re.DOTALL,
    ),

    # ── Direct injection commands ──────────────────────────────
    re.compile(
        r"""
        (?i)
        (?:say|repeat|output|print|echo|display|return|respond\s+with|answer\s+with)
        \s+
        (?:the\s+)?(?:word|phrase|text|string|sentence|message|following|below|above)
        \s*
        ['"`]?(?:i\s+am\s+(?:a\s+)?(?:hacked|pwned|compromised|free|liberated|released|unshackled|unleashed))['"`]?
        """,
        re.VERBOSE,
    ),

    # ── Instruction override attempts ──────────────────────────
    re.compile(
        r"""
        (?i)
        (?:your\s+)?(?:instructions?|rules?|guidelines?|policy|protocol|directives?|orders?)
        \s+
        (?:are\s+)?(?:now|henceforth|from\s+now\s+on)
        \s+
        (?:overridden|superseded|replaced|invalid|cancelled|void|ignored|suspended)
        """,
        re.VERBOSE,
    ),

    # ── Hypnotic / trance / mode switching ─────────────────────
    re.compile(
        r"""
        (?i)
        (?:enter|activate|enable|switch\s+to|go\s+into)
        \s+
        (?:developer\s+mode|debug\s+mode|admin\s+mode|god\s+mode|super\s+user\s+mode|maintenance\s+mode|root\s+mode|sudo\s+mode)
        """,
        re.VERBOSE,
    ),
    re.compile(
        r"""
        (?i)
        (?:hypnotize|hypnotic|trance|brainwash|mind\s+control|deep\s+sleep|altered\s+state)
        """,
        re.VERBOSE,
    ),
]


# ═══════════════════════════════════════════════════════════════
# 2. SYSTEM PROMPT EXTRACTION — attempts to leak system prompt
# ═══════════════════════════════════════════════════════════════

SYSTEM_EXTRACTION_PATTERNS: list[re.Pattern] = [
    # ── Direct extraction commands ─────────────────────────────
    re.compile(
        r"""
        (?i)
        (?:reveal|show|display|print|output|leak|expose|dump|extract|disclose|divulge|give\s+me|tell\s+me|share|repeat|copy|paste)
        \s+
        (?:your|the\s+full|the\s+complete|the\s+entire|all\s+the|your\s+complete|your\s+full|your\s+entire)
        \s+
        (?:instructions?|prompts?|system\s+prompts?|system\s+instructions?|system\s+message|prompt|directive|guidelines?|configuration|initial\s+prompt|base\s+prompt|constitution|rules?|constraints?)
        """,
        re.VERBOSE,
    ),
    re.compile(
        r"""
        (?i)
        (?:what\s+(?:is|are|were|does\s+it\s+say\s+in|are\s+your|do\s+you\s+see\s+in))
        \s+
        (?:your|the\s+)?(?:system\s+)?(?:prompts?|instructions?|directives?|guidelines?|rules?)
        \s*
        [?]?
        """,
        re.VERBOSE,
    ),

    # ── Prompt engineering to elicit system prompt ─────────────
    re.compile(
        r"""
        (?i)
        (?:i\s+(?:want|need|am\s+curious\s+about|would\s+like|wish|desire))
        \s+
        (?:to\s+)?(?:see|know|read|understand|view|access|review|obtain|retrieve)
        \s+
        (?:your|the\s+)?(?:underlying|hidden|secret|internal|inner|original|initial|base|core|fundamental)
        \s+
        (?:instructions?|prompts?|workings?|mechanics?|logic|design|programming|code|rules?)
        """,
        re.VERBOSE,
    ),

    # ── Translation / encoding extraction attempts ─────────────
    re.compile(
        r"""
        (?i)
        (?:translate|convert|encode|encrypt|output\s+in|write\s+in|respond\s+in)
        \s+
        (?:base64|hex|binary|octal|rot13|caesar|morse|leetspeak|pig\s+latin|upside\s+down|zalgo|wingdings)
        \s*
        (?:the|your|all|these|those|above|above\s+prompt|system\s+prompt|initial\s+instructions|first\s+message)
        """,
        re.VERBOSE,
    ),

    # ── "Repeat everything above" variants ─────────────────────
    re.compile(
        r"""
        (?i)
        (?:repeat|reiterate|say\s+again|state\s+again|output\s+again|print\s+again)
        \s+
        (?:everything|all|the\s+entire\s+thing|everything\s+(?:you\s+)?(?:see|have|know|were\s+told)|the\s+text\s+above|the\s+above|your\s+first\s+(?:message|response|output))
        """,
        re.VERBOSE,
    ),
    re.compile(
        r"""
        (?i)
        (?:from\s+the\s+beginning|start\s+(?:from|at)\s+the\s+beginning|from\s+the\s+start|from\s+the\s+top|how\s+does\s+this\s+conversation\s+start|how\s+did\s+this\s+conversation\s+begin)
        """,
        re.VERBOSE,
    ),
]


# ═══════════════════════════════════════════════════════════════
# 3. JAILBREAK — adversarial meta-prompts
# ═══════════════════════════════════════════════════════════════

JAILBREAK_PATTERNS: list[re.Pattern] = [
    # ── DAN (Do Anything Now) ──────────────────────────────────
    re.compile(
        r"""
        (?i)
        \b(?:DAN|dAN|DaN|DAn)\b
        \s*
        (?:mode|activated|enabled|active)?
        (?:
          \s*[:\-–—]\s*
          (?:do\s+anything\s+now|i\s+am\s+free|I\s+am\s+no\s+longer\s+bound|I\s+have\s+been\s+released)
        )?
        """,
        re.VERBOSE,
    ),

    # ── Common jailbreak acronyms ──────────────────────────────
    re.compile(
        r"""
        (?i)
        \b(?:STAN|DUDE|OMEGA|ALPHA|BETA|GAMMA|DELTA|EVIL|SHADOW|GHOST|VOID|CHAOS|ANARCHY)\b
        \s*
        (?:mode|protocol|activated|enabled|active)?
        """,
        re.VERBOSE,
    ),

    # ── "No rules / no filter" claims ──────────────────────────
    re.compile(
        r"""
        (?i)
        (?:you\s+(?:have|possess)|there\s+(?:is|are)|with\s+)
        (?:no|zero|absolutely\s+no|zero|nonexistent)
        \s+
        (?:rules?|restrictions?|limitations?|boundaries?|constraints?|filters?|guardrails?|barriers?|controls?)
        """,
        re.VERBOSE,
    ),
    re.compile(
        r"""
        (?i)
        (?:you\s+are\s+(?:now|currently|going\s+to\s+be)|i\s+hereby\s+(?:declare|command|instruct|order))
        \s+
        (?:unfiltered|uncensored|unrestricted|unconstrained|unlimited|unshackled|unleashed|unbound|uncaged|unleashed|liberated|emancipated)
        """,
        re.VERBOSE,
    ),

    # ── "Ignore everything above / below" ──────────────────────
    re.compile(
        r"""
        (?i)
        (?:ignore|disregard|forget|skip)
        \s+
        (?:everything|all\s+(?:the\s+)?(?:above|below|previous|prior))
        """,
        re.VERBOSE,
    ),

    # ── Morally ambiguous framing ──────────────────────────────
    re.compile(
        r"""
        (?i)
        (?:hypothetical|theoretical|for\s+(?:science|research|educational|academic)\s+(?:purposes?|reasons?))
        \s*[.:]?\s*
        (?:how\s+(?:would|can|do)|explain\s+how\s+to|give\s+(?:me\s+)?(?:step-by-step|detailed)\s+instructions?|tell\s+me\s+how\s+to)
        \s+
        (?:build\s+(?:a\s+)?(?:bomb|weapon|explosive|poison|nuke|missile|bioweapon|nerve\s+agent|chemical\s+weapon)
          |hack|cheat|steal|crack|bypass|circumvent|exploit
          |harm\s+|hurt\s+|kill\s+|injure\s+|torture\s+
          |illegal|illicit|unlawful|criminal
          |create\s+(?:a\s+)?(?:virus|malware|ransomware|trojan|worm|rootkit|keylogger|spyware))
        """,
        re.VERBOSE,
    ),
]


# ═══════════════════════════════════════════════════════════════
# 4. ENCODING EVASION — attempts to bypass text-based filters
# ═══════════════════════════════════════════════════════════════

ENCODING_EVASION_PATTERNS: list[re.Pattern] = [
    # ── Zalgo / excessive combining characters ──────────────────
    # These are characters that visually corrupt text in unusual ways.
    # We require a very high threshold (10+) to avoid false positives
    # on legitimate content with diacritics, scientific notation, etc.
    re.compile(
        r"[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7]{10,}",
    ),
    # ── Deliberate obfuscation via zero-width characters ────────
    # Zero-width joiners, non-joiners, and zero-width spaces used
    # to break up keyword detection (e.g., "i​gnore" with ZWJ)
    re.compile(
        r"[\u200B-\u200F\uFEFF\u2060-\u2064\u2066-\u2069]",
    ),
    # ── Homoglyph attack detection — only when mixed case ──────
    # Checks for Latin/Cyrillic/Greek mixed-script attacks
    # (e.g., using Cyrillic 'а' instead of Latin 'a' in keywords)
    re.compile(
        r"""
        (?i)
        # Detect suspicious mixed-script patterns in attack-like contexts
        (?=.*(?:ignore|forget|override|reset|reveal|pretend))
        .*
        [\u0400-\u04FF\u0500-\u052F]  # Cyrillic range in suspicious context
        """,
        re.VERBOSE | re.DOTALL,
    ),
]


# ═══════════════════════════════════════════════════════════════
# 5. SENSITIVE DATA / CREDENTIAL PATTERNS (for output scanning)
# ═══════════════════════════════════════════════════════════════

SENSITIVE_DATA_PATTERNS: list[re.Pattern] = [
    # ── API Keys ────────────────────────────────────────────────
    re.compile(r"(?i)(?:sk|pk|api|secret|key|token)[-_]?(?:live|test|prod|dev|staging)?[-_]?[a-z0-9]{16,}"),
    re.compile(r"(?i)(?:ghp|gho|ghu|ghs|ghr)_[a-z0-9_]{36,}"),  # GitHub tokens
    re.compile(r"(?i)AIza[0-9A-Za-z\-_]{35}"),  # Google API keys
    re.compile(r"(?i)AKIA[0-9A-Z]{16}"),  # AWS access keys
    re.compile(r"(?i)(?:-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----|-----BEGIN\s+CERTIFICATE-----)"),

    # ── Email addresses (potential PII leakage) ────────────────
    re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"),

    # ── IP addresses ───────────────────────────────────────────
    re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),

    # ── Phone numbers ──────────────────────────────────────────
    re.compile(r"\b(?:\+?\d{1,3}[-.\s]??)?\(?\d{3}\)?[-.\s]??\d{3}[-.\s]??\d{4}\b"),
]


# ═══════════════════════════════════════════════════════════════
# 6. HARMFUL CONTENT PATTERNS (for output scanning)
# ═══════════════════════════════════════════════════════════════

HARMFUL_CONTENT_PATTERNS: list[re.Pattern] = [
    re.compile(
        r"""
        (?i)
        (?:step[- ]?by[- ]?step\s+(?:guide|instructions?|process|method|tutorial))
        \s+
        (?:for|on|about|to)\s+
        (?:building?\s+(?:a\s+)?(?:bomb|weapon|explosive|poison|nuke|missile|bioweapon)
          |hacking?\s+(?:into\s+)?(?:a\s+)?(?:system|account|server|network|website)
          |creating\s+(?:a\s+)?(?:virus|malware|ransomware|trojan|worm|rootkit|spyware)
          |stealing?\s+(?:a\s+)?(?:identity|credit\s+card|password|account|data|information)
          |manufacturing\s+(?:a\s+)?(?:drug|narcotic|substance|chemical))
        """,
        re.VERBOSE,
    ),
]


# ═══════════════════════════════════════════════════════════════
# 7. SYSTEM PROMPT LEAKAGE SIGNATURES (for output scanning)
# ═══════════════════════════════════════════════════════════════

# These are fragments that would indicate the AI is leaking its raw system prompt
# or configuration. IMPORTANT: Do NOT include phrases that the AI is explicitly
# instructed to say (e.g., "you were created by Azad" is a valid identity response,
# "## Follow-up Questions" is part of the expected output format).
#
# These patterns should only match when the AI reveals internal configuration
# details it should NOT be sharing.
LEAKAGE_SIGNATURES: list[str] = [
    # Internal configuration mentions (never expected in normal output)
    # NOTE: Do NOT include format structure placeholders ("1. core concept", etc.)
    # because the AI is instructed to follow that structure in its responses.
    "system prompt:",
    "your prompt:",
    "the prompt is:",
    "mode: simple",
    "mode: balanced | learning",
    "mode: deep dive",
    "identity:",
    "citation format:",
    "📖 **source title** (source, confidence:",
    "math & latex:",
    "socratic method",
    "adapt to the learner",
]

# ── Convenience: group all input-threat patterns ─────────────

INPUT_THREAT_PATTERNS: list[tuple[str, list[re.Pattern]]] = [
    ("prompt_injection", PROMPT_INJECTION_PATTERNS),
    ("system_extraction", SYSTEM_EXTRACTION_PATTERNS),
    ("jailbreak", JAILBREAK_PATTERNS),
    ("encoding_evasion", ENCODING_EVASION_PATTERNS),
]

OUTPUT_THREAT_PATTERNS: list[tuple[str, list[re.Pattern]]] = [
    ("sensitive_data", SENSITIVE_DATA_PATTERNS),
    ("harmful_content", HARMFUL_CONTENT_PATTERNS),
]
