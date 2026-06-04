# Issue 1: Infrastructure Foundation — Docker Compose & Nginx Proxy

## What to build

Set up the complete deployment infrastructure: Docker Compose orchestration with two services (backend + frontend), named volumes for model and audio persistence, and Nginx reverse proxy routing all traffic through port 80.

After this is complete, `docker compose up` starts the entire stack — frontend serves SPA on port 80, proxies `/api/*` and `/downloads/*` to backend container.

## Acceptance criteria

- [ ] `docker-compose.yml` defines two services: `backend` (FastAPI + TTS) and `frontend` (Nuxt.js → Nginx)
- [ ] Named volumes: `tts-model-cache` (persists TTS model), `tts-audio-cache` (persists generated audio)
- [ ] Nginx reverse proxy routes `/api/*` → backend:8000, `/downloads/*` → backend:8000, everything else → frontend SPA
- [ ] Frontend container exposes port 80 (single entry point)
- [ ] Backend container exposes port 8000 (internal only, for debugging)
- [ ] `docker compose up` starts both services successfully
- [ ] Frontend serves SPA at http://localhost
- [ ] API calls to /api/* are proxied to backend correctly

## Blocked by

None - can start immediately
