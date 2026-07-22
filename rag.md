# RAG Pipeline

> **Synaris uses a Learning RAG, not a Search RAG.**
> The LLM is almost the last step. The pipeline around it is the brain.

---

## Philosophy

Most RAG systems do this:

```
User Question → Embedding → Vector Search → Top 5 Chunks → LLM → Answer
```

This is semantic Google. It answers questions — but it doesn't teach.

Synaris does this instead:

```
User → Intent Analysis → Learning Profile → Knowledge Graph → Memory Retrieval
    → Textbook Retrieval → Concept Retrieval → Difficulty Analysis
    → Reasoning → Teaching Strategy → Evaluation → Adaptive Memory Update
```

Retrieval is only **one step** in the pipeline — not the entire pipeline.

---

## Complete Pipeline

```
Student Question
        │
        ▼
┌─────────────────────────┐
│     Intent Router        │
│                         │
│  What is the user        │
│  trying to do?          │
│                         │
│  □ Learn                │
│  □ Revise               │
│  □ Solve                │
│  □ Explore              │
│  □ Quiz                 │
│  □ Homework             │
│  □ Research             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│     User Profile         │
│                         │
│  • Grade                │
│  • Subjects             │
│  • Weak Areas           │
│  • Learning Style       │
│  • Previous Mistakes    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Memory Retrieval       │
│                         │
│  • Previous conversations│
│  • Previous explanations │
│  • Mistakes             │
│  • Saved notes          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Knowledge Graph        │
│                         │
│  What concepts are       │
│  related?               │
│                         │
│  Example:               │
│  Differentiation        │
│    → Chain Rule         │
│    → Functions          │
│    → Limits             │
│    → Continuity         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Hybrid Retrieval       │
│                         │
│  Vector Search           │
│  + BM25                 │
│  + Knowledge Graph      │
│  + Memory               │
│                         │
│  ───────────────        │
│  Weighted Ranking       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Context Compression    │
│                         │
│  Instead of 40 chunks:  │
│  • Concept Summary      │
│  • Definitions          │
│  • Worked Example       │
│  • Common Mistakes      │
│  • Prerequisites        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Reasoning Engine       │
│                         │
│  Plans HOW to teach     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Whiteboard Planner     │
│                         │
│  Decides:               │
│  • Diagram?             │
│  • Formula?             │
│  • Animation?           │
│  • Graph?               │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│          LLM             │
│                         │
│  Generates answer       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Evaluation Agent       │
│                         │
│  Checks:                │
│  • Accuracy             │
│  • Hallucination        │
│  • Difficulty           │
│  • Teaching Quality     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Adaptive Memory        │
│                         │
│  Stores:                │
│  • What user understood │
│  • Mistakes             │
│  • Concept mastery      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Knowledge Update       │
│                         │
│  Updates:               │
│  • Learning Graph       │
│  • Confidence scores    │
│  • Future recommendations│
└─────────────────────────┘
```

---

## Retrieval Layers

Instead of one vector database, four retrieval layers:

```
Layer 1 — Student Memory
──────────────────────────────
• Previous mistakes
• Goals
• Notes
• Weaknesses

Layer 2 — Educational Content
──────────────────────────────
• NCERT
• MIT OCW
• Khan Academy
• OpenStax
• Wikipedia
• Research papers

Layer 3 — Knowledge Graph
──────────────────────────────
• Concept relationships
• Prerequisites
• Dependencies

Layer 4 — Reasoning Strategy
──────────────────────────────
• How should I teach this?
```

---

## Adaptive Retrieval

Same query, different retrieval based on the learner:

```
Two users ask: "What is differentiation?"

User 1 — Grade 8
  → Simple explanation
  → One graph
  → Analogy

User 2 — MIT Freshman
  → Formal definition
  → Proof
  → Applications
  → Taylor Series
```

---

## Memory

Synaris remembers conceptually, not conversationally:

```
NOT: "Conversation 41 had the chain rule"
  BUT: "Student always struggles with Chain Rule"
  → Prioritize Chain Rule examples next time
```

---

## Context Compression

```
Raw retrieval returns: Chapter, Page, Definition, Example, Research, Notes

↓ Compress into:

Concept → Key Formula → Example → Pitfalls → Applications
```

Cheaper, cleaner, more focused.

---

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Student Memory | PostgreSQL | Learning profiles, mistakes, history |
| Knowledge Graph | Neo4j | Concept relationships and dependencies |
| Vector Search | Qdrant | Semantic content retrieval |
| Keyword Search | Elasticsearch / BM25 | Lexical fallback |
| Caching | Redis | Repeated query optimization |
| API | FastAPI | Pipeline orchestration |
| Reasoning Flow | LangGraph | Multi-step reasoning chains |
| LLM Router | LiteLLM | Provider-agnostic model access |

---

## Whiteboard Retrieval

Different response types retrieve different content:

```
Need a graph?     → Retrieve graph examples
Need animation?   → Retrieve animation template
Need proof?       → Retrieve proof
```

---

## The Core Idea

> The **LLM is almost the last step**.
>
> Most AI apps put the LLM first.
>
> Synaris treats the LLM as **the teacher**, not **the brain**.
>
> The brain is the entire pipeline around it.
>
> That's the difference between an AI chatbot and a true learning system.
