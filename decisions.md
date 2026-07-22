# Architectural Decision Records

> **Key architectural decisions, alternatives considered, and trade-offs.**

---

## ADR-001: AI Orchestrator Over Direct Provider Integration

**Status:** Accepted

**Context:** Synaris needs to support multiple AI providers (Gemini, Groq, OpenRouter). Direct integration would tightly couple business logic to specific providers.

**Decision:** Build a provider-agnostic AI Orchestrator that routes requests based on task type. The orchestrator abstracts provider details behind a uniform interface.

**Consequences:**
- Positive: Switching providers or adding new ones doesn't change business logic
- Positive: Can route different task types to optimal providers
- Negative: Additional abstraction layer adds complexity
- Negative: Initial development takes longer than connecting a single provider

**Alternatives Considered:**
- Direct Gemini integration (rejected: vendor lock-in)
- LangChain (rejected: too much abstraction, hard to debug)
- LiteLLM (considered: may use for provider abstraction)

---

## ADR-002: RAG as Pipeline, Not Engine

**Status:** Accepted

**Context:** "RAG" is often presented as a monolithic block. In practice, it's a multi-stage pipeline. Each stage has different optimization requirements.

**Decision:** Implement RAG as a pipeline with explicit stages: Sources → Cleaning → Chunking → Embeddings → Vector Search → Reranking → Context Building → Citation Builder → LLM.

**Consequences:**
- Positive: Each stage can be optimized independently
- Positive: Pipeline visibility makes debugging easier
- Negative: More files and modules to maintain

---

## ADR-003: Security as a Dedicated Service

**Status:** Accepted

**Context:** Security is often scattered across middleware, auth code, and AI prompts. Scattered security is easily forgotten.

**Decision:** Create a dedicated `services/security/` module with sub-modules for authentication, authorization, prompt_guard, validation, content_filter, rate_limiter, audit, and encryption.

**Consequences:**
- Positive: Security is visible in the architecture
- Positive: Security logic is testable in isolation
- Positive: New security measures can be added without touching other code
- Negative: Every request goes through more code paths

---

## ADR-004: Educational Explainability Over Generic XAI

**Status:** Accepted

**Context:** "Explainable AI" (SHAP, LIME, attention visualization) is well-defined for traditional ML but doesn't apply cleanly to LLMs. Claiming XAI can appear as marketing.

**Decision:** Implement educational explainability: source attribution, confidence scoring, citation generation, difficulty adaptation, and learning feedback. Avoid SHAP/LIME.

**Consequences:**
- Positive: Actually useful for learners
- Positive: Implementable with current technology
- Positive: Avoids overpromising on AI transparency
- Negative: Cannot claim "XAI" in marketing

---

## ADR-005: FastAPI Over Django

**Status:** Accepted

**Context:** Python web framework choice.

**Decision:** Use FastAPI for native async support, automatic OpenAPI docs, Pydantic integration, and WebSocket support.

**Consequences:**
- Positive: High concurrency with async
- Positive: Automatic API documentation
- Positive: Type safety through Pydantic
- Negative: Smaller ecosystem than Django

**Alternatives Considered:**
- Django (rejected: sync-first, heavy)
- Flask (rejected: not async natively)
- Starlette (considered: FastAPI is built on it)

---

## ADR-006: Google OAuth + JWT as Primary Auth

**Status:** Accepted

**Context:** Authentication method for Synaris.

**Decision:** Use Google OAuth for login and JWT for session management. Supabase Auth is optional (can be added later).

**Consequences:**
- Positive: Users don't need to remember another password
- Positive: JWT enables stateless sessions
- Positive: Easy to add other OAuth providers later
- Negative: Requires Google account (mitigation: add email/password later)

---

## ADR-007: Agents Inside Orchestrator, Not Replacing It

**Status:** Accepted (for v3)

**Context:** Future AI agents need to be managed. Some architectures replace the orchestrator with agents.

**Decision:** Agents will live inside the AI Orchestrator as a management layer. The orchestrator routes to agents the same way it routes to providers.

**Consequences:**
- Positive: Consistent routing for all AI interactions
- Positive: Agents can use different providers
- Positive: Existing non-agent flows don't change
- Negative: More complexity in the orchestrator

---

## ADR-008: Build Order Respects Dependency Chain

**Status:** Accepted

**Context:** Order of implementation matters for maintainability.

**Decision:** Build in dependency order: FastAPI → PostgreSQL → Auth → AI Orchestrator → Gemini → Groq → RAG → API Integration Tests → Next.js Frontend → AI Evaluation → Personalization → AI Agents → Deployment.

**Consequences:**
- Positive: Every step builds on the previous one
- Positive: No major rewrites needed when adding features
- Positive: Backend is stable before frontend development begins
- Negative: Frontend takes longer to appear (slower initial demo)
