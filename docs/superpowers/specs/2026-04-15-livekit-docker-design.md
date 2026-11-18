# LiveKit Docker Compose Integration

**Date:** 2026-04-15
**Status:** Approved — revised 2026-04-15 (Caddy sidecar for prod TLS)

## Context

The Lively app already has a full LiveKit integration: the backend (`call_service.py`) manually mints LiveKit JWTs and exposes call room APIs; the frontend uses `@livekit/components-react` and `livekit-client`. The backend reads `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` from `Settings` (pydantic-settings). Currently no LiveKit server is running locally — the app falls back to code defaults (`ws://localhost:7880`, `devkey`, `secret`).

**Goal:** Add self-hosted LiveKit via Docker Compose for both local development and production, replacing the external talenitno-live connection. No backend or frontend code changes are needed — only infrastructure files and `.env` entries.

---

## Approach

Two separate, self-contained Docker Compose files (Option A). Dev and prod differ fundamentally:
- Dev: plain WebSocket, hardcoded devkey/secret, no TLS
- Prod: Caddy sidecar handles ACME/Let's Encrypt TLS and reverse-proxies to LiveKit internally; secrets from `.env.livekit.prod`

> **Design revision:** LiveKit server does not implement ACME natively. A Caddy sidecar is the standard LiveKit production pattern — it auto-obtains Let's Encrypt certs and reverse-proxies WebSocket traffic to LiveKit on its plain internal port.

Shared logic would create awkward conditional config; separate files are explicit and independently auditable.

---

## File Structure

```
lively/
├── livekit/
│   ├── config.dev.yaml           # LiveKit config — plain WS, no TLS
│   ├── config.prod.yaml          # LiveKit config — plain HTTP internally, Caddy handles TLS
│   └── Caddyfile                 # Caddy reverse-proxy config — ACME TLS → LiveKit
├── docker-compose.livekit.dev.yml
├── docker-compose.livekit.prod.yml  # LiveKit + Caddy sidecar
├── .env.livekit.prod             # gitignored — real domain, API key, API secret
├── .env.livekit.prod.example     # committed — placeholder template with comments
└── dev.sh                        # updated to start/stop LiveKit alongside Redis
```

---

## Ports & Networking

### Dev
| Port | Protocol | Purpose |
|------|----------|---------|
| 7880 | TCP | WebSocket — app connects via `ws://localhost:7880` |
| 7881 | TCP | TURN over TCP (fallback for restricted networks) |
| 50000–60000 | UDP | WebRTC media traffic |

### Prod
| Port | Protocol | Service | Purpose |
|------|----------|---------|---------|
| 443 | TCP | Caddy | WSS + HTTPS — app connects via `wss://your-domain.com` |
| 80 | TCP | Caddy | ACME HTTP-01 challenge (Let's Encrypt cert issuance) |
| 7881 | TCP | LiveKit | TURN over TCP (direct, not proxied) |
| 50000–60000 | UDP | LiveKit | WebRTC media traffic (direct, not proxied) |

Caddy and LiveKit communicate over a shared internal Docker network (`livekit-net`). Clients reach LiveKit signaling via Caddy (`wss://domain.com`); WebRTC media goes directly to the host ports.

---

## LiveKit Config Files

### `livekit/config.dev.yaml`
Hardcoded dev values, no TLS:
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

### `livekit/config.prod.yaml`
Plain HTTP internally (Caddy handles TLS). Secrets injected via `${VAR}` substitution (LiveKit supports this natively — keys quoted to prevent YAML parse issues):
```yaml
# Production config — LiveKit listens on plain HTTP internally.
# TLS is handled by the Caddy sidecar. See docker-compose.livekit.prod.yml.
# Requires LIVEKIT_API_KEY and LIVEKIT_API_SECRET in the environment.
port: 7880
bind_addresses:
  - ""  # empty string = bind to all interfaces (0.0.0.0)
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
keys:
  "${LIVEKIT_API_KEY}": "${LIVEKIT_API_SECRET}"
logging:
  level: info
```

### `livekit/Caddyfile`
Caddy auto-obtains Let's Encrypt cert for `LIVEKIT_DOMAIN` and reverse-proxies all traffic (including WebSocket upgrades) to LiveKit:
```
{$LIVEKIT_DOMAIN} {
    reverse_proxy livekit:7880
}
```

---

## Docker Compose Files

### `docker-compose.livekit.dev.yml`
- Image: `livekit/livekit-server:latest`
- Mounts `./livekit/config.dev.yaml` into container
- Exposes dev ports above
- No volumes (ephemeral data)
- Network: host or bridge with explicit port mapping

### `docker-compose.livekit.prod.yml`
Two services on a shared `livekit-net` Docker network:

**LiveKit service:**
- Image: `livekit/livekit-server:latest`
- Mounts `./livekit/config.prod.yaml` read-only
- `env_file: .env.livekit.prod` (provides `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`)
- Exposes only 7881/tcp and 50000-60000/udp (Caddy handles 80/443)
- `restart: unless-stopped`

**Caddy service:**
- Image: `caddy:latest`
- Mounts `./livekit/Caddyfile` read-only
- Named volumes `caddy-data` and `caddy-config` for cert persistence
- Exposes 80 (ACME challenge) and 443 (WSS/HTTPS)
- `env_file: .env.livekit.prod` (provides `LIVEKIT_DOMAIN` for Caddyfile `{$LIVEKIT_DOMAIN}` substitution)
- `restart: unless-stopped`

---

## Secret Files

### `.env.livekit.prod` (gitignored)
```
LIVEKIT_DOMAIN=livekit.yourdomain.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### `.env.livekit.prod.example` (committed)
```
# The public domain for this server (e.g. livekit.example.com — no scheme, no trailing slash)
LIVEKIT_DOMAIN=

# API key — generate with: docker run --rm livekit/livekit-server generate-keys
LIVEKIT_API_KEY=

# API secret — must match the key above (minimum 32 characters)
LIVEKIT_API_SECRET=
```

---

## App Wiring

### Dev (`backend/.env`)
Add these three lines (already accepted by `Settings` in `config.py`, no code change):
```
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

### Prod
Backend's env (however it's managed in prod) needs:
```
LIVEKIT_URL=wss://livekit.yourdomain.com
LIVEKIT_API_KEY=<same key as in .env.livekit.prod>
LIVEKIT_API_SECRET=<same secret as in .env.livekit.prod>
```

---

## dev.sh Update

Add a LiveKit block after the Redis block, using the same pattern (check if running → restart → create):

```bash
LIVEKIT_CONTAINER=lively-livekit

service "Starting LiveKit..."
if docker ps --format '{{.Names}}' | grep -q "^${LIVEKIT_CONTAINER}$"; then
    pass "LiveKit already running"
elif docker ps -a --format '{{.Names}}' | grep -q "^${LIVEKIT_CONTAINER}$"; then
    docker start "$LIVEKIT_CONTAINER" > /dev/null
    pass "LiveKit restarted"
else
    docker compose -f docker-compose.livekit.dev.yml up -d
    pass "LiveKit started"
fi
```

---

## .gitignore

Add `.env.livekit.prod` to `.gitignore` (or root `.gitignore` if one exists).

---

## Usage

```bash
# Dev — start everything (Redis + LiveKit + backend + frontend)
./dev.sh

# Dev — LiveKit only
docker compose -f docker-compose.livekit.dev.yml up

# Prod — LiveKit only
docker compose -f docker-compose.livekit.prod.yml up -d
```
