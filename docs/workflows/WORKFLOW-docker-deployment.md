# WORKFLOW: Docker Deployment & Service Ordering

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: `docker compose up` — service startup, health checks, networking

---

## Overview

The project deploys two Docker services (backend + frontend) using Docker Compose. The backend service (FastAPI + Coqui XTTS-v2) starts first, loads the model in a background thread, and becomes "healthy" when `/health` returns `model_loaded: true`. The frontend service (Nginx + SPA) starts only after the backend is healthy (`depends_on: backend.condition: service_healthy`). This workflow covers the complete deployment lifecycle, including health checks, networking, volumes, and failure modes.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Docker Compose | Orchestrates service startup, health checks, networking, volumes |
| Backend service (`lughat-backend`) | FastAPI + TTS model; exposes ports 8000 (internal), 9000 (host) |
| Frontend service (`lughat-frontend`) | Nginx + SPA; exposes port 80 (internal), 9001 (host) |
| Docker network (`lughat-network`) | Bridge network connecting both services |
| Docker volumes (`tts-model-cache`, `tts-audio-cache`) | Persistent storage for model cache and generated audio |
| Operator | Runs `docker compose up --build -d` |

---

## Prerequisites

- Docker and Docker Compose installed
- Sufficient disk space (~4GB for model + audio files)
- Sufficient RAM (~4GB for TTS model)
- CPU available (no GPU in this deployment)
- Internet access (model download on first load)

---

## Trigger

`docker compose up --build -d` (or `docker compose up -d` if image already built).

---

## Workflow Tree

### STEP 1: Backend Service Startup
**Actor**: Docker Compose (backend service)
**Action**:
  1. Build backend image (if `--build` flag): `python:3.12-slim` + ffmpeg + CPU-only PyTorch + Coqui TTS + torchcodec
  2. Create container `lughat-backend`
  3. Mount volumes: `tts-model-cache:/app/.cache/tts`, `tts-audio-cache:/app/downloads`, `./backend/speaker_wavs:/app/speaker_wavs`
  4. Set environment variables: `TZ=UTC`, `TTS_MODEL_CACHE=/app/.cache/tts`, `COQUI_TOS_AGREED=1`, `LD_LIBRARY_PATH`
  5. Start FastAPI server (uvicorn on port 8000)
  6. FastAPI `lifespan()` starts model loading in background thread
  7. Server becomes immediately available (model loads in background)

**Timeout**: N/A (server starts immediately; model loads in background)
**Input**: `docker compose up --build -d`
**Output on SUCCESS**: Backend container running; port 9000 mapped to container port 8000 → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(build_error)`: Docker build fails (missing dependencies, network error) → container not started
  - `FAILURE(port_conflict)`: Port 9000 already in use → container not started

**Observable states during this step**:
- Customer sees: N/A (deployment is backend process)
- Operator sees: `docker compose up` output showing build progress; container started
- Database: N/A
- Logs: `docker logs lughat-backend`

---

### STEP 2: Backend Health Check (Docker)
**Actor**: Docker (health check configuration)
**Action**: Docker runs health check every 15s: `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"`
- `timeout`: 5s
- `retries`: 60
- `start_period`: 60s
- Total max wait: 60s (start period) + 60 × 15s (retries) = ~960s (16 minutes)

**Timeout**: ~960s (16 minutes) maximum
**Input**: (none) (automatic, every 15s)
**Output on SUCCESS**: Container status = `healthy` → GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(health_check_fails)`: Health check fails after 60 retries → container status = `unhealthy` (but container still running)

**Observable states during this step**:
- Customer sees: N/A (deployment is backend process)
- Operator sees: `docker ps` shows container status (`healthy` or `unhealthy`); `docker logs lughat-backend` shows model loading progress
- Database: N/A
- Logs: `"Loading XTTS-v2 model..."`, `"XTTS-v2 model loaded successfully!"` (if model loads within timeout)

---

### STEP 3: Frontend Service Startup
**Actor**: Docker Compose (frontend service)
**Action**:
  1. Wait for backend to be `healthy` (per `depends_on: backend.condition: service_healthy`)
  2. Build frontend image (if `--build` flag): `node:20-alpine` (builder) → `nginx:alpine` (production)
  3. Create container `lughat-frontend`
  4. Map port 9001 (host) to container port 80
  5. Start Nginx (serves SPA static files; proxies `/api/*` and `/health` to backend:8000)

**Timeout**: ~960s (waits for backend to be healthy)
**Input**: Backend container status = `healthy`
**Output on SUCCESS**: Frontend container running; port 9001 mapped to container port 80 → WORKFLOW COMPLETE
**Output on FAILURE**:
  - `FAILURE(backend_never_healthy)`: Backend never becomes healthy (model load fails) → frontend waits indefinitely (no timeout on `depends_on`)

**Observable states during this step**:
- Customer sees: N/A (deployment is backend process)
- Operator sees: `docker compose up` output; frontend container started; port 9001 accessible
- Database: N/A
- Logs: `docker logs lughat-frontend`

---

### STEP 4: System Ready (Post-Deployment)
**Actor**: Both services (automatic)
**Action**: Backend model may still be loading (health check passed as soon as server responds, even with `model_loaded: false`). Frontend starts polling `/health` every 2 seconds. Model eventually loads (~120s on CPU).

**Timeout**: ~120s (model load time)
**Input**: (none) (automatic)
**Output on SUCCESS**: Model loaded; frontend sees "Ready" status → WORKFLOW COMPLETE
**Output on FAILURE**:
  - `FAILURE(model_load_fails)`: Model never loads (backend health check passes, but `/health` returns `model_loaded: false`); frontend polling times out (120s)

**Observable states during this step**:
- Customer sees: Status pill shows "Loading..." (orange dot); waits ~120s for model to load
- Operator sees: Backend logs `"XTTS-v2 model loaded successfully!"`; frontend polls `/health`
- Database: N/A
- Logs: Backend logs model loading progress

---

## State Transitions

```
[Not deployed] -> (docker compose up) -> [Building] (Docker images built)
[Building] -> (containers started) -> [Starting] (FastAPI server running)
[Starting] -> (health check passes) -> [Healthy] (backend)
[Healthy] -> (frontend starts) -> [Running] (both services up)
[Running] -> (model loads) -> [Ready] (frontend sees "Ready")
[Running] -> (model load fails) -> [Degraded] (backend healthy, frontend sees "Error")
[Healthy] -> (docker compose down) -> [Not deployed]
```

---

## Handoff Contracts

### Docker → Operator: Deployment Status
**From**: Docker Compose
**To**: Operator (via `docker compose up` output and `docker ps`)
**Payload**: Container status (`healthy`, `unhealthy`, `running`)
**Success**: Both containers running; ports 9000 (backend) and 9001 (frontend) accessible
**Failure**: Container fails to start; error message displayed

---

### Backend → Frontend: Health Check Dependency
**From**: Docker Compose (`depends_on: backend.condition: service_healthy`)
**To**: Frontend container startup
**Payload**: Backend container health status
**Success**: Backend container status = `healthy` → frontend starts
**Failure**: Backend container never becomes `healthy` → frontend waits indefinitely (no timeout on `depends_on`)
**NOTE**: The health check passes as soon as the server responds (even with `model_loaded: false`). The frontend starts immediately, but the model may not be loaded yet. This is by design — the frontend polls `/health` to track model loading progress.

---

### Frontend → Customer: Service Availability
**From**: Nginx (frontend container)
**To**: Customer's browser
**Payload**: SPA static files (HTML, JS, CSS, fonts, icons)
**Success**: SPA loads; customer sees TTS studio UI
**Failure**: Nginx returns 502 (if backend is down) or 404 (if SPA files not found)

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Backend container | STEP 1 | `docker compose down` | Docker container removal |
| Frontend container | STEP 3 | `docker compose down` | Docker container removal |
| Docker network (`lughat-network`) | STEP 1 (automatic) | `docker compose down` | Docker network removal |
| TTS model cache (~2GB) | First model load | `docker volume rm tts-model-cache` | Docker volume deletion |
| Generated audio files | POST /api/generate | `docker volume rm tts-audio-cache` or `/api/cleanup` | Docker volume deletion or API cleanup |

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: First deployment (no cached image) | `docker compose up --build -d` (no existing images) | Backend and frontend images built from scratch; containers started; model loads (~120s) |
| TC-02: Subsequent deployment (cached image) | `docker compose up -d` (existing images) | Containers started from cached images; model loads (~120s) |
| TC-03: Backend never becomes healthy | Model load fails (timeout or error) | Backend container status = `unhealthy` after ~960s; frontend never starts (waits indefinitely) |
| TC-04: Frontend starts while model still loading | Backend health check passes (server responds, model not loaded) | Frontend starts; polls `/health`; sees "Loading..." status |
| TC-05: Model loads after frontend starts | Backend model loads (~120s) after frontend starts | Frontend polls `/health`; sees status transition "Loading..." → "Ready" |
| TC-06: Container restart | `docker compose restart` | Containers restart; model begins loading again (~120s) |
| TC-07: Port conflict | Port 9000 or 9001 already in use | Container fails to start; error message displayed |
| TC-08: Disk space exhausted | Docker volume fills up | Container may crash; or file writes fail silently (non-fatal for MP3, non-fatal for .json) |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | Backend health check passes as soon as the server responds (even with `model_loaded: false`) | `docker-compose.yml:27` (health check calls `/health`) | Frontend starts immediately, but model may not be loaded yet (by design — frontend polls) |
| A2 | Frontend waits indefinitely for backend to be healthy (no timeout on `depends_on`) | `docker-compose.yml:42-43` (`condition: service_healthy`) | If backend never becomes healthy, frontend waits forever (no timeout) |
| A3 | Model cache volume (`tts-model-cache`) is ineffective (env var overrides mount point) | `docker-compose.yml:12`, `app.py:110` | ~2GB model re-downloaded on every container restart |
| A4 | Audio cache volume (`tts-audio-cache`) has no size limit | `docker-compose.yml:54` (volume defined without size constraint) | Volume could fill up, preventing new file writes |

---

## Open Questions

1. Should there be a timeout on `depends_on` (frontend waits max X minutes for backend)? (Currently: no timeout — frontend waits indefinitely.)

2. Should the backend health check verify `model_loaded: true` (not just server responsiveness)? (Currently: health check only verifies server responds.)

3. Should the model cache volume be fixed (env var = volume mount point)? (Currently: env var overrides mount point — cache is ineffective.)

4. Should there be a maximum storage limit on the audio cache volume? (Currently: no limit.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `docker-compose.yml`, `app.py:145-222` | Documented that health check passes as soon as server responds (not when model loaded); frontend waits indefinitely for backend; model cache volume is ineffective |
