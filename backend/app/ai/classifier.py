"""
Question Classifier — lightweight subject/intent detection.

Determines what kind of question the user is asking BEFORE
sending it to the main AI. This gates RAG lookups and
tailors the system prompt.

Categories:
  - simple:    Basic facts, calculations ("what's 2+2?", "define X")
  - math:      Math problems, equations (needs RAG: no, needs LaTeX: yes)
  - science:   Physics, chemistry, biology (needs RAG: maybe)
  - code:      Programming questions (needs RAG: no)
  - history:   Historical events, dates (needs RAG: yes)
  - concept:   Deep conceptual questions (needs RAG: maybe)
  - general:   Everything else (needs RAG: no)

Usage:
    classification = await classify_question("What is quantum entanglement?")
    if classification.needs_rag:
        augmented_prompt = await augment_with_knowledge(prompt)
"""

import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class QuestionClass:
    """Classification result for a user question."""
    category: str = "general"       # simple, math, science, code, history, concept, general
    needs_rag: bool = False         # Whether to search Wikipedia
    needs_latex: bool = False       # Whether math formatting is needed
    complexity: str = "medium"      # low, medium, high
    subject: str = "general"        # The detected subject
    confidence: float = 0.0         # How confident we are (internal use only)


# ─── Pattern-based classifier (fast, no external API call) ─────

# NOTE: "Why" questions are NOT in this list — they're checked AFTER
# science/code/history patterns so complex "why" questions (e.g.
# "Why does quantum entanglement happen?") get proper RAG treatment.
_SIMPLE_PATTERNS = [
    # ── Basic calculations ──
    r"^\d+\s*[-+*/xX\xf7]\s*\d+",  # "2+2", "5*3", "10/2"

    # ── What / Which questions ──
    r"^(what('s| is)\s+(a|an|the)\s+\w+)",         # "What's a neuron?", "What is the capital"
    r"^(what('s| is)\s+\w+\s+(mean|stand for))",     # "What does CPU mean?", "What's API stand for"
    r"^(what does\s+\w+\s+(mean|stand for|refer to))",  # "What does API stand for?"
    r"^(what\s+(is|are)\s+\w+\s+(used for|made of|made from))",  # "What is X used for?"
    r"^(what('s| is)\s+(the\s+)?(difference|opposite|synonym|antonym))",  # "What's the difference?"
    r"^(what\s+(color|size|shape|weight|height|length|width|depth)\s+(is|are))",  # "What color is the sky?"
    r"^(what\s+(is|are)\s+\w+\s+called)",            # "What are baby cats called?"
    r"^(what\s+is\s+\w+\s*[?]?$)",                   # "What is entropy?" (single-word topic only)

    # ── Define / Explain (concise) ──
    r"^(define|what is|what's|what are)\s+\w+",      # "Define inertia", "What is gravity"
    r"^(explain briefly|summarize)\s+\w+",   # "Explain briefly how rain forms"

    # ── How questions (measurable attributes) ──
    r"^(how\s+(old|tall|big|far|long|many|much|fast|heavy|deep|wide|hot|cold)\s+(is|are)\s+\w+)",
    r"^(how\s+(do|does|can|would)\s+(i|you|we)\s+\w+)",  # "How do I cook pasta?"

    # ── When / Where / Who ──
    r"^(when\s+(was|were|did|will|do|does)\s+\w+)",
    r"^(where\s+(is|are|was|were|do|does|did|can)\s+\w+)",
    r"^(who\s+(is|was|were|invented|created|discovered|wrote|said|made)\s+\w+)",

    # ── Yes / No / Short answers ──
    r"^(yes|no|maybe|idk|i don't know|not sure|perhaps|probably|never mind)$",
    r"^(is\s+(it|there|that|this)\s+\w+)",           # "Is it true?", "Is there a way?"
    r"^(are\s+(there|these|those|we|you|they)\s+\w+)",
    r"^(can\s+(i|you|we|it|this|that)\s+\w+)",       # "Can you help?", "Can I do X?"
    r"^(does\s+(it|this|that|he|she)\s+\w+)",        # "Does this work?"
    r"^(do\s+(you|we|they|i)\s+\w+)",                # "Do you know?", "Do we need?"

    # ── Greetings & acknowledgements ──
    r"^(hi|hello|hey|good morning|good afternoon|good evening|good night|greetings|sup|yo)(\s|[!.,?]|$)",
    r"^(thanks|thank you|thankyou|thx|ty|tyvm)\s*(!|\.|,)?(\s|$)",
    r"^(appreciate it|much appreciated|cheers)(\s|[!.,?]|$)",
    r"^(ok|okay|okey|k|kk|sure|great|awesome|nice|perfect|excellent|amazing)(\s|[!.,?]|$)",
    r"^(got it|gotcha|understood)(\s|[!.,?]|$)",
    r"^(bye|goodbye|see you|later|talk later|peace)(\s|[!.,?]|$)",

    # ── Follow-up prompts ──
    r"^(can you|could you|please)\s+(elaborate|expand|clarify|explain|detail)\s*\w*",
    r"^(tell me more|go on|continue|elaborate|explain further|give me more|say more)(\s|[!.,?]|$)",
    r"^(give (me|another)\s+example)",               # "Give me an example", "Give another example"
    r"^(show me|give me|list|name)\s+(a|an|the|some|me|another|more)\s+\w+",

    # ── Conversion / Translation ──
    r"^(convert|change|turn)\s+\w+\s+(to|into)\s+\w+",  # "Convert 100F to Celsius"
    r"^(translate)\s+\w+\s+(to|into)\s+\w+",            # "Translate hello to Spanish"
    r"^(how many|how much)\s+\w+\s+(are|is)\s+in\s+\w+",  # "How many feet in a meter?"

    # ── Spelling / Pronunciation / Meaning ──
    r"^(how do you (spell|pronounce|say))\s+\w+",     # "How do you spell parallel?"

    # ── Usage / Purpose ──
    r"^(what('s| is)\s+\w+\s+(for|used for|about))",  # "What's Python for?", "What is calculus about?"

    # ── Short standalone questions ──
    r"^(why|why not|how|how come|when|where|who|which one|what next|and then|so what)\s*[?]?$",

    # ── Possession / Existence ──
    r"^(does\s+\w+\s+(have|has|contain|include|support))\s+\w+",
    r"^(is\s+there\s+\w+)",

    # ── Comparisons (basic, well-known concepts) ──
    r"^(what('s| is)\s+the\s+(difference|similarity|relation)\s+between)",

    # ── True/False verification ──
    r"^(is it (true|correct|possible|right|safe|ok|okay)\s+(that|to))",
]

_MATH_PATTERNS = [
    r"(integrate|derivative|differentiate|solve|equation|formula)",
    r"(matrix|vector|tensor|eigenvalue|eigenvector)",
    r"(theorem|lemma|proof|axiom|postulate)",
    r"(polynomial|quadratic|logarithm|exponential|trigonometric)",
    r"(\u2211|\u222b|\u03c0|\u221a|\u221e|\u2202|\u2207|\u0394|\u03bb|\u03b8|\u03c6)",  # Sum, integral, pi, sqrt symbols
    r"(calculus|algebra|geometry|topology|statistics|probability)",
    r"\$\w+\$",  # Already has LaTeX
    r"\\frac|\\sum|\\int|\\sqrt|\\alpha|\\beta|\\gamma",
]

_SCIENCE_PATTERNS = [
    r"(physics|chemistry|biology|astronomy|thermodynamics|quantum)",
    r"(DNA|RNA|protein|cell|molecule|atom|electron|proton|neutron)",
    r"(gravity|electromagnetism|nuclear|fission|fusion)",
    r"(photosynthesis|evolution|ecosystem|organism|species)",
    r"(force|mass|acceleration|velocity|energy|momentum|entropy)",
]

_CODE_PATTERNS = [
    r"(python|javascript|typescript|java|rust|golang|swift|kotlin)",
    r"(function|class|method|variable|loop|array|object|async)",
    r"(compile|debug|refactor|deploy|API|algorithm|data structure)",
    r"(HTML|CSS|React|Next|Node|Django|Flask|SQL|NoSQL)",
    r"(bug fix|code review|optimize|implement)",
]

_HISTORY_PATTERNS = [
    r"(history|historical|century|ancient|medieval|renaissance)",
    r"(war|battle|revolution|empire|kingdom|civilization)",
    r"(president|king|queen|emperor|pharaoh|dynasty)",
]

# "Why" questions are checked LAST (after subject-specific patterns)
# so science/history questions starting with "why" still get proper RAG.
_WHY_PATTERN = r"^(why\s+(is|are|was|were|do|does|did|can|would|should)\s+\w+)"


def _pattern_classify(question: str) -> QuestionClass | None:
    """Try to classify using fast regex patterns (no AI call needed)."""
    q = question.strip().lower()

    # 1. Check simple patterns (except "why" — handled last)
    for pattern in _SIMPLE_PATTERNS:
        if re.match(pattern, q, re.IGNORECASE):
            return QuestionClass(
                category="simple",
                needs_rag=False,
                needs_latex="=" in q or "+" in q or "-" in q or "*" in q,
                complexity="low",
                subject="general",
                confidence=0.85,
            )

    # 2. Check math patterns
    for pattern in _MATH_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return QuestionClass(
                category="math",
                needs_rag=False,
                needs_latex=True,
                complexity="low" if len(q) < 30 else "medium",
                subject="mathematics",
                confidence=0.8,
            )

    # 3. Check science patterns
    for pattern in _SCIENCE_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return QuestionClass(
                category="science",
                needs_rag=True,
                needs_latex=any(p in q for p in ["equation", "formula", "calculate"]),
                complexity="medium",
                subject="science",
                confidence=0.75,
            )

    # 4. Check code patterns
    for pattern in _CODE_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return QuestionClass(
                category="code",
                needs_rag=False,
                needs_latex=False,
                complexity="low" if len(q) < 40 else "medium",
                subject="programming",
                confidence=0.8,
            )

    # 5. Check history patterns
    for pattern in _HISTORY_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return QuestionClass(
                category="history",
                needs_rag=True,
                needs_latex=False,
                complexity="medium",
                subject="history",
                confidence=0.7,
            )

    # 6. Why questions last — don't preempt subject-specific patterns
    #    (e.g. "Why does quantum entanglement happen?" should be science, not simple)
    if re.match(_WHY_PATTERN, q, re.IGNORECASE):
        return QuestionClass(
            category="simple",
            needs_rag=False,
            needs_latex=False,
            complexity="low" if len(q) < 40 else "medium",
            subject="general",
            confidence=0.7,
        )

    return None


# ─── AI-based classifier (for ambiguous questions, uses fast model) ─────

_SYSTEM_PROMPT_CLASSIFY = """You are a question classifier. Analyze the user's question and return ONLY a JSON object with no other text:

{
  "category": "simple|math|science|code|history|concept|general",
  "needs_rag": true/false,
  "needs_latex": true/false,
  "complexity": "low|medium|high",
  "subject": "brief subject name"
}

Rules:
- simple: Basic calculations, definitions, yes/no questions, factual lookups
- math: Math problems, equations, formulas, proofs (needs_rag: false)
- science: Physics, chemistry, biology, astronomy (needs_rag: true for deep topics)
- code: Programming, algorithms, debugging (needs_rag: false)
- history: Historical events, people, dates (needs_rag: true)
- concept: Deep conceptual explanations, "how does X work" (needs_rag: true)
- general: Everything else (needs_rag: false)

Only set needs_rag: true for topics that benefit from Wikipedia context (science concepts, history, deep conceptual questions).
Simple questions and math/code problems do NOT need RAG."""


async def classify_question(question: str) -> QuestionClass:
    """
    Classify a user's question to determine routing and RAG needs.

    Uses fast pattern matching first, falls back to AI classification
    if patterns don't match.
    """
    if not question or not question.strip():
        return QuestionClass(category="general", needs_rag=False, complexity="low", confidence=1.0)

    # Try fast pattern matching first
    pattern_result = _pattern_classify(question)
    if pattern_result is not None:
        logger.debug(f"Pattern classified '{question[:40]}...' as {pattern_result.category}")
        return pattern_result

    # Fall back to AI classification for ambiguous questions
    try:
        from app.orchestration.router import route_request

        result = await route_request(
            prompt=f"Classify this question: {question}",
            system_prompt=_SYSTEM_PROMPT_CLASSIFY,
            mode="quick",
        )

        import json
        data = json.loads(result.content)
        return QuestionClass(
            category=data.get("category", "general"),
            needs_rag=data.get("needs_rag", False),
            needs_latex=data.get("needs_latex", False),
            complexity=data.get("complexity", "medium"),
            subject=data.get("subject", "general"),
            confidence=0.6,
        )
    except Exception as e:
        logger.warning(f"AI classification failed, using default: {e}")
        return QuestionClass(category="general", needs_rag=False, complexity="medium", confidence=0.0)
