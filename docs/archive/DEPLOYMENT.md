# Deployment Architecture

> **Version 1.0 — Deployment, DevOps, monitoring, and infrastructure for Synaris**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Docker Setup](#docker-setup)
3. [Environment Configuration](#environment-configuration)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Monitoring & Logging](#monitoring--logging)
6. [Backup Strategy](#backup-strategy)
7. [Scaling Strategy](#scaling-strategy)

---

## Architecture Overview

### Production Infrastructure

```
                         Cloudflare
                            │
                     (DNS / CDN / DDoS)
                            │
                      ┌─────┴─────┐
                      │           │
                      ▼           ▼
                 Vercel Edge    Railway
                 (Frontend)    (Backend)
                      │           │
                      │           ├──────────────┐
                      │           │              │
                      │           ▼              ▼
                      │      PostgreSQL      Qdrant
                      │      (Railway)       (Railway)
                      │           │              │
                      │           └──────┬───────┘
                      │                  │
                      │                  ▼
                      │               Redis
                      │            (Railway)
                      │
                      ▼
                User's Browser
```

### Service Breakdown

| Service | Platform | Scaling | Replicas |
|---|---|---|---|
| Next.js Frontend | Vercel | Auto | Multiple regions |
| FastAPI Backend | Railway | Horizontal | 2–10 |
| PostgreSQL | Railway | Vertical | 1 primary + 1 replica |
| Redis | Railway | Vertical | 1 |
| Qdrant | Railway | Horizontal | 1–3 |
| Celery Workers | Railway | Horizontal | 2–5 |

---

## Docker Setup

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: synaris
      POSTGRES_USER: synaris
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U synaris"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://synaris:${DB_PASSWORD}@postgres:5432/synaris
      REDIS_URL: redis://redis:6379/0
      QDRANT_URL: http://qdrant:6333
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      qdrant:
        condition: service_started
    volumes:
      - ./src:/app/src

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      DATABASE_URL: postgresql+asyncpg://synaris:${DB_PASSWORD}@postgres:5432/synaris
      REDIS_URL: redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./src:/app/src

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
```

### Dockerfile (API)

```dockerfile
# Dockerfile.api
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/

# Run as non-root user
RUN useradd -m -u 1000 synaris && chown -R synaris:synaris /app
USER synaris

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Environment Configuration

```python
# src/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Application
    APP_ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str
    
    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Qdrant
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: Optional[str] = None
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # LLM Providers
    OPENROUTER_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    DEEPSEEK_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    
    # Search APIs
    BRAVE_API_KEY: Optional[str] = None
    TAVILY_API_KEY: Optional[str] = None
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 60
    RATE_LIMIT_WINDOW: int = 60
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

### Example .env

```bash
# Application
APP_ENV=development
DEBUG=true
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=postgresql+asyncpg://synaris:password@localhost:5432/synaris

# Redis
REDIS_URL=redis://localhost:6379/0

# Qdrant
QDRANT_URL=http://localhost:6333

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# LLM Providers
OPENROUTER_API_KEY=sk-or-v1-your-key
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-key

# Search
BRAVE_API_KEY=your-key
TAVILY_API_KEY=your-key
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    uses: ./.github/workflows/test.yml  # Reuse test workflow
    
  deploy:
    needs: [test]
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile.api
          push: true
          tags: |
            synaris/api:latest
            synaris/api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Build and push Worker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile.worker
          push: true
          tags: |
            synaris/worker:latest
            synaris/worker:${{ github.sha }}
      
      - name: Deploy to Railway
        uses: railway-org/railway-action@v2
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: synaris-api
          image: synaris/api:${{ github.sha }}
      
      - name: Run database migrations
        run: |
          alembic upgrade head
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Deploy frontend to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
```

---

## Monitoring & Logging

### Application Monitoring

```python
# src/monitoring.py
import structlog
from prometheus_client import Counter, Histogram, Gauge
import time

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Prometheus metrics
REQUESTS_TOTAL = Counter(
    'synaris_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

RESPONSE_TIME = Histogram(
    'synaris_response_time_seconds',
    'API response time',
    ['endpoint'],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0)
)

ACTIVE_USERS = Gauge(
    'synaris_active_users',
    'Currently active users'
)

AI_LATENCY = Histogram(
    'synaris_ai_latency_seconds',
    'AI response generation time',
    ['model', 'agent'],
    buckets=(0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0)
)

# Logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    # Update metrics
    REQUESTS_TOTAL.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    RESPONSE_TIME.labels(
        endpoint=request.url.path
    ).observe(duration)
    
    # Structured log
    logger.info("request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round(duration * 1000),
        user_id=request.state.user_id if hasattr(request.state, 'user_id') else None,
    )
    
    return response
```

### Health Check Endpoint

```python
# src/routes/health.py
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "checks": {}
    }
    
    # Check database
    try:
        await db.execute("SELECT 1")
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        await redis.ping()
        health_status["checks"]["redis"] = "healthy"
    except Exception as e:
        health_status["checks"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Qdrant
    try:
        await qdrant.health_check()
        health_status["checks"]["qdrant"] = "healthy"
    except Exception as e:
        health_status["checks"]["qdrant"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check LLM providers (light ping)
    try:
        # Just check if keys are configured, don't call APIs
        health_status["checks"]["llm_providers"] = "configured"
    except Exception as e:
        health_status["checks"]["llm_providers"] = f"error: {str(e)}"
    
    return health_status
```

### Alerting Rules

```yaml
# monitoring/alerts.yml
groups:
  - name: synaris-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(synaris_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
      
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(synaris_response_time_seconds_bucket[5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"
      
      - alert: AIHighLatency
        expr: histogram_quantile(0.95, rate(synaris_ai_latency_seconds_bucket[5m])) > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High AI response latency"
      
      - alert: DatabaseDown
        expr: synaris_database_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
```

---

## Backup Strategy

```yaml
# Backup schedule
backups:
  postgresql:
    schedule: "0 2 * * *"  # Daily at 2 AM
    retention: 30 days
    type: full
    storage: s3
    
  qdrant:
    schedule: "0 3 * * *"  # Daily at 3 AM
    retention: 7 days
    type: snapshot
    storage: s3
    
  redis:
    schedule: "0 */6 * * *"  # Every 6 hours
    retention: 24 hours
    type: dump
    storage: local + s3
```

### Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="synaris-backups"

# PostgreSQL backup
pg_dump -U synaris -d synaris \
    --format=custom \
    --compress=9 \
    --file="${BACKUP_DIR}/postgres_${TIMESTAMP}.dump"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/postgres_${TIMESTAMP}.dump" \
    "s3://${S3_BUCKET}/postgres/"

# Clean up old backups (older than 30 days)
find ${BACKUP_DIR} -name "postgres_*.dump" -mtime +30 -delete

# Qdrant snapshot
curl -X POST "http://qdrant:6333/snapshots"
# (Qdrant saves snapshot to its storage directory)
```

---

## Scaling Strategy

### Horizontal Scaling

```yaml
# railway.json
{
  "services": [
    {
      "name": "synaris-api",
      "scaling": {
        "min": 2,
        "max": 10,
        "cpu": 80,
        "memory": 75
      },
      "autoscaling": {
        "enabled": true,
        "metrics": [
          {
            "type": "requests_per_second",
            "target": 50
          },
          {
            "type": "cpu_utilization",
            "target": 70
          }
        ]
      }
    }
  ]
}
```

### Database Scaling

```python
# Read replicas for query-heavy operations
READ_REPLICAS = [
    "postgresql+asyncpg://user:pass@replica-1:5432/synaris",
    "postgresql+asyncpg://user:pass@replica-2:5432/synaris",
]

class DatabaseRouter:
    """Route read queries to replicas, writes to primary"""
    
    def __init__(self):
        self.primary = create_async_engine(PRIMARY_URL)
        self.replicas = [create_async_engine(url) for url in READ_REPLICAS]
        self.replica_index = 0
    
    def get_read_engine(self):
        engine = self.replicas[self.replica_index]
        self.replica_index = (self.replica_index + 1) % len(self.replicas)
        return engine
    
    def get_write_engine(self):
        return self.primary

# Connection pooling per service
CONNECTION_POOLS = {
    "api": {"pool_size": 20, "max_overflow": 10},
    "worker": {"pool_size": 10, "max_overflow": 5},
}
```
