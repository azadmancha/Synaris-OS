# AI Architecture

> **Version 1.0 — The multi-agent reasoning system that powers Synaris**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Agent Pipeline](#agent-pipeline)
3. [Coordinator Agent](#coordinator-agent)
4. [Intent Router](#intent-router)
5. [Subject Agents](#subject-agents)
6. [Reasoning Engine](#reasoning-engine)
7. [Teaching Agent](#teaching-agent)
8. [Evaluation Engine](#evaluation-engine)
9. [Memory Agent](#memory-agent)
10. [Response Generator](#response-generator)
11. [Multi-Model Strategy](#multi-model-strategy)
12. [Failure Handling & Retry Logic](#failure-handling--retry-logic)
13. [Agent Communication Protocol](#agent-communication-protocol)

---

## Architecture Overview

Synaris uses a **coordinated multi-agent architecture** where specialized agents work together to produce adaptive, high-quality learning experiences.

### Design Principles

1. **Separation of concerns** — Each agent has a single responsibility
2. **Composability** — Agents can be added, removed, or replaced independently
3. **Observability** — Every agent decision is logged and auditable
4. **Graceful degradation** — If one agent fails, the system adapts
5. **Model flexibility** — Each agent can use a different LLM optimized for its task

### High-Level Flow

```
User Input
    │
    ▼
┌─────────────────────┐
│   Coordinator       │  Entry point. Validates input. Manages state.
│   Agent             │  Routes to appropriate pipeline.
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Intent Router     │  Classifies intent: teach / quiz / research /
│                     │  practice / clarify / off-topic
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Subject Router    │  Identifies subject domain: math / physics / cs /
│                     │  history / etc. Routes to subject agent.
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Reasoning Agent   │  Core reasoning. First-principles analysis.
│                     │  Step-by-step verification.
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Teaching Agent    │  Adapts reasoning to learner's level.
│                     │  Applies pedagogy. Generates examples.
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Evaluation Agent  │  Self-evaluates the response.
│                     │  Checks accuracy, pedagogy, hallucination risk.
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Memory Agent      │  Updates learning profile.
│                     │  Stores in long-term memory.
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Response          │  Renders final response.
│   Generator         │  Formats for UI. Generates follow-ups.
└─────────────────────┘
          │
          ▼
     User Receives
```

### Parallel Processing

Not all agents run sequentially. Some run in parallel:

```
User Input → Coordinator → Intent Router
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             Subject Router   Memory Agent   Knowledge Graph
                    │                         (parallel lookup)
                    ▼
             Reasoning Agent
                    │
                    ▼
             Teaching Agent
                    │
                    ▼
             Evaluation Agent (parallel with Memory Agent)
                    │
                    ▼
             Response Generator
                    │
                    ▼
```

---

## Agent Specifications

### 1. Coordinator Agent

**Purpose:** Entry point. Validates input. Manages session state. Routes to the correct pipeline.

**Input:**
```json
{
  "user_input": "Explain entropy in thermodynamics",
  "session_id": "uuid",
  "user_id": "uuid",
  "mode": "deep_dive",
  "context": {
    "previous_messages": [...],
    "active_subject": "physics",
    "current_topic": "thermodynamics"
  }
}
```

**Processing:**
1. Validate input (not empty, not spam, not off-topic)
2. Check session state (new or continuing)
3. Retrieve relevant context from Memory Agent
4. Pass to Intent Router

**Output:**
```json
{
  "validated_input": "Explain entropy in thermodynamics",
  "session_context": {...},
  "learner_profile": {...},
  "next_agent": "intent_router"
}
```

**Failure cases:**
- Empty input → Return prompt for input
- Spam detection → Request rephrasing
- Session expired → Create new session, notify user

**Model:** Fast + cheap (e.g., GPT-4o-mini, DeepSeek-Chat, Claude Haiku)

---

### 2. Intent Router

**Purpose:** Classify the learner's intent. This determines which pipeline the request follows.

**Intents:**

| Intent | Description | Pipeline |
|---|---|---|
| `teach` | Learn a new concept | Full pipeline |
| `clarify` | Understand a specific point | Short pipeline |
| `practice` | Solve a problem | Reasoning + evaluation |
| `quiz` | Test knowledge | Quiz pipeline |
| `research` | Deep analysis of a topic | Research pipeline |
| `code` | Programming help | Code pipeline |
| `summarize` | Summarize content | Short pipeline |
| `compare` | Compare concepts | Full pipeline |
| `apply` | Apply concept to real-world | Application pipeline |
| `off_topic` | Not educational | Polite redirect |

**Input:**
```json
{
  "user_input": "Explain entropy in thermodynamics",
  "session_context": {...},
  "learner_profile": {...}
}
```

**Output:**
```json
{
  "intent": "teach",
  "confidence": 0.97,
  "sub_intent": "concept_explanation",
  "alternative_intents": [
    {"intent": "clarify", "confidence": 0.02},
    {"intent": "apply", "confidence": 0.01}
  ]
}
```

**Failure cases:**
- Low confidence (< 0.7) → Ask clarifying question
- Ambiguous → Present options to user
- Off-topic → Polite redirect to educational topics

**Model:** Medium speed + accuracy (e.g., Claude Sonnet, GPT-4o)

---

### 3. Subject Router

**Purpose:** Identify the subject domain(s) of the question and route to the appropriate subject agent.

**Subjects:**

| Subject | Agent | Specialization |
|---|---|---|
| Mathematics | Math Agent | Algebra, calculus, geometry, statistics |
| Physics | Physics Agent | Mechanics, thermodynamics, EM, quantum |
| Chemistry | Chemistry Agent | Organic, inorganic, physical, biochemistry |
| Computer Science | CS Agent | Algorithms, systems, AI, theory |
| Biology | Biology Agent | Molecular, cellular, ecology, genetics |
| History | History Agent | World, regional, historiography |
| Economics | Economics Agent | Micro, macro, econometrics |
| Literature | Literature Agent | Analysis, theory, writing |
| Philosophy | Philosophy Agent | Logic, ethics, metaphysics |
| Engineering | Engineering Agent | Mechanical, electrical, civil |
| Medicine | Medicine Agent | Anatomy, physiology, pathology |
| Cross-Disciplinary | Mixed | Multiple subjects combined |

**Input:**
```json
{
  "user_input": "Explain entropy in thermodynamics",
  "intent": "teach",
  "learner_profile": {...}
}
```

**Output:**
```json
{
  "primary_subject": "physics",
  "sub_topics": ["thermodynamics", "entropy", "statistical_mechanics"],
  "confidence": 0.95,
  "cross_disciplinary": true,
  "related_subjects": ["mathematics", "chemistry"],
  "prerequisites": [
    {"concept": "energy", "mastery_required": "familiar"}
  ]
}
```

**Failure cases:**
- Unknown subject → General reasoning agent as fallback
- Cross-disciplinary → Route to multiple agents, merge responses
- Prerequisites not met → Suggest review before proceeding

**Model:** Medium (e.g., DeepSeek-Chat, Claude Sonnet)

---

### 4. Reasoning Agent(s)

**Purpose:** Core reasoning. This is where the actual thinking happens. Each subject has its own reasoning approach.

#### General Reasoning Agent (Fallback)

Used when no specialized subject agent exists.

**Process:**
1. Decompose the question into sub-problems
2. Apply first-principles reasoning
3. Verify each step independently
4. Cross-check for consistency
5. Identify assumptions and limitations

**Input:**
```json
{
  "user_input": "Explain entropy in thermodynamics",
  "subject": "physics",
  "sub_topics": ["thermodynamics", "entropy"],
  "learner_profile": {...},
  "mode": "deep_dive"
}
```

**Output:**
```json
{
  "reasoning_steps": [
    {"step": 1, "content": "...", "verification": "valid"},
    {"step": 2, "content": "...", "verification": "valid"},
    ...
  ],
  "conclusion": "...",
  "confidence": 0.92,
  "alternative_perspectives": [...],
  "assumptions": [...],
  "knowledge_gaps": [...]
}
```

#### Math Agent

**Specialized capabilities:**
- Symbolic mathematics (SymPy)
- Step-by-step verification
- Multiple solution paths
- Common mistake identification
- Visualization generation

**Tools:**
- SymPy for symbolic computation
- LaTeX for mathematical notation
- Manim for animated visualizations (future)

#### Physics Agent

**Specialized capabilities:**
- Dimensional analysis
- Conservation law verification
- Approximation techniques (limits, expansions)
- Physical intuition building
- Real-world application mapping

#### Programming Agent

**Specialized capabilities:**
- Code execution (sandboxed)
- Algorithm analysis (time/space complexity)
- Multiple language support
- Debugging and error explanation
- Code review and refactoring
- Architecture generation
- Test generation

**Tools:**
- Tree-sitter for AST parsing
- Sandboxed Python/JS execution
- Pyright/Pylint for static analysis

**Failure cases:**
- Incorrect reasoning → Retry with different approach
- Missing prerequisite → Flag and request additional context
- Ambiguity → Present multiple interpretations

**Models:** Variable by task:
- Complex reasoning: Claude Opus, GPT-4o, DeepSeek-R1
- Math: DeepSeek-Math, Gemini
- Code: Claude Sonnet, DeepSeek-Coder

---

### 5. Teaching Agent

**Purpose:** Take the reasoning output and adapt it for the learner. This is where educational psychology meets AI.

**Adaptation dimensions:**

1. **Depth level:**
   - Quick: Core insight only (1–2 sentences)
   - Balanced: Explanation with 1 example (2–3 paragraphs)
   - Deep Dive: Full treatment with multiple perspectives
   - Expert: Technical depth with formalisms

2. **Learning style:**
   - Visual: Diagrams, graphs, mind maps
   - Textual: Well-structured prose, analogies
   - Interactive: Questions, exercises, predictions
   - Mixed: Adaptive combination

3. **Knowledge level:**
   - Beginner: Assume no prerequisites. Build from foundations.
   - Intermediate: Assume basic knowledge. Connect to existing understanding.
   - Advanced: Assume strong foundations. Focus on depth and nuance.
   - Expert: Assume mastery. Focus on edge cases and open questions.

4. **Pedagogical strategy:**
   - Socratic: Question-driven, guide to discovery
   - Feynman: Explain simply, use analogies
   - First Principles: Build from fundamental truths
   - Example-driven: Learn through concrete cases
   - Problem-based: Learn through application

**Input:**
```json
{
  "reasoning_output": {...},
  "learner_profile": {
    "depth_preference": "deep_dive",
    "learning_style": "visual",
    "knowledge_level": "intermediate",
    "weak_concepts": ["statistical_mechanics"],
    "strong_concepts": ["classical_mechanics"]
  }
}
```

**Output:**
```json
{
  "explanation": "...",
  "examples": [
    {"type": "analogy", "content": "..."},
    {"type": "real_world", "content": "..."}
  ],
  "visualization_suggestions": [
    {"type": "mermaid", "content": "..."},
    {"type": "mind_map", "content": "..."}
  ],
  "check_understanding": [
    "Can you explain entropy in your own words?",
    "What happens to entropy in a reversible process?"
  ],
  "connections": [
    {"concept": "information theory", "relationship": "analogous"},
    {"concept": "arrow of time", "relationship": "related"}
  ]
}
```

**Failure cases:**
- Adaptation mismatch → User can manually adjust depth/style
- Poor explanation → Evaluation engine catches and regenerates
- Too complex → Simplify further, break into smaller chunks

**Model:** High pedagogical quality (e.g., Claude Opus, GPT-4o, fine-tuned model)

---

### 6. Evaluation Engine

**Purpose:** Self-evaluate every response before it reaches the user. This is Synaris' quality gate.

**Evaluation dimensions:**

| Dimension | Description | Weight |
|---|---|---|
| Accuracy | Is the content factually correct? | Critical |
| Reasoning | Is the reasoning sound and complete? | Critical |
| Pedagogy | Is it well-explained for the learner's level? | High |
| Hallucination Risk | Does it contain unverified claims? | Critical |
| Confidence | Is the confidence level appropriate? | High |
| Completeness | Does it fully address the question? | High |
| Readability | Is it clear and well-structured? | Medium |
| Citation Quality | Are sources properly referenced? | Medium |
| Safety | Does it avoid harmful content? | Critical |
| Bias | Does it present balanced perspectives? | Medium |

**Evaluation methodology:**

Each dimension is scored 0.0–1.0:

```json
{
  "accuracy": {
    "score": 0.95,
    "issues": ["Minor imprecision in definition of adiabatic"],
    "verdict": "pass"
  },
  "reasoning": {
    "score": 0.92,
    "issues": [],
    "verdict": "pass",
    "reasoning_chain": ["deductive", "consistent"]
  },
  "hallucination_risk": {
    "score": 0.02,
    "issues": [],
    "verdict": "pass"
  },
  "overall": {
    "score": 0.93,
    "verdict": "pass",
    "needs_regeneration": false,
    "improvement_suggestions": [
      "Could add a real-world example of entropy"
    ]
  }
}
```

**Evaluation tools:**
- DeepEval — Automated LLM evaluation
- Ragas — RAG quality metrics
- TruLens — Feedback tracking
- Custom rubric evaluator

**Failure handling:**
- Score < 0.5 → Regenerate response entirely
- Score 0.5–0.7 → Flag for human review, optionally regenerate
- Score > 0.7 → Pass with improvement suggestions for next time

**Model:** High discernment (e.g., GPT-4o, Claude Opus, fine-tuned evaluator)

---

### 7. Memory Agent

**Purpose:** Update the learner's profile after every interaction. This is what makes Synaris adaptive over time.

**Update operations:**

```json
{
  "session_updates": {
    "topics_discussed": ["entropy", "thermodynamics"],
    "concepts_introduced": ["statistical_entropy", "second_law"],
    "concepts_reviewed": ["energy", "temperature"],
    "understanding_assessment": {
      "entropy": "developing",
      "statistical_mechanics": "introduced"
    },
    "misconceptions_detected": [
      {
        "concept": "entropy_disorder",
        "misconception": "Entropy equals disorder",
        "correction_applied": true
      }
    ],
    "questions_asked": 3,
    "session_duration_minutes": 15,
    "engagement_level": "high"
  },
  "learner_profile_updates": {
    "weak_concepts_added": ["statistical_mechanics"],
    "strong_concepts_added": ["classical_thermodynamics"],
    "learning_style_update": {
      "visual_preference": 0.7,
      "textual_preference": 0.3
    },
    "confidence_trend": "improving",
    "curiosity_score": 0.85
  }
}
```

**Long-term memory stores:**

| Store | Technology | Content |
|---|---|---|
| Conversation Memory | PostgreSQL | Recent message history (last N sessions) |
| Learning Profile | PostgreSQL | Demographics, preferences, goals |
| Knowledge State | PostgreSQL + Qdrant | Concept mastery levels |
| Weak Concepts | PostgreSQL | Misconceptions and gaps |
| Interaction History | PostgreSQL | Session metadata |
| Embeddings | Qdrant | Semantic search over past sessions |

**Model:** Fast + efficient (e.g., GPT-4o-mini, DeepSeek-Chat)

---

### 8. Response Generator

**Purpose:** Take all agent outputs and generate the final rendered response for the UI.

**Output format:**

```json
{
  "message_id": "uuid",
  "content": {
    "markdown": "## Entropy in Thermodynamics\n\nEntropy ($S$) is a measure of...",
    "segments": [
      {"type": "text", "content": "..."},
      {"type": "math", "content": "S = k_B \\ln \\Omega", "format": "latex"},
      {"type": "code", "content": "...", "language": "python"},
      {"type": "diagram", "content": "...", "format": "mermaid"},
      {"type": "image", "url": "..."}
    ]
  },
  "follow_ups": [
    "What's the relationship between entropy and information?",
    "How does entropy apply to black holes?",
    "Can entropy decrease in a closed system?"
  ],
  "metadata": {
    "mode": "deep_dive",
    "subject": "physics",
    "topics": ["entropy", "thermodynamics"],
    "evaluation_score": 0.93,
    "processing_time_ms": 2400,
    "models_used": ["claude-sonnet", "deepseek-math"]
  },
  "learning_updates": {
    "new_concepts": ["statistical_entropy"],
    "practice_suggestions": [...]
  }
}
```

**Rendering types:**
- **Text** — Markdown with formatting
- **Math** — LaTeX rendered via KaTeX
- **Code** — Syntax highlighted with line numbers
- **Diagrams** — Mermaid, mind maps, flowcharts
- **Tables** — Formatted data tables
- **Lists** — Ordered and unordered
- **Images** — Generated diagrams, graphs

---

## Multi-Model Strategy

Synaris uses different models for different tasks, optimized for cost, speed, and quality.

### Model Selection Logic

```
┌──────────────────┐
│ Task Type        │  →  Model Selection
├──────────────────┤
│ Input validation │  →  Fast & cheap (Haiku, Mini)
│ Intent routing   │  →  Medium (Sonnet, DeepSeek)
│ Subject routing  │  →  Medium (Sonnet, DeepSeek)
│ Reasoning        │  →  Best (Opus, GPT-4o, R1)
│ Teaching         │  →  Best for pedagogy (Opus, GPT-4o)
│ Evaluation       │  →  High discernment (GPT-4o, Opus)
│ Memory updates   │  →  Fast & cheap (Mini, DeepSeek-Chat)
│ Response gen     │  →  Medium (Sonnet, DeepSeek-Chat)
│ Follow-up gen    │  →  Medium (Sonnet)
│ Code             │  →  Code-specialized (Coder, Sonnet)
│ Math             │  →  Math-specialized (DeepSeek-Math)
└──────────────────┘
```

### Provider Strategy

| Provider | Models Used | Use Case |
|---|---|---|
| OpenRouter | All models | Primary provider, fallback routing |
| Anthropic (Claude) | Haiku, Sonnet, Opus | Reasoning, teaching, evaluation |
| OpenAI | GPT-4o, GPT-4o-mini | Evaluation, fallback |
| DeepSeek | DeepSeek-Chat, DeepSeek-R1, DeepSeek-Coder | Math, code, reasoning |
| Google (Gemini) | Gemini Pro, Gemini Ultra | Research, long context |
| Groq | Llama 3, Mixtral | Fast inference for simple tasks |

---

## Failure Handling & Retry Logic

### Retry Policy

| Failure Type | Max Retries | Strategy | Fallback |
|---|---|---|---|
| LLM timeout | 2 | Exponential backoff (1s, 2s) | Use different model |
| LLM unavailable | 3 | Try next provider | Return cached/delayed response |
| Rate limited | 3 | Exponential backoff (2s, 4s, 8s) | Queue for later |
| Bad response | 2 | Regenerate with different params | Return simplified response |
| Agent failure | 2 | Re-route through alternative agent | Bypass agent, direct response |
| Evaluation failure | 1 | Regenerate | Return with uncertainty flag |

### Graceful Degradation

If the full pipeline fails:

```
Full Pipeline → Heavy Pipeline → Light Pipeline → Fallback
```

1. **Full:** All agents + evaluation + memory + knowledge graph
2. **Heavy:** Coordinator → Router → Reasoning → Response (no evaluation)
3. **Light:** Coordinator → Direct LLM response
4. **Fallback:** "I'm having trouble. Please try again later."

### Circuit Breaker

If an agent fails 5+ times in 1 minute, it's temporarily disabled:
- Disabled for 5 minutes
- Traffic routes to fallback/alternative
- After 5 minutes, one test request is sent
- If successful, re-enable; if not, extend cooldown

---

## Agent Communication Protocol

### Message Format

All agents communicate via a standard message envelope:

```json
{
  "version": "1.0",
  "message_id": "uuid",
  "timestamp": "ISO8601",
  "source_agent": "coordinator",
  "target_agent": "intent_router",
  "session_id": "uuid",
  "correlation_id": "uuid",
  "payload": {...},
  "metadata": {
    "retry_count": 0,
    "processing_time_ms": 0,
    "model_used": null
  }
}
```

### Communication Patterns

1. **Sync** (HTTP): Coordinator → Intent Router → Subject Router → Reasoning
2. **Async** (Message Queue): Memory updates, knowledge graph updates, analytics
3. **Parallel** (Fan-out): Knowledge graph lookup + Memory retrieval + Subject routing

### Data Flow Diagram

```
                    ┌─────────────────────┐
                    │     User Input      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Coordinator      │
                    │    (API Gateway)    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
           ┌─────────────────┐  ┌──────────────────┐
           │  Input Validation│  │  Session Context │
           │  (Fast LLM)     │  │  (DB Lookup)     │
           └────────┬────────┘  └────────┬─────────┘
                    │                     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Intent Router    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
           ┌─────────────────┐  ┌──────────────────┐
           │  Subject Router │  │  Memory Agent    │
           │                 │  │  (Async)         │
           └────────┬────────┘  └──────────────────┘
                    │
                    ▼
           ┌─────────────────┐
           │  Reasoning      │
           │  Agent(s)       │
           └────────┬────────┘
                    │
                    ▼
           ┌─────────────────┐
           │  Teaching Agent │
           └────────┬────────┘
                    │
                    ▼
           ┌─────────────────┐
           │  Evaluation     │
           │  Engine         │
           └────────┬────────┘
                    │
           ┌────────┴────────┐
           ▼                  ▼
    ┌──────────────┐  ┌──────────────┐
    │ Pass (≥0.7)  │  │ Fail (<0.7) │
    └──────┬───────┘  └──────┬───────┘
           │                 │
           ▼                 ▼
    ┌──────────────┐  ┌──────────────┐
    │ Response     │  │ Regenerate   │
    │ Generator    │  │ (up to 2x)  │
    └──────┬───────┘  └──────┬───────┘
           │                 │
           ▼                 │
    ┌──────────────┐         │
    │ Memory Agent │         │
    │ (Update)     │◄────────┘
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  User Gets   │
    │  Response    │
    └──────────────┘
```

---

## Observability

Every agent decision is logged:

```json
{
  "session_id": "uuid",
  "correlation_id": "uuid",
  "agent": "reasoning_agent",
  "action": "generate_reasoning",
  "input_hash": "...",
  "output_hash": "...",
  "model_used": "claude-opus",
  "latency_ms": 1200,
  "tokens_used": 450,
  "evaluation": {...},
  "timestamp": "ISO8601"
}
```

This enables:
- Debugging failed sessions
- Improving agent prompts
- Identifying model weaknesses
- Cost optimization
- Quality monitoring
