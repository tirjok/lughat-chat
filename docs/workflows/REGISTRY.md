# Workflow Registry — Lughat Chat

> **Generated:** 2026-08-02
> **Scope:** Full monorepo (frontend + backend + deployment)
> **Source:** Discovered from actual code, not specs. Blueprints from `docs/architecture/BLUEPRINT.md` (Aug 2) used as reference.

---

## Red Flags: Missing Workflows

The following workflows exist in the codebase but have **no specification document**.
These are liabilities: they will be modified without understanding their full shape and will break.

| # | Workflow | Status | Where Found | Risk |
|---|---|---|---|---|
| **RF-1** | **Orphan File Cleanup** | Missing | `backend/app.py:476-498` (finally block), `backend/tests/test_orphan_cleanup.py` | Client disconnect during streaming leaves MP3 + .json on disk. The fix (Issue #3) was applied but never specified. Any future change to the `intermediate_files` list without updating the cleanup logic will reintroduce the bug. |
| **RF-2** | **Model Reload on Failure** | Missing | `backend/app.py:273-333` (`/health?reload=1`) | Triggers a full model re-load cycle. No spec covers: what happens if reload also fails? Is there a max-reload limit? Can reload be triggered while a synthesis is in progress (race condition on `_model_lock`)? |
| **RF-3** | **Voice Preview** | Missing | `frontend/app/components/VoiceSelector.vue:61-63` (`previewVoice()`) | Calls `showToast()` with a message but does not actually play audio. The intent is a 1-second voice sample — this is dead code or an incomplete feature. |
| **RF-4** | **Focus Halo Effect** | Missing | `frontend/app/components/FocusHaloCanvas.vue` | Radial gradient glow behind active RTL textarea. No spec covers: when does it activate/deactivate? What about multiple textareas? SSR compatibility? |
| **RF-5** | **Panel Focus Management** | Missing | `frontend/app/composables/usePanelToggle.ts:24-33` (`focusFirstInteractiveElement`) | Automatically focuses the first interactive element when panel switches. No spec covers: what if no interactive element exists? What is the focus trap behavior? |
| **RF-6** | **Keyboard Shortcut: Ctrl/Cmd+Enter** | Missing | `frontend/app/pages/index.vue:157-160` (`handleKeyDown`) | Synthesizes text when Ctrl/Cmd+Enter is pressed. No spec covers: when is it disabled? What if the model is loading? What about mobile (no keyboard)? |
| **RF-7** | **Mobile Divider Dragging** | Missing | `frontend/app/pages/index.vue:26-53` (`onDragStart/Move/End`) | Touch/mouse drag on the canvas/control-deck divider resizes panels. No spec covers: touch event handling, boundary constraints (0.25–0.85), `user-select` suppression during drag, `prefers-reduced-motion` interaction. |
| **RF-8** | **Volume Persistence Lifecycle** | Missing | `docker-compose.yml:11-14,52-54`, `scripts/test-volume-persistence.sh` | TTS model cache and audio cache persist across container restarts. No spec covers: what happens when the cache is full? What is the eviction policy? How large does the volume grow? |
| **RF-9** | **Nginx Large-File Streaming** | Missing | `frontend/nginx.conf:16-22` (`proxy_buffering off`, 1800s timeout) | Nginx disables buffering for `/api/*` and `/downloads/*` to stream large MP3 responses. No spec covers: what happens when the backend is slow? What is the memory impact of `proxy_buffering off` under concurrent load? |
| **RF-10** | **Startup Validation Sequence** | Missing | `scripts/init.sh` (5 validation steps) | Validates model weights, speaker directory, audio cache, Python deps, port availability. No spec covers: what is the recovery path for each validation failure? Is this run in production? |
| **RF-11** | **Frontend Application Lifecycle** | Missing | `frontend/app/pages/index.vue:53-76` (`useHealthPoll` on mount, `onUnmounted` dispose) | Health polling starts on mount, stops on terminal state. Audio module disposes on unmount. No spec covers: what happens if the user navigates away during synthesis? What happens if health polling fails mid-session? |

---

## View 1: By Workflow (Master List)

| # | Workflow | Spec File | Status | Trigger | Primary Actor | Last Reviewed |
|---|---|---|---|---|---|---|
| 1 | Model Initialization | `BLUEPRINT.md §6.4` | **Approved** | Container start (lifespan) | Backend (daemon thread) | 2026-08-02 |
| 2 | Text Synthesis | `BLUEPRINT.md §4.4, §5.1` | **Approved** | User clicks "Generate Speech" | Frontend → Backend | 2026-08-02 |
| 3 | Health Monitoring | `BLUEPRINT.md §6.4` | **Approved** | Frontend `onMounted` | Frontend (polling) | 2026-08-02 |
| 4 | Voice Discovery | `BLUEPRINT.md §4.3` | **Approved** | Frontend `onMounted` | Frontend → Backend | 2026-08-02 |
| 5 | Audio Playback | — | **Missing** | Successful synthesis | Frontend (useAudioModule) | — |
| 6 | Generation History | `BLUEPRINT.md §4.3` | **Approved** | `GET /api/history` | Backend | 2026-08-02 |
| 7 | Time-Based File Cleanup | `BLUEPRINT.md §4.3` | **Approved** | `GET /api/history?cleanup=true` or `POST /api/cleanup` | Backend | 2026-08-02 |
| 8 | Orphan File Cleanup | — | **Missing** | Client disconnect during streaming | Backend (finally block) | — |
| 9 | Model Reload on Failure | — | **Missing** | `GET /health?reload=1` | Backend | — |
| 10 | Container Startup/Health | `BLUEPRINT.md §7.1` | **Approved** | `docker compose up` | Docker Compose | 2026-08-02 |
| 11 | CI Pipeline Execution | `BLUEPRINT.md §7.4` | **Approved** | Push/PR to main/develop | GitHub Actions | 2026-08-02 |
| 12 | Volume Persistence | — | **Missing** | Container restart | Docker Compose | — |
| 13 | Docker Optimization | — | **Draft** | `scripts/optimize-docker.sh` | DevOps (manual) | — |
| 14 | E2E Stack Test | — | **Draft** | `scripts/test-e2e.sh` | QA (manual) | — |
| 15 | Startup Validation | — | **Draft** | `scripts/init.sh` | DevOps (manual) | — |
| 16 | Responsive Layout Toggle | — | **Missing** | Window resize (≥768px ↔ <768px) | Frontend (usePanelToggle) | — |
| 17 | Scroll Reveal Animation | — | **Missing** | Element enters viewport | Frontend (useScrollReveal) | — |
| 18 | Toast Notification System | — | **Missing** | `showToast()` call | Frontend (useToast) | — |
| 19 | Panel Focus Management | — | **Missing** | Panel switch | Frontend (usePanelToggle) | — |
| 20 | Focus Halo Effect | — | **Missing** | Textarea focus/blur | Frontend (FocusHaloCanvas) | — |
| 21 | Voice Preview | — | **Missing** | Voice selector hover/click | Frontend (VoiceSelector) | — |
| 22 | Model Loading Failure Recovery | — | **Missing** | `/health` returns `error` | Backend + Frontend | — |
| 23 | Frontend Application Lifecycle | — | **Missing** | SPA load/unload | Frontend | — |
| 24 | Keyboard Shortcut: Ctrl/Cmd+Enter | — | **Missing** | Key press | Frontend (index.vue) | — |
| 25 | Mobile Divider Dragging | — | **Missing** | Touch/mouse drag | Frontend (index.vue) | — |
| 26 | Nginx Large-File Streaming | — | **Missing** | `/api/*`, `/downloads/*` requests | Nginx | — |
| 27 | Multi-Page SPA Routing | `WORKFLOW-multi-page-spa-routing.md` | **Draft** | User clicks nav link / types URL / browser back-forward | Frontend (Nuxt Router + GlobalNavbar) | 2026-08-03 |

---

## View 2: By Component (Code → Workflows)

### Backend

| Component | File(s) | Workflows it participates in |
|---|---|---|
| `app.py` (FastAPI) | `backend/app.py` (626 lines) | Model Initialization, Text Synthesis, Health Monitoring, Voice Discovery, Generation History, Time-Based File Cleanup, Orphan File Cleanup, Model Reload on Failure |
| `lifespan()` | `backend/app.py:147-220` | Model Initialization, Model Loading Failure Recovery |
| `generate_speech()` | `backend/app.py:342-504` | Text Synthesis, Orphan File Cleanup |
| `get_history()` | `backend/app.py:507-588` | Generation History, Time-Based File Cleanup |
| `cleanup_old_files()` | `backend/app.py:591-625` | Time-Based File Cleanup |
| `health()` | `backend/app.py:272-332` | Health Monitoring, Model Reload on Failure, Model Loading Failure Recovery |
| `list_voices()` | `backend/app.py:336-339` | Voice Discovery |

### Frontend — Composables

| Composable | File | Workflows it participates in |
|---|---|---|
| `useHealthPoll` | `frontend/app/composables/useHealthPoll.ts` | Health Monitoring, Frontend Application Lifecycle |
| `useTtsApi` | `frontend/app/composables/useTtsApi.ts` | Text Synthesis |
| `useAudioModule` | `frontend/app/composables/useAudioModule.ts` | Audio Playback, Frontend Application Lifecycle |
| `useVoices` | `frontend/app/composables/useVoices.ts` | Voice Discovery, Frontend Application Lifecycle |
| `useInputValidation` | `frontend/app/composables/useInputValidation.ts` | Text Synthesis (precondition) |
| `useToast` | `frontend/app/composables/useToast.ts` | Toast Notification System, Voice Preview |
| `usePanelToggle` | `frontend/app/composables/usePanelToggle.ts` | Responsive Layout Toggle, Panel Focus Management |
| `useScrollReveal` | `frontend/app/composables/useScrollReveal.ts` | Scroll Reveal Animation |

### Frontend — Components

| Component | File | Workflows it participates in |
|---|---|---|
| `index.vue` (page) | `frontend/app/pages/index.vue` (751 lines) | Text Synthesis, Keyboard Shortcut: Ctrl/Cmd+Enter, Mobile Divider Dragging, Frontend Application Lifecycle |
| `AudioPlayerPanel.vue` | `frontend/app/components/AudioPlayerPanel.vue` | Audio Playback |
| `WaveformCanvas.vue` | `frontend/app/components/WaveformCanvas.vue` | Audio Playback (visualization) |
| `GenerateButton.vue` | `frontend/app/components/GenerateButton.vue` | Text Synthesis (trigger) |
| `VoiceSelector.vue` | `frontend/app/components/VoiceSelector.vue` | Voice Discovery, Voice Preview |
| `ModelStatusIndicator.vue` | `frontend/app/components/ModelStatusIndicator.vue` | Health Monitoring |
| `MobileStatusIndicator.vue` | `frontend/app/components/MobileStatusIndicator.vue` | Health Monitoring (mobile) |
| `SpeedSlider.vue` | `frontend/app/components/SpeedSlider.vue` | Text Synthesis (parameter) |
| `ToastNotification.vue` | `frontend/app/components/ToastNotification.vue` | Toast Notification System |
| `FocusHaloCanvas.vue` | `frontend/app/components/FocusHaloCanvas.vue` | Focus Halo Effect |

### Infrastructure

| Component | File(s) | Workflows it participates in |
|---|---|---|
| `docker-compose.yml` | `docker-compose.yml` (55 lines) | Container Startup/Health, Volume Persistence |
| `nginx.conf` | `frontend/nginx.conf` (63 lines) | Nginx Large-File Streaming, Frontend Application Lifecycle (SPA fallback) |
| `backend.yml` | `.github/workflows/backend.yml` | CI Pipeline Execution |
| `frontend.yml` | `.github/workflows/frontend.yml` | CI Pipeline Execution |
| `init.sh` | `scripts/init.sh` | Startup Validation |
| `test-e2e.sh` | `scripts/test-e2e.sh` | E2E Stack Test |
| `test-volume-persistence.sh` | `scripts/test-volume-persistence.sh` | Volume Persistence |
| `optimize-docker.sh` | `scripts/optimize-docker.sh` | Docker Optimization |
| `test-phase5.sh` | `scripts/test-phase5.sh` | Deprecated (Phase 5 wrapper) |

---

## View 3: By User Journey (User-Facing → Workflows)

### Customer Journeys

| What the customer experiences | Underlying workflow(s) | Entry point |
|---|---|---|
| Opens the app | Frontend Application Lifecycle → Health Monitoring → Voice Discovery | `GET /` (SPA load) |
| Sees model status | Health Monitoring (live polling) | `useHealthPoll` on mount |
| Selects a voice | Voice Discovery → Voice Preview | `VoiceSelector` dropdown |
| Types Arabic text | Text Synthesis (validation phase) | `textarea` input |
| Clicks "Generate Speech" | Text Synthesis → Audio Playback | `GenerateButton @click` |
| Hears synthesized speech | Audio Playback (playback, seek, download) | `AudioPlayerPanel` |
| Views generation history | Generation History → Time-Based File Cleanup | `/api/history` |
| Drags panel divider (mobile) | Mobile Divider Dragging | Touch/mouse on divider |
| Switches panels (desktop/mobile) | Responsive Layout Toggle → Panel Focus Management | `usePanelToggle.togglePanel()` |
| Uses keyboard shortcut | Keyboard Shortcut: Ctrl/Cmd+Enter | `handleKeyDown` |
| Sees scroll animations | Scroll Reveal Animation | IntersectionObserver |
| Sees toasts/notifications | Toast Notification System | `showToast()` |
| Sees focus glow behind textarea | Focus Halo Effect | Textarea focus/blur |

### Operator Journeys

| What the operator does | Underlying workflow(s) | Entry point |
|---|---|---|
| Deploys the stack | Container Startup/Health → Startup Validation | `docker compose up` |
| Checks service health | Health Monitoring (via `/health`) | `curl localhost:9000/health` |
| Adds a new voice | Voice Discovery (file-based) | Drop `.wav` into `speaker_wavs/` |
| Troubleshoots model loading | Model Initialization → Model Loading Failure Recovery → Model Reload on Failure | `/health?reload=1` |
| Manages disk space | Time-Based File Cleanup → Orphan File Cleanup | `POST /api/cleanup` or `GET /api/history?cleanup=true` |
| Runs quality checks | CI Pipeline Execution | GitHub Actions (push/PR) |
| Tests full stack | E2E Stack Test → Volume Persistence | `scripts/test-e2e.sh` |
| Optimizes Docker images | Docker Optimization | `scripts/optimize-docker.sh` |

### System-to-System Journeys

| What happens automatically | Underlying workflow(s) | Trigger |
|---|---|---|
| TTS model loads on container start | Model Initialization | `lifespan()` daemon thread |
| Frontend polls backend health | Health Monitoring | 2s interval, stops on terminal state |
| Nginx proxies API to backend | Nginx Large-File Streaming | Request routing |
| Generated audio persists across restarts | Volume Persistence | Named Docker volumes |
| Frontend waits for backend health | Container Startup/Health | `depends_on: service_healthy` |
| CI runs tests on push/PR | CI Pipeline Execution | GitHub Actions trigger |

---

## View 4: By State (State → Workflows)

### TTS Model States

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| `loading` (backend) | Container start (`lifespan()`) | → `ready`, `error` | Model Initialization (step 1) |
| `ready` (backend) | Model Initialization (success) | (terminal until reload) | Model Reload on Failure (via `/health?reload=1`) |
| `error` (backend) | Model Initialization (failure), Health check (non-200) | (terminal until reload) | Model Reload on Failure (via `/health?reload=1`) |
| `loading` (frontend) | `useHealthPoll` on mount | → `ready`, `error` | Health Monitoring (polling result) |
| `ready` (frontend) | Health Monitoring (status === "ready") | (terminal — stops polling) | — |
| `error` (frontend) | Health Monitoring (non-200, or max retries) | (terminal — stops polling) | — |

### Audio Generation States

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| `idle` (no audio) | App load | → `loading` | Text Synthesis (user action) |
| `loading` (synthesizing) | `handleSynthesize()` sets `isGenerating=true` | → `playing`, `error` | Text Synthesis (backend response) |
| `playing` | `audioModule.load()` + `play()` | → `paused`, `ended`, `idle` | Audio Playback (pause, end, close) |
| `paused` | `audioModule.pause()` | → `playing`, `idle` | Audio Playback (toggle, close) |
| `error` (generation) | Non-200 response from `/api/generate` | → `idle` | Text Synthesis (error toast) |
| `error` (playback) | Audio element error event | → `idle` | Audio Playback (error toast) |

### File System States

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Orphaned MP3 + .json | Client disconnect during streaming | → deleted | Orphan File Cleanup (finally block) |
| Old MP3 + .json (>24h) | Time passes | → deleted | Time-Based File Cleanup |
| Orphaned WAV | FFmpeg failure | → deleted | Orphan File Cleanup (WAV always cleaned) |
| Persisted model cache | `TTS("tts_models/multilingual/xtts_v2")` | (persists across restarts) | Volume Persistence (named volume) |
| Persisted audio cache | Generated files in `/app/downloads/` | (persists across restarts) | Volume Persistence (named volume) |

### Frontend UI States

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Panel: `control-deck` (active) | App load, panel toggle | → `canvas` | Panel Focus Management (switch) |
| Panel: `canvas` (active) | Panel toggle | → `control-deck` | Panel Focus Management (switch) |
| Panel: mobile (stacked) | Window < 768px | → desktop (≥768px) | Responsive Layout Toggle (resize) |
| Panel: desktop (side-by-side) | Window ≥ 768px | → mobile (<768px) | Responsive Layout Toggle (resize) |
| Divider dragging | `onDragStart` | → not dragging | Mobile Divider Dragging (drag end) |
| Toast visible | `showToast()` | → dismissed (5s) | Toast Notification System (auto-dismiss, manual close) |
| Halo active | Textarea focus | → not active (blur) | Focus Halo Effect (blur) |

---

## Test Coverage Map

| Workflow | Has Tests? | Test Files | Coverage Quality |
|---|---|---|---|
| Model Initialization | Partial | `test_health.py` (health endpoint) | Endpoint tested, but background thread behavior not tested |
| Text Synthesis | Yes | `test_generate.py`, `test_generate_blob.py`, `test_ffmpeg_fallback.py` | Strong — validates validation, 503, 500, success, English, custom voice |
| Health Monitoring | Partial | `useHealthPoll.test.ts` | Frontend polling tested, but backend reload logic not tested |
| Voice Discovery | Yes | `test_voices.py`, `useVoices.test.ts` | Both backend and frontend tested |
| Audio Playback | Yes | `useAudioModule.test.ts`, `AudioPlayerPanel.test.ts` | Strong — load, play, pause, seek, download, dispose |
| Generation History | Yes | `test_history.py` | Backend tested |
| Time-Based File Cleanup | Partial | `test_history.py` (cleanup param) | Only implicit cleanup tested, explicit `/api/cleanup` endpoint not tested |
| Orphan File Cleanup | Yes (source check) | `test_orphan_cleanup.py` | **Source-level assertion only** — verifies code exists but does not test behavior |
| Model Reload on Failure | Partial | `test_health.py` (reload param) | Reload endpoint tested but failure recovery path not tested |
| Container Startup/Health | Partial | `test-volume-persistence.sh` (restarts), `test-e2e.sh` | Manual scripts, no automated test |
| CI Pipeline Execution | N/A (infra) | N/A | — |
| Responsive Layout Toggle | Partial | `PanelSliding.test.ts` | Layout tested, but divider dragging logic not tested |
| Keyboard Shortcut | Partial | `ToastShortcut.test.ts` | Tests toast keyboard shortcut, not Ctrl+Enter synthesis |
| Focus Halo Effect | No | — | **No tests** — component exists, behavior untested |
| Panel Focus Management | No | — | **No tests** — composable exists, behavior untested |
| Voice Preview | No | — | **No tests** — dead code (toast only, no audio played) |
| Scroll Reveal Animation | No | — | **No tests** — composable exists, behavior untested |
| Toast Notification System | Partial | `useToast.test.ts`, `ToastNotification.test.ts`, `ToastShortcut.test.ts` | Core toast tested, but auto-dismiss timer behavior not tested |
| Nginx Large-File Streaming | No | — | **No tests** — config exists, behavior untested |
| Startup Validation | No | `test-phase5.sh` references `init.sh` | Manual script, no automated test |

---

## Deprecated Workflows

These workflows exist in the codebase but are no longer actively used or have been superseded.

| Workflow | Replaced By | Reason |
|---|---|---|
| Phase 5 Test Suite | `./run-tests.sh` (quality gate) | `test-phase5.sh` is a wrapper that calls other scripts — now redundant since `run-tests.sh` is the single source of truth |
| e2e.sh TTS endpoint test | `test_generate.py` (unit tests) | `test-e2e.sh` uses `/api/tts` (wrong endpoint — actual is `/api/generate`), mock-only test |
| optimize-docker.sh | Manual multi-stage builds | Generates temp Dockerfiles in `/tmp/` — not used in CI or production |
| `/api/tts` endpoint (e2e script) | `/api/generate` | e2e script references wrong endpoint name |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | TTS model loading happens in a **daemon thread** (background, doesn't block server start) | `backend/app.py:212` (`daemon=True`) | If thread is not daemon, server shutdown waits for model load |
| A2 | Speaker WAV files are **mounted from host** (`./backend/speaker_wavs:/app/speaker_wavs`) | `docker-compose.yml:16` | Adding new voices requires host file + container restart |
| A3 | FFmpeg is **always available** in the backend container | `backend/Dockerfile` (ffmpeg installed) | Without FFmpeg, all synthesis fails with 500 |
| A4 | The `proxy_buffering off` in Nginx means **all audio responses stream unbuffered** | `frontend/nginx.conf:21-22` | High memory usage under concurrent load |
| A5 | Frontend health polling **respects** the backend's 300s hard timeout (150 retries × 2s = 300s) | `useHealthPoll.ts:12`, `app.py:157` | If mismatched, frontend gives up before backend finishes |
| A6 | The `seed` parameter provides **deterministic** TTS output (for testing/debugging) | `app.py:385-393` (torch.manual_seed) | Coqui XTTS may not honor PyTorch seed — output could vary |
| A7 | Orphan cleanup only runs when the **response is never delivered** (`_response_delivered` flag) | `app.py:465,476-486` | If the flag is incorrectly set, successful responses leave orphaned files |
| A8 | The `quality gate` (`./run-tests.sh`) is run **before every commit** via pre-commit hooks | `AGENTS.md §5, §6` | If hooks are bypassed, broken code reaches main |

---

## Open Questions

1. **Model reload during active synthesis** — If `/health?reload=1` is called while a synthesis is in progress, the `_model_lock` serializes access. Does the in-flight synthesis fail? What does the client see?
2. **Voice preview intent** — `VoiceSelector.vue:61-63` calls `showToast()` with "Playing 1-second preview" but no audio is played. Is this intentional (placeholder) or a bug?
3. **Concurrent synthesis limit** — The single `_model_lock` serializes all synthesis requests. What happens under concurrent load? Is there a queue?
4. **Cache size growth** — TTS model cache is ~2GB. Audio cache grows indefinitely (only 24h TTL). What is the expected disk usage at scale?
5. **Nginx `proxy_buffering off` under load** — Without buffering, Nginx holds the connection open for up to 1800s. What is the memory impact?
6. **Deterministic seed** — Coqui XTTS-v2 may not honor `torch.manual_seed()` for all random operations (attention, sampling). Is the seed truly deterministic?
7. **Startup validation in production** — `init.sh` validates model weights, speaker directory, etc. Is this script run in production? It is not referenced in `Dockerfile` or `docker-compose.yml`.
8. **Mobile keyboard shortcut** — Ctrl/Cmd+Enter synthesis shortcut is meaningless on mobile devices. Is this expected?
