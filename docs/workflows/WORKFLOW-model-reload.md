# WORKFLOW: Model Reload

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: GET /health?reload=1 — force TTS model reload

---

## Overview

The `/health` endpoint accepts an optional `?reload=1` query parameter that forces the TTS model to be reloaded. This is a troubleshooting mechanism — if the model is in an error state (or even a ready state), the operator can trigger a full reload cycle. This workflow covers the reload process, its side effects, and the risks of concurrent reloads.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Frontend (user action) | Triggers reload by navigating to `/health?reload=1` (or via API call) |
| FastAPI (`/health`) | Processes `?reload=1` query parameter; clears model; re-spawns loading thread |
| Daemon Thread | Runs `load_model()` with retry logic (same as initial load) |
| Frontend Health Poller | Polls `/health` every 2 seconds; sees status transition "ready" → "loading" → "ready" |

---

## Prerequisites

- Backend container is running
- Model is in any state (loading, ready, or error)
- Internet access (model may need to re-download ~2GB)

---

## Trigger

`GET /health?reload=1` (query parameter `reload=1`).

---

## Workflow Tree

### STEP 1: Reload Request Received
**Actor**: FastAPI (`/health` endpoint)
**Action**: Checks `reload` query parameter; if "1", triggers reload sequence
**Timeout**: N/A (synchronous)
**Input**: `{ reload: "1" }` (query parameter)
**Output on SUCCESS**: Model cleared; loading thread re-spawned → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(no_reload)`: `reload` parameter is not "1" → no-op; return current status

**Observable states during this step**:
- Customer sees: Status pill transitions "Ready" → "Loading..." (green → orange); in-flight generation requests may receive 503
- Operator sees: Backend logs `"Model loading abandoned: hard timeout (300s) exceeded"` (if reload during active load) or `"Loading XTTS-v2 model..."` (normal reload)
- Database: N/A
- Logs: `"Model loading abandoned: hard timeout (300s) exceeded"` (if reload during active load) or `"Loading XTTS-v2 model..."` (normal reload)

---

### STEP 2: Model Cleared
**Actor**: FastAPI (within `/health` endpoint)
**Action**: Sets `model_load_status = "loading"`; sets `tts_model = None`
**Timeout**: N/A (synchronous)
**Input**: (none)
**Output on SUCCESS**: Model state cleared → GO TO STEP 3
**Output on FAILURE**: N/A (state assignment should not fail)

**Observable states during this step**:
- Customer sees: Status pill shows "Loading..." (orange dot); all API endpoints return 503
- Operator sees: Backend logs `"Model loading abandoned: hard timeout (300s) exceeded"` (if reload during active load)
- Database: N/A
- Logs: (see STEP 1)

---

### STEP 3: Re-Spawn Loading Thread
**Actor**: FastAPI (within `/health` endpoint)
**Action**: Starts new daemon thread running `load_model()` (same as initial load: 3 retries, exponential backoff, 300s hard timeout)
**Timeout**: 300s (same as initial load)
**Input**: (none)
**Output on SUCCESS**: New daemon thread running; model loads → GO TO STEP 4 (same as initial load flow)
**Output on FAILURE**:
  - `FAILURE(threads_running)`: Old thread may still be running (if reload during active load) → two concurrent loading threads

**Observable states during this step**:
- Customer sees: Status pill shows "Loading..." (orange dot); polling continues
- Operator sees: Backend logs `"Loading XTTS-v2 model..."`; two threads may run concurrently (if old thread not aborted)
- Database: N/A
- Logs: `"Loading XTTS-v2 model..."` (new thread)

---

### STEP 4: Model Reload Completes
**Actor**: Daemon thread (same as initial load flow)
**Action**: Loads model with retry logic (3 retries, exponential backoff, 300s hard timeout)
**Timeout**: 300s (same as initial load)
**Input**: (none)
**Output on SUCCESS**: `tts_model` set; `model_load_status = "ready"` → WORKFLOW COMPLETE (model ready)
**Output on FAILURE**: `model_load_status = "error"` → GO TO STEP 5 (error state)

**Observable states during this step**:
- Customer sees: Status pill shows "Loading..." (orange dot)
- Operator sees: Backend logs `"XTTS-v2 model loaded successfully!"` (on success) or failure messages
- Database: N/A
- Logs: (see initial load flow)

---

### STEP 5: Reload Failed (Error State)
**Actor**: Any API endpoint (reads state)
**Action**: `model_load_status == "error"`, `tts_model = None` → all requests return 503
**Timeout**: N/A (error persists until another reload)
**Input**: (none)
**Output on SUCCESS**: N/A (error is terminal — requires another reload)
**Output on FAILURE**: N/A (no automatic recovery)

**Observable states during this step**:
- Customer sees: Status pill shows "Error" (red dot); all endpoints return 503
- Operator sees: Backend logs failure reason; may need to check container logs, network, disk space
- Database: N/A
- Logs: (see initial load flow — failure messages)

---

## State Transitions

```
[ready] -> (reload) -> [loading] (model cleared, thread re-spawned)
[loading] -> (reload) -> [loading] (new thread starts; old may still run)
[error] -> (reload) -> [loading] (model cleared, thread re-spawned)
[loading] -> (reload succeeds) -> [ready]
[loading] -> (reload fails) -> [error]
```

---

## Handoff Contracts

### Frontend → Backend: Model Reload (`GET /health?reload=1`)
**Endpoint**: `GET /health?reload=1`
**Payload**: (none)
**Query**: `reload=1` (string, required for reload)
**Success response**:
```json
{
  "status": "loading" | "ready" | "error",
  "model_loaded": boolean
}
```
**Note**: On reload, status immediately becomes "loading" (model cleared). Frontend polling will see this transition.
**Failure response**: HTTP 503 (if reload during active generation, in-flight requests get 503)
**Timeout**: 30s (Nginx proxy_read_timeout for /health)
**On Failure**: Frontend sees status = "loading"; polling continues; model reloads in background

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| TTS model (in-memory) | STEP 2 (cleared) | STEP 4 (re-loaded) | Replaced by new model instance |
| Old daemon thread | STEP 3 (may still run) | Never (no abort mechanism) | Process exit (daemon thread killed) |
| Model cache files (~2GB) | First reload (re-download) | Manual (delete volume) | Docker volume deletion |

---

## Reality Checker Findings

| # | Finding | Severity | Spec section affected | Resolution |
|---|---------|----------|----------------------|------------|
| RC-1 | Reload does NOT abort the existing daemon thread. If reload is called while the model is still loading (from initial load or a previous reload), two daemon threads run concurrently. Both threads compete to set `tts_model` and `model_load_status`. The last thread to win determines the final state. | **High** | STEP 3 | This is a race condition. Two threads may both attempt to load the model (each downloading ~2GB). This wastes bandwidth and CPU. |
| RC-2 | In-flight generation requests during reload receive 503 (model cleared). The frontend may show a confusing transition: "Ready" → "Loading..." → "Error" (if reload fails) or "Ready" (if reload succeeds). | **Medium** | STEP 1 | No user notification about the reload. The status pill shows "Loading..." but no explanation. |
| RC-3 | The `already_loaded` check in `load_model()` (checks `tts_model is not None`) is bypassed by the reload sequence (which sets `tts_model = None` first). This means the guard is ineffective during reload. | **Medium** | STEP 3 | Intentional — reload explicitly clears the model. But it means the guard doesn't prevent concurrent reloads. |

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: Reload from ready state | Model is ready; `?reload=1` called | Status transitions ready → loading → ready (full reload cycle); ~120s + 2GB download |
| TC-02: Reload from error state | Model is in error; `?reload=1` called | Status transitions error → loading → ready (or error); full reload cycle |
| TC-03: Reload during loading | Model is still loading (initial load or previous reload); `?reload=1` called | New thread starts; old thread may still run (two concurrent threads); last thread to win sets final state |
| TC-04: Reload during generation | Model is ready; generation in progress; `?reload=1` called | In-flight generation receives 503 (model cleared); status transitions ready → loading |
| TC-05: Reload fails | Model reload fails (timeout or error) | Status transitions loading → error; all endpoints return 503 |
| TC-06: Rapid consecutive reloads | Multiple `?reload=1` requests arrive rapidly | Multiple daemon threads may start (race condition); each downloads ~2GB |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | Reload costs ~120s + 2GB download (same as initial load) | `app.py:153-155` (same retry logic) | Frequent reloads waste bandwidth and CPU |
| A2 | In-flight generation requests are not gracefully handled during reload | `app.py:337-341` (reads model state under lock) | Requests during reload receive 503 (model cleared) |
| A3 | No mechanism exists to abort the old daemon thread | `app.py:209` (daemon thread, no join) | Old thread continues running; two threads may load concurrently |

---

## Open Questions

1. Should the reload endpoint abort the existing daemon thread before starting a new one? (Currently: no abort mechanism.)

2. Should there be a way to notify the frontend that a reload was triggered (vs. a new user action)? (Currently: status pill shows "Loading..." regardless of cause.)

3. Should there be a cooldown period between reloads? (Currently: no limit.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `backend/app.py:269-320` | Documented RC-1 (concurrent threads on reload), RC-2 (no user notification), RC-3 (no abort mechanism) |
