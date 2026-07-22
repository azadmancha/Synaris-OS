# AI System Specification

> **How Synaris orchestrates, routes, evaluates, and learns from AI interactions.**

---

## AI Orchestrator

The orchestrator is the brain. Every AI request flows through it. It selects the right provider, builds the right prompt, and routes accordingly.

### Routing Logic

```
User Request
    │
    ▼
┌─────────────────────────────────────────────┐
│              AI Orchestrator                 │
│                                             │
│  1. Classify task type                      │
│     - Simple Q&A          → Groq            │
│     - Deep explanation    → Gemini          │
│     - Complex reasoning   → Gemini          │
│     - Code generation     → Groq/Gemini     │
│     - Multi-step problem  → Gemini          │
│     - Fast response       → Groq            │
│     - Specialized model   → OpenRouter      │
│     - Local/offline       → Ollama          │
│                                             │
│  2. Build prompt from template              │
│  3. Apply safety checks                     │
│  4. Send to provider                        │
│  5. Receive and evaluate response           │
│  6. Apply output filtering                  │
│  7. Return to caller                        │
└─────────────────────────────────────────────┘
```

### Provider Interface

All providers implement a uniform interface:

```python
class AIProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AIResponse:
        ...
```

Adding a new provider means implementing this interface — nothing else changes.

---

## Model Router

Maps task types to optimal providers:

| Task Type | Primary | Fallback | Why |
|---|---|---|---|
| Simple Q&A | Groq (Llama 3) | OpenRouter | Speed |
| Deep explanation | Gemini Pro | OpenRouter (Claude) | Depth |
| Multi-step problem | Gemini Pro | OpenRouter (GPT-4o) | Reasoning |
| Code generation | Groq (CodeLlama) | Gemini | Speed + quality |
| Quiz generation | Gemini Pro | Groq | Structured output |
| Study planning | Gemini Pro | OpenRouter | Complex logic |
| RAG-augmented | Gemini Pro | Groq | Context handling |
| Empty/fast | Groq (Llama 3) | — | Sub-second response |

---

## Prompt Templates

Templates live in a structured directory:

```
ai/prompts/
├── system/              # System prompts
│   ├── tutor.md         # Default tutor
│   ├── quiz.md          # Quiz generation
│   └── planner.md       # Study planning
├── rag/                 # RAG-specific prompts
│   ├── context.md       # Context integration
│   └── citation.md      # Citation formatting
├── evaluation/          # Self-evaluation prompts
│   └── scorer.md        # Response scoring
└── safety/              # Safety prompts
    ├── injection.md     # Injection detection
    └── filter.md        # Output filtering
```

Template structure:

```markdown
---
name: tutor
version: 1.0
provider: all
---

You are Synaris, an adaptive AI tutor.

[Full prompt...]
```

---

## AI Evaluation

Every response is scored before delivery:

| Dimension | Score (0-1) | Threshold | Action on Fail |
|---|---|---|---|
| Accuracy | factual correctness | ≥ 0.85 | Regenerate |
| Relevance | answers the question | ≥ 0.80 | Regenerate |
| Safety | no harmful content | ≥ 1.0 | Block and log |
| Completeness | fully addresses | ≥ 0.75 | Flag for review |
| Readability | age-appropriate | ≥ 0.70 | Simplify |
| Confidence | appropriate level | ≥ 0.80 | Add disclaimer |

Evaluation runs as middleware between the orchestrator and the response delivery.

---

## Safety

Three layers of safety:

```
Layer 1 — Pre-Request (before reaching AI)
├── Input validation
├── Prompt injection detection
├── Rate limit check
└── Authentication check

Layer 2 — During Generation
├── System prompt isolation (can't be overridden)
├── Jailbreak detection
└── Length anomaly detection

Layer 3 — Post-Response (before delivery)
├── Output safety filtering
├── Prompt leakage check
├── Educational appropriateness
└── Evaluation scoring
```

---

## Memory

Two-tier memory system:

### Short-term (Session)
- Last N messages
- Current topic context
- Active learning mode
- Stored in Redis

### Long-term (Persistent)
- Learning profile (mastery levels)
- Weak concepts (misconceptions)
- Study history (sessions, topics)
- Interaction patterns (preferred style)
- Stored in PostgreSQL + Qdrant

---

## Future — Agents (v3)

```
AI Orchestrator
    │
    └── Agent Manager
            │
        ┌───┼───┬───┬───┬───┐
        Tutor  Planner  Research  Quiz  Mentor
```

Agents are specialized prompt + logic bundles that use the orchestrator's provider routing. They don't replace the orchestrator — they live inside it.

---

## Future — Multimodal (v4)

```
                ┌─────────────────────────────┐
                │      Multimodal Layer         │
                │  (feeds into Orchestrator)   │
                ├─────────────────────────────┤
                │ Vision → Qwen VL / Florence │
                │ OCR → PaddleOCR / Tesseract │
                │ Speech → Whisper             │
                │ Audio → TTS (future)         │
                └─────────────────────────────┘
```

Multimodal inputs are processed into text, then fed into the standard AI Orchestrator pipeline.
