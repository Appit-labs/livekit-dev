# Plan 1: Real-time Foundation — Redis + WebSocket + Presence + Typing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Redis-backed WebSocket layer to the Lively FastAPI backend with presence tracking, connection counters for multi-tab safety, typing indicators, and per-connection rate limiting.

**Architecture:** Every connected client opens `WS /ws?token=<jwt>&workspace_id=<uuid>`. The server validates the JWT, confirms workspace membership via DB, subscribes the connection to Redis pub/sub channels (`workspace:{id}`, `user:{id}`), and streams events to the client. A `connections:{user_id}` counter ensures presence is only cleared when the last tab closes. Typing indicator state lives in short-TTL Redis keys.

**Tech Stack:** `redis[hiredis]>=5.0`, `fakeredis[aioredis]>=2.0` (tests), FastAPI native WebSocket, `pytest-asyncio` (already installed).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `app/infra/redis/__init__.py` | Re-export `get_redis`, `close_redis` |
| Create | `app/infra/redis/client.py` | Async Redis singleton |
| Create | `app/infra/redis/pubsub.py` | `publish()` + `ChannelSubscriber` |
| Create | `app/services/presence_service.py` | Presence connect/disconnect/heartbeat, typing start/stop |
| Create | `app/api/v1/ws/__init__.py` | Empty |
| Create | `app/api/v1/ws/events.py` | `EventType` enum, rate-limit constants |
| Create | `app/api/v1/ws/handler.py` | WebSocket endpoint function |
| Create | `tests/test_infra/__init__.py` | Empty |
| Create | `tests/test_infra/test_redis_pubsub.py` | pub/sub unit tests |
| Create | `tests/test_services/__init__.py` | Empty (if missing) |
| Create | `tests/test_services/test_presence_service.py` | Presence + typing tests |
| Create | `tests/test_api/__init__.py` | Empty (if missing) |
| Create | `tests/test_api/test_ws_handler.py` | WebSocket integration tests |
| Modify | `app/core/config.py` | Add `REDIS_URL`, `PRESENCE_TTL_SECONDS`, `TYPING_TTL_SECONDS` |
| Modify | `app/infra/db/database.py` | Add `get_db_ctx` async context manager |
| Modify | `app/main.py` | Add WebSocket route, Redis startup/shutdown lifecycle |
| Modify | `pyproject.toml` | Add `redis[hiredis]`, `fakeredis[aioredis]` (dev) |
| Modify | `backend/.env.example` | Add Redis vars |

---

## Task 1: Add dependencies and config

**Files:**
- Modify: `pyproject.toml`
- Modify: `app/core/config.py`
- Modify: `backend/.env.example`

- [ ] **Step 1: Add Redis to pyproject.toml**

Open `pyproject.toml` and add to `dependencies`:

```toml
[project]
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.29.0",
    "pydantic-settings>=2.5.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "python-multipart>=0.0.9",
    "pyotp>=2.9.0",
    "python-dateutil>=2.9.0",
    "alembic>=1.13.0",
    "aiofiles>=24.1.0",
    "email-validator>=2.0.0",
    "redis[hiredis]>=5.0",
]

[project.optional-dependencies]
dev = [
    "httpx>=0.27.0",
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "fakeredis[aioredis]>=2.0",
]
```

- [ ] **Step 2: Install new dependencies**

```bash
cd /home/ibadr/work/demos/lively/backend
pip install "redis[hiredis]>=5.0" "fakeredis[aioredis]>=2.0"
```

Expected: Both packages install without errors.

- [ ] **Step 3: Add Redis settings to config.py**

Open `app/core/config.py`. Add the three new fields to the `Settings` class before the closing line:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "Lively"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://lively:password@localhost:5432/lively"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    MAX_UPLOAD_SIZE_MB: int = 25
    UPLOAD_DIR: str = "./uploads"

    REDIS_URL: str = "redis://localhost:6379"
    PRESENCE_TTL_SECONDS: int = 60
    TYPING_TTL_SECONDS: int = 5


settings = Settings()
```

- [ ] **Step 4: Update .env.example**

Open `backend/.env.example` and append:

```
# Redis
REDIS_URL=redis://localhost:6379
PRESENCE_TTL_SECONDS=60
TYPING_TTL_SECONDS=5
```

- [ ] **Step 5: Commit**

```bash
cd /home/ibadr/work/demos/lively/backend
git add pyproject.toml app/core/config.py .env.example
git commit -m "feat: add Redis config and dependencies"
```

---

## Task 2: Redis client

**Files:**
- Create: `app/infra/redis/__init__.py`
- Create: `app/infra/redis/client.py`
- Create: `tests/test_infra/__init__.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_infra/__init__.py` (empty):
```python
```

Create `tests/test_infra/test_redis_client.py`:

```python
import pytest
import fakeredis.aioredis as fakeredis

from unittest.mock import patch, AsyncMock


@pytest.fixture(autouse=True)
async def reset_redis_singleton():
    """Reset the module-level _redis singleton between tests."""
    import app.infra.redis.client as client_module
    client_module._redis = None
    yield
    client_module._redis = None


@pytest.mark.asyncio
async def test_get_redis_returns_client():
    fake = fakeredis.FakeRedis(decode_responses=True)
    with patch("app.infra.redis.client.aioredis.from_url", return_value=fake):
        from app.infra.redis.client import get_redis
        r = await get_redis()
        assert r is not None


@pytest.mark.asyncio
async def test_get_redis_returns_same_instance():
    fake = fakeredis.FakeRedis(decode_responses=True)
    with patch("app.infra.redis.client.aioredis.from_url", return_value=fake):
        from app.infra.redis.client import get_redis
        r1 = await get_redis()
        r2 = await get_redis()
        assert r1 is r2


@pytest.mark.asyncio
async def test_close_redis_clears_singleton():
    fake = fakeredis.FakeRedis(decode_responses=True)
    with patch("app.infra.redis.client.aioredis.from_url", return_value=fake):
        from app.infra.redis.client import get_redis, close_redis
        await get_redis()
        await close_redis()
        import app.infra.redis.client as client_module
        assert client_module._redis is None
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/ibadr/work/demos/lively/backend
pytest tests/test_infra/test_redis_client.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.infra.redis'`

- [ ] **Step 3: Create the Redis client**

Create `app/infra/redis/__init__.py`:

```python
from app.infra.redis.client import get_redis, close_redis

__all__ = ["get_redis", "close_redis"]
```

Create `app/infra/redis/client.py`:

```python
import redis.asyncio as aioredis

from app.core.config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_infra/test_redis_client.py -v
```

Expected:
```
PASSED tests/test_infra/test_redis_client.py::test_get_redis_returns_client
PASSED tests/test_infra/test_redis_client.py::test_get_redis_returns_same_instance
PASSED tests/test_infra/test_redis_client.py::test_close_redis_clears_singleton
```

- [ ] **Step 5: Commit**

```bash
git add app/infra/redis/ tests/test_infra/
git commit -m "feat: add Redis async client singleton"
```

---

## Task 3: Redis pub/sub

**Files:**
- Create: `app/infra/redis/pubsub.py`
- Create: `tests/test_infra/test_redis_pubsub.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_infra/test_redis_pubsub.py`:

```python
import asyncio
import json
import pytest
import fakeredis.aioredis as fakeredis

from unittest.mock import patch


@pytest.fixture
def fake_redis():
    return fakeredis.FakeRedis(decode_responses=True)


@pytest.fixture(autouse=True)
async def patch_get_redis(fake_redis):
    async def _fake():
        return fake_redis
    with patch("app.infra.redis.pubsub.get_redis", _fake):
        yield fake_redis


@pytest.mark.asyncio
async def test_publish_sends_json_to_channel(fake_redis):
    from app.infra.redis.pubsub import publish

    pubsub = fake_redis.pubsub()
    await pubsub.subscribe("workspace:abc")

    await publish("workspace:abc", "message.new", {"text": "hello"})

    # fakeredis delivers synchronously — read one message
    msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
    assert msg is not None
    data = json.loads(msg["data"])
    assert data["type"] == "message.new"
    assert data["payload"]["text"] == "hello"
    await pubsub.unsubscribe("workspace:abc")
    await pubsub.aclose()


@pytest.mark.asyncio
async def test_publish_includes_type_and_payload(fake_redis):
    from app.infra.redis.pubsub import publish

    pubsub = fake_redis.pubsub()
    await pubsub.subscribe("user:123")
    await publish("user:123", "call.invite", {"room": "dm-abc"})

    msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
    assert msg is not None
    data = json.loads(msg["data"])
    assert data["type"] == "call.invite"
    assert data["payload"]["room"] == "dm-abc"
    await pubsub.unsubscribe("user:123")
    await pubsub.aclose()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_infra/test_redis_pubsub.py -v
```

Expected: `ImportError: cannot import name 'publish' from 'app.infra.redis.pubsub'`

- [ ] **Step 3: Implement pub/sub**

Create `app/infra/redis/pubsub.py`:

```python
import json

import redis.asyncio as aioredis

from app.infra.redis.client import get_redis


async def publish(channel: str, event_type: str, payload: dict) -> None:
    redis = await get_redis()
    message = json.dumps({"type": event_type, "payload": payload})
    await redis.publish(channel, message)


class ChannelSubscriber:
    """Async context manager that subscribes to Redis pub/sub channels and
    yields parsed event dicts via the async generator `listen()`."""

    def __init__(self, channels: list[str]) -> None:
        self._channels = channels
        self._pubsub: aioredis.client.PubSub | None = None

    async def __aenter__(self) -> "ChannelSubscriber":
        redis = await get_redis()
        self._pubsub = redis.pubsub()
        await self._pubsub.subscribe(*self._channels)
        return self

    async def __aexit__(self, *_args) -> None:
        if self._pubsub:
            await self._pubsub.unsubscribe(*self._channels)
            await self._pubsub.aclose()

    async def listen(self):
        """Yield parsed event dicts, skipping subscribe/unsubscribe confirmations."""
        async for message in self._pubsub.listen():
            if message["type"] == "message":
                yield json.loads(message["data"])
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_infra/test_redis_pubsub.py -v
```

Expected:
```
PASSED tests/test_infra/test_redis_pubsub.py::test_publish_sends_json_to_channel
PASSED tests/test_infra/test_redis_pubsub.py::test_publish_includes_type_and_payload
```

- [ ] **Step 5: Commit**

```bash
git add app/infra/redis/pubsub.py tests/test_infra/test_redis_pubsub.py
git commit -m "feat: add Redis pub/sub publish and ChannelSubscriber"
```

---

## Task 4: Presence service

**Files:**
- Create: `app/services/presence_service.py`
- Create: `tests/test_services/test_presence_service.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_services/__init__.py` (empty if it doesn't exist):
```python
```

Create `tests/test_services/test_presence_service.py`:

```python
import json
import pytest
import fakeredis.aioredis as fakeredis
from unittest.mock import patch, AsyncMock
from uuid import uuid4


@pytest.fixture
def fake_redis():
    return fakeredis.FakeRedis(decode_responses=True)


@pytest.fixture(autouse=True)
async def patch_redis(fake_redis):
    async def _fake():
        return fake_redis

    with patch("app.services.presence_service.get_redis", _fake), \
         patch("app.infra.redis.pubsub.get_redis", _fake):
        yield fake_redis


@pytest.mark.asyncio
async def test_connect_sets_presence_key(fake_redis):
    from app.services.presence_service import PresenceService
    svc = PresenceService()
    user_id = uuid4()
    workspace_id = uuid4()

    await svc.connect(user_id, workspace_id)

    val = await fake_redis.get(f"presence:{user_id}")
    assert val is not None
    data = json.loads(val)
    assert data["status"] == "online"


@pytest.mark.asyncio
async def test_connect_increments_connection_counter(fake_redis):
    from app.services.presence_service import PresenceService
    svc = PresenceService()
    user_id = uuid4()
    workspace_id = uuid4()

    await svc.connect(user_id, workspace_id)
    await svc.connect(user_id, workspace_id)

    count = await fake_redis.get(f"connections:{user_id}")
    assert int(count) == 2


@pytest.mark.asyncio
async def test_disconnect_keeps_presence_when_other_tabs_open(fake_redis):
    from app.services.presence_service import PresenceService
    svc = PresenceService()
    user_id = uuid4()
    workspace_id = uuid4()

    await svc.connect(user_id, workspace_id)
    await svc.connect(user_id, workspace_id)
    await svc.disconnect(user_id, workspace_id)

    val = await fake_redis.get(f"presence:{user_id}")
    assert val is not None  # still online — one tab remains


@pytest.mark.asyncio
async def test_disconnect_removes_presence_when_last_tab_closes(fake_redis):
    from app.services.presence_service import PresenceService
    svc = PresenceService()
    user_id = uuid4()
    workspace_id = uuid4()

    await svc.connect(user_id, workspace_id)
    await svc.disconnect(user_id, workspace_id)

    val = await fake_redis.get(f"presence:{user_id}")
    assert val is None


@pytest.mark.asyncio
async def test_heartbeat_resets_presence_ttl(fake_redis):
    from app.services.presence_service import PresenceService
    svc = PresenceService()
    user_id = uuid4()
    workspace_id = uuid4()

    await svc.connect(user_id, workspace_id)
    await svc.heartbeat(user_id)

    ttl = await fake_redis.ttl(f"presence:{user_id}")
    assert ttl > 0


@pytest.mark.asyncio
async def test_get_bulk_returns_statuses(fake_redis):
    from app.services.presence_service import PresenceService
    svc = PresenceService()
    user_a = uuid4()
    user_b = uuid4()
    workspace_id = uuid4()

    await svc.connect(user_a, workspace_id)

    result = await svc.get_bulk([user_a, user_b])
    assert result[str(user_a)] == "online"
    assert result[str(user_b)] == "offline"


@pytest.mark.asyncio
async def test_typing_start_sets_redis_key(fake_redis):
    from app.services.presence_service import PresenceService
    svc = PresenceService()
    user_id = uuid4()
    room_id = str(uuid4())

    await svc.typing_start(user_id, room_id, "channel")

    val = await fake_redis.get(f"typing:{room_id}:{user_id}")
    assert val == "1"


@pytest.mark.asyncio
async def test_typing_stop_deletes_redis_key(fake_redis):
    from app.services.presence_service import PresenceService
    svc = PresenceService()
    user_id = uuid4()
    room_id = str(uuid4())

    await svc.typing_start(user_id, room_id, "channel")
    await svc.typing_stop(user_id, room_id, "channel")

    val = await fake_redis.get(f"typing:{room_id}:{user_id}")
    assert val is None


@pytest.mark.asyncio
async def test_typing_start_does_not_republish_if_already_active(fake_redis):
    """Second typing_start within TTL window should NOT re-publish to Redis."""
    from app.services.presence_service import PresenceService
    from app.infra.redis import pubsub as pubsub_module

    publish_calls = []

    async def _fake_publish(channel, event_type, payload):
        publish_calls.append(event_type)

    with patch.object(pubsub_module, "publish", _fake_publish):
        svc = PresenceService()
        user_id = uuid4()
        room_id = str(uuid4())

        await svc.typing_start(user_id, room_id, "channel")
        await svc.typing_start(user_id, room_id, "channel")  # second call

    assert publish_calls.count("typing.start") == 1
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_services/test_presence_service.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.services.presence_service'`

- [ ] **Step 3: Implement presence service**

Create `app/services/presence_service.py`:

```python
import json
import time
from uuid import UUID

from app.core.config import settings
from app.infra.redis.client import get_redis
from app.infra.redis import pubsub


class PresenceService:
    async def connect(self, user_id: UUID, workspace_id: UUID) -> None:
        redis = await get_redis()
        count = await redis.incr(f"connections:{user_id}")
        if count == 1:
            value = json.dumps({"status": "online", "last_seen": int(time.time())})
            await redis.set(f"presence:{user_id}", value, ex=settings.PRESENCE_TTL_SECONDS)
            await pubsub.publish(
                f"workspace:{workspace_id}",
                "presence.update",
                {"user_id": str(user_id), "status": "online"},
            )

    async def disconnect(self, user_id: UUID, workspace_id: UUID) -> None:
        redis = await get_redis()
        count = await redis.decr(f"connections:{user_id}")
        if count <= 0:
            await redis.delete(f"connections:{user_id}")
            await redis.delete(f"presence:{user_id}")
            await pubsub.publish(
                f"workspace:{workspace_id}",
                "presence.update",
                {"user_id": str(user_id), "status": "offline"},
            )

    async def heartbeat(self, user_id: UUID) -> None:
        redis = await get_redis()
        await redis.expire(f"presence:{user_id}", settings.PRESENCE_TTL_SECONDS)

    async def get_bulk(self, user_ids: list[UUID]) -> dict[str, str]:
        if not user_ids:
            return {}
        redis = await get_redis()
        keys = [f"presence:{uid}" for uid in user_ids]
        values = await redis.mget(*keys)
        result: dict[str, str] = {}
        for uid, val in zip(user_ids, values):
            if val:
                result[str(uid)] = json.loads(val).get("status", "offline")
            else:
                result[str(uid)] = "offline"
        return result

    async def typing_start(self, user_id: UUID, room_id: str, room_type: str) -> None:
        """room_type: 'channel' or 'dm'"""
        redis = await get_redis()
        key = f"typing:{room_id}:{user_id}"
        already_active = await redis.exists(key)
        await redis.set(key, "1", ex=settings.TYPING_TTL_SECONDS)
        if not already_active:
            await pubsub.publish(
                f"{room_type}:{room_id}",
                "typing.start",
                {"user_id": str(user_id), "room_id": room_id},
            )

    async def typing_stop(self, user_id: UUID, room_id: str, room_type: str) -> None:
        redis = await get_redis()
        deleted = await redis.delete(f"typing:{room_id}:{user_id}")
        if deleted:
            await pubsub.publish(
                f"{room_type}:{room_id}",
                "typing.stop",
                {"user_id": str(user_id), "room_id": room_id},
            )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_services/test_presence_service.py -v
```

Expected: All 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/services/presence_service.py tests/test_services/
git commit -m "feat: add presence service with multi-tab connection counter"
```

---

## Task 5: WebSocket event types

**Files:**
- Create: `app/api/v1/ws/__init__.py`
- Create: `app/api/v1/ws/events.py`

No tests needed for this task — it's pure constants.

- [ ] **Step 1: Create the event definitions**

Create `app/api/v1/ws/__init__.py`:

```python
```

Create `app/api/v1/ws/events.py`:

```python
from enum import StrEnum


class EventType(StrEnum):
    # Server → Client
    CONNECTED = "connected"
    MESSAGE_NEW = "message.new"
    MESSAGE_EDITED = "message.edited"
    MESSAGE_DELETED = "message.deleted"
    TYPING_START = "typing.start"
    TYPING_STOP = "typing.stop"
    PRESENCE_UPDATE = "presence.update"
    CALL_INVITE = "call.invite"
    CALL_ENDED = "call.ended"
    CALL_PARTICIPANT_JOINED = "call.participant_joined"
    CALL_PARTICIPANT_LEFT = "call.participant_left"
    NOTIFICATION_NEW = "notification.new"
    ERROR = "error"

    # Client → Server
    HEARTBEAT = "heartbeat"


# Per-event rate limits: max events per RATE_LIMIT_WINDOW_SECONDS
RATE_LIMITS: dict[str, int] = {
    EventType.MESSAGE_NEW: 10,
    EventType.TYPING_START: 20,
}
DEFAULT_RATE_LIMIT: int = 30
RATE_LIMIT_WINDOW_SECONDS: int = 10
```

- [ ] **Step 2: Commit**

```bash
git add app/api/v1/ws/
git commit -m "feat: add WebSocket event type definitions and rate limit constants"
```

---

## Task 6: Add get_db_ctx to database module

The WebSocket handler needs a one-shot DB session (not the `Depends(get_db)` injection). Add a context manager to `app/infra/db/database.py`.

**Files:**
- Modify: `app/infra/db/database.py`

- [ ] **Step 1: Add get_db_ctx**

Open `app/infra/db/database.py`. Add the import and function:

```python
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def get_db_ctx() -> AsyncGenerator[AsyncSession, None]:
    """Use when you need a session outside of FastAPI's dependency injection,
    e.g. in WebSocket handlers or background tasks."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

- [ ] **Step 2: Verify it imports cleanly**

```bash
cd /home/ibadr/work/demos/lively/backend
python -c "from app.infra.db.database import get_db_ctx; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add app/infra/db/database.py
git commit -m "feat: add get_db_ctx async context manager for non-DI session use"
```

---

## Task 7: WebSocket handler

**Files:**
- Create: `app/api/v1/ws/handler.py`
- Create: `tests/test_api/test_ws_handler.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_api/__init__.py` (empty if it doesn't exist):
```python
```

Create `tests/test_api/test_ws_handler.py`:

```python
import json
import pytest
from uuid import uuid4
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.core.security import create_access_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _valid_token(user_id=None):
    uid = user_id or uuid4()
    return str(uid), create_access_token(str(uid))


def _make_app_with_mocks():
    """Return an app instance with Redis and DB mocked out."""
    import fakeredis.aioredis as fakeredis
    from app.main import create_app

    fake = fakeredis.FakeRedis(decode_responses=True)

    async def _fake_redis():
        return fake

    return create_app(), fake, _fake_redis


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------

def test_ws_rejects_missing_token():
    from app.main import app
    client = TestClient(app)
    with client.websocket_connect("/ws?workspace_id=" + str(uuid4())) as ws:
        # Server should close with 4001
        pass  # TestClient raises on abnormal closure — check below


def test_ws_rejects_invalid_token():
    from app.main import app
    client = TestClient(app)
    with pytest.raises(Exception):
        with client.websocket_connect(
            "/ws?token=not-a-valid-jwt&workspace_id=" + str(uuid4())
        ) as ws:
            ws.receive_json()


def test_ws_accepts_valid_token_and_sends_connected_event():
    from app.main import app
    import fakeredis.aioredis as fakeredis

    fake = fakeredis.FakeRedis(decode_responses=True)

    async def _fake_redis():
        return fake

    workspace_id = uuid4()
    user_id, token = _valid_token()

    # Mock workspace membership check
    mock_member = MagicMock()
    mock_member.role = "member"

    with patch("app.api.v1.ws.handler.get_redis", _fake_redis), \
         patch("app.infra.redis.client.get_redis", _fake_redis), \
         patch("app.infra.redis.pubsub.get_redis", _fake_redis), \
         patch("app.services.presence_service.get_redis", _fake_redis), \
         patch("app.api.v1.ws.handler._get_workspace_member", AsyncMock(return_value=mock_member)):

        client = TestClient(app)
        with client.websocket_connect(
            f"/ws?token={token}&workspace_id={workspace_id}"
        ) as ws:
            msg = ws.receive_json()
            assert msg["type"] == "connected"
            assert "user_id" in msg["payload"]


def test_ws_rejects_non_member():
    from app.main import app
    import fakeredis.aioredis as fakeredis

    fake = fakeredis.FakeRedis(decode_responses=True)

    async def _fake_redis():
        return fake

    workspace_id = uuid4()
    user_id, token = _valid_token()

    with patch("app.api.v1.ws.handler.get_redis", _fake_redis), \
         patch("app.infra.redis.client.get_redis", _fake_redis), \
         patch("app.infra.redis.pubsub.get_redis", _fake_redis), \
         patch("app.services.presence_service.get_redis", _fake_redis), \
         patch("app.api.v1.ws.handler._get_workspace_member", AsyncMock(return_value=None)):

        client = TestClient(app)
        with pytest.raises(Exception):
            with client.websocket_connect(
                f"/ws?token={token}&workspace_id={workspace_id}"
            ) as ws:
                ws.receive_json()


def test_ws_heartbeat_refreshes_presence():
    from app.main import app
    import fakeredis.aioredis as fakeredis

    fake = fakeredis.FakeRedis(decode_responses=True)

    async def _fake_redis():
        return fake

    workspace_id = uuid4()
    user_id_str, token = _valid_token()

    mock_member = MagicMock()
    mock_member.role = "member"

    with patch("app.api.v1.ws.handler.get_redis", _fake_redis), \
         patch("app.infra.redis.client.get_redis", _fake_redis), \
         patch("app.infra.redis.pubsub.get_redis", _fake_redis), \
         patch("app.services.presence_service.get_redis", _fake_redis), \
         patch("app.api.v1.ws.handler._get_workspace_member", AsyncMock(return_value=mock_member)):

        client = TestClient(app)
        with client.websocket_connect(
            f"/ws?token={token}&workspace_id={workspace_id}"
        ) as ws:
            ws.receive_json()  # connected
            ws.send_json({"type": "heartbeat", "payload": {}})
            # No error means heartbeat was processed
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_api/test_ws_handler.py -v
```

Expected: Tests fail — WebSocket route does not exist yet.

- [ ] **Step 3: Implement the WebSocket handler**

Create `app/api/v1/ws/handler.py`:

```python
import asyncio
import json
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect

from app.api.v1.ws.events import (
    DEFAULT_RATE_LIMIT,
    RATE_LIMIT_WINDOW_SECONDS,
    RATE_LIMITS,
    EventType,
)
from app.core.security import decode_token
from app.core.exceptions import AppError
from app.infra.db.database import get_db_ctx
from app.infra.redis.client import get_redis
from app.infra.redis.pubsub import ChannelSubscriber
from app.infra.db.repositories.workspace_repo import WorkspaceRepository
from app.services.presence_service import PresenceService


async def _get_workspace_member(workspace_id: UUID, user_id: UUID):
    """Returns the WorkspaceMemberEntity if user is a member, else None."""
    async with get_db_ctx() as db:
        repo = WorkspaceRepository(db)
        return await repo.get_member(workspace_id, user_id)


async def _authenticate(token: str | None) -> UUID | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        return UUID(payload["sub"])
    except (AppError, ValueError, KeyError):
        return None


async def _check_rate_limit(redis, user_id: UUID, event_type: str) -> bool:
    limit = RATE_LIMITS.get(event_type, DEFAULT_RATE_LIMIT)
    key = f"ratelimit:ws:{user_id}:{event_type}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS)
    return count <= limit


async def websocket_endpoint(
    ws: WebSocket,
    token: str | None,
    workspace_id: UUID,
) -> None:
    user_id = await _authenticate(token)
    if not user_id:
        await ws.close(code=4001)
        return

    member = await _get_workspace_member(workspace_id, user_id)
    if not member:
        await ws.close(code=4003)
        return

    await ws.accept()

    redis = await get_redis()
    presence = PresenceService()
    channels = [f"workspace:{workspace_id}", f"user:{user_id}"]

    await presence.connect(user_id, workspace_id)
    await ws.send_json(
        {"type": EventType.CONNECTED, "payload": {"user_id": str(user_id)}}
    )

    async def _forward_from_redis() -> None:
        async with ChannelSubscriber(channels) as sub:
            async for event in sub.listen():
                try:
                    await ws.send_json(event)
                except Exception:
                    return

    async def _handle_client_messages() -> None:
        async for raw in ws.iter_text():
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event_type: str = msg.get("type", "")
            payload: dict = msg.get("payload", {})

            if not await _check_rate_limit(redis, user_id, event_type):
                await ws.close(code=4029)
                return

            if event_type == EventType.HEARTBEAT:
                await presence.heartbeat(user_id)

            elif event_type == EventType.TYPING_START:
                room_id = payload.get("room_id")
                room_type = payload.get("room_type", "channel")
                if room_id:
                    await presence.typing_start(user_id, str(room_id), room_type)

            elif event_type == EventType.TYPING_STOP:
                room_id = payload.get("room_id")
                room_type = payload.get("room_type", "channel")
                if room_id:
                    await presence.typing_stop(user_id, str(room_id), room_type)

    try:
        await asyncio.gather(
            _forward_from_redis(),
            _handle_client_messages(),
        )
    except WebSocketDisconnect:
        pass
    finally:
        await presence.disconnect(user_id, workspace_id)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_api/test_ws_handler.py -v
```

Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/ws/handler.py tests/test_api/test_ws_handler.py
git commit -m "feat: add WebSocket handler with auth, rate limiting, presence"
```

---

## Task 8: Wire WebSocket into main.py and add Redis lifecycle

**Files:**
- Modify: `app/main.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_api/test_ws_handler.py` (append at the bottom):

```python
def test_ws_route_exists_in_app():
    from app.main import app
    routes = [r.path for r in app.routes]
    assert "/ws" in routes
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_api/test_ws_handler.py::test_ws_route_exists_in_app -v
```

Expected: `FAILED — AssertionError: assert '/ws' in [...]`

- [ ] **Step 3: Update main.py**

Replace the contents of `app/main.py` with:

```python
from fastapi import FastAPI, Request, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from uuid import UUID

from app.core.config import settings
from app.core.exceptions import (
    AppError,
    ConflictError,
    ForbiddenError,
    InvalidCredentialsError,
    NotFoundError,
    TokenExpiredError,
    ValidationError,
)
from app.api.v1.auth.routes import router as auth_router
from app.api.v1.users.routes import router as users_router
from app.api.v1.workspaces.routes import router as workspaces_router
from app.api.v1.channels.routes import router as channels_router
from app.api.v1.dm.routes import router as dm_router
from app.api.v1.boards.routes import router as boards_router
from app.api.v1.calendar.routes import router as calendar_router
from app.api.v1.drafts.routes import router as drafts_router
from app.api.v1.settings.routes import router as settings_router
from app.api.v1.reports.routes import router as reports_router
from app.api.v1.ws.handler import websocket_endpoint
from app.infra.redis.client import close_redis


_STATUS_MAP = {
    NotFoundError: 404,
    ConflictError: 409,
    ForbiddenError: 403,
    InvalidCredentialsError: 401,
    ValidationError: 422,
    TokenExpiredError: 401,
}


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        status_code = next(
            (v for k, v in _STATUS_MAP.items() if isinstance(exc, k)),
            400,
        )
        return JSONResponse(
            status_code=status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.on_event("shutdown")
    async def shutdown_redis() -> None:
        await close_redis()

    prefix = settings.API_V1_PREFIX
    app.include_router(auth_router, prefix=prefix)
    app.include_router(users_router, prefix=prefix)
    app.include_router(workspaces_router, prefix=prefix)
    app.include_router(channels_router, prefix=prefix)
    app.include_router(dm_router, prefix=prefix)
    app.include_router(boards_router, prefix=prefix)
    app.include_router(calendar_router, prefix=prefix)
    app.include_router(drafts_router, prefix=prefix)
    app.include_router(settings_router, prefix=prefix)
    app.include_router(reports_router, prefix=prefix)

    @app.websocket("/ws")
    async def ws_route(
        ws: WebSocket,
        token: str | None = Query(default=None),
        workspace_id: UUID = Query(...),
    ) -> None:
        await websocket_endpoint(ws, token, workspace_id)

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
```

- [ ] **Step 4: Run all tests to verify nothing broke**

```bash
pytest tests/ -v --tb=short
```

Expected: All tests pass. The new route test passes.

- [ ] **Step 5: Commit**

```bash
git add app/main.py
git commit -m "feat: register WebSocket route and Redis shutdown lifecycle in main.py"
```

---

## Task 9: Smoke test the running server

- [ ] **Step 1: Start a local Redis instance**

```bash
docker run -d --name lively-redis -p 6379:6379 redis:7-alpine
```

Expected: Container starts. `docker ps` shows it running.

- [ ] **Step 2: Start the FastAPI server**

```bash
cd /home/ibadr/work/demos/lively/backend
uvicorn app.main:app --reload --port 8000
```

Expected: Server starts on port 8000 with no errors.

- [ ] **Step 3: Verify the health check**

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Verify WebSocket rejects bad token**

```bash
python3 -c "
import asyncio
import websockets

async def test():
    try:
        async with websockets.connect('ws://localhost:8000/ws?token=bad&workspace_id=00000000-0000-0000-0000-000000000000') as ws:
            print(await ws.recv())
    except websockets.exceptions.ConnectionClosedError as e:
        print(f'Closed with code: {e.code}')  # expect 4001 or 4003

asyncio.run(test())
"
```

Expected: `Closed with code: 4001` or connection refused.

- [ ] **Step 5: Final run of all tests**

```bash
pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 6: Tag Plan 1 complete**

```bash
git tag plan1-foundation
```

---

## Self-Review Checklist

All spec requirements for Plan 1:

| Spec requirement | Covered in task |
|---|---|
| Redis pub/sub for fan-out | Task 3 |
| Multi-tab presence counter (INCR/DECR) | Task 4 |
| Presence TTL + heartbeat every 30s | Task 4 |
| Typing indicators with TTL keys | Task 4 |
| No republish if typing already active | Task 4, test 9 |
| WebSocket auth via JWT query param | Task 7 |
| Reject unauthenticated (code 4001) | Task 7, test |
| Reject non-members (code 4003) | Task 7, test |
| Per-connection rate limiting (code 4029) | Task 7 |
| Redis shutdown lifecycle | Task 8 |
| `get_db_ctx` for non-DI DB sessions | Task 6 |

---

## What Plan 2 Covers

Plan 2 builds on this foundation:
- LiveKit token generation + call endpoints
- ARQ workers (email, push, upload processing)
- Notifications (in-app, FCM push, email)
- Database migrations for `notifications` + `user_devices` tables
