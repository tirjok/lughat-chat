# Workflow Registry — Lughat Chat

> **Generated:** 2026-08-02
> **Project:** Lughat Chat — Arabic Text-to-Speech Web Application
> **Stack:** Nuxt 4 (Vue 3) + FastAPI + Coqui XTTS-v2 + Docker

---

## Red Flags

> **Missing** = exists in code but has no spec. These are the highest-priority items to spec next.

| # | Workflow | Status | Risk |
|---|----------|--------|------|
| 1 | TTS Model Lifecycle (loading, ready, error, reload) | **Draft** | Model load failure leaves system unusable; no operator recovery path |
| 2 | Speech Generation Pipeline (text → MP3) | **Draft** | Multi-step pipeline with intermediate files; partial failure leaves orphaned MP3s |
| 3 | Audio File Lifecycle (generation → history → cleanup) | **Draft** | Filesystem state drifts over time without cleanup; race conditions on concurrent cleanup |
| 4 | Frontend Application Bootstrap (SPA load → model polling → ready) | **Draft** | 120s model load visible to user; polling with no user feedback beyond status pill |
| 5 | Voice Discovery & Selection | **Draft** | Filesystem-scoped; new WAV files appear without restart but no validation feedback |
| 6 | Audio Playback Session (load → play → pause → seek → end) | **Draft** | Blob URL lifecycle (creation, revocation, memory leak risk) |
| 7 | Model Reload (?reload=1 on /health) | **Draft** | Stops in-progress generation, discards in-memory model, 120s again |
| 8 | Mobile Split-Screen Drag Resize | **Draft** | Touch events, canvas ratio, panel state — no spec for failure modes |
| 9 | Toast Notification Lifecycle (show → auto-dismiss → clear) | **Draft** | Module-level mutable state; timer cleanup on unmount |
| 10 | CI/CD Pipeline Execution | **Draft** | Three workflows (backend, frontend, root CI); no spec for what happens on failure |
| 11 | Docker Deployment & Service Ordering | **Draft** | Backend health check gates frontend start; 50-min max wait |
| 12 | Speaker WAV Generation Utility | **Draft** | generate_speaker_wavs.py — TTS or silent fallback |

---

## View 1: By Workflow

| Workflow | Spec file | Status | Trigger | Primary actor | Last reviewed |
|---|---|---|---|---|---|
| TTS Model Lifecycle | WORKFLOW-tts-model-lifecycle.md | Draft | Docker compose start | Backend service | 2026-08-02 |
| Speech Generation Pipeline | WORKFLOW-speech-generation.md | Draft | POST /api/generate | Customer (via UI) | 2026-08-02 |
| Audio File Lifecycle | WORKFLOW-audio-file-lifecycle.md | Draft | POST /api/generate, GET /api/history, POST /api/cleanup | Backend service (automatic) | 2026-08-02 |
| Frontend Application Bootstrap | WORKFLOW-frontend-bootstrap.md | Draft | Browser navigates to / | Customer | 2026-08-02 |
| Voice Discovery & Selection | WORKFLOW-voice-discovery.md | Draft | GET /api/voices (on mount) | Frontend (auto) | 2026-08-02 |
| Audio Playback Session | WORKFLOW-audio-playback.md | Draft | User clicks play | Customer (via UI) | 2026-08-02 |
| Model Reload | WORKFLOW-model-reload.md | Draft | GET /health?reload=1 | Customer (via UI) | 2026-08-02 |
| Mobile Split-Screen Drag Resize | WORKFLOW-mobile-panel-resize.md | Draft | Touch/mouse drag on divider | Customer (via UI) | 2026-08-02 |
| Toast Notification Lifecycle | WORKFLOW-toast-notifications.md | Draft | API call success/failure | Frontend (auto) | 2026-08-02 |
| CI/CD Pipeline Execution | WORKFLOW-ci-pipeline.md | Draft | Git push / PR | CI system | 2026-08-02 |
| Docker Deployment & Service Ordering | WORKFLOW-docker-deployment.md | Draft | docker compose up | Operator | 2026-08-02 |
| Speaker WAV Generation Utility | WORKFLOW-speaker-wav-generation.md | Draft | python generate_speaker_wavs.py | Operator | 2026-08-02 |

---

## View 2: By Component

| Component | File(s) | Workflows it participates in |
|---|---|---|
| **Backend** | | |
| FastAPI app | `backend/app.py` (594 lines) | TTS Model Lifecycle, Speech Generation Pipeline, Audio File Lifecycle, Model Reload, Voice Discovery & Selection |
| Speaker WAV generator | `backend/generate_speaker_wavs.py` (96 lines) | Speaker WAV Generation Utility |
| Test runner script | `scripts/run-backend-tests.sh` | CI/CD Pipeline Execution |
| **Frontend — Composables** | | |
| useTtsApi | `frontend/app/composables/useTtsApi.ts` (100 lines) | Speech Generation Pipeline, Frontend Application Bootstrap |
| useAudioModule | `frontend/app/composables/useAudioModule.ts` (182 lines) | Audio Playback Session |
| useHealthPoll | `frontend/app/composables/useHealthPoll.ts` (64 lines) | Frontend Application Bootstrap, TTS Model Lifecycle, Model Reload |
| useVoices | `frontend/app/composables/useVoices.ts` (39 lines) | Voice Discovery & Selection |
| useInputValidation | `frontend/app/composables/useInputValidation.ts` (30 lines) | Speech Generation Pipeline |
| useToast | `frontend/app/composables/useToast.ts` (58 lines) | Toast Notification Lifecycle |
| usePanelToggle | `frontend/app/composables/usePanelToggle.ts` (46 lines) | Mobile Split-Screen Drag Resize |
| useScrollReveal | `frontend/app/composables/useScrollReveal.ts` (74 lines) | Frontend Application Bootstrap |
| **Frontend — Components** | | |
| GenerateButton | `frontend/app/components/GenerateButton.vue` (162 lines) | Speech Generation Pipeline, Frontend Application Bootstrap |
| AudioPlayerPanel | `frontend/app/components/AudioPlayerPanel.vue` (161 lines) | Audio Playback Session |
| WaveformCanvas | `frontend/app/components/WaveformCanvas.vue` (176 lines) | Audio Playback Session |
| VoiceSelector | `frontend/app/components/VoiceSelector.vue` (230 lines) | Voice Discovery & Selection |
| SpeedSlider | `frontend/app/components/SpeedSlider.vue` (126 lines) | Speech Generation Pipeline |
| ToastNotification | `frontend/app/components/ToastNotification.vue` (82 lines) | Toast Notification Lifecycle |
| ModelStatusIndicator | `frontend/app/components/ModelStatusIndicator.vue` (43 lines) | TTS Model Lifecycle, Frontend Application Bootstrap |
| MobileStatusIndicator | `frontend/app/components/MobileStatusIndicator.vue` (43 lines) | TTS Model Lifecycle, Frontend Application Bootstrap |
| FocusHaloCanvas | `frontend/app/components/FocusHaloCanvas.vue` (70 lines) | Frontend Application Bootstrap |
| **Frontend — Page** | | |
| index.vue | `frontend/app/pages/index.vue` (751 lines) | All frontend workflows (orchestrator) |
| **Infrastructure** | | |
| Nginx config | `frontend/nginx.conf` (62 lines) | Docker Deployment & Service Ordering, Speech Generation Pipeline (proxy) |
| Docker Compose | `docker-compose.yml` (55 lines) | Docker Deployment & Service Ordering |
| CI workflows | `.github/workflows/{backend,frontend}.yml` | CI/CD Pipeline Execution |
| Quality gate | `run-tests.sh` | CI/CD Pipeline Execution |

---

## View 3: By User Journey

### Customer Journeys

| What the customer experiences | Underlying workflow(s) | Entry point |
|---|---|---|
| Opens the app and waits for model to load | Frontend Application Bootstrap, TTS Model Lifecycle | Browser navigates to `/` |
| Selects a voice and generates speech | Speech Generation Pipeline, Voice Discovery & Selection | Click "Generate Speech" button |
| Listens to generated audio | Audio Playback Session | AudioPlayerPanel auto-shown after generation |
| Downloads generated audio | Audio Playback Session (download action) | Download button in AudioPlayerPanel |
| Views audio history | Audio File Lifecycle (listing) | GET /api/history (implicit, not UI-exposed yet) |
| Sees a toast notification | Toast Notification Lifecycle | Auto-triggered on success/error |
| Drags the mobile panel divider | Mobile Split-Screen Drag Resize | Touch/mouse drag on divider |

### Operator Journeys

| What the operator does | Underlying workflow(s) | Entry point |
|---|---|---|
| Deploys the system | Docker Deployment & Service Ordering | `docker compose up` |
| Generates speaker reference WAV files | Speaker WAV Generation Utility | `python generate_speaker_wavs.py` |
| Forces model reload (troubleshooting) | Model Reload | GET /health?reload=1 |
| Runs quality gate before commit | CI/CD Pipeline Execution | `./run-tests.sh` |
| Manually cleans up old audio files | Audio File Lifecycle (cleanup) | POST /api/cleanup (not UI-exposed yet) |
| Checks system health | TTS Model Lifecycle | GET /health, docker healthcheck |

### System-to-System Journeys

| What happens automatically | Underlying workflow(s) | Trigger |
|---|---|---|
| TTS model loads at backend startup | TTS Model Lifecycle | FastAPI lifespan |
| Frontend polls /health every 2 seconds | Frontend Application Bootstrap | Vue `onMounted` |
| Audio files auto-cleaned after 24 hours | Audio File Lifecycle | GET /api/history?cleanup=true, POST /api/cleanup |
| Nginx proxies API requests to backend | Speech Generation Pipeline (proxy) | HTTP request to /api/* |
| Frontetnd starts only after backend is healthy | Docker Deployment & Service Ordering | Docker `depends_on` |
| CI runs lint + typecheck + tests on push | CI/CD Pipeline Execution | Git push to main/develop |
| Speaker WAVs discovered at runtime | Voice Discovery & Selection | GET /api/voices (on frontend mount) |

---

## View 4: By State

### TTS Model States (backend `model_load_status`)

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| `loading` | FastAPI lifespan starts, daemon thread spawns | → `ready`, `error` | TTS Model Lifecycle, Frontend Application Bootstrap |
| `ready` | Model loaded successfully, `tts_model` set | → `error` (load failure on retry), `loading` (reload) | TTS Model Lifecycle, Model Reload, Speech Generation Pipeline (reads state) |
| `error` | Load failed after 3 retries or hard timeout | → `loading` (reload) | TTS Model Lifecycle, Model Reload |

### Speech Generation States (implicit, no DB)

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| No file | Before POST /api/generate | → MP3 file in `/downloads/` | Speech Generation Pipeline |
| Intermediate WAV created | XTTS `tts_to_file()` succeeds | → deleted (after FFmpeg), or orphaned (FFmpeg failure) | Speech Generation Pipeline |
| MP3 file exists | FFmpeg conversion succeeds | → retained (within 24h), or deleted (cleanup) | Audio File Lifecycle |
| Metadata sidecar (.json) created | After MP3 write | → retained alongside MP3, or deleted with MP3 | Audio File Lifecycle |

### Audio File States (filesystem)

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Generated MP3 in `/downloads/` | POST /api/generate succeeds | → deleted after 24h | Audio File Lifecycle |
| Orphaned intermediate WAV in `/downloads/` | FFmpeg conversion fails (WAV not cleaned up? No — WAV is cleaned in finally block) | → deleted by cleanup | Audio File Lifecycle |
| Metadata sidecar `.json` | POST /api/generate (after MP3 write) | → deleted alongside MP3 | Audio File Lifecycle |

### Frontend Application States

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Unloaded (SPA HTML) | Browser navigates to `/` | → Loaded (JS executed) | Frontend Application Bootstrap |
| Loading (model not ready) | `useHealthPoll()` starts polling, `status = 'loading'` | → Ready, Error | Frontend Application Bootstrap |
| Ready (model loaded) | `/health` returns `model_loaded: true` | → (unmount) | Frontend Application Bootstrap, Speech Generation Pipeline |
| Error (model failed) | Health check returns non-200 or max retries exceeded | → (unmount) | Frontend Application Bootstrap |
| Generating (in-flight synthesis) | `isGenerating = true` | → Generated, Error | Speech Generation Pipeline |
| Generated (audio available) | `audioModule.load(blob)` succeeds | → Playing, Paused | Audio Playback Session |
| Playing | `audioModule.play()` succeeds | → Paused, Ended | Audio Playback Session |
| Paused | `audioModule.pause()` called | → Playing, Ended | Audio Playback Session |
| Ended (playback complete) | `<audio>` `ended` event fires | → (reset to Generated) | Audio Playback Session |

### Toast Notification States

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Pending (in `toastState.value` array) | `showToast()` called | → Dismissed (timer), or removed manually | Toast Notification Lifecycle |
| Dismissed (auto, 5s) | `DISPATCH_DELAY` timer fires | → (removed from array) | Toast Notification Lifecycle |
| Dismissed (manual, close button) | User clicks close button | → (removed from array) | Toast Notification Lifecycle |

### Panel States (desktop vs. mobile)

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Desktop side-by-side | `window.innerWidth >= 768` | → Mobile stacked (resize) | Mobile Split-Screen Drag Resize |
| Mobile stacked (canvas top, controls bottom) | `window.innerWidth < 768` | → Desktop side-by-side (resize) | Mobile Split-Screen Drag Resize |
| Mobile canvas ratio 0.25–0.85 | Drag divider moves ratio | → Released (snap to last ratio) | Mobile Split-Screen Drag Resize |

### Speaker WAV States (filesystem)

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| No WAV file in `speaker_wavs/` | Fresh install, files deleted | → WAV file exists | Voice Discovery & Selection |
| WAV file exists | Placed in `speaker_wavs/` or generated | → Deleted, or replaced | Voice Discovery & Selection, Speaker WAV Generation Utility |
| WAV file < 0.33s duration | Invalid file placed in directory | → Replaced with valid file | Speech Generation Pipeline (validation fails) |

---

## Handoff Contracts (Key Inter-System Boundaries)

### Frontend → Backend: Health Check (`GET /health`)
```
Payload: (none)
Query: ?reload=1 (optional, string)
Success: { status: "loading"|"ready"|"error", model_loaded: boolean }
Failure: HTTP 503 — "TTS model not ready" (if health endpoint itself unavailable)
Timeout: 30s (Nginx proxy_read_timeout for /health)
On Failure: Frontend polls retries (default 60 × 2s = 120s max); then status = 'error'
```

### Frontend → Backend: Voice Discovery (`GET /api/voices`)
```
Payload: (none)
Success: Array<{ id: string, name: string, dialect: string, tag: string, icon: string, speaker_wav: string }>
Failure: HTTP 500 — filesystem read error
Timeout: N/A (fast, directory scan)
On Failure: Frontend sets error ref; console.error logged; VoiceSelector shows empty state
```

### Frontend → Backend: Speech Generation (`POST /api/generate`)
```
Payload: { text: string (1-3000), language: "ar"|"en", speaker?: string, speed?: number (0.5-2.0), seed?: number }
Success: `audio/mpeg` binary (FileResponse) — MP3, 192k bitrate
Failure responses:
  - HTTP 400: Pydantic validation error (text too long, speed out of range)
  - HTTP 503: TTS model not ready (model_load_status != "ready")
  - HTTP 500: Speaker WAV not found
  - HTTP 500: Speaker WAV too short (< 0.33s)
  - HTTP 500: XTTS generation failed (no WAV output)
  - HTTP 500: FFmpeg conversion failed (explicit failure, no WAV fallback)
  - HTTP 500: Generic exception (unhandled error)
Timeout: 1800s (Nginx proxy_read_timeout for /api/*)
On Failure: Frontend catches error, calls showToast(message, 'error'), isGenerating = false
On Success: Frontend receives Blob → audioModule.load(blob) → auto-plays
Cleanup: Intermediate WAV file deleted after FFmpeg; MP3 retained in /downloads/
Sidecar: .json metadata written alongside MP3 (text, language, voice, speed, pitch, seed, created_at)
```

### Frontend → Backend: Audio History (`GET /api/history`)
```
Payload: (none)
Query: ?cleanup=true (optional, triggers inline cleanup of files > 24h)
Success: Array<{ filename, text, language, voice, speed, pitch, created_at }>
Failure: HTTP 500 — filesystem read error
Timeout: N/A (fast, directory scan)
On Failure: HTTP 500 raised; not caught in frontend (endpoint not UI-exposed yet)
Note: Cleanup errors during inline cleanup are silently logged (non-blocking)
```

### Frontend → Backend: Cleanup (`POST /api/cleanup`)
```
Payload: (none)
Success: { removed_count: number }
Failure: HTTP 500 — filesystem error (rare)
Timeout: N/A (fast, directory scan)
On Failure: HTTP 500 raised; not caught in frontend (endpoint not UI-exposed yet)
Note: Cleanup errors are silently logged (non-blocking)
```

### Backend Internal: Model Loading → API Readiness
```
From: FastAPI lifespan (daemon thread)
To: All API endpoints (read model_load_status)
Payload: N/A (in-memory global)
Success: tts_model set, model_load_status = "ready"
Failure: model_load_status = "error", tts_model = None
Timeout: 300s hard timeout (5 min), 3 retries with [2s, 4s, 8s] backoff
On Failure: All endpoints return 503; frontend polls until max retries (60 × 2s = 120s)
Ordering: Server responds immediately (lifespan yields); model loads in background
Race condition: Concurrent requests during loading receive 503 (correct)
```

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | TTS model loads in ~120s on CPU (per docs) | Documented, not verified against actual hardware | Frontend polling (60 × 2s = 120s) may timeout before model ready |
| A2 | Speaker WAV files are placed in `backend/speaker_wavs/` on the Docker host and mounted into the container | `docker-compose.yml` mounts `./backend/speaker_wavs:/app/speaker_wavs` | If mount fails (read-only filesystem), voices not discoverable |
| A3 | FFmpeg is always available in the backend container | `Dockerfile` installs ffmpeg | Without FFmpeg, generation fails with 500 (no WAV fallback) |
| A4 | `/downloads/` directory is writable inside the container | Code creates dir on startup (catches OSError) | If not writable, MP3 and .json files fail silently (non-fatal for MP3, non-fatal for .json) |
| A5 | The TTS model cache volume (`tts-model-cache`) is effectively unused (env var overrides mount point) | Documented in blueprint — `TTS_MODEL_CACHE=/app/.cache/tts` not the volume mount | ~2GB re-downloaded on every container restart |
| A6 | Only two speaker WAV files exist: `KSA Hamed - Male.wav` and `KSA Zariyah - Female.wav` | Listed in blueprint | Voice list is dynamic; adding/removing .wav files changes `/api/voices` response |
| A7 | Frontend is a single prerendered HTML page with no routing | `routeRules: { '/': { prerender: true } }` | No SPA routing means no route-based state persistence |
| A8 | No authentication exists on any endpoint | CORS `allow_origins=["*"]`, no auth middleware | Any caller on Docker network can call all endpoints |
| A9 | The `SynthesisResponse` Pydantic model is defined but never used | Documented in blueprint, confirmed in code | Dead code — `POST /api/generate` returns `FileResponse`, not JSON |
| A10 | `?reload=1` on `/health` fully reloads the TTS model (sets status to "loading", re-spawns thread) | Code section at `app.py:269-320` | In-progress generation is lost; model re-download takes ~120s |
| A11 | Frontend health polling stops on terminal state (ready or error) | `useHealthPoll.ts` sets `retryCount = maxRetries` on terminal state | No polling after model is ready or fails |
| A12 | Blob URLs created by `audioModule.load()` are revoked on `dispose()` | `useAudioModule.ts` tracks URLs in `objectUrls` Set | Without dispose, memory leak from unreleased object URLs |
| A13 | Mobile panel drag ratio is clamped to 0.25–0.85 | `index.vue` `Math.max(0.25, Math.min(0.85, ...))` | Panel never fully collapses or takes full height |
| A14 | Toast auto-dismisses after 5 seconds | `DISPATCH_DELAY = 5000` in `useToast.ts` | Stale toasts persist if timer doesn't fire (e.g., component unmount) |
| A15 | Frontend composables are auto-imported by Nuxt (no explicit `import` needed) | Nuxt convention, confirmed in code (composables used without imports in components) | If convention breaks, components fail to compile |

---

## Open Questions

1. **What happens when the TTS model crashes mid-generation?** (OOM, segfault, library error) — The daemon thread would die, `tts_model` stays set but unusable, all subsequent requests return 503. Is there a restart mechanism?

2. **What is the maximum text length that produces acceptable audio?** (3000 char limit at API level, but XTTS-v2 has its own limits.)

3. **What happens if `/downloads/` fills the Docker volume?** (No size limit on `tts-audio-cache` volume.)

4. **Is there any rate limiting on `/api/generate`?** (No — one user can flood the endpoint with synthesis requests.)

5. **What happens when a user generates audio while another user's generation is in progress?** (FastAPI is single-process; requests queue. Long queue = slow response.)

6. **Does `?reload=1` on `/health` abort in-progress generation requests?** (Likely yes — model becomes None, in-flight requests get 503.)

7. **What is the expected behavior when the backend container restarts during active generation?** (In-flight requests fail; MP3 files may be orphaned.)

8. **Is there any mechanism for the frontend to detect that the backend restarted?** (Health polling would transition `loading → ready` again, but no explicit notification.)

9. **What happens when the user navigates away (SPA unmount) during generation?** (`isGenerating` stays true; generation continues on backend; result is lost.)

10. **Are there any browser compatibility concerns with the audio playback?** (Blob URLs, `<audio>` element, MP3 codec support.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial registry created from full codebase scan | Identified 12 Missing workflows; all flagged in Red Flags |

---

*This registry was generated on 2026-08-02 from a full analysis of the Lughat Chat codebase (594-line backend, 751-line frontend, 9 components, 8 composables, 25 test files, 2 Docker services, 2 CI workflows, 5 API endpoints, 1 utility script).*
