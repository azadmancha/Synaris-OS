# Synaris Roadmap

> **Versioned build plan — from core infrastructure to intelligent learning system.**

---

## Version 2 — Core Platform Foundation (Current)

### Platform
- [x] FastAPI backend
- [x] Next.js frontend
- [x] PostgreSQL database
- [x] Docker containerization
- [x] Professional landing page
- [x] Google OAuth authentication
- [x] User profiles
- [x] Learning dashboard

### AI Foundation
- [x] AI Orchestrator (provider-agnostic router)
- [x] Gemini integration (deep reasoning)
- [x] Groq integration (fast inference)
- [x] OpenRouter support (model flexibility)
- [x] Ollama support (optional/local)
- [x] Prompt management system
- [ ] Internal AI evaluation

> **Provider test results (July 2026):** Groq (0.4–1.2s) and OpenRouter (1.1–1.8s) are both working. Gemini is rate-limited on the current API key.
> **🔁 Revisit Gemini as the default provider** once API quota resets — it has the most generous free tier (1,500 req/day) and offers gemini-2.0-flash for fast inference and gemini-2.5-pro for deep reasoning.

### RAG Foundation
- [x] Wikipedia integration
- [ ] OpenStax integration
- [ ] Wikibooks integration
- [ ] Document ingestion pipeline
- [x] Embeddings generation
- [ ] Vector database (Qdrant)
- [x] Semantic retrieval (pgvector)
- [ ] Citation generation ("Learn More")

### Learning Features
- [x] AI Tutor (adaptive explanations)
- [x] Quiz generation
- [x] Personalized study plans
- [x] Progress tracking
- [x] Learning history
- [x] Feedback loop (👍 / 🤔 / 😕)

### Security (Core)
- [x] Google OAuth (Supabase)
- [x] JWT authentication
- [ ] Role-based authorization
- [x] Prompt injection protection
- [x] Prompt leak prevention
- [x] System prompt isolation
- [x] Input validation & sanitization
- [x] Output safety filtering
- [x] Rate limiting
- [x] API key protection (.env)
- [ ] Secure logging & audit trails
- [ ] Basic abuse detection

### Infrastructure
- [x] Docker setup (dev + prod)
- [x] CI/CD (GitHub Actions)
- [x] Environment configuration
- [x] Structured logging
- [x] Error handling
- [x] Monitoring hooks (Sentry)
- [x] API integration testing

---

## Version 3 — Intelligent Learning System

### AI Agents
- [ ] Tutor Agent
- [ ] Planner Agent
- [ ] Quiz Agent
- [ ] Evaluator Agent
- [ ] Research Agent
- [ ] Mentor Agent
- [ ] Agent Coordinator (manages agent pipeline)

### Advanced Learning
- [ ] Long-term memory system
  - [ ] **Phase 1: Session Summaries** — AI-generated summaries of each study session stored in a `memory_summaries` table (key concepts, topics learned, struggles)
  - [ ] **Phase 2: Cross-Session Recall** — extend `_build_conversation_context()` to inject relevant past session knowledge into AI prompts, using semantic search (pgvector) over summaries
  - [ ] **Phase 3: Spaced Repetition & Review** — proactively suggest review sessions based on `ConceptMastery.next_review_at`, begin sessions with "Last time you studied X..."
- [ ] Personalization engine
- [ ] Learning analytics dashboard
- [ ] Mastery estimation
- [ ] Revision planner
- [ ] Recommendation engine
- [ ] Search engine (full-text + semantic)

### Advanced RAG
- [ ] Multi-source retrieval
- [ ] Result reranking
- [ ] Better citation formatting
- [ ] Hybrid search (vector + keyword)
- [ ] Knowledge graph foundation

### AI Evaluation
- [ ] Hallucination detection
- [ ] Educational quality scoring
- [ ] Response benchmarking
- [ ] Model comparison tooling
- [ ] Internal testing suite

---

## Version 4 — Research & Advanced AI

### Multimodal AI
- [ ] Image understanding
- [ ] Diagram interpretation
- [ ] OCR support (PaddleOCR, Tesseract)
- [ ] Mathematical notation understanding
- [ ] Voice input (Whisper)

### Advanced Intelligence
- [ ] Explainable AI (educational)
- [ ] Learning graph (visual knowledge map)
- [ ] Advanced reasoning chains
- [ ] Multi-agent collaboration
- [ ] Research mode (paper analysis)

### Research
- [ ] Educational benchmarks
- [ ] AI evaluation framework
- [ ] Research datasets
- [ ] Paper-ready experiments
- [ ] Open-source release

---

## Long-Term Vision

### Educational Institutions
- Teacher dashboard
- Classroom management
- LMS integration (Canvas, Blackboard)
- Offline-first support
- Cross-platform expansion (only if real demand)

### Core Belief

**Synaris succeeds when:**

1. A student who struggled with math for years finally understands calculus
2. A curious teenager discovers their passion through exploration
3. A professional learns a completely new field in months instead of years
4. A teacher uses Synaris to understand how each of their 30 students thinks
5. Someone, somewhere, says: "Synaris taught me how to think"

Everything else is just infrastructure.
