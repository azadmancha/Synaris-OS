# Tech Stack

> **Technology decisions, alternatives considered, and rationale**

---

## Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 14+ (App Router) | React framework with SSR, RSC, streaming |
| **TypeScript** | 5.x | Type safety |
| **TailwindCSS** | 3.x | Utility-first CSS |
| **Framer Motion** | Latest | Animations and transitions |
| **KaTeX** | Latest | LaTeX math rendering |
| **Mermaid** | Latest | Diagram rendering |
| **React Flow** | Latest | Knowledge graph visualization |
| **React Hook Form** | Latest | Form handling |
| **Zustand** | Latest | Client state management |
| **TanStack Query** | Latest | Server state management |
| **MDX** | Latest | Content rendering |

### Why Next.js?
- **SSR** for landing page SEO
- **Streaming** for AI response rendering
- **RSC** for dashboard performance
- **Route handlers** for lightweight API routes
- **Middleware** for auth

---

## Backend

| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | 0.110+ | Async Python web framework |
| **Python** | 3.12 | Runtime |
| **SQLAlchemy** | 2.0+ | Async ORM |
| **Alembic** | Latest | Database migrations |
| **Pydantic** | 2.x | Validation and settings |
| **Celery** | Latest | Async task queue |
| **Redis** | 7.x | Cache + message broker |
| **WebSockets** | FastAPI native | Real-time streaming |

### Why FastAPI?
- Native async/await support
- Automatic OpenAPI docs
- Pydantic integration
- WebSocket support built-in
- High performance (Starlette-based)

---

## Database

| Technology | Version | Purpose |
|---|---|---|
| **PostgreSQL** | 16 | Primary relational database |
| **Qdrant** | Latest | Vector similarity search |
| **Redis** | 7 | Cache + pub/sub |

### Why PostgreSQL over NoSQL?
- ACID compliance for learning profiles
- Rich query capabilities for analytics
- pgvector for hybrid search (future)
- Supabase manages auth natively

### Why Qdrant over Pinecone/Weaviate?
- Self-hostable (Docker)
- No vector size limits on free tier
- High performance for our use case
- Open source

---

## AI & LLMs

| Provider | Models | Use Case |
|---|---|---|
| **OpenRouter** | All models | Primary API, fallback routing |
| **Anthropic** | Claude Haiku, Sonnet, Opus | Reasoning, teaching, evaluation |
| **OpenAI** | GPT-4o, GPT-4o-mini | Evaluation, fallback |
| **DeepSeek** | Chat, R1, Coder | Math, code, reasoning |
| **Google** | Gemini Pro, Ultra | Research, long context |
| **Groq** | Llama 3, Mixtral | Fast inference |

### Embeddings

| Model | Use Case |
|---|---|
| **BGE-M3** | Primary embeddings (multilingual) |
| **Jina Embeddings** | Alternative, document-level |

### RAG / Search

| Tool | Use Case |
|---|---|
| **LlamaIndex** | Document indexing and retrieval |
| **LangChain** | Agent chains (selectively used) |

### Evaluation

| Tool | Use Case |
|---|---|
| **DeepEval** | Primary AI evaluation framework |
| **Ragas** | RAG quality metrics |
| **TruLens** | Feedback tracking |

---

## Infrastructure

| Service | Purpose | Alternative Considered |
|---|---|---|
| **Supabase** | Auth + Database | Firebase (more expensive) |
| **Railway** | Backend hosting | Render, Fly.io (chose for simplicity) |
| **Vercel** | Frontend hosting | Netlify (slower edge) |
| **Cloudflare** | DNS, CDN, DDoS | CloudFront (more complex) |
| **Docker** | Containerization | - |
| **GitHub Actions** | CI/CD | GitLab CI (but project on GitHub) |

---

## Development Tools

| Tool | Purpose |
|---|---|
| **Ruff** | Python linter + formatter |
| **Pyright** | Python type checking |
| **pytest** | Python testing |
| **Vitest** | TypeScript testing |
| **Playwright** | E2E testing |
| **Prettier** | TypeScript formatting |
| **ESLint** | TypeScript linting |
| **Husky** | Pre-commit hooks |

---

## Stack Choices Summary

| Decision | Winner | Why Not the Others |
|---|---|---|
| Framework | FastAPI | Django (too heavy), Flask (not async) |
| Frontend | Next.js | Remix (less ecosystem), SPA (no SSR) |
| CSS | TailwindCSS | Styled-components (runtime cost), plain CSS (maintenance) |
| DB | PostgreSQL | MongoDB (no ACID for profiles) |
| Vector | Qdrant | Pinecone (cost), Weaviate (complexity), Chroma (less production-ready) |
| Cache | Redis | Memcached (less features) |
| Auth | Supabase | Auth0 (cost), Firebase (less control) |
| AI | OpenRouter | Direct APIs (more integration work) |
| Hosting | Railway + Vercel | AWS (too complex), GCP (too complex) |

---

## Open Source Commitment

All components are either:
- **Open source** and self-hostable (PostgreSQL, Qdrant, Redis, FastAPI, Next.js)
- **Free tier available** (Supabase, OpenRouter, Railway, Vercel)
- **MIT/Apache licensed** (all our code, libraries)

No vendor lock-in. Every service can be replaced with an alternative.
