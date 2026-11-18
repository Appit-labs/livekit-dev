# livekit-dev

A local LiveKit setup that behaves like production: a dev stack you can bring up with one command,
a prod-shaped compose file with secrets externalised, and a backend that issues room tokens.

Kept because reproducing "works locally, breaks in the room" got old.

## Layout

```
docker-compose.livekit.dev.yml    # LiveKit + Redis + backend, local
docker-compose.livekit.prod.yml   # prod-shaped, secrets from the environment only
dev.sh                            # one-command bring-up / tear-down
backend/                          # token issuing + room API
livekit/                          # server config (no keys committed)
frontend/                         # minimal client for testing a room
docs/                             # notes from getting this working
```

## Run it

```bash
cp .env.livekit.prod.example .env.livekit.prod     # or generate the dev keys
./dev.sh up        # or: docker compose -f docker-compose.livekit.dev.yml up -d
./dev.sh logs
./dev.sh down
```

Keys are read from the environment. Nothing in this repository contains a real `LIVEKIT_API_KEY`,
`LIVEKIT_API_SECRET` or `SECRET_KEY` — `backend/.env` and `.env.livekit.prod` are git-ignored, and the
example files carry empty values.

## What is actually useful here

- a compose file that pins the LiveKit server version and Redis, so the dev room behaves like prod
- token issuing in the backend, including the `roomJoin` grant shape that is easy to get wrong
- `dev.sh` teardown that removes volumes, because a stale Redis makes presence lie

## Licence

MIT.
