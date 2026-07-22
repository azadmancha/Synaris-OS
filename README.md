# Synaris

**Learn deeply. Think independently. Build fearlessly.**

> AI-powered personalized learning platform.

---

## Status

| Layer | Status |
|---|---|
| Architecture | Complete ✦ |
| Backend | In Progress |
| Frontend | In Progress |
| AI Integration | In Progress |
| RAG Pipeline | Planned |

---

## Overview

Synaris is an AI-native personalized learning platform that helps students genuinely understand concepts — not just memorize answers.

Unlike standard AI chatbots, Synaris uses a multi-layered architecture: a provider-independent AI Orchestrator routes tasks to the optimal model (Gemini for deep reasoning, Groq for fast inference), a RAG pipeline retrieves knowledge from Wikipedia, OpenStax, and Wikibooks, and a dedicated Security Layer protects every interaction.

---

## Features

- **Personalized AI Tutoring** — Adaptive explanations that match your level
- **Multi-Model AI** — Gemini (deep reasoning), Groq (fast inference), OpenRouter (flexibility)
- **RAG-Powered Knowledge** — Wikipedia, OpenStax, Wikibooks with citations
- **AI Agent Pipeline** — Tutor, Planner, Research, Quiz, Mentor (v3)
- **Progress Tracking** — Mastery estimation, learning analytics
- **Quiz Generation** — Adaptive questions that test real understanding
- **Learning Memory** — Long-term profile that remembers your strengths and gaps
- **Study Planning** — Personalized revision schedules
- **Security First** — Prompt injection protection, safety filtering, rate limiting

---

## Architecture

```
Student → Auth → AI Orchestrator → AI Providers + RAG + Security
                                        ↓
                               Adaptive Learning Engine
                                        ↓
                               Learning Memory → Analytics → Dashboard
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the complete diagram and layer descriptions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, TailwindCSS, Framer Motion |
| Backend | FastAPI, Python 3.12, async |
| Database | PostgreSQL 16, Redis 7 |
| Vector Store | Qdrant |
| AI Inference | Gemini, Groq, OpenRouter |
| Embeddings | BGE-M3 |
| Auth | Google OAuth + JWT |
| Deployment | Docker, Railway, Vercel |
| CI/CD | GitHub Actions |

---

## Quick Start

```bash
git clone https://github.com/your-username/synaris.git
cd synaris

cp .env.example .env
# Add your API keys (Gemini, Groq, etc.)

docker compose up -d

# Open http://localhost:3000
```

---

## Project Structure

```
Synaris/
├── CONSTITUTION.md   # Project Constitution
├── ARCHITECTURE.md   # System architecture
├── ROADMAP.md        # v2/v3/v4 build plan
├── decisions.md      # Architectural decisions
├── ai.md             # AI system specification
├── rag.md            # RAG pipeline specification
├── research.md       # Research papers & experiments
├── WHY.md            # The soul of the project
├── backend/          # FastAPI + services/security/ + orchestrator/
├── frontend/         # Next.js (TypeScript)
├── ai/               # Providers, prompts, evaluators
├── tests/            # All test suites
└── docs/             # Detailed references (archive)
```

---

## Roadmap

- **v2 — Core Platform** (Current): Backend, Auth, AI Orchestrator, RAG, Frontend
- **v3 — Intelligent Learning**: AI Agents, Memory, Personalization, Evaluation
- **v4 — Research & Advanced AI**: Multimodal, Advanced Reasoning, Research mode

See [ROADMAP.md](ROADMAP.md) for the complete checklist.

---

## Project Constitution

Before contributing, read [CONSTITUTION.md](CONSTITUTION.md) — the principles every AI and contributor follows when building Synaris.

---

## License

MIT License. Use it to build thinkers, not answer-seekers.

---

*"Learn deeply. Think independently. Build fearlessly."*
