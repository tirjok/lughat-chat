# WORKFLOW: Model Loading & Readiness
**Version**: 0.1
**Date**: 2026-07-10
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Backend TTS model initialization, frontend health polling, and readiness gating

---

## Executive Summary
Backend container starts → FastAPI yields immediately → background thread loads XTTS-v2 model (~120s on CPU) → `/health` reports `"loading"` until `"ready"`. Frontend polls `/health` every 2s (max 10 retries = 20s), disables Generate button until ready. **Critical bug:** 20s polling window is 6× shorter than 120s model load — frontend shows "Error" long before model loads (RC-001). Docker health check correctly accounts for 120s (200 retries × 15s). **Known issues:** named volume path mismatch (RC-004), frontend polling too short (RC-001), SPA serves regardless of backend health (RC-038). Fix: increase frontend polling to match 120s.

---

## Overview
When the backend container starts, the XTTS-v2 model (~2GB) must be loaded into memory. This takes ~120 seconds on CPU. During this time, the `/health` endpoint reports `status: "loading"`. The frontend polls `/health` every 2 seconds (max 10 retries = 20 seconds) and disables the Generate button until `status: "ready"`. If the model fails to load, status becomes `"error"`. This workflow covers the entire lifecycle: container start → model load → readiness → potential failure → recovery.

---

## Actors
| Actor | Role in this workflow |
|---|---|
| Docker Compose | Starts backend container, runs health check |
| Backend Docker container | Runs FastAPI, starts background thread for model loading |
| FastAPI lifespan | Yields control immediately, starts model loading thread |
| Background thread | Loads XTTS-v2 model (blocks for ~120s) |
| `/health` endpoint | Returns current model load status |
| Frontend `useHealthPoll` | Polls `/health` every 2s, updates UI state |
| Frontend `ModelStatusIndicator` / `MobileStatusIndicator` | Displays loading/ready/error state |
| Frontend `GenerateButton` | Disabled until model is ready |

---

## Prerequisites
- Docker Compose is running (`docker compose up`)
- Backend image is built (contains Python, PyTorch, Coqui TTS, FFmpeg)
- Sufficient disk space for ~2GB model download (in `TTS_MODEL_CACHE` or `/root/.local/share/tts`)
- Sufficient RAM for XTTS-v2 model (~8–16GB recommended for CPU inference)
- `COQUI_TOS_AGREED=1` environment variable is set (Coqui TTS requirement)

---

## Trigger
**Primary**: Backend container starts (Docker Compose `docker compose up`).
**Secondary**: Backend container restarts (manual `docker compose restart backend`).
**Tertiary**: Backend process crashes and is restarted by Docker (`restart: unless-stopped`).

---

## Workflow Tree

### STEP 1: Container Start (Docker)
**Actor**: Docker Compose
**Action**: Start backend container with build context `./backend`, mount volumes, set environment variables.
**Timeout**: N/A (Docker starts container immediately)
**Input**: `docker compose up backend`
**Output on SUCCESS**: Container running, FastAPI listening on port 8000 → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(build_failed)`: Dockerfile build fails (missing dependencies, corrupted image) → Container exits immediately → Docker logs error → Frontend cannot connect → Health polling enters error state after 10 retries (20s)
  - `FAILURE(port_already_in_use)`: Host port 9000 already occupied → Docker fails to bind → Container exits → Frontend cannot connect

**Observable states during this step**:
  - Customer sees: Frontend loads (Nginx serves SPA), model status shows "Loading..." (orange pulsing dot), Generate button is disabled
  - Operator sees: `docker compose logs backend` shows build output, then FastAPI startup messages
  - Database: No changes
  - Logs: Docker build logs, then FastAPI startup logs

---

### STEP 2: FastAPI Lifespan Yields (Immediate)
**Actor**: FastAPI (`lifespan` context manager in `app.py`)
**Action**: FastAPI initializes, registers routes, adds CORS middleware, creates directories (`/app/downloads`, `/app/.cache/tts`). **Immediately yields** — does NOT block on model loading.
**Timeout**: N/A (< 1 second)
**Input**: Container started
**Output on SUCCESS**: FastAPI is accepting HTTP requests on port 8000 → GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(directory_creation_failed)`: Cannot create `/app/downloads` or `/app/.cache/tts` (read-only filesystem) → Silently caught with `try/except OSError` → No user impact (directories are optional for local/dev environments)

**Observable states during this step**:
  - Customer sees: Frontend loads, API calls to `/health` start returning `status: "loading"` (model not yet loaded)
  - Operator sees: FastAPI logs: `"Loading XTTS-v2 model..."`
  - Database: No changes
  - Logs: `[backend] Loading XTTS-v2 model...`

---

### STEP 3: Background Model Loading (Thread)
**Actor**: Background daemon thread (`load_model()` function, started in `lifespan`)
**Action**: Load Coqui TTS model `tts_models/multilingual/xtts_v2`. This involves:
  1. Downloading model weights to `TTS_MODEL_CACHE` (or `/root/.local/share/tts` via named volume)
  2. Initializing PyTorch with CPU backend
  3. Patching `torch.ops.load_library` to suppress missing NVIDIA library errors (CPU-only fallback)
  4. Patching `transformers.pytorch_utils.isin_mps_friendly` (compatibility shim)
  5. Setting `model_load_status = "ready"` when complete
**Timeout**: ~120 seconds (model download + initialization on CPU)
**Input**: Container started, FastAPI running
**Output on SUCCESS**: `model_load_status = "ready"`, `tts_model` is a valid TTS instance → GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(torch_not_installed)`: PyTorch not available (test environment) → `model_load_status = "error"`, `tts_model = None` → `/health` returns `model_loaded: false` → Frontend health polling enters error state after 10 retries
  - `FAILURE(coqui_TTS_not_available)`: `TTS` import fails (Coqui TTS not installed) → `model_load_status = "error"` → Same as above
  - `FAILURE(model_download_failed)`: Model weights cannot be downloaded (no internet, disk full, Coqui servers down) → Exception caught → `model_load_status = "error"`, `tts_model = None`
  - `FAILURE(model_initialization_failed)`: Model loads but inference fails (corrupt weights, GPU/CPU mismatch) → Exception caught → `model_load_status = "error"`
  - `FAILURE(library_patch_failed)`: Torch patching fails → Caught by outer `try/except ImportError` → Non-fatal (model may still load)

**Observable states during this step**:
  - Customer sees: Frontend model status indicator shows "Loading..." (orange pulsing dot), Generate button is disabled
  - Operator sees: Backend logs: `"Loading XTTS-v2 model..."` → (silence for ~120s) → `"XTTS-v2 model loaded successfully!"` OR `"Error loading TTS model: {error}"`
  - Database: Model weights downloaded to cache directory (~2GB)
  - Logs: Download progress, initialization messages, error stack traces if failed

---

### STEP 4: Health Endpoint Returns Status (Ongoing)
**Actor**: `/health` endpoint (FastAPI)
**Action**: Return current model load status to any caller.
**Timeout**: N/A (synchronous, < 1ms)
**Input**: `GET /health`
**Output on SUCCESS**: `{ "status": "loading"|"ready"|"error", "model_loaded": bool }`
**Output on FAILURE**:
  - `FAILURE(server_not_running)`: FastAPI not responding → HTTP connection error → Frontend health polling enters error state

**Observable states during this step**:
  - Customer sees: Model status indicator updates from "Loading..." (orange) to "Ready" (green) when model loads, or "Error" (red) if it fails
  - Operator sees: Health check endpoint returns current state
  - Database: No changes
  - Logs: (no logs from health endpoint — it's silent)

---

### STEP 5: Frontend Health Polling (Continuous)
**Actor**: Frontend (`useHealthPoll` composable)
**Action**: Poll `/health` every 2 seconds, starting immediately on mount. Max 10 retries (20 seconds total). Stop polling when status is `"ready"` or `"error"` (terminal states).
**Timeout**: 20 seconds (10 retries × 2 seconds)
**Input**: `GET /health` (every 2s)
**Output on SUCCESS**: `status` updates to `"ready"` → Frontend enables Generate button, shows "Ready" indicator → GO TO STEP 6
**Output on FAILURE**:
  - `FAILURE(max_retries_exceeded)`: 10 polls fail (server down, network error, or model never loads) → `status = "error"` → Frontend shows "Error" indicator, Generate button stays disabled
  - `FAILURE(non_200_response)`: `/health` returns non-200 (e.g., 503) → `status = "error"` → Frontend shows "Error" indicator

**Observable states during this step**:
  - Customer sees: Model status indicator transitions from "Loading..." (orange) → "Ready" (green) when model loads, or "Error" (red) if polling fails
  - Operator sees: Frontend network tab shows periodic `/health` requests every 2s
  - Database: No changes
  - Logs: (no frontend logs)

---

### STEP 6: Generate Button Gating (UI)
**Actor**: Frontend (`GenerateButton` component + `handleSynthesize` in `index.vue`)
**Action**: Disable Generate button when `modelStatus !== 'ready'`.
**Timeout**: N/A (reactive, instant)
**Input**: `modelStatus` from `useHealthPoll()`
**Output on SUCCESS**: Button enabled when `modelStatus === 'ready'`
**Output on FAILURE**:
  - `FAILURE(button_stays_disabled)`: Model never loads → Button stays disabled forever → User has no way to use the product

**Observable states during this step**:
  - Customer sees: Button is grayed out and unclickable while "Loading..." is displayed. Button becomes active when "Ready" is displayed.
  - Operator sees: (nothing — purely client-side)
  - Database: No changes
  - Logs: No logs

---

### STEP 7: Docker Health Check (Infrastructure)
**Actor**: Docker Compose health check configuration
**Action**: Run `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"` every 15 seconds. `start_period: 120s`, `retries: 200`.
**Timeout**: 120s start period + 200 × 15s = 3000s (50 minutes) max to consider container healthy
**Input**: Container started
**Output on SUCCESS**: Container marked `health: healthy` → Frontend container starts (depends on `service_healthy`)
**Output on FAILURE**:
  - `FAILURE(health_check_never_passes)`: Model never loads → Container never reaches `healthy` state → Frontend container never starts (blocked by `depends_on: backend.condition: service_healthy`)
  - `FAILURE(health_check_timeout)`: 200 retries exhausted (3000s = 50 minutes) → Container marked `unhealthy` → Frontend container still blocked

**Observable states during this step**:
  - Customer sees: Frontend loads (Nginx serves SPA) regardless of backend health — the frontend is a static SPA
  - Operator sees: `docker compose ps` shows backend as `healthy` (or `unhealthy` if model fails)
  - Database: No changes
  - Logs: Docker health check logs

---

### ABORT_CLEANUP: Model Load Failure Recovery
**Triggered by**: Any failure in STEP 3 (model loading) that results in `model_load_status = "error"`.
**Actions** (in order):
  1. `model_load_status` is set to `"error"` (in-memory, process-level)
  2. `tts_model` is set to `None` (in-memory, process-level)
  3. `/health` endpoint returns `{ "status": "error", "model_loaded": false }`
  4. Frontend health polling enters error state after 10 retries
  5. Frontend shows "Error" indicator (red dot), Generate button stays disabled
  6. **No automatic recovery** — the only recovery is container restart (`docker compose restart backend`)

**What customer sees**: Red dot indicator ("Error"), Generate button permanently disabled, no way to use the product without restart.

**What operator sees**: Backend logs: `"Error loading TTS model: {error}"`. Docker shows backend as `unhealthy` after 50 minutes. Frontend container may not start (blocked by `depends_on: service_healthy`).

---

## State Transitions
```
[Container starting]
  → (FastAPI starts, model loading thread starts) → [Model loading: ~120s]
  → (model loads successfully) → [Model ready: status="ready"]
  → (model fails to load) → [Model error: status="error"]
  → (container restarts) → [Model loading: ~120s] (loop back to top)

[Model ready]
  → (container restarts) → [Model loading: ~120s]
  → (process crashes) → [Model error] → [Container restarts] → [Model loading]

[Model error]
  → (container restarts) → [Model loading: ~120s] (retry)
  → (no restart) → [Model error: permanent until manual intervention]
```

---

## Handoff Contracts

### Docker → Backend (Container Start)
**Endpoint**: `docker compose up backend`
**Payload**: Build context `./backend`, volumes `tts-model-cache`, `tts-audio-cache`, `speaker_wavs/`, env vars (`TZ`, `TTS_MODEL_CACHE`, `COQUI_TOS_AGREED`, `LD_LIBRARY_PATH`)
**Success response**: Container running, FastAPI listening on port 8000
**Failure response**: Build failure, port conflict, or OOM kill
**Timeout**: N/A (Docker starts immediately)
**On failure**: Container exits, Docker shows error in `docker compose logs`

### Backend → Model (Load Thread)
**Endpoint**: In-process `TTS("tts_models/multilingual/xtts_v2")` call
**Payload**: Model name string, cache directory from `TTS_MODEL_CACHE` env var
**Success response**: `tts_model` is a valid TTS instance, `model_load_status = "ready"`
**Failure response**: Exception → `model_load_status = "error"`, `tts_model = None`
**Timeout**: ~120 seconds (model download + initialization)
**On timeout/failure**: Model status stays "error", no automatic retry

### Backend → Frontend (Health Polling)
**Endpoint**: `GET /health` (every 2s from frontend)
**Payload**: None
**Success response**: `{ "status": "loading"|"ready"|"error", "model_loaded": bool }`
**Failure response**: Connection error → Frontend counts as failed retry
**Timeout**: 20 seconds total (10 retries × 2s)
**On timeout**: Frontend enters error state, disables Generate button permanently until page reload

### Docker → Frontend (Service Dependency)
**Endpoint**: `docker compose up` (frontend service)
**Payload**: `depends_on: backend.condition: service_healthy`
**Success response**: Frontend container starts only after backend is `healthy`
**Failure response**: Frontend container never starts if backend never becomes `healthy`
**Timeout**: 50 minutes (200 retries × 15s, after 120s start period)
**On timeout**: Frontend container blocked indefinitely

---

## Cleanup Inventory
| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| TTS model weights (~2GB) | Step 3 (model download) | — | **Not managed** — cached in `tts-model-cache` volume, persists across restarts |
| Backend process (FastAPI) | Step 1 (container start) | Container stop/restart | Docker manages process lifecycle |
| Background model loading thread | Step 2 (lifespan) | Container stop | Daemon thread — automatically terminates with process |

---

## Reality Checker Findings
| # | Finding | Severity | Spec section | Resolution |
|---|---|---|---|---|
| RC-001 | Frontend health polling max is 10 retries × 2s = **20 seconds**, but model loading takes **~120 seconds** | **Critical** | STEP 5 | The frontend polling window (20s) is **6× shorter** than the actual model load time (120s). After 20s, the frontend enters `error` state and disables the Generate button permanently. The user sees "Error" even though the model is still loading in the background. **This is a bug: the frontend gives up long before the model finishes loading.** |
| RC-042 | Docker health check has `start_period: 120s` and `retries: 200` (3000s = 50 minutes), which correctly accounts for model loading time. But the frontend polling (20s) does NOT. | Critical | STEP 5 vs STEP 7 | Discrepancy between Docker health check (correct) and frontend polling (incorrect). The Docker health check will eventually pass, but the frontend will have already errored out. |
| RC-038 | Frontend is a **static SPA** served by Nginx — it loads regardless of backend health. The frontend doesn't know the backend is down until the first API call fails. | Medium | STEP 5 | The SPA loads instantly, but all API calls (health, voices, synthesis) will fail silently until the backend is ready. |
| RC-039 | The `generate_speaker_wavs.py` script is a **one-time setup tool** — not part of the runtime workflow. It generates `female.wav` and `male.wav`, but the deployed files are `KSA Hamed - Male.wav` and `KSA Zariyah - Female.wav`. | High | STEP 3 | The script and deployed files use different naming conventions. The script is likely outdated or was replaced manually. |
| RC-004 | Model cache (`tts-model-cache` named volume at `/root/.local/share/tts`) is **NOT used** — the app writes to `/app/.cache/tts` (set via `TTS_MODEL_CACHE` env var). The named volume is mounted at a different path. | High | STEP 3 | Model is re-downloaded (~2GB) on every container restart. The named volume exists but is unused. |

---

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Normal model load | Container starts, model downloads in ~120s | Frontend health polling shows "Loading..." → "Ready" (green), Generate button enables |
| TC-02: Frontend polling window too short | Model takes 120s, frontend polls for 20s then errors | **BUG**: Frontend shows "Error" after 20s even though model is still loading |
| TC-03: Model never loads | Model download fails (no internet, disk full) | Frontend shows "Error" after 20s, Generate button stays disabled |
| TC-04: Container restart during model load | Container restarts while model is loading | Model starts loading again from scratch (no cache used — see RC-004) |
| TC-05: Container restart after model loaded | Container restarts, model re-downloads (~120s) | Same as TC-01 but with ~120s delay |
| TC-06: Backend container never starts | Docker build fails | Frontend shows "Error" after 20s, Generate button stays disabled |
| TC-07: Docker health check passes | Model loads within 120s, health check passes | Frontend container starts (if depends_on condition met) |
| TC-08: Docker health check fails | Model never loads, health check never passes | Frontend container blocked (never starts) |
| TC-09: Frontend loads before backend ready | SPA loads instantly, health polling starts | Frontend shows "Loading..." for 20s, then "Error" (see RC-001) |
| TC-10: Page reload during model load | User reloads page while model is loading | Frontend restarts health polling from 0 (20s window again) |

---

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | Model loading takes ~120 seconds on CPU hardware | Docker health check `start_period: 120s` (verified) | Medium — could be longer on slower hardware |
| A2 | Frontend health polling (10 retries × 2s = 20s) is sufficient for the user to wait for model readiness | **NOT verified against model load time** — 20s << 120s | **Critical** — see RC-001. Frontend gives up 100s before model loads. |
| A3 | Named volume `tts-model-cache` at `/root/.local/share/tts` is used for model persistence | **NOT verified** — app writes to `/app/.cache/tts` (env var) | **High** — volume is unused, model re-downloaded every restart |
| A4 | Frontend SPA is served by Nginx regardless of backend health | `docker-compose.yml` — frontend doesn't depend on backend for serving static files (verified) | Low — confirmed in compose file |
| A5 | `COQUI_TOS_AGREED=1` must be set for Coqui TTS to work | Docker Compose env vars (verified) | Low — confirmed in compose file |

---

## Open Questions
- What is the correct fix for RC-001? Increase frontend polling retries to 60 (120s), or change polling interval to 15s with 8 retries (120s)?
- Should the frontend retry health polling after it enters error state (e.g., retry every 30s indefinitely)?
- Why does the named volume `tts-model-cache` exist at `/root/.local/share/tts` if the app writes to `/app/.cache/tts`? Is this a leftover from a previous configuration?
- Is there a plan to cache model weights across restarts? The 2GB download on every restart is expensive.
- What happens if the model loads but the speaker WAV files are missing? The model is "ready" but synthesis fails.

---

## Spec vs Reality Audit Log
| Date | Finding | Action taken |
|---|---|---|
| 2026-07-10 | Initial spec created from codebase analysis | — |
| 2026-07-10 | RC-001: Frontend polling window (20s) is 6× shorter than model load time (120s) — critical bug | Flagged as Critical — needs immediate fix |
| 2026-07-10 | RC-004: Named volume path doesn't match app config path — model never cached | Flagged as High — wastes 2GB download per restart |
