# Style Guide

> **Coding standards, naming conventions, and best practices for all Synaris code**

---

## Table of Contents

1. [General Principles](#general-principles)
2. [Python (Backend)](#python-backend)
3. [TypeScript/React (Frontend)](#typescriptreact-frontend)
4. [Documentation](#documentation)
5. [Naming Conventions](#naming-conventions)
6. [Folder Structure](#folder-structure)
7. [Logging](#logging)
8. [Error Handling](#error-handling)

---

## General Principles

1. **Readability over cleverness** — Code is written for humans first
2. **Consistency** — Follow patterns established in the codebase
3. **Type safety** — Use type hints everywhere
4. **Testing** — Every function should be testable
5. **Documentation** — Document *why*, not *what* (the code shows what)
6. **Small functions** — Each function does one thing
7. **No TODOs in production code** — Address issues before merging

---

## Python (Backend)

### Formatting & Linting

```bash
# Use Ruff for both linting and formatting
ruff check .       # Lint
ruff format .      # Format
ruff check --fix . # Auto-fix
```

### Configuration

```toml
# pyproject.toml
[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "ANN"]

[tool.ruff.format]
quote-style = "double"
```

### Type Hints

```python
# Always use type hints — no exceptions
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

def process_message(
    user_id: UUID,
    content: str,
    mode: str = "balanced",
    metadata: Optional[Dict[str, Any]] = None
) -> dict:
    """Process a user message through the agent pipeline.
    
    Args:
        user_id: The user's UUID
        content: The message content
        mode: Learning mode (quick, balanced, deep_dive, expert)
        metadata: Optional metadata
        
    Returns:
        dict: The processed response with content and metadata
    
    Raises:
        ValueError: If content is empty
        ValidationError: If mode is invalid
    """
    pass
```

### Async Patterns

```python
# Use async/await throughout
from sqlalchemy.ext.asyncio import AsyncSession

async def get_learner_profile(db: AsyncSession, user_id: UUID) -> LearnerProfile:
    result = await db.execute(
        select(LearnerProfile).where(LearnerProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()

# Use asyncio.gather for parallel operations
async def process_message(...):
    results = await asyncio.gather(
        get_memory_context(user_id),
        get_knowledge_graph_data(topic),
        get_concept_mastery(user_id, subject),
        return_exceptions=True
    )
```

### File Structure

```python
# One class/concern per file
# File name matches class name (snake_case)

# Good: services/memory_service.py
class MemoryService:
    ...

# Good: models/concept_mastery.py
class ConceptMastery(Base):
    ...
```

### Imports

```python
# Standard library
import asyncio
from datetime import datetime
from typing import Optional

# Third party
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Local
from app.core.config import settings
from app.models.concept_mastery import ConceptMastery
from app.services.memory_service import MemoryService
```

---

## TypeScript/React (Frontend)

### Formatting & Linting

```json
{
  "prettier": {
    "semi": true,
    "singleQuote": true,
    "tabWidth": 2,
    "trailingComma": "all",
    "printWidth": 100
  }
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Component Patterns

```typescript
// Use functional components with hooks
// Always use TypeScript interfaces

interface Props {
  depth: 'quick' | 'balanced' | 'deep_dive' | 'expert';
  onChange: (depth: string) => void;
  className?: string;
}

export function DepthSelector({ depth, onChange, className }: Props) {
  return (
    <div className={`depth-selector ${className ?? ''}`}>
      {(['quick', 'balanced', 'deep_dive', 'expert'] as const).map((option) => (
        <button
          key={option}
          className={`depth-option ${depth === option ? 'depth-option--active' : ''}`}
          onClick={() => onChange(option)}
          aria-pressed={depth === option}
        >
          {option === 'deep_dive' ? 'Deep Dive' : capitalize(option)}
        </button>
      ))}
    </div>
  );
}
```

### State Management

```typescript
// Use Zustand for global state
import { create } from 'zustand';

interface SessionStore {
  isStreaming: boolean;
  messages: Message[];
  setStreaming: (streaming: boolean) => void;
  addMessage: (message: Message) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  isStreaming: false,
  messages: [],
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
}));

// Use TanStack Query for server state
import { useQuery } from '@tanstack/react-query';

function useLearningProfile(userId: string) {
  return useQuery({
    queryKey: ['learning-profile', userId],
    queryFn: () => fetch(`/api/profile/${userId}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### CSS Conventions

```css
/* Use TailwindCSS utility classes */
/* Use CSS modules for complex components */

/* Naming: BEM-like with Tailwind */
.depth-selector {
  @apply flex gap-2 bg-secondary rounded-full p-0.5;
}

.depth-option {
  @apply px-3 py-1 rounded-full text-xs transition-all cursor-pointer;
}

.depth-option--active {
  @apply bg-white shadow-sm font-medium;
}
```

---

## Documentation

### Code Documentation

```python
# Every module should have a docstring
# Every public function should have a docstring
# Inline comments for non-obvious logic only

def calculate_next_review(mastery_level: str, consecutive_correct: int) -> int:
    """Calculate the next review interval using spaced repetition.
    
    Uses a modified SM-2 algorithm with confidence scoring.
    Returns days until next review.
    
    Args:
        mastery_level: Current mastery level
        consecutive_correct: Number of consecutive correct responses
        
    Returns:
        int: Days until next review (clamped to 1-90)
    """
    intervals = {"introduced": 1, "developing": 3, "familiar": 7, "mastered": 14}
    base = intervals.get(mastery_level, 1)
    multiplier = min(consecutive_correct * 0.5, 3.0)
    return min(max(int(base * multiplier), 1), 90)
```

### Markdown Documentation

- Use ATX headings (`#` not `=` underlines)
- Use fenced code blocks with language tags
- Use tables for structured data
- Use relative links for internal references
- Keep line length readable (80-100 chars)

---

## Naming Conventions

### Python

| Element | Convention | Example |
|---|---|---|
| Variables | snake_case | `user_profile` |
| Functions | snake_case | `get_learner_profile()` |
| Classes | PascalCase | `class MemoryService:` |
| Constants | UPPER_SNAKE | `MAX_RETRY_COUNT = 3` |
| Private | _prefix | `_validate_input()` |
| Modules | snake_case | `memory_service.py` |
| Packages | snake_case | `services/` |

### TypeScript

| Element | Convention | Example |
|---|---|---|
| Variables | camelCase | `userProfile` |
| Functions | camelCase | `getLearnerProfile()` |
| Components | PascalCase | `DepthSelector` |
| Interfaces | PascalCase | `interface MessageProps` |
| Types | PascalCase | `type MessageType = ...` |
| Constants | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Files | kebab-case | `depth-selector.tsx` |

---

## Folder Structure

### Backend

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── api/                    # API routes
│   │   ├── __init__.py
│   │   ├── sessions.py
│   │   ├── messages.py
│   │   ├── profile.py
│   │   ├── knowledge_graph.py
│   │   └── health.py
│   ├── core/                   # Core configuration
│   │   ├── __init__.py
│   │   ├── config.py           # Pydantic settings
│   │   ├── database.py         # Database setup
│   │   ├── redis.py            # Redis client
│   │   ├── qdrant.py           # Qdrant client
│   │   └── security.py         # Auth middleware
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── session.py
│   │   ├── message.py
│   │   ├── concept_mastery.py
│   │   └── ...
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── session_service.py
│   │   ├── memory_service.py
│   │   ├── study_planner.py
│   │   └── ...
│   └── agents/                 # AI agents
│       ├── __init__.py
│       ├── coordinator/
│       ├── intent_router/
│       ├── reasoning/
│       ├── teaching/
│       ├── evaluation/
│       └── memory/
├── migrations/                 # Alembic
│   ├── env.py
│   ├── alembic.ini
│   └── versions/
├── tests/
├── requirements.txt
└── Dockerfile
```

### Frontend

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Landing / Dashboard
│   │   ├── learn/
│   │   ├── profile/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/                 # Generic UI components
│   │   ├── chat/               # Chat-related components
│   │   ├── learning/           # Learning-specific
│   │   ├── layout/             # Navigation, headers
│   │   └── shared/             # Shared utilities
│   ├── lib/                    # Utilities, API client
│   ├── styles/                 # Global styles
│   ├── hooks/                  # Custom React hooks
│   └── stores/                 # Zustand stores
├── public/
├── tests/
└── package.json
```

---

## Logging

```python
# Use structured logging everywhere
import structlog

logger = structlog.get_logger()

# Always include context
logger.info("session_created",
    session_id=session.id,
    user_id=user.id,
    mode=session.mode,
    subject=session.subject,
)

# Error logging with traceback
try:
    result = await process_message(...)
except Exception as e:
    logger.error("message_processing_failed",
        session_id=session_id,
        error=str(e),
        exc_info=True,  # Include traceback in dev
    )
```

---

## Error Handling

```python
# Custom exceptions for different error types
class SynarisError(Exception):
    """Base exception for Synaris errors."""
    pass

class ValidationError(SynarisError):
    """Input validation failed."""
    pass

class AgentError(SynarisError):
    """AI agent encountered an error."""
    def __init__(self, agent_name: str, message: str, retryable: bool = True):
        self.agent_name = agent_name
        self.retryable = retryable
        super().__init__(f"[{agent_name}] {message}")

class RateLimitError(SynarisError):
    """Rate limit exceeded."""
    pass

# Graceful error responses
@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=400,
        content={
            "error": "validation_error",
            "message": str(exc),
            "user_message": "I didn't quite understand that. Could you rephrase?"
        }
    )

@app.exception_handler(SynarisError)
async def synaris_error_handler(request: Request, exc: SynarisError):
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": str(exc),
            "user_message": "Something went wrong on my end. Let me try again."
        }
    )
```
