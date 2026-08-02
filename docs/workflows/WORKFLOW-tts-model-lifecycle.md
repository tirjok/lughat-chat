# WORKFLOW: TTS Model Lifecycle

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Discovery — Model loading, ready, error, and reload states

---

## Overview

The TTS model (Coqui XTTS-v2, ~2GB) is loaded in a background daemon thread when the FastAPI server starts. The server becomes immediately available; API endpoints check the model status before processing requests. This workflow covers the complete lifecycle of the model from initial load through error, reload, and shutdown.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| FastAPI Lifespan | Triggers model loading via `lifespan()` context manager |
| Daemon Thread | Runs `load_model()` with retry logic and hard timeout |
| API Endpoints | Read `model_load_status` to decide whether to process requests |
| Frontend Health Poller | Polls `/health` every 2 seconds, maps backend status to UI state |
| Operator | May trigger `?reload=1` to force model reload |

---

## Prerequisites

- Docker container is running (`docker compose up`)
- Python 3.12 environment with Coqui TTS library installed
- CPU available (no GPU in this deployment)
- `COQUI_TOS_AGREED=1` environment variable set
- Internet access to download model weights (first load)

---

## Trigger

Docker Compose starts the backend container → FastAPI `lifespan()` is called → daemon thread starts `load_model()`.

---

## Workflow Tree

### STEP 1: Model Load Initiation
**Actor**: FastAPI Lifespan (on server start)
**Action**: Starts daemon thread running `load_model()`; server yields immediately (becomes available)
**Timeout**: N/A (server starts immediately)
**Input**: N/A (automatic on startup)
**Output on SUCCESS**: Daemon thread running `load_model()`; `model_load_status = "loading"`
**Output on FAILURE**: N/A (thread always starts; failure detected inside thread)

**Observable states during this step**:
- Customer sees: SPA loaded, status pill shows "Loading..." (orange dot, pulsing)
- Operator sees: Container status `healthy` (Docker health check passes — server responds, model not yet ready)
- Database: N/A (no database)
- Logs: `"Loading XTTS-v2 model..."` printed to stderr

---

### STEP 2: Model Loading (Background Thread)
**Actor**: Daemon thread (`threading.Thread(target=load_model, daemon=True)`)
**Action**: Attempts to load XTTS-v2 model with retry logic (3 attempts, exponential backoff: 2s, 4s, 8s), hard timeout 300s (5 min)
**Timeout**: 300s hard timeout (monotonic clock check before each attempt)
**Input**: N/A (automatic)
**Output on SUCCESS**: `tts_model` set to loaded TTS instance; `model_load_status = "ready"` → GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(timeout)`: 300s exceeded → `model_load_status = "error"` → GO TO STEP 4
  - `FAILURE(load_error)`: All 3 retries exhausted → `model_load_status = "error"`, `tts_model = None` → GO TO STEP 4
  - `FAILURE(already_loaded)`: `tts_model` is not None (re-entry, e.g., `?reload=1` during load) → skip, do nothing

**Observable states during this step**:
- Customer sees: Status pill shows "Loading..." (orange dot, pulsing); all API endpoints return 503
- Operator sees: Container `healthy`; backend logs show retry attempts with delays
- Database: N/A
- Logs: `"Loading XTTS-v2 model..."`, `"Error loading TTS model (attempt N/3): {error}"`, `"Retrying in {delay}s..."`

---

### STEP 3: Model Ready
**Actor**: Any API endpoint (reads state)
**Action**: `model_load_status == "ready"`, `tts_model` is not None → requests are processed
**Timeout**: N/A (model is in memory)
**Input**: N/A (automatic)
**Output on SUCCESS**: Requests processed normally
**Output on FAILURE**:
  - `FAILURE(model_crash)`: Model crashes (OOM, segfault, library error) → `tts_model` becomes unusable → GO TO STEP 4
  - `FAILURE(reload)`: Operator calls `/health?reload=1` → GO TO STEP 5

**Observable states during this step**:
- Customer sees: Status pill shows "Ready" (green dot, pulsing); all endpoints functional
- Operator sees: Backend logs: `"XTTS-v2 model loaded successfully!"`
- Database: N/A
- Logs: `"XTTS-v2 model loaded successfully!"`

---

### STEP 4: Model Error (Terminal — No Reload)
**Actor**: Any API endpoint (reads state)
**Action**: `model_load_status == "error"`, `tts_model = None` → all requests return 503
**Timeout**: N/A (error state persists until reload)
**Input**: N/A (automatic)
**Output on SUCCESS**: N/A (error is terminal — requires manual intervention)
**Output on FAILURE**:
  - `FAILURE(reload)`: Operator calls `/health?reload=1` → GO TO STEP 5

**Observable states during this step**:
- Customer sees: Status pill shows "Error" (red dot); all API endpoints return 503 ("TTS model not ready")
- Operator sees: Backend logs show failure reason (timeout or retry exhaustion); may need to check container logs
- Database: N/A
- Logs: `"Model loading abandoned: hard timeout (300s) exceeded"` or `"Model loading failed after 3 attempts"`

---

### STEP 5: Model Reload (Explicit)
**Actor**: Frontend (via `/health?reload=1`)
**Action**: Sets `model_load_status = "loading"`, sets `tts_model = None`, re-spawns daemon thread with new `load_model()`
**Timeout**: 300s (same as initial load)
**Input**: `GET /health?reload=1` (query parameter `reload=1`)
**Output on SUCCESS**: `model_load_status = "loading"`; daemon thread re-spawned → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(already_loading)`: Model is already loading (thread still running) → no-op, return current status

**Observable states during this step**:
- Customer sees: Status pill transitions "Ready" → "Loading..." (green → orange); in-flight generation requests may receive 503
- Operator sees: Backend logs: `"Model loading abandoned: hard timeout (300s) exceeded"` (if reload during active load) or `"Loading XTTS-v2 model..."` (normal reload)
- Database: N/A
- Logs: `"Model loading abandoned: hard timeout (300s) exceeded"` (if reload during active load) or `"Loading XTTS-v2 model..."` (normal reload)

---

### STEP 6: Server Shutdown
**Actor**: Docker Compose (`docker compose down`)
**Action**: FastAPI `lifespan()` cleanup; daemon thread is non-joinable (daemon=True)
**Timeout**: N/A (daemon thread is killed with process)
**Input**: N/A (automatic on container stop)
**Output on SUCCESS**: Process exits
**Output on FAILURE**: N/A (daemon thread may be killed mid-operation; no cleanup possible)

**Observable states during this step**:
- Customer sees: Connection drops (WebSocket close, pending request fails)
- Operator sees: `"Shutting down TTS backend..."` printed to stderr
- Database: N/A
- Logs: `"Shutting down TTS backend..."`

---

## State Transitions

```
[loading] -> (load succeeds) -> [ready]
[loading] -> (3 retries fail) -> [error]
[loading] -> (300s timeout) -> [error]
[loading] -> (reload) -> [loading] (re-spawn thread)
[ready] -> (model crash) -> [error]
[ready] -> (reload) -> [loading] (re-spawn thread)
[error] -> (reload) -> [loading] (re-spawn thread)
[error] -> (no action) -> [error] (terminal until reload)
```

---

## Handoff Contracts

### Backend → Frontend: Model Status
**Endpoint**: `GET /health`
**Payload**: (none)
**Query**: `?reload=1` (optional string)
**Success response**:
```json
{
  "status": "loading" | "ready" | "error",
  "model_loaded": boolean
}
```
**Failure response**:
```json
HTTP 503 — "TTS model not ready"
```
**Timeout**: 30s (Nginx proxy_read_timeout for /health)
**On Failure**: Frontend health polling increments retry count; on max retries, status = 'error', polling stops

---

### Frontend → Backend: Health Polling (Frontend Workflow)
**From**: `useHealthPoll()` composable
**To**: `GET /health`
**Payload**: (none)
**Interval**: 2 seconds
**Max retries**: 60 (configurable via `maxRetries` option)
**First check**: Immediate (on `onMounted`)
**Stop conditions**: `status == "ready"` or `status == "error"` or max retries exceeded
**On Failure (network error)**: Increment retry count; on max retries, status = 'error', polling stops
**On Failure (non-200)**: status = 'error', polling stops immediately

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| TTS model (in-memory) | STEP 2 (success) | STEP 6 (shutdown) | Process exit (OS reclaims memory) |
| Daemon thread | STEP 1 | STEP 6 (shutdown) | Process exit (daemon thread killed) |
| Model cache files (~2GB) | First load | Manual (delete volume) | Docker volume deletion |

---

## Reality Checker Findings

| # | Finding | Severity | Spec section affected | Resolution |
|---|---------|----------|----------------------|------------|
| RC-1 | Frontend health polling max retries (60 × 2s = 120s) is less than backend hard timeout (300s) | **High** | STEP 2, Handoff Contracts | Frontend gives up on model loading at 120s, but backend continues until 300s. Customer sees "Error" at 120s, but model may load at 240s. Frontend would need to be restarted or trigger reload to see the loaded model. |
| RC-2 | `?reload=1` sets `model_load_status = "loading"` and `tts_model = None` but does NOT abort the existing daemon thread | **High** | STEP 5 | If reload is called while model is still loading (from initial load or previous reload), the old thread continues running in the background. The new thread also starts. Two concurrent loading threads. |
| RC-3 | The `already_loaded` check in `load_model()` prevents duplicate loading, but `?reload=1` sets `tts_model = None` first, bypassing this guard | **Medium** | STEP 5 | This is intentional — reload explicitly clears the model. However, a race condition exists: if two requests call `?reload=1` simultaneously, two threads may start loading. |
| RC-4 | Docker health check (`/health`) passes as soon as the server responds (even with `model_loaded: false`) | **Medium** | STEP 1 | Frontend container starts (per `depends_on: backend.condition: service_healthy`) as soon as the server responds — potentially before the model is loaded. Frontend starts polling immediately, which is correct behavior. |
| RC-5 | Model cache volume (`tts-model-cache`) is defined but NOT effectively used — env var `TTS_MODEL_CACHE=/app/.cache/tts` overrides the volume mount point (`/root/.local/share/tts`) | **Medium** | Overview | ~2GB model re-downloaded on every container restart. This is a known documented issue but impacts the workflow (each reload costs ~120s + bandwidth). |

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: Initial load succeeds | Container starts, model downloads successfully | Status transitions loading → ready within 300s; all endpoints functional |
| TC-02: Initial load times out | Model download stuck/slow (> 300s) | Status transitions loading → error after 300s; all endpoints return 503 |
| TC-03: Initial load fails after retries | Model download fails on all 3 attempts | Status transitions loading → error; all endpoints return 503 |
| TC-04: Model crashes mid-operation | OOM or library error during active use | Status transitions ready → error; all endpoints return 503 |
| TC-05: Reload during loading | `?reload=1` called while model is still loading (status = "loading") | New thread starts; old thread may continue (race condition) |
| TC-06: Reload during ready | `?reload=1` called while model is loaded (status = "ready") | Status transitions ready → loading → ready (full reload cycle); in-flight requests may get 503 |
| TC-07: Reload during error | `?reload=1` called while model is in error state | Status transitions error → loading → ready (or error) |
| TC-08: Frontend polling before model ready | Frontend loads, model still loading | Status shows "Loading..."; polling continues every 2s; status transitions to ready/error when thread completes |
| TC-09: Frontend polling max retries exceeded | Backend never becomes ready (model fails), frontend retries exhausted | Frontend status = 'error'; polling stops |
| TC-10: Concurrent reload requests | Two `?reload=1` requests arrive simultaneously | Two daemon threads may start loading (race condition documented in RC-3) |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | TTS model downloads ~2GB on first load; subsequent loads use cache (but cache volume is ineffective — see RC-5) | `docker-compose.yml`, `app.py:110` | Each restart = 2GB download + ~120s load time |
| A2 | Daemon thread is non-joinable (`daemon=True`) — no shutdown coordination possible | `app.py:209` | Model may be mid-load when container stops; no graceful shutdown |
| A3 | 300s hard timeout is sufficient for model download on typical hardware | Documented in blueprint | On slow networks, 300s may not be enough; model load fails permanently |
| A4 | Frontend health polling interval (2s) and max retries (60) are reasonable for ~120s model load time | `useHealthPoll.ts:12` | Frontend gives up at 120s (RC-1); model may load at 240s but frontend never sees it |
| A5 | Model crash (OOM, segfault) is rare but possible on CPU-only hardware with large model | Not verified | No restart mechanism; system becomes unusable until manual intervention |

---

## Open Questions

1. Should the frontend be notified when a model that was previously "error" becomes "ready" (e.g., after a reload)? Currently, the status pill would transition "Error" → "Loading..." → "Ready", but this may be confusing to the user.

2. Should there be a mechanism to auto-restart the model loading thread if it crashes? (Currently: no.)

3. Is the 300s hard timeout appropriate for all deployment environments? (Slow networks, constrained resources?)

4. Should the `?reload=1` endpoint abort the existing daemon thread before starting a new one? (Currently: no abort — two threads may run concurrently.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `backend/app.py:145-222` and `useHealthPoll.ts` | Documented RC-1 (frontend timeout < backend timeout), RC-2 (concurrent threads on reload), RC-5 (ineffective cache volume) |
