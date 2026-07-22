# Changelog

All notable changes to Synaris will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- Project inception and vision document (WHY.md)
- Complete system architecture specification (ARCHITECTURE.md, AI_SYSTEM.md)
- Product specification with all pages, flows, and features (PRODUCT_SPEC.md)
- Database schema design with PostgreSQL, Qdrant, and Redis (DATABASE.md)
- Learning engine with 7 modes and pedagogical strategies (LEARNING_ENGINE.md)
- Memory system with 3-tier architecture (MEMORY_SYSTEM.md)
- 12-agent multi-AI system specification (AGENTS.md)
- Evaluation engine with 10-dimension scoring (EVALUATION.md)
- Design system with color tokens, typography, animations, and accessibility (DESIGN_SYSTEM.md)
- Complete testing strategy from unit to AI evaluation (TESTING.md)
- Security architecture with 4-layer prompt injection defense (SECURITY.md)
- Deployment architecture with Docker, Railway, and Vercel (DEPLOYMENT.md)
- Long-term roadmap covering 5 phases (ROADMAP.md)
- API specification with all endpoints (API.md)
- Technology stack decisions and trade-offs (TECH_STACK.md)
- Coding standards and style guide (STYLE_GUIDE.md)
- Project scaffolding: backend/, frontend/, ai/, tests/
- AI agent prompts library (PROMPTS.md)
- CI/CD pipeline configuration
- MIT License

### Phase 1 Complete: Foundation
- FastAPI backend with async PostgreSQL (SQLAlchemy)
- Next.js 14 frontend with App Router
- Supabase Auth integration (Google OAuth + email/password + guest mode)
- AI Orchestrator with provider-agnostic routing (LiteLLM, Groq, Gemini, OpenRouter, Ollama)
- RAG pipeline: Wikipedia → cleaning → semantic chunking → embeddings → pgvector search → reranking → context building
- AI Tutor with adaptive explanations, conversation history (12 messages), and follow-up suggestions
- Quiz generation with streaming (SSE), multiple question types, scoring, and mistake tracking
- Personalized study plans with AI-generated weekly milestones
- Analytics dashboard with activity tracking, concept mastery, quiz performance, and learning streaks
- Security layer: prompt injection protection, input/output guardrails, rate limiting, JWT auth
- Error monitoring via Sentry (frontend + backend)
- Dark mode with persistent preference
- Shared architecture: useAuth hook, useDarkMode hook, AppLayout component
- 170 backend tests passing

### Optimized & Refactored
- Extracted depth selector into reusable DepthSelector component
- Extracted quiz sub-components (AnswerOption, ShortAnswerInput, QuizSkeleton) into QuizComponents
- Extracted chat components (MessageActions, FollowUpSuggestions) into separate file
- Replaced dashboard IIFE with named getStudyPlanStatCard helper
- Fixed Pydantic v2 deprecation warning in config.py (class Config → model_config)
- Added React ErrorBoundary component for graceful render error handling
- Updated ROADMAP.md with completed checkboxes
- Cleaned up duplicate inline depth selector markup
