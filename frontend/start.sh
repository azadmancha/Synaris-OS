#!/bin/bash
# ──────────────────────────────────────────────────────────
# Synaris Frontend — Local Development Startup
# ──────────────────────────────────────────────────────────
# Kills zombie Node/Next.js processes, clears the build
# cache, and starts the dev server on port 3000.
#
# Usage:
#   ./start.sh              # Start frontend on port 3000
#   ./start.sh --port 3005  # Start on a custom port
# ──────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[synaris]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[  ok  ]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[ warn ]${NC} $1"; }
log_error() { echo -e "${RED}[fail]${NC} $1"; }

# ── Config ────────────────────────────────────────────────

PORT=3000
if [ "${1:-}" = "--port" ] && [ -n "${2:-}" ]; then
    PORT="$2"
elif [ -n "${1:-}" ] && [ "${1:-}" != "--port" ]; then
    # Support ./start.sh 3005 as shorthand
    PORT="$1"
fi

# ── Cleanup ───────────────────────────────────────────────

log_info "Cleaning up old processes..."

# Kill ALL stray node/next processes from previous runs
# Using pkill with the exact process name to avoid killing other Node apps
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "node.*next" 2>/dev/null || true

sleep 1

# Also check the specific port
CURRENT_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [ -n "$CURRENT_PID" ]; then
    log_warn "Port $PORT is taken by PID $CURRENT_PID — killing..."
    kill -9 "$CURRENT_PID" 2>/dev/null || true
    sleep 1
    if lsof -ti :"$PORT" >/dev/null 2>&1; then
        log_error "Port $PORT is still in use. Try: lsof -ti :$PORT | xargs kill -9"
        exit 1
    fi
    log_ok "Port $PORT is now free"
fi

# Clear build cache — stale .next caches cause MODULE_NOT_FOUND errors
log_info "Clearing build cache..."
rm -rf .next node_modules/.cache 2>/dev/null || true
log_ok "Cache cleared"

# ── Start ─────────────────────────────────────────────────

echo ""
log_info "Starting Synaris frontend on port $PORT..."
echo ""

PORT=$PORT npm run dev
# Note: Runs in foreground. Press Ctrl+C to stop.
# For background: PORT=$PORT nohup npm run dev > /tmp/synaris_frontend.log 2>&1 &
