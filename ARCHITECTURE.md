# Synaris Architecture

> **Security-first, educator-aware AI learning platform — from student to response and back.**

---

## Architecture Overview

```
                              Student
                                  │
                     Google OAuth / JWT Authentication
                                  │
                                  ▼
                         AI Orchestrator Layer
                                  │
      ┌───────────────┬───────────────┬────────────────┐
      ▼               ▼               ▼                ▼
   Groq API       Gemini API     RAG Pipeline      Security Layer
 (Fast Tasks)   (Deep Reasoning) (Knowledge)     (Safety & Guardrails)
                                  │
                                  ▼
                      Adaptive Learning Engine
     ┌─────────────┬──────────────┬───────────────┬─────────────┐
     ▼             ▼              ▼               ▼
Personalization  Quiz Engine   Study Planner   Explainability
                                                Engine
                                  │
                                  ▼
                           Learning Memory
                                  │
                                  ▼
                         Learning Analytics
                                  │
                                  ▼
                             Dashboard
```

---

## Layer Descriptions

### 1. Authentication Layer

Google OAuth + JWT. User-aware from the first request.

```
Student → Google OAuth → JWT Token → All subsequent requests
```

Every request is authenticated. No anonymous access to protected endpoints.

### 2. AI Orchestrator Layer

The brain. Routes every request to the right provider based on task type.

```
User Request
    │
    ▼
AI Orchestrator
    │
    ├── Simple task → Groq (fast inference)
    ├── Complex task → Gemini (deep reasoning)
    ├── Specialized → OpenRouter (model flexibility)
    
```

The orchestrator abstracts provider details. Switching models or adding new ones doesn't change business logic.

### 3. AI Providers

| Provider | Role | Why |
|---|---|---|
| **Groq** | Fast inference | Speed for simple Q&A, quick explanations |
| **Gemini** | Deep reasoning | Complex tutoring, multi-step problems |
| **OpenRouter** | Model flexibility | Access to Claude, GPT-4o, DeepSeek as needed |

### 4. RAG Pipeline

Knowledge retrieval done right. Not a single "RAG Engine" — a pipeline.

```
Wikipedia ─┐
OpenStax ──┤
Wikibooks ─┤
           ▼
      Documents
           │
           ▼
       Cleaning
           │
           ▼
       Chunking
           │
           ▼
     Embeddings (BGE-M3)
           │
           ▼
   Vector Search (Qdrant)
           │
           ▼
       Reranking
           │
           ▼
   Context Building
           │
           ▼
      Citation Builder
           │
           ▼
         LLM
```

Every response includes a "Learn More" link to the source material.

### 5. Security Layer

**Visible in the architecture because it's part of the design, not bolted on.**

```
Security Layer
│
├── Prompt Injection Protection
├── Prompt Leakage Prevention
├── Jailbreak Detection
├── Input Validation
├── Output Filtering
├── Rate Limiting
└── API Protection
```

Running on every request, before and after AI processing.

### 6. Adaptive Learning Engine

The heart of the product. What makes Synaris a learning platform, not a chatbot.

```
Adaptive Learning Engine
│
├── Explanation Generation
├── Difficulty Adaptation
├── Learning Path Selection
├── Misconception Detection
└── Concept Reinforcement
```

### 7. Explainability Engine (Not XAI)

Educational explainability — not generic XAI. Shows *why* an explanation was chosen, which sources were used, and how confident the system is.

```
Explainability Engine
│
├── Source Attribution
├── Confidence Scoring
├── Citation Generation
├── Alternative Explanations
├── Difficulty Adaptation
└── Learning Feedback
```

### 8. Learning Memory

Long-term memory across sessions. Knows what the student has learned, what they're struggling with, and what to review next.

### 9. Learning Analytics

Transforms raw session data into actionable insight. Powers the dashboard and personalization.

### 10. Dashboard

The student's home base. Shows progress, recommendations, recent activity, and weak areas.

---

## Data Flow (Complete Request)

```
1. Student sends request
2. Authentication validates JWT
3. Request hits AI Orchestrator
4. Orchestrator determines:
   a. Which provider to use (Groq/Gemini/OpenRouter)
   b. Whether RAG retrieval is needed
   c. Security checks (injection, validation)
5. If RAG needed:
   a. Search Wikipedia/OpenStax/Wikibooks
   b. Generate embeddings
   c. Search Qdrant vector database
   d. Rerank results
   e. Build context with citations
6. AI generates response with context
7. Security layer filters output
8. Explainability Engine scores confidence
9. Adaptive Learning Engine adjusts difficulty
10. Learning Memory updates profile
11. Learning Analytics records event
12. Dashboard updates (async)
13. Response returned to student with citations
```

---

## Request Processing Pipeline

```
                        ┌─────────────────────┐
                        │   Student Request   │
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   Security Layer     │
                        │ • Validate input     │
                        │ • Check rate limit   │
                        │ • Detect injection   │
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │  AI Orchestrator     │
                        │ • Classify task      │
                        │ • Select model       │
                        │ • Build prompt       │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             ┌──────────┐  ┌──────────┐  ┌─────────────┐
             │  Groq    │  │  Gemini  │  │  RAG        │
             │ (Simple) │  │ (Complex)│  │  Pipeline   │
             └────┬─────┘  └────┬─────┘  └──────┬──────┘
                  │             │                │
                  └─────────────┼────────────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │   Security Layer     │
                     │ • Filter output      │
                     │ • Check safety       │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │ Adaptive Learning   │
                     │ Engine              │
                     │ • Adjust difficulty │
                     │ • Detect gaps       │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │ Learning Memory     │
                     │ • Update profile    │
                     │ • Schedule review   │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │   Response          │
                     │   + Citations       │
                     │   + Confidence      │
                     │   + Explainability  │
                     └─────────────────────┘
```

---

## Key Design Decisions

| Decision | Choice | Why Not the Alternative |
|---|---|---|
| **AI Orchestrator** | Custom provider abstraction | Avoid vendor lock-in. Single provider is a single point of failure. |
| **RAG as Pipeline** | Multi-stage (sources → clean → chunk → embed → search → rerank → cite) | A monolithic "RAG Engine" can't be optimized per stage. |
| **Security Layer** | Dedicated service | Scattered security is forgotten security. Visible architecture = accountable implementation. |
| **Explainability** | Educational (sources, confidence, citations) | Generic XAI (SHAP/LIME) doesn't apply well to LLMs and can look like marketing. |
| **Auth** | Google OAuth + JWT | Most user-friendly. No password management needed. |
| **Primary AI** | Gemini (deep) + Groq (fast) | Gemini excels at reasoning. Groq excels at speed. Together they cover most use cases. |
| **Agents** | Future (v3) inside Orchestrator | Agents are a management layer, not a replacement for the orchestrator. |

---

## Data Architecture

```
PostgreSQL (Relational)
├── Users & Auth
├── Conversations & Messages
├── Learning Profiles & Mastery
├── Study Plans & Quizzes
├── Portfolio Items
└── Analytics Events

Redis (Cache)
├── Active User Sessions
├── Rate Limit Counters
├── Cached Query Results
└── Pub/Sub (real-time updates)

Qdrant (Vector Store)
├── Educational Content Embeddings
├── Student Knowledge State
└── Session Embeddings (semantic search)
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Security Layer                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Prompt Injection Protection              │   │
│  │  • Detect "ignore previous instructions" patterns │   │
│  │  • Detect system prompt extraction attempts      │   │
│  │  • Detect jailbreak attempts                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Input Validation                        │   │
│  │  • Sanitize all user input                       │   │
│  │  • Enforce content length limits                 │   │
│  │  • Block malicious patterns                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Output Filtering                        │   │
│  │  • Check for sensitive content in responses      │   │
│  │  • Verify no system prompt leakage               │   │
│  │  • Ensure educational appropriateness            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Rate Limiting                           │   │
│  │  • Per-user rate limits                          │   │
│  │  • Per-endpoint rate limits                      │   │
│  │  • Exponential backoff for violations            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Audit Logging                           │   │
│  │  • Log all security events                       │   │
│  │  • Track authentication attempts                 │   │
│  │  • Monitor abuse patterns                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Future Architecture (v3 — Agents)

```
                        AI Orchestrator
                              │
                      ┌───────┴───────┐
                      │ Agent Manager │
                      └───────┬───────┘
                              │
      ┌───────────┬───────────┬───────────┬───────────┐
      ▼           ▼           ▼           ▼           ▼
  Tutor       Planner    Research    Quiz       Mentor
  Agent       Agent       Agent      Agent       Agent
```

Agents live **inside** the orchestrator, not replacing it. The orchestrator routes to agents the same way it routes to providers.

---

## Future Architecture (v4 — Multimodal)

```
                    Multimodal Layer
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
     Vision            OCR            Diagram
  Understanding                   Understanding
        │
        ▼
                    Speech Layer
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
  Speech Recognition    Whisper          TTS (future)
```

Separate from the learning engine. Multimodal capabilities feed into the orchestrator the same way text does.
