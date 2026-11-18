#!/usr/bin/env bash
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
REDIS_CONTAINER=lively-redis
LIVEKIT_CONTAINER=lively-livekit
BACKEND_PORT=8000
FRONTEND_PORT=5173

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${YELLOW}[dev]${NC} $1"; }
service() { echo -e "${CYAN}[dev]${NC} $1"; }
pass()    { echo -e "${GREEN}[dev]${NC} $1"; }

# ── Cleanup on Ctrl+C ─────────────────────────────────────────────────────────
PIDS=()
cleanup() {
    echo ""
    info "Shutting down..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    info "Done."
}
trap cleanup SIGINT SIGTERM EXIT

# ── 1. Redis ──────────────────────────────────────────────────────────────────
service "Starting Redis..."
if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
    pass "Redis already running"
elif docker ps -a --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
    docker start "$REDIS_CONTAINER" > /dev/null
    pass "Redis restarted"
else
    docker run -d --name "$REDIS_CONTAINER" -p 6379:6379 redis:7-alpine > /dev/null
    pass "Redis started"
fi

# ── 2. LiveKit ────────────────────────────────────────────────────────────────
service "Starting LiveKit..."
if docker ps --format '{{.Names}}' | grep -q "^${LIVEKIT_CONTAINER}$"; then
    pass "LiveKit already running"
elif docker ps -a --format '{{.Names}}' | grep -q "^${LIVEKIT_CONTAINER}$"; then
    docker start "$LIVEKIT_CONTAINER" > /dev/null
    pass "LiveKit restarted"
else
    docker compose -f "$SCRIPT_DIR/docker-compose.livekit.dev.yml" up -d > /dev/null
    pass "LiveKit started"
fi

# ── 3. Database migrations ───────────────────────────────────────────────────
service "Running database migrations..."
(cd "$BACKEND_DIR" && alembic upgrade head 2>&1 | grep -E "Running upgrade|already at head|ERROR" || true)
pass "Migrations applied"

# ── 4. Backend ────────────────────────────────────────────────────────────────
service "Starting FastAPI backend on port $BACKEND_PORT..."
(
    cd "$BACKEND_DIR"
    uvicorn app.main:app --reload --port "$BACKEND_PORT" --log-level info
) &
PIDS+=($!)

# ── 5. Frontend ───────────────────────────────────────────────────────────────
service "Starting Vite frontend on port $FRONTEND_PORT..."
(
    cd "$FRONTEND_DIR"
    npm run dev
) &
PIDS+=($!)

# ── Ready ─────────────────────────────────────────────────────────────────────
echo ""
pass "All services started:"
echo -e "  Backend  → ${GREEN}http://localhost:${BACKEND_PORT}${NC}  (API docs: http://localhost:${BACKEND_PORT}/api/docs)"
echo -e "  Frontend → ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo ""
info "Press Ctrl+C to stop everything."
echo ""

wait
