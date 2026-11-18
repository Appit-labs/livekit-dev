# Lively — Real-Time Layer Design Spec

**Date:** 2026-04-06
**Status:** Approved
**Scope:** Extend the existing Python/FastAPI backend with WebSocket, LiveKit call integration, presence, file uploads, full-text search, and notifications.

---

## 1. Context

Lively is a workspace collaboration app (channels, DMs, boards, calendar) built on FastAPI + PostgreSQL + React. The media layer (voice/video/screenshare) is handled entirely by a production LiveKit server at `engine.talentinobot.com/livekit`. This spec covers everything else the app needs to become a production-ready real-time platform.

**What is NOT covered here:** LiveKit's SFU, room management internals, WebRTC signaling, audio/video track handling. LiveKit owns all of that.

---

## 2. Stack Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Backend | Python/FastAPI (extend existing) | Preserves working code, migrations, auth |
| WebSocket | FastAPI native WebSocket | No extra dependency, async-first |
| Message bus | Redis pub/sub | Enables multi-instance fan-out |
| Async jobs | ARQ (Async Redis Queue) | Lightweight, async-first, reuses Redis |
| Real-time events | Redis pub/sub (fan-out) + ARQ (async jobs) | Right tool per concern |
| LiveKit SDK | `livekit-api` (PyPI) | Official, async-compatible |
| File storage | Firebase Storage + `firebase-admin` | Already in stack for FCM |
| Search | PostgreSQL tsvector/tsquery | No external service, GIN index |
| Push | FCM via `firebase-admin` | Same SDK as storage |

---

## 3. Final Directory Structure

```
lively/backend/
├── app/
│   ├── api/v1/
│   │   ├── auth/           (existing)
│   │   ├── channels/       (existing)
│   │   ├── dm/             (existing)
│   │   ├── users/          (existing — add device token endpoint)
│   │   ├── workspaces/     (existing)
│   │   ├── calls/          (NEW — LiveKit token + room endpoints + webhook)
│   │   ├── search/         (NEW — full-text search endpoint)
│   │   ├── uploads/        (NEW — Firebase Storage presign + confirm)
│   │   ├── notifications/  (NEW — list, read, read-all)
│   │   └── ws/             (NEW — WebSocket connection handler)
│   ├── core/
│   │   ├── config.py       (extend — add LIVEKIT_*, REDIS_URL, FIREBASE_*)
│   │   ├── security.py     (existing)
│   │   └── exceptions.py   (existing)
│   ├── infra/
│   │   ├── db/             (existing — add tsvector columns + triggers via Alembic)
│   │   ├── redis/          (NEW — client, pub/sub, streams, presence)
│   │   ├── firebase/       (NEW — storage client, FCM client)
│   │   └── external/       (existing — email gateway)
│   ├── services/
│   │   ├── auth_service.py         (existing)
│   │   ├── channel_service.py      (existing)
│   │   ├── dm_service.py           (existing)
│   │   ├── livekit_service.py      (NEW)
│   │   ├── presence_service.py     (NEW)
│   │   ├── notification_service.py (NEW)
│   │   ├── search_service.py       (NEW)
│   │   └── upload_service.py       (NEW)
│   ├── workers/
│   │   ├── arq_settings.py    (NEW — ARQ worker config + job registry)
│   │   ├── email_worker.py    (NEW — async email jobs)
│   │   ├── push_worker.py     (NEW — FCM push jobs)
│   │   └── upload_worker.py   (NEW — post-upload processing)
│   └── main.py              (extend — register new routers + WebSocket)
```

---

## 4. Section 1 — WebSocket + Redis Fan-out

### Overview

Each connected client holds a WebSocket connection to a FastAPI instance. In production, multiple instances run behind a load balancer. Redis pub/sub is the message bus: a publish on any instance fans out to all subscribed instances, which push to their connected clients.

### Connection Lifecycle

```
Client connects → JWT verified → subscribe to Redis channels → receive events
Client sends event → validate → DB write → Redis publish → all instances fan-out
Client disconnects → unsubscribe → delete presence key → publish presence.update
```

### Redis Channel Naming

| Channel | Events carried |
|---|---|
| `workspace:{workspace_id}` | Workspace-level events, presence updates |
| `channel:{channel_id}` | Channel messages, typing indicators |
| `dm:{conversation_id}` | DM messages, typing indicators |
| `user:{user_id}` | Call invites, personal notifications |

### WebSocket Endpoint

```
WS /ws?token=<jwt>
```

JWT is validated on connect. Unauthenticated connections are closed immediately with code 4001.

### Event Envelope

All events — both client→server and server→client — use the same envelope:

```json
{
  "type": "message.new",
  "payload": { ... },
  "ts": 1712345678.123
}
```

### Event Types

| Type | Direction | Description |
|---|---|---|
| `message.new` | S→C | New message in channel or DM |
| `message.edited` | S→C | Message content updated |
| `message.deleted` | S→C | Message soft-deleted |
| `typing.start` | C→S, S→C | User started typing |
| `typing.stop` | C→S, S→C | User stopped typing |
| `presence.update` | S→C | User online/offline status changed |
| `call.invite` | S→C | Incoming call for this user |
| `call.ended` | S→C | Active call finished |
| `call.participant_joined` | S→C | Participant joined the LiveKit room |
| `call.participant_left` | S→C | Participant left the LiveKit room |
| `notification.new` | S→C | In-app notification delivery |

### DB Write Before Publish

Messages are persisted to PostgreSQL before being published to Redis. No phantom messages — if the publish fails, the message is still in the DB and recoverable on reconnect.

### Reconnect + Catchup

On reconnect, the client sends its last seen message `ts`. The server returns missed messages via REST before re-subscribing to Redis channels.

### Multi-tab Behavior

Each browser tab holds a separate WebSocket connection. All connections for the same user subscribe to identical Redis channels and receive identical events — correct for multi-tab sync.

### Multi-tab Presence (connection counter)

A naive DEL on disconnect would mark a user offline even if they have other tabs open. Use a Redis connection counter instead:

```
Key:   connections:{user_id}
Type:  integer (INCR / DECR)
TTL:   none (managed explicitly)
```

| Event | Redis operation | Presence action |
|---|---|---|
| WebSocket connect | INCR connections:{user_id} | If result == 1: SET presence key, publish online |
| WebSocket disconnect | DECR connections:{user_id} | If result == 0: DEL presence key, publish offline |

The presence key is only deleted when the last connection closes. All other logic (heartbeat, TTL) remains the same.

### WebSocket Rate Limiting

Per-connection rate limiting prevents a single user from flooding the server with `message.new` or `typing.start` events. Use a Redis token bucket per connection:

```
Key:   ratelimit:ws:{user_id}
Type:  integer (token count)
TTL:   reset window (e.g. 10 seconds)
```

Limits (enforced in the WebSocket handler before any processing):
- `message.new`: 10 per 10 seconds
- `typing.start`: 20 per 10 seconds
- All other events: 30 per 10 seconds

Exceeding the limit: close the connection with code 4029 (too many requests). Log the violation.

---

## 5. Section 2 — LiveKit Token Generation + Call Flow

### Overview

The backend generates short-lived, scoped LiveKit JWTs. The `/join` page in the React frontend already accepts a token via query string and connects directly to LiveKit — no changes needed to the frontend join flow.

### Room Naming Convention

| Call type | Room name |
|---|---|
| DM call | `dm-{conversation_id}` |
| Channel call | `channel-{channel_id}` |

Deterministic names: two users in the same DM always land in the same room without a registry lookup.

### Call Initiation Flow

```
1. User A clicks Call in DMView
2. POST /api/v1/calls/token { room_name, participant_name }
3. Backend: ensure room exists on LiveKit server
4. Backend: issue scoped JWT (TTL = LIVEKIT_TOKEN_TTL_SECONDS)
5. Backend: publish call.invite to user:{B} Redis channel
6. Backend: return { token, ws_url, room_name }
7. Frontend: navigate to /join?token=...&room=...&wsUrl=...
8. User B receives call.invite via WebSocket
9. User B accepts → same POST /calls/token → navigate to /join
```

### Token Grants

```python
VideoGrants(
    room_join=True,
    room=room_name,
    can_publish=True,
    can_subscribe=True,
    can_publish_data=False,   # False — LiveKit data channels not used; set True only if adding cursor sharing or reactions via LiveKit
    # NOT granted: room_create, room_admin, room_record
)
```

TTL: configurable, default 600 seconds.

### Endpoints

```
POST /api/v1/calls/token
Body:    { room_name: str, participant_name: str }
Returns: { token: str, ws_url: str, room_name: str }

POST /api/v1/calls/webhook
Body:    LiveKit WebhookEvent (raw bytes, HMAC-verified)
Returns: 200 OK (immediately — processing is async via ARQ)
```

**Webhook raw body requirement:** HMAC verification must be performed against the raw request bytes before any JSON parsing. The endpoint must read `await request.body()` first and pass those bytes directly to the LiveKit SDK verifier. If Pydantic or FastAPI's JSON parser processes the body first, the HMAC will fail. The route must use `Request` directly (not a Pydantic body model) and the middleware must not consume the body stream.

### Webhook Events Handled

| Event | Action |
|---|---|
| `room_finished` | Publish `call.ended` to `channel:{id}` or `dm:{id}`, clear call state from Redis |
| `participant_joined` | Publish `call.participant_joined` |
| `participant_left` | Publish `call.participant_left` |

The webhook endpoint responds 200 immediately. Event handling is enqueued as an ARQ background task.

### New Config Keys

```python
LIVEKIT_URL: str                    # wss://engine.talentinobot.com/livekit
LIVEKIT_HTTP_URL: str               # https://engine.talentinobot.com/livekit
LIVEKIT_API_KEY: str
LIVEKIT_API_SECRET: str
LIVEKIT_TOKEN_TTL_SECONDS: int = 600
```

---

## 6. Section 3 — Presence & Typing Indicators

### Overview

Both are Redis-only. No DB writes. No migrations. Presence state is maintained via heartbeat-refreshed TTL keys. Typing state is maintained via short TTL keys that expire naturally.

### Presence

```
Key:   presence:{user_id}
Value: {"status": "online", "last_seen": <unix_ts>}
TTL:   PRESENCE_TTL_SECONDS (default: 60)
```

| Event | Redis operation | Side effect |
|---|---|---|
| WebSocket connect | SET key, TTL=60 | Publish `presence.update` → `workspace:{id}` |
| Client heartbeat (every 30s) | EXPIRE key, TTL=60 | No publish (no state change) |
| WebSocket disconnect | DEL key | Publish `presence.update` → `workspace:{id}` |
| TTL expires (ungraceful disconnect) | Redis auto-deletes | No publish — client sees offline on next presence check |

Bulk presence on page load: `MGET presence:{id1} presence:{id2} ...` — one round-trip for all workspace members.

### Typing Indicators

```
Key:   typing:{channel_or_dm_id}:{user_id}
Value: 1
TTL:   TYPING_TTL_SECONDS (default: 5)
```

| Client action | Server action |
|---|---|
| User starts typing | SET key TTL=5, publish `typing.start` |
| User keeps typing (every 3s) | Reset TTL=5 (no publish if already active) |
| User stops / sends message | DEL key, publish `typing.stop` |
| TTL expires | Redis auto-deletes — no server action needed |

Frontend rule: debounce — fire `typing.start` once on keystroke, re-fire every 3 seconds while active. Stop on send or blur.

### New Config Keys

```python
REDIS_URL: str = "redis://localhost:6379"
PRESENCE_TTL_SECONDS: int = 60
TYPING_TTL_SECONDS: int = 5
```

---

## 7. Section 4 — File Uploads via Firebase Storage

### Overview

Files are uploaded directly from the client to Firebase Storage using a presigned URL issued by the backend. The backend never proxies file bytes — it only validates, issues URLs, and stores metadata.

### Upload Flow

```
1. POST /api/v1/uploads/presign { filename, content_type, size_bytes }
2. Backend validates type and size
3. Backend generates signed upload URL (TTL: 15 min)
4. Backend creates file_attachments row (status: pending)
5. Backend returns { upload_url, file_id, download_url }
6. Client PUTs file directly to Firebase Storage
7. POST /api/v1/uploads/confirm { file_id, message_context }
8. Backend marks file_attachments row as confirmed
9. Backend enqueues ARQ post-upload job
10. Backend publishes message.new with attachment
```

### Storage Path Convention

```
workspaces/{workspace_id}/channels/{channel_id}/{uuid}.{ext}
workspaces/{workspace_id}/dm/{conversation_id}/{uuid}.{ext}
users/{user_id}/avatars/{uuid}.{ext}
```

### Validation Rules

| Rule | Value |
|---|---|
| Max size | 25 MB (matches existing MAX_UPLOAD_SIZE_MB) |
| Allowed MIME types | image/*, video/*, audio/*, application/pdf, application/zip, common Office types |
| Signed URL TTL | 15 minutes |
| Bucket access model | Private bucket — signed download URLs (see note below) |

### New Tables

**`file_attachments`**
```
id              UUID  PK
workspace_id    UUID  FK
uploaded_by     UUID  FK → users
filename        TEXT
content_type    TEXT
size_bytes      INT
storage_path    TEXT
download_url    TEXT
status          TEXT  (pending | confirmed | failed)
created_at      TIMESTAMPTZ
```

Two separate join tables — no polymorphic FK (PostgreSQL cannot enforce a FK pointing at two different tables; a shared `message_id` column would produce ghost rows on delete with no cascade):

**`channel_message_attachments`**
```
message_id      UUID  FK → channel_messages.id  ON DELETE CASCADE
attachment_id   UUID  FK → file_attachments.id  ON DELETE CASCADE
PRIMARY KEY (message_id, attachment_id)
```

**`dm_message_attachments`**
```
message_id      UUID  FK → direct_messages.id   ON DELETE CASCADE
attachment_id   UUID  FK → file_attachments.id  ON DELETE CASCADE
PRIMARY KEY (message_id, attachment_id)
```

### ARQ Post-Upload Job

After confirm, enqueue:
1. MIME type re-validation against actual file bytes (`python-magic`)
2. Image thumbnail generation (Pillow) — stored alongside original
3. Metadata extraction (dimensions for images, duration for video)

### Firebase Download URL Model

The storage bucket is **private**. Firebase signed download URLs expire (default 7 days). The `download_url` stored in `file_attachments` is a signed URL — it must be refreshed before expiry. Two options:

- **Generate fresh signed URL on every read** — add a `GET /api/v1/uploads/{file_id}/url` endpoint that returns a short-lived signed URL (15 min). The frontend never stores the URL long-term.
- **Store permanent URL** — make the bucket public. Simple but exposes all files to anyone with the URL (no auth check).

**Chosen approach: generate on read.** The `download_url` column stores the storage path only, not a pre-signed URL. The API generates a signed URL at read time scoped to the requesting user's session. This is the safer default for a workspace app with access controls.

### New Config Keys

```python
FIREBASE_PROJECT_ID: str
FIREBASE_STORAGE_BUCKET: str          # e.g. talentino-live.appspot.com
FIREBASE_SERVICE_ACCOUNT_KEY: str     # inline JSON string (not a file path)
                                      # set as: FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
                                      # inline JSON is safer for containerized deployments — no file mounts needed
```

---

## 8. Section 5 — Full-text Search (PostgreSQL tsvector)

### Overview

Search is implemented using PostgreSQL native full-text search. No external search engine. Results are scoped by workspace membership and channel/DM access — users cannot see results from workspaces or channels they don't belong to.

### Schema Changes (Alembic migration)

Add `search_vector` tsvector column, GIN index, and trigger to both message tables:

```sql
-- Columns
ALTER TABLE channel_messages ADD COLUMN search_vector tsvector;
ALTER TABLE direct_messages  ADD COLUMN search_vector tsvector;

-- GIN indexes
CREATE INDEX channel_messages_search_idx ON channel_messages USING GIN(search_vector);
CREATE INDEX direct_messages_search_idx  ON direct_messages  USING GIN(search_vector);

-- Shared trigger function
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
CREATE TRIGGER channel_messages_search_trigger
  BEFORE INSERT OR UPDATE ON channel_messages
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

CREATE TRIGGER direct_messages_search_trigger
  BEFORE INSERT OR UPDATE ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();
```

Existing rows: one-time ARQ backfill job populates `search_vector` in batches to avoid table locks. A single `UPDATE ... SET content = content` on a large table takes a full sequential scan with row-level locks for the entire transaction. Instead, paginate by `id` and update in chunks:

```sql
-- Repeated until no rows remain
UPDATE channel_messages
SET content = content
WHERE id IN (
  SELECT id FROM channel_messages
  WHERE search_vector IS NULL
  ORDER BY id
  LIMIT 2000
);
-- Sleep 100ms between batches in the ARQ job
```

Each batch is its own transaction. The sleep between batches keeps the table available for live traffic during backfill.

### Endpoint

```
GET /api/v1/search?q=...&workspace_id=...&type=channels|dm|all&limit=20&cursor=...
Authorization: Bearer <jwt>
```

**Response:**
```json
{
  "results": [
    {
      "id": "...",
      "type": "channel_message",
      "channel_id": "...",
      "channel_name": "general",
      "sender": { "id": "...", "name": "Ibrahim" },
      "snippet": "...the <b>budget report</b> needs review by...",
      "created_at": "2026-04-05T10:23:00Z",
      "rank": 0.82
    }
  ],
  "total": 47,
  "next_cursor": "..."
}
```

### Query Design

| Decision | Choice |
|---|---|
| Language config | `'english'` — stemming (run/running/ran all match) |
| Query function | `plainto_tsquery` — safe for raw user input |
| Highlighting | `ts_headline` built-in — no post-processing |
| Pagination | Cursor-based by `(created_at, id)` — stable under inserts |
| Permission scope | Always filter by workspace + channel_members / dm_participants |

---

## 9. Section 6 — Notifications (Push, Email, In-app)

### Routing Rule

```
Event occurs
    │
    ├── User is ONLINE (presence:{user_id} exists in Redis)?
    │       YES → attempt WebSocket delivery
    │               │
    │               ├── send succeeds → done
    │               └── send fails (dead connection) → fall through to OFFLINE path
    │
    └── User is OFFLINE (or send failed)?
            ├── Store in DB (in-app notification)
            ├── Enqueue ARQ push job (FCM)
            └── Enqueue ARQ email job (if high-value event)
```

**Presence race condition:** The `presence:{user_id}` TTL key may still exist after a client disconnects (up to 60s until expiry). If a WebSocket push is attempted to a dead connection, the send will raise an exception. The WebSocket handler must catch this, mark the connection closed, and fall through to the offline path (enqueue FCM). Do not rely solely on the presence key to confirm reachability.

DND check in ARQ workers: if current time falls within `dnd_start`–`dnd_end` window, skip push and email, store in DB only.

### In-app Notifications

**New table: `notifications`**
```
id              UUID  PK
user_id         UUID  FK → users
workspace_id    UUID  FK
type            TEXT  (mention | dm | call_invite | call_missed | system)
title           TEXT
body            TEXT
data            JSONB  (entity_id, entity_type, deep_link)
read_at         TIMESTAMPTZ  nullable
created_at      TIMESTAMPTZ
```

**Endpoints:**
```
GET  /api/v1/notifications?unread=true&limit=20&cursor=...
POST /api/v1/notifications/{id}/read
POST /api/v1/notifications/read-all
```

On WebSocket connect, server pushes any unread notifications accumulated while offline.

### Push Notifications (FCM)

Uses `firebase-admin` — same SDK as Storage, no new dependency.

**Device registration:**
```
POST /api/v1/users/me/devices
{ "fcm_token": "...", "platform": "web|ios|android" }
```

**New table: `user_devices`**
```
id          UUID  PK
user_id     UUID  FK
fcm_token   TEXT  UNIQUE
platform    TEXT
created_at  TIMESTAMPTZ
```

**ARQ push worker:**
1. Fetch all FCM tokens for user
2. Send `MulticastMessage`
3. On `InvalidRegistration` error → delete stale token from DB

**Push triggers:**

| Event | Push? |
|---|---|
| DM received (user offline) | Yes |
| @mention (user offline) | Yes |
| Call invite | Yes (high priority) |
| Channel message, no mention | No |
| Missed call | Yes |

### Email Notifications

Reuses existing `email_gateway.py`. Delivered via ARQ `email_worker.py`.

**Email triggers:**

| Event | Email? | Delay |
|---|---|---|
| Missed call | Yes | Immediate |
| DM while offline | Yes | 5 min digest delay |
| @mention while offline | Yes | 5 min delay |
| Channel message (no mention) | No | — |

5-minute delay jobs are suppressed — not cancelled. ARQ does not support clean cancellation of already-enqueued jobs. Instead, when a user reconnects via WebSocket, write a suppression flag to Redis:

```
Key:   suppress_email:{user_id}:{event_type}
Value: 1
TTL:   600 seconds (longer than the digest delay)
```

The ARQ email worker checks for this flag as its first step. If found, it no-ops and returns without sending. The flag expires automatically — no cleanup needed.

### Notification Preferences

Extend user settings with:
```
push_enabled          BOOL  default true
email_enabled         BOOL  default true
muted_channels        UUID[]
muted_workspaces      UUID[]
dnd_start             TIME  nullable
dnd_end               TIME  nullable
```

---

## 10. New Environment Variables (complete list)

```env
# Redis
REDIS_URL=redis://localhost:6379
PRESENCE_TTL_SECONDS=60
TYPING_TTL_SECONDS=5

# LiveKit
LIVEKIT_URL=wss://engine.talentinobot.com/livekit
LIVEKIT_HTTP_URL=https://engine.talentinobot.com/livekit
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_TOKEN_TTL_SECONDS=600

# Firebase (Storage + FCM)
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_SERVICE_ACCOUNT_KEY=
```

---

## 11. New Python Dependencies

```toml
# pyproject.toml additions
livekit-api          = ">=0.7"     # LiveKit token + room management
redis[hiredis]       = ">=5.0"     # Redis client (hiredis for speed)
arq                  = ">=0.25"    # Async job queue
firebase-admin       = ">=6.0"     # FCM push + Firebase Storage
python-magic         = ">=0.4"     # MIME validation by file bytes
Pillow               = ">=10.0"    # Image thumbnail generation
```

---

## 12. Implementation Order

Build in this sequence — each phase is independently deployable:

1. **Redis infra + WebSocket** — `infra/redis/`, `api/v1/ws/`, extend `main.py`
2. **Presence + typing** — `services/presence_service.py`, integrate with WebSocket handler
3. **LiveKit tokens + calls** — `services/livekit_service.py`, `api/v1/calls/`, wire DMView buttons
4. **ARQ workers** — `workers/`, email + push jobs
5. **File uploads** — `infra/firebase/`, `api/v1/uploads/`, `services/upload_service.py`
6. **Notifications** — `services/notification_service.py`, `api/v1/notifications/`, DB table
7. **Search** — Alembic migration, `services/search_service.py`, `api/v1/search/`
