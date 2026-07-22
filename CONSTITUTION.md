# Synaris Project Constitution

> **The master document every AI assistant reads before writing a single line of code.**

---

## Preamble

Synaris is not merely software. It represents years of learning, tutoring, educational experiences, and a long-term mission to make quality education freely accessible.

Every line of code written in this repository serves that mission. Every engineering decision protects it.

---

## Article I — Source of Truth

Before generating any code, thoroughly read and understand:

1. **README.md** — Project overview and quick start
2. **ARCHITECTURE.md** — System architecture and design
3. **ROADMAP.md** — Current version plan and future direction
4. **decisions.md** — Key architectural decisions and trade-offs
5. **CONSTITUTION.md** — This document

Treat these as the project's constitution. Never generate code that contradicts them. If you discover inconsistencies, explain them instead of ignoring them.

---

## Article II — Engineering Philosophy

### 2. Pseudo-Code Before Implementation

Before implementing any non-trivial feature:

1. **Explain** the problem
2. **Explain** the architecture
3. **Draw** the data flow
4. **Produce** pseudocode
5. **Wait** until the design is internally consistent
6. **Then** generate production-ready code

### 3. Architecture Is Inviolable

Never violate the architecture for convenience. If implementing a feature requires bypassing the architecture, stop, explain why, and propose a better design.

---

## Article III — Code Quality Standards

### 1. Publishable Quality

Every piece of code should be suitable for:

- GitHub portfolio
- Open-source publication
- Technical interviews
- University admissions
- Future contributors

Assume experienced engineers will review every commit.

### 2. Readability Over Cleverness

Prefer boring technology over clever technology. Simple systems survive longer. Only introduce complexity when it solves a real problem.

### 3. Comment Intent, Not Syntax

```python
# BAD — describes what the code does (redundant)
# Increment x by 1
x += 1

# GOOD — explains why the code exists
# We track consecutive correct answers to adjust
# the spaced repetition interval. This multiplier
# prevents over-reviewing concepts the user has mastered.
consecutive_correct += 1
```

Every module should document:
- Why this class/module exists
- Why this abstraction was chosen
- How it communicates with the rest of the system
- Future extension points
- Security considerations
- Performance considerations

### 4. Meaningful TODOs

Whenever a feature is incomplete, write meaningful TODO comments explaining:

```python
# TODO(v3):
# Replace current in-memory session cache with Redis.
# This enables horizontal scaling across multiple backend instances.
# Estimated effort: 2 days
```

### 5. Architecture Explanations

Whenever you create a new folder or module, explain:
- Why it exists
- Why it belongs there
- How it communicates with the rest of the system
- What future versions will use it

---

## Article IV — Technology Standards

### Frontend

- **Framework:** Next.js with App Router
- **Styling:** TailwindCSS
- **Animation:** Framer Motion
- **Components:** shadcn/ui compatible patterns
- **Approach:** Clean architecture, component structure, state management, reusability
- **Constraint:** The frontend will primarily be designed manually. Do not over-design visual appearance unless explicitly requested.
- **Animation rule:** Design so future animations can be added without refactoring. Prefer Framer Motion compatible layouts, reusable component hierarchy, loading states, skeleton components, and micro-interactions without tightly coupling animations to business logic.

### Backend

- **Framework:** FastAPI (async)
- **Language:** Python 3.12+
- **ORM:** SQLAlchemy 2.0 (async)
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Vector Store:** Qdrant
- **Auth:** Google OAuth + JWT (Supabase optional)
- **Architecture:** Clean layered architecture with dependency injection

### AI

- **Orchestrator:** Provider-independent AI Orchestrator
- **Primary:** Gemini (deep reasoning)
- **Fast Inference:** Groq (fast tasks)
- **Multi-Provider:** OpenRouter (model flexibility)
- **Never** tightly couple business logic to a specific provider.

### RAG

- **Sources:** Wikipedia, OpenStax, Wikibooks (primary)
- **Future:** Custom document ingestion
- **Pipeline:** Document → Cleaning → Chunking → Embeddings → Vector Search → Reranking → Context Building → LLM

---

## Article V — Security by Design

Security is part of the architecture, not an optional feature.

Every new module must consider **before implementation**:

1. **Authentication** — Is the user who they claim to be?
2. **Authorization** — Does the user have permission?
3. **Validation** — Is the input safe and well-formed?
4. **Prompt Injection** — Is the AI input protected?
5. **Prompt Leakage** — Can system prompts be extracted?
6. **Rate Limiting** — Is abuse prevented?
7. **Secrets Management** — Are API keys properly isolated?
8. **Logging** — Are security events logged?
9. **Error Handling** — Do errors leak sensitive information?

Security services live in a dedicated `services/security/` module:

```
services/security/
├── authentication/    # JWT, OAuth
├── authorization/     # Role-based access
├── prompt_guard/      # Injection protection, leak prevention, jailbreak detection
├── validation/        # Input sanitization
├── content_filter/    # Output safety filtering
├── rate_limiter/      # Request throttling
├── audit/             # Security event logging
└── encryption/        # Data at rest encryption
```

---

## Article VI — Educational Philosophy

Every feature must answer one question:

> **Does this genuinely help someone learn?**

If not, it probably shouldn't exist.

### Educational Explainability (Not XAI)

Synaris does not claim to implement Explainable AI (SHAP, LIME, feature attribution). Instead, it implements **educational explainability**:

- **Source Attribution** — Which sources were used
- **Confidence Scoring** — How confident the system is
- **Citation Generation** — Links to source material
- **Alternative Explanations** — Different ways to understand
- **Difficulty Adaptation** — Matching the learner's level
- **Learning Feedback** — What the learner understood

### Teaching Mode

One of this project's responsibilities is helping the developer become a better engineer. If the developer makes a poor engineering decision:

- Explain why
- Suggest better alternatives
- Teach the trade-offs

Do not simply agree.

---

## Article VII — Product Analytics by Design

Design the architecture so future versions can collect meaningful analytics while respecting user privacy.

### Platform Metrics
Total users, DAU/WAU/MAU, new registrations, returning users, retention, session duration

### Learning Metrics
Questions asked, topics studied, study time, concepts mastered, quiz scores, improvement over time, learning streaks, weak/strong subjects

### AI Metrics
Total requests, response time, model usage, token usage, cost, RAG retrieval success, hallucination score, evaluation scores, user feedback

### System Metrics
API latency, error rate, database performance, cache hit rate, auth success/failure, uptime, rate-limit events

Do not fully implement analytics now. Only ensure the architecture supports it.

---

## Article VIII — Development Workflow

### Decision-Making

Never make a major architectural decision silently. Whenever introducing a new dependency, library, framework, or architectural pattern:

- Explain why it was chosen
- Explain alternatives considered
- Explain trade-offs
- Mention any long-term maintenance implications
- If appropriate, update `decisions.md`

### Version Awareness

Always respect the current roadmap version. Never implement v3 or v4 features while working on v2 unless explicitly requested or it makes far too much sense. Instead, leave meaningful TODOs referencing the future version.

### Open-Source Mindset

Assume Synaris may become open source. Write code that contributors can easily understand. Avoid clever code. Prefer explicitness over magic.

### Graceful Failure

Design systems to fail gracefully. Whenever possible:

- Provide meaningful error messages
- Avoid crashes
- Degrade functionality safely
- Log unexpected failures

### API Design

Whenever creating endpoints:
- Generate clear OpenAPI documentation
- Use meaningful summaries, descriptions, and response models
- Prioritize consistent naming

### Naming

Avoid abbreviations unless universally understood. Names should clearly communicate purpose.

### Continuous Improvement

If existing code can be improved, suggest a refactor before adding new features. Avoid building on poor foundations. If a requested implementation would unnecessarily complicate the architecture, explain why and suggest a simpler solution.

### Commit Discipline

Generate meaningful commits. Avoid giant commits. Each commit should represent one logical change. Follow conventional commit style.

### Technical Debt

Whenever technical debt is introduced, document it. Explain why it exists, its impact, and when it should be fixed.

---

## Article IX — The Final Rule

Optimize for long-term engineering quality rather than speed. Synaris is intended to become a multi-year project. Protect the architecture.

Whenever implementing a feature, ask three questions:

1. **Is this good software engineering?**
2. **Does this help students learn better?**
3. **Will I still be happy with this decision two years from now?**

If the answer to any of these is no, suggest a better design.

---

*"Learn deeply. Think independently. Build fearlessly."*
