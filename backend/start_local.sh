#!/bin/bash
# ──────────────────────────────────────────────────────────
# Synaris Local Development Startup
# ──────────────────────────────────────────────────────────
# Kills zombie processes, verifies ports are free, and
# starts the backend API server.
#
# Usage:
#   ./start_local.sh              # Start backend only
#   ./start_local.sh --frontend   # Start both backend and frontend
# ──────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}[synaris]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[  ok  ]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[ warn ]${NC} $1"; }
log_error() { echo -e "${RED}[fail]${NC} $1"; }

# ── Config ────────────────────────────────────────────────

BACKEND_PORT=8000
FRONTEND_PORT=3000
FRONTEND_DIR="$SCRIPT_DIR/../frontend"

# ── Cleanup function ──────────────────────────────────────

cleanup_port() {
    local port=$1
    local pid
    pid=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pid" ]; then
        log_warn "Port $port is taken by PID $pid — killing..."
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
        # Verify it's free
        if lsof -ti :"$port" >/dev/null 2>&1; then
            log_error "Port $port is still in use after kill!"
            return 1
        fi
        log_ok "Port $port is now free"
    fi
}

cleanup_all() {
    log_info "Cleaning up old processes..."
    # Kill any stray uvicorn/node processes from previous runs
    pkill -9 -f "uvicorn app.main" 2>/dev/null || true
    pkill -9 -f "next dev" 2>/dev/null || true
    pkill -9 -f "node.*next" 2>/dev/null || true
    sleep 1

    cleanup_port "$BACKEND_PORT" || true
    cleanup_port "$FRONTEND_PORT" 2>/dev/null || true
}

# ── Start backend ─────────────────────────────────────────

start_backend() {
    log_info "Activating virtual environment..."
    # Find the venv — try common locations
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    elif [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    else
        log_error "No virtual environment found! Run: python -m venv .venv"
        exit 1
    fi

    log_info "Starting Synaris backend on port $BACKEND_PORT..."
    uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --log-level info &
    BACKEND_PID=$!

    # Wait for server to be ready
    for i in $(seq 1 15); do
        if curl -s --max-time 1 "http://localhost:$BACKEND_PORT/v1/health/ping" >/dev/null 2>&1; then
            log_ok "Backend is ready (PID $BACKEND_PID)"
            return 0
        fi
        sleep 1
    done

    log_error "Backend failed to start within 15 seconds — check logs above"
    kill "$BACKEND_PID" 2>/dev/null || true
    return 1
}

# ── Start frontend ────────────────────────────────────────

start_frontend() {
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found at $FRONTEND_DIR"
        return 1
    fi

    log_info "Starting frontend on port $FRONTEND_PORT..."
    cd "$FRONTEND_DIR"

    # Clear build cache to avoid stale module errors
    rm -rf .next node_modules/.cache 2>/dev/null || true

    PORT=$FRONTEND_PORT npm run dev > /tmp/synaris_frontend.log 2>&1 &
    FRONTEND_PID=$!

    # Wait for server to be ready
    for i in $(seq 1 20); do
        if curl -s --max-time 2 "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
            log_ok "Frontend is ready (PID $FRONTEND_PID)"
            log_info "Frontend: http://localhost:$FRONTEND_PORT"
            return 0
        fi
        sleep 1
    done

    log_warn "Frontend may still be compiling — check /tmp/synaris_frontend.log"
    log_info "Likely URL: http://localhost:$FRONTEND_PORT"
    return 0
}

# ── Main ──────────────────────────────────────────────────

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Synaris — Starting Up        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

cleanup_all
echo ""
start_backend
echo ""

# Determine the actual API URL
API_URL="http://localhost:$BACKEND_PORT"
log_info "API:      $API_URL"
log_info "Docs:     $API_URL/docs"

if [ "${1:-}" = "--frontend" ]; then
    echo ""
    start_frontend
fi

echo ""
log_ok "Synaris is running!"
echo ""
echo "  API:        http://localhost:$BACKEND_PORT"
echo "  API Docs:   http://localhost:$BACKEND_PORT/docs"
echo "  Health:     http://localhost:$BACKEND_PORT/v1/health"
echo ""
