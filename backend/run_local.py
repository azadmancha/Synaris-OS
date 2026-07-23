"""
Synaris — Run Locally (no Docker, no PostgreSQL).

Starts the FastAPI backend with SQLite and verifies
the key endpoints work.

Usage:
    python run_local.py
"""

import asyncio
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HOST = "0.0.0.0"
PORT = 8000
BASE = f"http://localhost:{PORT}/v1"

backend_dir = Path(__file__).parent
db_path = backend_dir / "synaris_local.db"

# Auth token — set by login, used by all subsequent requests
_auth_token: str | None = None


def http(method: str, path: str, body: dict = None, timeout: int = 30):
    """Simplified HTTP request using stdlib only."""
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    # Build headers — always include auth token if available
    headers = {}
    if _auth_token:
        headers["Authorization"] = f"Bearer {_auth_token}"
    if body:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(
        url, data=data, method=method,
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode()
            return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw) if raw else {"error": f"HTTP {e.code}: {e.reason}"}
        except json.JSONDecodeError:
            return e.code, {"error": f"HTTP {e.code}: {raw[:200]}"}
    except Exception as e:
        return 0, {"error": str(e)}


async def main() -> int:
    # ── Read API keys from .env ──
    env_path = backend_dir.parent / ".env"
    env_vars = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip()

    gemini_key = env_vars.get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
    groq_key = env_vars.get("GROQ_API_KEY") or os.environ.get("GROQ_API_KEY")
    openrouter_key = env_vars.get("OPENROUTER_API_KEY") or os.environ.get("OPENROUTER_API_KEY")

    if not groq_key and not gemini_key:
        print("  ❌ No API keys found. Set at least GROQ_API_KEY or GEMINI_API_KEY")
        sys.exit(1)

    providers = []
    if gemini_key: providers.append("Gemini")
    if groq_key: providers.append("Groq")
    if openrouter_key: providers.append("OpenRouter")

    print(f"{'='*60}")
    print("  Synaris — Local Server Test")
    print(f"{'='*60}")
    print(f"  DB:       {db_path}")
    print(f"  Port:     http://localhost:{PORT}")
    print(f"  AI:       {', '.join(providers)}")
    print()

    # Clean up old db for fresh start
    if db_path.exists():
        db_path.unlink()

    # ── Start server ──
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"
    if gemini_key: env["GEMINI_API_KEY"] = gemini_key
    if groq_key: env["GROQ_API_KEY"] = groq_key
    if openrouter_key: env["OPENROUTER_API_KEY"] = openrouter_key
    env["DEBUG"] = "false"

    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn",
         "app.main:app", "--host", HOST, "--port", str(PORT),
         "--log-level", "warning"],
        cwd=str(backend_dir), env=env,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )

    # Wait for server
    print("  Starting server...", end="", flush=True)
    for i in range(20):
        time.sleep(1)
        s, _ = http("GET", "/health")
        if 200 <= s < 300:
            print(f" ready ({i+1}s)")
            break
        print(".", end="", flush=True)
    else:
        print("\n  ❌ Server failed to start")
        stdout, stderr = server.communicate(timeout=10)
        err = stderr.decode()[:1000] if stderr else "(no output)"
        print(f"  Stderr: {err}")
        server.terminate()
        return 1

    passed = 0
    failed = 0

    def check(name: str, status: int, body=None, ok_range=(200, 300)):
        nonlocal passed, failed
        ok = ok_range[0] <= status < ok_range[1]
        if ok:
            passed += 1
            icon = "✅"
        else:
            failed += 1
            icon = "❌"
        detail = ""
        if isinstance(body, dict):
            if "error" in body:
                detail = f"  → {body['error']}"
            elif "id" in body:
                detail = f"  → id={body.get('id', '?')[:12]}..."
        print(f"  {icon} {name} → {status}{detail}")
        return ok

    try:
        # ── 1. Health ──
        print("\n  ── Health ──")
        s, data = http("GET", "/health")
        check("GET /v1/health", s, data)

        # ── 2. Auth ──
        print("\n  ── Auth ──")
        s, data = http("POST", "/auth/login", {
            "email": "student@synaris.app",
            "display_name": "Test Student",
        })
        check("POST /auth/login", s, data)
        if s >= 300:
            raise RuntimeError(f"Auth failed (status={s})")
        # Store token for all subsequent requests
        global _auth_token
        _auth_token = data.get("token", "")

        # ── 3. Create session ──
        print("\n  ── Session ──")
        s, data = http("POST", "/sessions", {
            "mode": "balanced",
            "subject": "physics",
        })
        check("POST /sessions", s, data)
        if s >= 300:
            raise RuntimeError(f"Session creation failed (status={s})")
        session_id = data.get("id", "")

        # ── 4. Quick chat via Groq ──
        print("\n  ── AI Chat (Quick → Groq) ──")
        s, data = http("POST", f"/sessions/{session_id}/messages", {
            "content": "Explain what entropy is in one sentence.",
            "mode": "quick",
        }, timeout=60)
        check("POST /messages (quick)", s, data)
        if isinstance(data, dict) and "ai_message" in data:
            ai = data["ai_message"]
            content = ai.get("content", "")
            model = ai.get("model_used", "?")
            print(f"  🤖 Model: {model}")
            print(f"  📝 {content[:300]}")

        # ── 5. Deep chat via Gemini ──
        print("\n  ── AI Chat (Deep → Gemini) ──")
        s, data = http("POST", f"/sessions/{session_id}/messages", {
            "content": "Why is the sky blue? Use physics principles.",
            "mode": "deep_dive",
        }, timeout=60)
        check("POST /messages (deep)", s, data)
        if isinstance(data, dict) and "ai_message" in data:
            ai = data["ai_message"]
            content = ai.get("content", "")
            model = ai.get("model_used", "?")
            print(f"  🤖 Model: {model}")
            print(f"  📝 {content[:300]}")

    except RuntimeError as e:
        print(f"\n  ⚠️  {e}")

    finally:
        print(f"\n  ── Results: {passed}/{passed+failed} passed ──")
        print("  Shutting down server...")
        server.terminate()
        server.wait(timeout=5)
        if db_path.exists():
            db_path.unlink()
            print("  Cleaned up test database.")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit(asyncio.run(main()))
