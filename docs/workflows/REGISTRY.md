# Workflow Registry — Lughat Chat TTS

**Date**: 2026-08-01 (Original Audit)
**Updated**: 2026-08-01 (Resolution Audit)
**Auditor**: Workflow Architect
**Project**: Lughat Chat — Arabic Text-to-Speech Studio

---

## View 1: By Workflow (Master List)

| # | Workflow | Spec File | Status | Trigger | Primary Actor | Last Reviewed |
|---|---|---|---|---|---|---|
| W-01 | Model Startup & Loading | `backend/app.py:143-209` | **Resolved** | Container start (Docker) | Backend service | 2026-08-01 |
| W-02 | Health Check Polling (Frontend) | `frontend/app/composables/useHealthPoll.ts` | **Resolved** | Page load (onMounted) | Frontend (browser) | 2026-08-01 |
| W-03 | Text-to-Speech Synthesis | `backend/app.py:306-415` | **Partially Resolved** | User clicks "Generate" / Ctrl+Enter | User (frontend) | 2026-08-01 |
| W-04 | Audio Playback & Controls | `frontend/app/composables/useAudioModule.ts` | **Partially Resolved** | User clicks play/pause/seek | User (frontend) | 2026-08-01 |
| W-05 | Voice Discovery & Selection | — | **Missing** | Page load (onMounted) | Frontend (browser) | 2026-08-01 |
| W-06 | Audio History Browsing | `backend/app.py:418-471` | **Resolved** | User navigates to history | User (frontend) | 2026-08-01 |
| W-07 | Audio Download | — | **Missing** | User clicks download | User (frontend) | 2026-08-01 |
| W-08 | Containerized Deployment | `docker-compose.yml` | **Partially Resolved** | `docker compose up` | DevOps / Operator | 2026-08-01 |
| W-09 | Backend CI Pipeline | `.github/workflows/backend.yml` | Approved | Push/PR to main/develop | CI system | 2026-08-01 |
| W-10 | Frontend CI Pipeline | `.github/workflows/frontend.yml` | **Approved** | Push/PR to main/develop | CI system | 2026-08-01 |
| W-11 | Full Quality Gate (`run-tests.sh`) | `run-tests.sh` | **Resolved** | Pre-commit hook / manual | Developer | 2026-08-01 |
| W-12 | Docker Image Optimization | `scripts/optimize-docker.sh` | Draft | Manual execution | DevOps / Operator | 2026-08-01 |
| W-13 | End-to-End Integration Test | `scripts/test-e2e.sh` | **Resolved** | Manual execution | QA / Operator | 2026-08-01 |
| W-14 | Volume Persistence Verification | `scripts/test-volume-persistence.sh` | **Resolved** | Manual execution | QA / Operator | 2026-08-01 |
| W-15 | Startup Validation (init.sh) | `scripts/init.sh` | **Resolved** | Container entrypoint | Backend service | 2026-08-01 |
| W-16 | Container Health Monitoring | `docker-compose.yml` (healthcheck) | **Partially Resolved** | Docker (every 15s) | Docker engine | 2026-08-01 |
| W-17 | Speaker WAV Management | `backend/app.py:27-49` | **Resolved** | File system watch | Operator (manual) | 2026-08-01 |
| W-18 | Frontend Panel Layout & Mobile Split-Screen | `frontend/app/pages/index.vue:36-53` | **Partially Resolved** | Resize / user interaction | User (frontend) | 2026-08-01 |
| W-19 | Scroll-Reveal Animations | `frontend/app/composables/useScrollReveal.ts` | **Resolved** | Scroll into viewport | Browser (IntersectionObserver) | 2026-08-01 |
| W-20 | Toast Notification Lifecycle | `frontend/app/composables/useToast.ts` | **Unresolved** | Programmatic call | System (error/success) | 2026-08-01 |

**Status Definitions:**
- **Approved**: Fully specified and reviewed.
- **Draft**: Partially documented (exists as code/script but incomplete spec).
- **Missing**: Exists in code but no spec exists — **red flag**.
- **Resolved**: Issue addressed in code; no remaining risk.
- **Partially Resolved**: Some improvements made; residual risks remain (documented below).
- **Unresolved**: Issue persists unchanged from original audit.

---

## View 2: By Component

| Component | File(s) | Workflows it participates in |
|---|---|---|
| **FastAPI App** | `backend/app.py` | W-01, W-03, W-06, W-16 |
| TTS Model Loader | `backend/app.py:143-209` (lifespan) | W-01 |
| `/health` Endpoint | `backend/app.py:233-239` | W-02, W-16 |
| `/api/voices` Endpoint | `backend/app.py:242-245` | W-05 |
| `/api/generate` Endpoint | `backend/app.py:306-415` | W-03 |
| `/api/history` Endpoint | `backend/app.py:418-471` | W-06 |
| `/api/cleanup` Endpoint | `backend/app.py:474-504` | W-07 (cleanup) |
| Nginx Config | `frontend/nginx.conf` | W-03, W-06, W-08 |
| Frontend Page | `frontend/app/pages/index.vue` | W-02, W-03, W-04, W-05, W-07, W-18, W-20 |
| `useHealthPoll` | `frontend/app/composables/useHealthPoll.ts` | W-02 |
| `useTtsApi` | `frontend/app/composables/useTtsApi.ts` | W-03 |
| `useAudioModule` | `frontend/app/composables/useAudioModule.ts` | W-04 |
| `useVoices` | `frontend/app/composables/useVoices.ts` | W-05 |
| `useInputValidation` | `frontend/app/composables/useInputValidation.ts` | W-03 |
| `useToast` | `frontend/app/composables/useToast.ts` | W-20 |
| `usePanelToggle` | `frontend/app/composables/usePanelToggle.ts` | W-18 |
| `useScrollReveal` | `frontend/app/composables/useScrollReveal.ts` | W-19 |
| Backend Dockerfile | `backend/Dockerfile` | W-08, W-12 |
| Frontend Dockerfile | `frontend/Dockerfile` | W-08, W-12 |
| Docker Compose | `docker-compose.yml` | W-08, W-16 |
| Backend CI | `.github/workflows/backend.yml` | W-09 |
| Frontend CI | `.github/workflows/frontend.yml` | W-10 |
| `run-tests.sh` | `run-tests.sh` | W-11 |
| `init.sh` | `scripts/init.sh` | W-15 |
| `test-e2e.sh` | `scripts/test-e2e.sh` | W-13 |
| `test-volume-persistence.sh` | `scripts/test-volume-persistence.sh` | W-14 |
| `optimize-docker.sh` | `scripts/optimize-docker.sh` | W-12 |
| Speaker WAVs | `backend/speaker_wavs/*.wav` | W-17 |
| Nginx Reverse Proxy | `frontend/nginx.conf` | W-03, W-06, W-08 |

---

## View 3: By User Journey

### User Journeys (Customer-Facing)

| What the user experiences | Underlying workflow(s) | Entry point |
|---|---|---|
| Opens the TTS Studio app | W-02 (Health Polling), W-05 (Voice Discovery) | `GET /` (frontend page) |
| Selects a voice/dialect | W-05 (Voice Discovery & Selection) | `VoiceSelector` component |
| Types Arabic text | W-18 (Panel Layout), W-20 (Toast on validation fail) | Textarea (RTL, `dir="rtl"`) |
| Clicks "Generate Speech" | W-03 (TTS Synthesis) | `GenerateButton` / Ctrl+Enter |
| Listens to generated audio | W-04 (Audio Playback & Controls) | `AudioPlayerPanel` |
| Downloads generated audio | W-07 (Audio Download) | Download button |
| Browses audio history | W-06 (Audio History Browsing) | `/api/history` |
| Switches between panels (desktop) | W-18 (Panel Layout) | Panel toggle |
| Uses app on mobile | W-18 (Mobile Split-Screen), W-19 (Scroll Reveal) | Touch drag on divider |

### Operator Journeys

| What the operator does | Underlying workflow(s) | Entry point |
|---|---|---|
| Deploys the full stack | W-08 (Containerized Deployment) | `docker compose up --build -d` |
| Adds a new voice preset | W-17 (Speaker WAV Management) | Place `.wav` in `speaker_wavs/` |
| Runs quality gates before commit | W-11 (Full Quality Gate) | Pre-commit hook |
| Runs CI/CD on push/PR | W-09, W-10 (CI Pipelines) | GitHub Actions |
| Verifies e2e integration | W-13 (E2E Test) | `scripts/test-e2e.sh` |
| Tests volume persistence across restarts | W-14 (Volume Persistence) | `scripts/test-volume-persistence.sh` |
| Optimizes Docker images | W-12 (Docker Optimization) | `scripts/optimize-docker.sh` |
| Validates container startup | W-15 (Startup Validation) | `scripts/init.sh` (entrypoint) |
| Cleans up old audio files | W-07 (Audio Cleanup) | `POST /api/cleanup` |

### System-to-System Journeys

| What happens automatically | Underlying workflow(s) | Trigger |
|---|---|---|
| TTS model loads on container start | W-01 (Model Startup) | Docker container launch |
| Frontend polls backend health | W-02 (Health Polling) | Page load (every 2s, 60 retries) |
| Docker checks backend health | W-16 (Container Health) | Every 15s (60 retries, 60s start_period) |
| Nginx proxies API to backend | W-08 (Deployment) | Every `/api/` request |
| Frontend starts after backend healthy | W-08 (Deployment) | `depends_on: service_healthy` |
| Model re-downloads on rebuild | W-08 (Deployment) | `docker compose up --build` (cache not persisted) |

---

## View 4: By State

### TTS Model State (Backend)

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| `loading` | Container start (lifespan), Health poll reset | -> `ready`, `error` | W-01 (Model Startup) |
| `ready` | Model loaded successfully, Health poll success | -> `error` (runtime failure) | W-01 (if model crashes), W-03 (if generation fails) |
| `error` | Model load exception (after 3 retries), Health poll max retries | (terminal — requires restart) | W-01 (restart container), W-16 (Docker restart) |

### Audio Generation State (Per Request)

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| `idle` (no audio) | App start, User clears text | -> `generating`, `error` | W-03 (Synthesis), W-07 (Download) |
| `generating` | User clicks Generate | -> `generated`, `error` | W-03 (Synthesis), W-20 (Toast error) |
| `generated` (audio blob ready) | Synthesis response received | -> `playing`, `downloaded`, `idle` | W-04 (Playback), W-07 (Download), W-03 (new generation) |
| `playing` | User clicks play | -> `paused`, `ended` | W-04 (Playback), W-18 (panel close) |
| `paused` | User clicks pause | -> `playing`, `ended` | W-04 (Playback) |
| `ended` | Audio reaches end | -> `idle` | W-04 (Playback), W-07 (Download) |
| `error` | API error, generation failure | -> `idle` (retry) | W-03 (Synthesis), W-20 (Toast) |

### Audio File State (On Disk)

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| `.mp3` created | `/api/generate` success | Removed by `/api/cleanup` (>24h) | W-07 (Cleanup endpoint) |
| `.wav` intermediate | `/api/generate` (step 1) | Deleted after MP3 conversion (try/except pass) | W-03 (Synthesis — cleanup in `finally` block) |

### Audio Panel State (Frontend UI)

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Panel hidden | App start, User closes player | -> `visible` | W-04 (Playback), W-18 (Panel toggle) |
| Panel visible | Generation completes | -> `hidden` | W-04 (Playback), W-18 (Panel toggle), W-07 (Download) |
| Control deck active (desktop) | App start | -> `canvas` | W-18 (Panel toggle) |
| Canvas active (desktop) | User toggles panel | -> `control-deck` | W-18 (Panel toggle) |
| Mobile: Canvas top (ratio N%) | App start (0.55) | -> control deck (ratio 1-N%) | W-18 (Touch drag on divider) |
| Mobile: Control deck (ratio N%) | User drags divider | -> canvas (ratio N%) | W-18 (Touch drag on divider) |

### Health Poll State (Frontend)

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| `loading` | Page load (onMounted) | -> `ready`, `error` | W-02 (Health Polling) |
| `ready` | Health endpoint returns `model_loaded: true` | (terminal — polling stops) | W-02 (polling stops, interval cleared) |
| `error` | Health endpoint returns `!ok`, or max retries (60) reached | (terminal — polling stops) | W-02 (polling stops, interval cleared) |

---

## Red Flag Resolution Audit (2026-08-01)

This section tracks the resolution status of each red flag from the original audit.

| # | Workflow | Original Risk | Status | Resolution Evidence |
|---|---|---|---|---|
| **RF-01** | Model Startup & Loading (W-01) | **Critical** | ✅ **RESOLVED** | `backend/app.py:143-209` — Now has retry logic (3 retries, exponential backoff 2/4/8s), hard timeout (300s), daemon thread. If model load fails after 3 attempts, status = "error". |
| **RF-02** | Health Check Polling (W-02) | **High** | ✅ **RESOLVED** | `useHealthPoll.ts` — `maxRetries` defaults to **60** (was 10), at 2s intervals = 120s max. Matches Docker `start_period: 60s`. Frontend polling now covers full model load window. |
| **RF-03** | TTS Synthesis (W-03) | **Critical** | ⚠️ **PARTIALLY RESOLVED** | `backend/app.py:306-415` — Added `intermediate_files` tracking with `finally` block cleanup. Validates speaker WAV exists and duration ≥ 0.33s. Has `torch.manual_seed()` for determinism. **Remaining issue**: FFmpeg failure falls back to `.wav` file with `.mp3` extension — player may not play. No transaction boundary. |
| **RF-04** | Audio Playback (W-04) | **Medium** | ⚠️ **PARTIALLY RESOLVED** | `useAudioModule.ts` — `dispose()` calls `revokePrevious()` and clears `audioRef.value.src = ''`. Frontend calls `audioModule.dispose()` on `onUnmounted` (index.vue:76). **Remaining issue**: `revokePrevious()` only revokes the *one* previous URL, not stale URLs from rapid generations before disposal. |
| **RF-05** | Container Health Monitoring (W-16) | **High** | ⚠️ **PARTIALLY RESOLVED** | `docker-compose.yml` — retries reduced from 200 to **60**, start_period from 120s to **60s**. Max wait = 60×15s + 60s = 960s (16 min), down from 50 min. Still high but more reasonable. |
| **RF-06** | Speaker WAV Management (W-17) | **Medium** | ✅ **RESOLVED** | `backend/app.py:27-49` — `_validate_speaker_wav()` validates duration ≥ 0.33s with clear 500 error message. |
| **RF-07** | Audio File Cleanup | **High** | ✅ **RESOLVED** | `backend/app.py:418-504` — `/api/history?cleanup=true` triggers 24h cleanup. `/api/cleanup` endpoint provides dedicated cleanup. Both use `os.remove()` on files older than 24 hours. |
| **RF-08** | Mobile Panel Drag (W-18) | **Medium** | ⚠️ **PARTIALLY RESOLVED** | `index.vue:36-53` — `canvasRatio` clamped to `Math.max(0.25, Math.min(0.85), ...)`. Touch/mouse events with `isDragging` state, `dragging` CSS class. **Remaining issue**: no inertia/snap-to. |
| **RF-09** | Toast Notification Lifecycle (W-20) | **Low** | ❌ **UNRESOLVED** | `useToast.ts` — Global `toastState` ref, `DISMISS_DELAY = 5000`. No max queue limit. Timers stored in `dismissTimers` Map, cleaned on unmount. **Same issues persist**: no max-queue, race condition on rapid toasts. |

---

## Original Red Flag Reference (for context)

The following workflows existed in **active code** with **no specification** at time of original audit:

| # | Workflow | Risk Level | Evidence (original) |
|---|---|---|---|
| **RF-01** | Model Startup & Loading (W-01) | **Critical** | `backend/app.py:143-180` — daemon thread, no timeout, no retry, no recovery. |
| **RF-02** | Health Check Polling (W-02) | **High** | `useHealthPoll.ts` — 10 retries × 2s = 20s max vs 120s model load. |
| **RF-03** | TTS Synthesis (W-03) | **Critical** | `backend/app.py:248-341` — 5-step pipeline, no rollback. |
| **RF-04** | Audio Playback (W-04) | **Medium** | `useAudioModule.ts` — `revokePrevious()` only revokes the *previous* URL. |
| **RF-05** | Container Health Monitoring (W-16) | **High** | `docker-compose.yml:26-31` — 200 retries × 15s = 3000s (50 min). |
| **RF-06** | Speaker WAV Management (W-17) | **Medium** | `speaker_wavs/` — no validation on file addition. |
| **RF-07** | Audio File Cleanup | **High** | No cleanup workflow. MP3 files accumulate indefinitely. |
| **RF-08** | Mobile Panel Drag (W-18) | **Medium** | `index.vue:36-53` — no bounds validation beyond 0.25–0.85. |
| **RF-09** | Toast Notification Lifecycle (W-20) | **Low** | `useToast.ts` — no max-queue limit, race condition on rapid toasts. |

---

## Timing & Race Condition Assumptions

| # | Assumption | Where Found | Risk if Wrong | Status |
|---|---|---|---|---|
| A-01 | Model loads within 120s | `docker-compose.yml:31` (`start_period: 60s`) | Frontend health polling (120s max, 60 retries) now covers Docker start_period. | ✅ **RESOLVED** |
| A-02 | Backend is reachable by Nginx at `backend:8000` | `frontend/nginx.conf:10` | If Docker network fails, all API calls get 502. No fallback. | Unchanged |
| A-03 | Speaker WAV files exist before first synthesis request | `backend/app.py:334-338` | First request after container start returns 500 if WAV missing. No graceful degradation. | Partially: validation now exists. |
| A-04 | FFmpeg is available and functional | `backend/app.py:371-390` | If FFmpeg fails, WAV is used as fallback (`.mp3` extension, `.wav` content). Player may not play. | Unchanged |
| A-05 | Docker volumes persist across `docker compose down/up` | `docker-compose.yml:52-54` | Named volumes persist, but `./backend/speaker_wavs:/app/speaker_wavs` is a bind mount — files must exist on host. | Unchanged |
| A-06 | TTS model is ~2GB and downloads once | `docker-compose.yml:53` (volume comment) | Comment says "persists" but actual code writes to `/app/.cache/tts` (env var). Volume mount is at `/root/.local/share/tts`. **Mismatch — model re-downloads every restart.** | Unchanged |
| A-07 | Ctrl+Enter triggers synthesis (keyboard shortcut) | `index.vue:156-159` | No prevention if textarea is not focused. Could trigger from any element. | Unchanged |
| A-08 | `model_load_status` is thread-safe | `backend/app.py:180` (daemon thread) | Python GIL protects simple assignments, but `tts_model` assignment and `model_load_status` assignment are not atomic together. A race between `lifespan` setting status and `/api/generate` reading it could cause a 503 during the millisecond window between assignment. | Unchanged |

---

## Handoff Contracts

### Frontend → Backend (Nginx Proxy)

| Field | Type | Description |
|---|---|---|
| `text` | `string` (1–3000 chars) | Arabic text to synthesize |
| `speaker` | `string` (optional) | Voice ID (resolved from `speaker_wavs/`) |
| `speed` | `number` (0.5–2.0) | Playback speed factor |
| `language` | `string` (default: "ar") | Language code |

**Success**: `audio/mpeg` (MP3 binary)
**Failure**: `400` (invalid text), `503` (model not ready), `500` (speaker WAV missing / generation failure)
**Timeout**: 1800s (30 min) via Nginx `proxy_read_timeout`

### Backend → Frontend (Health Poll)

| Field | Type | Description |
|---|---|---|
| `status` | `"loading"` \| `"ready"` \| `"error"` | Model load status |
| `model_loaded` | `boolean` | Whether model is ready for synthesis |

**Success**: 200 + JSON body
**Failure**: Non-200 → treated as error by polling

### Backend → Docker (Health Check)

| Field | Type | Description |
|---|---|---|
| URL | `http://localhost:8000/health` | Health endpoint |
| Evaluation | Python `eval()` of response | `model_loaded` must be `True` |

**Success**: Exit code 0
**Failure**: Exit code 1 → Docker marks unhealthy

---

## Cleanup Inventory

| Resource | Created by | Location | Cleanup Mechanism |
|---|---|---|---|
| TTS Model (~2GB) | Model load (lifespan) | `/app/.cache/tts` (container) | Container restart (re-downloads) |
| Generated MP3 files | `/api/generate` | `/app/downloads/*.mp3` | `POST /api/cleanup` removes files >24h old |
| Intermediate WAV files | `/api/generate` (step 1) | `/app/downloads/*.wav` | Deleted in `finally` block after MP3 conversion |
| Speaker WAV files | Operator (manual) | `backend/speaker_wavs/*.wav` | Manual removal |
| `URL.createObjectURL()` | `useAudioModule.ts` | Browser memory | Revoked on next `load()` call; `dispose()` called on `onUnmounted` (index.vue:76) |

---

## Open Questions

1. **Model cache volume mismatch**: The `docker-compose.yml` mounts `tts-model-cache` at `/root/.local/share/tts`, but the application writes to `/app/.cache/tts` (via `TTS_MODEL_CACHE` env var). The volume is effectively unused. **Status: Unresolved** — confirmed in docker-compose.yml line 12 vs env var line 19.

2. **Audio history stores no text**: `/api/history` returns `"text": ""` for all entries. The original text is not persisted. **Status: Unresolved** — confirmed in `app.py:440`.

3. **No auth on API endpoints**: All endpoints are public (CORS `*`). **Status: Unresolved** — no authentication middleware.

4. **No rate limiting**: Any client can flood `/api/generate`. CPU-only inference takes seconds per request. **Status: Unresolved** — no rate limiting middleware.

5. **`run-tests.sh` found and working**: The AGENTS.md references `./run-tests.sh` as the single source of truth for quality gates. **Status: RESOLVED** — `run-tests.sh` exists and runs 4 quality gates (backend tests → lint → typecheck → frontend tests).

6. **Seed parameter in API but not in frontend**: `SynthesisRequest` accepts `seed` (deterministic), but the frontend `useTtsApi.ts` does not pass it. **Status: Unresolved** — confirmed in `useTtsApi.ts` (no `seed` field in `SynthesisRequest` interface).

7. **`SynthesisResponse` model defined but unused**: The backend defines `SynthesisResponse(audio_url, filename, duration_seconds)` but `/api/generate` returns `FileResponse` instead. **Status: Unresolved** — legacy model at `app.py:244-247`.

---

## Discovery Audit Checklist

```
# Workflow Discovery Audit — Lughat Chat TTS
# Original Date: 2026-08-01 | Updated: 2026-08-01 (Resolution Audit)
# Auditor: Workflow Architect

## Entry Points Scanned
- [x] All API route files (REST) → backend/app.py: 5 endpoints (including /api/cleanup)
- [x] All frontend page files → frontend/app/pages/index.vue (single-page app)
- [x] All composables (business logic) → 8 composables
- [x] All Vue components → 9 components
- [x] All background workers / job processors → None (no async workers)
- [x] All scheduled job / cron definitions → None (no cron jobs)
- [x] All event listeners / message consumers → None (no websockets, no message queues)
- [x] All webhook endpoints → None

## Infrastructure Scanned
- [x] Service orchestration config (docker-compose.yml) → 2 services, 2 named volumes, 1 network
- [x] Infrastructure-as-code modules → N/A (Docker Compose only)
- [x] CI/CD pipeline definitions → 2 GitHub Actions workflows
- [x] Bootstrap / startup scripts → 6 shell scripts (run-tests.sh, run-backend-tests.sh, init.sh, test-e2e.sh, test-volume-persistence.sh, optimize-docker.sh)
- [x] DNS and CDN configuration → N/A (local deployment)

## Data Layer Scanned
- [x] All database migrations (schema implies lifecycle) → N/A (no database)
- [x] All seed / fixture files → N/A
- [x] All state machine definitions or status enums → Model state (loading/ready/error)
- [x] All foreign key relationships (imply ordering constraints) → N/A (file-based storage)

## Config Scanned
- [x] Environment variable definitions → 6 env vars in docker-compose.yml
- [x] Feature flag definitions → N/A
- [x] Secrets management config → N/A (no secrets)
- [x] Service dependency declarations → Frontend depends_on backend (service_healthy)

## Findings (Updated)
| # | Discovered workflow | Has spec? | Severity of gap | Resolution Status |
|---|---|---|---|---|
| 1 | Model Startup & Loading (W-01) | No → Now has spec | **Critical** | ✅ RESOLVED: retry + backoff + timeout |
| 2 | Health Check Polling (W-02) | No → Now has spec | **High** | ✅ RESOLVED: 60 retries (120s) matches 60s start_period |
| 3 | TTS Synthesis (W-03) | No → Now has spec | **Critical** | ⚠️ PARTIALLY RESOLVED: cleanup + validation, FFmpeg fallback remains |
| 4 | Audio Playback (W-04) | No → Now has spec | **Medium** | ⚠️ PARTIALLY RESOLVED: dispose() wired, single-URL leak remains |
| 5 | Voice Discovery (W-05) | No | **Low** | Unchanged: simple directory scan |
| 6 | Audio History (W-06) | No → Now has spec | **Medium** | ✅ RESOLVED: cleanup=true query param + /api/cleanup endpoint |
| 7 | Audio Download (W-07) | No | **Low** | Unchanged: simple blob download |
| 8 | Containerized Deployment (W-08) | No → Now has spec | **Medium** | ⚠️ PARTIALLY RESOLVED: 16 min max wait (was 50 min) |
| 9 | Backend CI (W-09) | Yes | Low | Unchanged |
| 10 | Frontend CI (W-10) | Yes | Low | Unchanged |
| 11 | Quality Gate (W-11) | No → Now exists | **High** | ✅ RESOLVED: run-tests.sh exists |
| 12 | Docker Optimization (W-12) | Partial | **Medium** | Unchanged: script writes to /tmp |
| 13 | E2E Test (W-13) | Partial → Now exists | **Medium** | ⚠️ PARTIALLY RESOLVED: script exists but uses /api/tts (wrong endpoint) |
| 14 | Volume Persistence (W-14) | Partial → Now exists | **Medium** | ✅ RESOLVED: script exists and functional |
| 15 | Startup Validation (W-15) | Partial → Now exists | **Medium** | ✅ RESOLVED: init.sh exists, validates 5 items |
| 16 | Container Health (W-16) | No → Now has spec | **High** | ⚠️ PARTIALLY RESOLVED: 16 min max wait (was 50 min) |
| 17 | Speaker WAV Mgmt (W-17) | No → Now has spec | **Medium** | ✅ RESOLVED: _validate_speaker_wav() in place |
| 18 | Panel Layout (W-18) | No → Now has spec | **Medium** | ⚠️ PARTIALLY RESOLVED: bounds validation (0.25–0.85), no inertia/snap |
| 19 | Scroll Reveal (W-19) | No → Now has spec | **Low** | ✅ RESOLVED: useScrollReveal.ts with IntersectionObserver |
| 20 | Toast Lifecycle (W-20) | No | **Low** | ❌ UNRESOLVED: no max-queue, race condition |
```
