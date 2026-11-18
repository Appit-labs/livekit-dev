# LiveKit Docker Compose Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add self-hosted LiveKit via Docker Compose for local dev and production, replacing the external talenitno-live connection.

**Architecture:** Two fully separate, self-contained compose files — `docker-compose.livekit.dev.yml` (plain WebSocket, no TLS) and `docker-compose.livekit.prod.yml` (ACME/Let's Encrypt TLS). Each mounts its own LiveKit YAML config. The backend reads `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` from the environment — no backend or frontend code changes needed, only infrastructure files and `.env` entries.

**Tech Stack:** Docker Compose v2, `livekit/livekit-server:latest`, LiveKit YAML config with `${VAR}` env-var substitution, Let's Encrypt ACME for prod TLS.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `livekit/config.dev.yaml` | LiveKit server config — no TLS, devkey/secret |
| Create | `livekit/config.prod.yaml` | LiveKit server config — ACME TLS, env-var keys |
| Create | `docker-compose.livekit.dev.yml` | Dev compose — ports 7880/7881/UDP 50000-60000 |
| Create | `docker-compose.livekit.prod.yml` | Prod compose — ports 443/80/7881/UDP 50000-60000, named volume |
| Create | `.env.livekit.prod.example` | Committed template with empty values |
| Modify | `.gitignore` | Add `.env.livekit.prod` |
| Modify | `backend/.env` | Add dev LiveKit vars pointing to localhost:7880 |
| Modify | `dev.sh` | Add LiveKit container start block after Redis |

---

## Task 1: LiveKit dev config file

**Files:**
- Create: `livekit/config.dev.yaml`

- [ ] **Step 1: Create the livekit directory and dev config**

```bash
mkdir -p livekit
```

Create `livekit/config.dev.yaml`:

```yaml
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: false
keys:
  devkey: secret
logging:
  level: debug
```

- [ ] **Step 2: Commit**

```bash
git add livekit/config.dev.yaml
git commit -m "chore: add LiveKit dev server config"
```

---

## Task 2: Dev Docker Compose file

**Files:**
- Create: `docker-compose.livekit.dev.yml`

- [ ] **Step 1: Create the dev compose file**

Create `docker-compose.livekit.dev.yml` at the repo root:

```yaml
services:
  livekit:
    image: livekit/livekit-server:latest
    container_name: lively-livekit
    command: --config /etc/livekit/config.yaml
    volumes:
      - ./livekit/config.dev.yaml:/etc/livekit/config.yaml:ro
    ports:
      - "7880:7880"
      - "7881:7881"
      - "50000-60000:50000-60000/udp"
```

- [ ] **Step 2: Validate the compose file syntax**

```bash
docker compose -f docker-compose.livekit.dev.yml config
```

Expected: YAML output with resolved service definition, no errors.

- [ ] **Step 3: Spin up LiveKit and verify it starts**

```bash
docker compose -f docker-compose.livekit.dev.yml up
```

Expected: logs like `starting LiveKit server` and `using single-node routing` with no errors. Press Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.livekit.dev.yml
git commit -m "chore: add LiveKit dev Docker Compose file"
```

---

## Task 3: LiveKit prod config file

**Files:**
- Create: `livekit/config.prod.yaml`

- [ ] **Step 1: Create the prod config**

Create `livekit/config.prod.yaml`:

```yaml
port: 443
bind_addresses:
  - ""
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}
tls:
  domain: ${LIVEKIT_DOMAIN}
logging:
  level: info
```

> **Note on `${VAR}` substitution:** LiveKit server processes `${VAR}` placeholders in the config YAML before parsing. The `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_DOMAIN` env vars are passed into the container via `env_file` in the prod compose file (Task 4). Verify the exact ACME/TLS config key names against the LiveKit docs at https://docs.livekit.io/home/self-hosting/deployment/ before deploying to prod.

- [ ] **Step 2: Commit**

```bash
git add livekit/config.prod.yaml
git commit -m "chore: add LiveKit prod server config with ACME TLS"
```

---

## Task 4: Prod Docker Compose file + env template

**Files:**
- Create: `docker-compose.livekit.prod.yml`
- Create: `.env.livekit.prod.example`

- [ ] **Step 1: Create the env template**

Create `.env.livekit.prod.example` at repo root:

```
LIVEKIT_DOMAIN=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

- [ ] **Step 2: Create the prod compose file**

Create `docker-compose.livekit.prod.yml` at repo root:

```yaml
services:
  livekit:
    image: livekit/livekit-server:latest
    container_name: lively-livekit
    command: --config /etc/livekit/config.yaml
    volumes:
      - ./livekit/config.prod.yaml:/etc/livekit/config.yaml:ro
      - livekit-data:/data/livekit
    ports:
      - "80:80"
      - "443:443"
      - "7881:7881"
      - "50000-60000:50000-60000/udp"
    env_file:
      - .env.livekit.prod
    restart: unless-stopped

volumes:
  livekit-data:
```

- [ ] **Step 3: Validate the compose file syntax**

```bash
docker compose -f docker-compose.livekit.prod.yml config
```

Expected: validation error about missing `env_file` (`.env.livekit.prod` doesn't exist yet — that's expected at this stage). If it errors on YAML syntax, fix the compose file. If it errors only on the missing env file, that's fine.

Alternatively, create a temporary `.env.livekit.prod` with placeholder values to pass validation:

```bash
echo "LIVEKIT_DOMAIN=test.example.com\nLIVEKIT_API_KEY=testkey\nLIVEKIT_API_SECRET=testsecret" > .env.livekit.prod
docker compose -f docker-compose.livekit.prod.yml config
rm .env.livekit.prod
```

Expected: YAML output with resolved service definition, no errors.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.livekit.prod.yml .env.livekit.prod.example
git commit -m "chore: add LiveKit prod Docker Compose file and env template"
```

---

## Task 5: Secrets and .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Check if a .gitignore exists at repo root**

```bash
ls .gitignore 2>/dev/null && echo "exists" || echo "missing"
```

- [ ] **Step 2: Add .env.livekit.prod to .gitignore**

If `.gitignore` exists, append to it:

```bash
echo "\n# LiveKit prod secrets\n.env.livekit.prod" >> .gitignore
```

If it doesn't exist, create it:

```
# LiveKit prod secrets
.env.livekit.prod
```

- [ ] **Step 3: Verify the file is ignored**

```bash
git check-ignore -v .env.livekit.prod
```

Expected: output like `.gitignore:N:.env.livekit.prod  .env.livekit.prod`

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore LiveKit prod secrets file"
```

---

## Task 6: Wire backend dev .env to local LiveKit

**Files:**
- Modify: `backend/.env`

- [ ] **Step 1: Add LiveKit vars to backend dev .env**

Open `backend/.env` and append these three lines:

```
# LiveKit (local dev — matches docker-compose.livekit.dev.yml)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

These match the `keys` section in `livekit/config.dev.yaml` exactly. The backend's `Settings` class in `app/core/config.py` already declares these three fields — no code change needed.

- [ ] **Step 2: Verify the backend reads them correctly**

With LiveKit dev running (`docker compose -f docker-compose.livekit.dev.yml up -d`), start the backend and hit the settings endpoint or check startup logs to confirm no config errors:

```bash
cd backend && uvicorn app.main:app --port 8000 --log-level info 2>&1 | head -20
```

Expected: backend starts cleanly with no `LIVEKIT_*` warnings.

- [ ] **Step 3: Stop the test container**

```bash
docker compose -f docker-compose.livekit.dev.yml down
```

- [ ] **Step 4: Update .env.example if it exists**

Check `backend/.env.example`:

```bash
grep -q "LIVEKIT" backend/.env.example && echo "already there" || echo "needs update"
```

If not present, append to `backend/.env.example`:

```
# LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

- [ ] **Step 5: Commit**

```bash
git add backend/.env.example
git commit -m "chore: add LiveKit dev vars to backend env example"
```

> Note: `backend/.env` is typically gitignored. Do not commit it. Only commit `.env.example`.

---

## Task 7: Update dev.sh to start LiveKit

**Files:**
- Modify: `dev.sh`

- [ ] **Step 1: Read the current dev.sh to understand the Redis block structure**

The Redis block in `dev.sh` looks like this (lines ~33-43):

```bash
REDIS_CONTAINER=lively-redis
...
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
```

- [ ] **Step 2: Add LIVEKIT_CONTAINER variable to the Config section**

In the `# ── Config` section at the top of `dev.sh`, add after `REDIS_CONTAINER=lively-redis`:

```bash
LIVEKIT_CONTAINER=lively-livekit
```

- [ ] **Step 3: Add the LiveKit block after the Redis block**

Add this block immediately after the Redis `fi` and before `# ── 2. Database migrations`:

```bash
# ── 2. LiveKit ────────────────────────────────────────────────────────────────
service "Starting LiveKit..."
if docker ps --format '{{.Names}}' | grep -q "^${LIVEKIT_CONTAINER}$"; then
    pass "LiveKit already running"
elif docker ps -a --format '{{.Names}}' | grep -q "^${LIVEKIT_CONTAINER}$"; then
    docker start "$LIVEKIT_CONTAINER" > /dev/null
    pass "LiveKit restarted"
else
    docker compose -f "$(dirname "$0")/docker-compose.livekit.dev.yml" up -d > /dev/null
    pass "LiveKit started"
fi
```

> The `$(dirname "$0")` ensures the path resolves correctly regardless of where `dev.sh` is invoked from. The container name `lively-livekit` matches the `container_name` set in `docker-compose.livekit.dev.yml`.

- [ ] **Step 4: Renumber the migration and service comments**

The existing sections are numbered `# ── 1. Redis`, `# ── 2. Database migrations`, `# ── 3. Backend`, `# ── 4. Frontend`. After inserting LiveKit as section 2, renumber:

- `# ── 2. Database migrations` → `# ── 3. Database migrations`
- `# ── 3. Backend` → `# ── 4. Backend`
- `# ── 4. Frontend` → `# ── 5. Frontend`

- [ ] **Step 5: Test dev.sh runs cleanly**

```bash
./dev.sh
```

Expected:
```
[dev] Starting Redis...
[dev] Redis already running    (or "Redis started")
[dev] Starting LiveKit...
[dev] LiveKit started
[dev] Running database migrations...
...
[dev] All services started:
  Backend  → http://localhost:8000
  Frontend → http://localhost:5173
```

Press Ctrl+C to stop. Verify Redis and LiveKit containers are still running (they're Docker containers, not foreground processes):

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep -E "lively-redis|lively-livekit"
```

Expected: both containers listed as `Up`.

- [ ] **Step 6: Commit**

```bash
git add dev.sh
git commit -m "chore: start LiveKit dev container in dev.sh"
```

---

## Task 8: End-to-end smoke test

No new files — this task validates the full flow works.

- [ ] **Step 1: Start the full stack**

```bash
./dev.sh
```

Wait for all services to report ready.

- [ ] **Step 2: Confirm LiveKit is reachable**

```bash
curl -s http://localhost:7880 | head -5
```

Expected: some HTTP response (LiveKit serves a basic health page on port 7880). A 404 or empty body is also acceptable — the point is the port is open.

- [ ] **Step 3: Create a room and join it via the API**

First get a token (requires the backend to be running with a valid user session). If you have a test user, hit:

```bash
# Replace TOKEN with a valid JWT from your login flow
curl -s -X POST http://localhost:8000/api/v1/calls/rooms/YOUR_ROOM_ID/join \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"
```

Expected: JSON response containing `token`, `livekit_url` (should be `ws://localhost:7880`), `room_id`, `room_name`.

- [ ] **Step 4: Verify the returned livekit_url matches local LiveKit**

The `livekit_url` field in the response must be `ws://localhost:7880` — confirming the backend is reading `LIVEKIT_URL` from `backend/.env` (not the old external service).

- [ ] **Step 5: Stop everything**

```bash
# Ctrl+C in the dev.sh terminal stops backend + frontend
# LiveKit and Redis keep running as Docker containers — that's intentional
docker compose -f docker-compose.livekit.dev.yml down   # if you want to fully stop LiveKit
```

---

## Prod Deployment Checklist (not automated — manual steps)

Before running the prod compose on a server:

1. Copy `.env.livekit.prod.example` to `.env.livekit.prod` on the server
2. Fill in `LIVEKIT_DOMAIN`, `LIVEKIT_API_KEY` (generate a random string), `LIVEKIT_API_SECRET` (generate a random string ≥32 chars)
3. Point your DNS A record for `LIVEKIT_DOMAIN` to the server's public IP
4. Ensure ports 80, 443, 7881/TCP, and 50000-60000/UDP are open in the firewall
5. Start LiveKit: `docker compose -f docker-compose.livekit.prod.yml up -d`
6. Set the backend's prod env: `LIVEKIT_URL=wss://your-domain.com`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` matching the values in `.env.livekit.prod`
7. Verify ACME cert issuance: `docker logs lively-livekit 2>&1 | grep -i "tls\|cert\|acme"`
