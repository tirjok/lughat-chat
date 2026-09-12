# Workflow Registry — Lughat Chat

> **Generated:** 2026-08-19 (updated from 2026-08-08)
> **Scope:** Full monorepo (frontend + backend + deployment)
> **Source:** Discovered from actual code — every route, composable, page, component, script, and config scanned.

---

## Red Flags: Missing Workflows

The following workflows exist in the codebase but have **no specification document**.
These are liabilities: they will be modified without understanding their full shape and will break.

| # | Workflow | Status | Where Found | Risk |
|---|---|---|---|---|
| **RF-1** | **Text Synthesis (full)** | **Missing** | `backend/app.py:342-504`, `frontend/app/pages/index.vue:96-131`, `frontend/app/composables/useTtsApi.ts` | The happy path is documented in BLUEPRINT.md §4.4, but no spec covers: validation failures (422), model not ready (503), missing speaker WAV (500), FFmpeg failure (500), client disconnect during streaming (orphan cleanup), race condition on `_model_lock` during concurrent synthesis, seed determinism limits. |
| **RF-2** | **Model Initialization (full)** | **Missing** | `backend/app.py:147-220` (lifespan) | Backend model loading with 3 retries, exponential backoff (2s, 4s, 8s), 5min hard timeout. No spec covers: what happens if all 3 retries fail? What does the frontend show after 300s? Can the frontend poll during a reload? |
| **RF-3** | **Model Reload on Failure** | **Missing** | `backend/app.py:273-333` (`/health?reload=1`) | Triggers a full model re-load cycle. No spec covers: what happens if reload also fails? Is there a max-reload limit? Can reload be triggered while a synthesis is in progress (race condition on `_model_lock`)? |
| **RF-4** | **Frontend Application Lifecycle** | **Missing** | `frontend/app/pages/index.vue:53-76` (useHealthPoll on mount, onUnmounted dispose) | Health polling starts on mount, stops on terminal state. Audio module disposes on unmount. No spec covers: what happens if the user navigates away during synthesis? What happens if health polling fails mid-session? What happens on dashboard/lesson pages (different composables mount)? |
| **RF-5** | **Audio Playback Lifecycle** | **Missing** | `frontend/app/composables/useAudioModule.ts` (load, play, pause, seek, download, dispose) | Full audio state machine: idle → loading → playing → paused → ended. No spec covers: error handling (audio element error), blob URL memory leaks, concurrent audio element handling, `onPlaybackEnd` callback, download as separate navigation. |
| **RF-6** | **Keyboard Shortcut: Ctrl/Cmd+Enter** | **Missing** | `frontend/app/pages/index.vue:138-142` (`handleKeyDown`) | Synthesizes text when Ctrl/Cmd+Enter is pressed. No spec covers: when is it disabled? What if the model is loading? What about mobile (no keyboard)? What about the text validation state? |
| **RF-7** | **Responsive Layout Toggle** | **Missing** | `frontend/app/composables/usePanelToggle.ts` (resize listener, `BREAKPOINT_MOBILE = 768`) | Window resize triggers `isMobile` state change, which toggles between `MobileSplitScreen` and `DesktopPanels`. No spec covers: what happens during resize (flash of wrong layout)? How does the divider ratio persist across breakpoint crossings? |
| **RF-8** | **Scroll Reveal Animation** | **Missing** | `frontend/app/composables/useScrollReveal.ts` (IntersectionObserver) | Elements with class "fade-up" fade up when entering viewport. No spec covers: what if IntersectionObserver is not supported? What happens when the container is null? How does `prefers-reduced-motion` interact? |
| **RF-9** | **Toast Notification System** | **Missing** | `frontend/app/composables/useToast.ts` + `ToastNotification.vue` | Auto-dismiss after 5s, manual close, 3 types (success/error/info). No spec covers: what happens if 10+ toasts fire rapidly? Timer leaks on component unmount? Toast ordering (newest on top or bottom)? |
| **RF-10** | **Volume Persistence Lifecycle** | **Missing** | `docker-compose.yml:11-14,52-54` | TTS model cache (~2GB) and audio cache persist across container restarts via named volumes. No spec covers: what happens when the cache is full? What is the eviction policy? How large does the volume grow? |
| **RF-11** | **Nginx Large-File Streaming** | **Missing** | `frontend/nginx.conf:16-22` (`proxy_buffering off`, 1800s timeout) | Nginx disables buffering for `/api/*` and `/downloads/*` to stream large MP3 responses. No spec covers: what happens when the backend is slow? What is the memory impact of `proxy_buffering off` under concurrent load? |
| **RF-12** | **Startup Validation Sequence** | **Missing** | `scripts/init.sh` (5 validation steps) | Validates model weights, speaker directory, audio cache, Python deps, port availability. No spec covers: what is the recovery path for each validation failure? Is this run in production? |
| **RF-13** | **Model Loading Failure Recovery** | **Missing** | `backend/app.py:196-198` (lifespan retries), `frontend/app/composables/useHealthPoll.ts` (150 retries × 2s) | When model loading fails after 3 retries + 5min timeout, the status is `"error"`. No spec covers: what does the frontend show? How long does the frontend poll before giving up (300s)? Can the user manually trigger recovery? |
| **RF-14** | **Voice Preview (Dead Code)** | **Missing** | `frontend/app/components/VoiceSelector.vue:62-64` (`previewVoice()`) | Calls `showToast()` with "Playing 1-second preview of {name}..." but does NOT actually play audio. This is dead code or an incomplete feature. No spec covers: the intended behavior. |
| **RF-15** | **Focus Halo Effect** | **Missing** | `frontend/app/components/FocusHaloCanvas.vue` | Radial gradient glow behind active RTL textarea. No spec covers: when does it activate/deactivate? What about multiple textareas? SSR compatibility? What triggers the blur handler (textarea empty vs non-empty)? |
| Lesson Details Page Session | WORKFLOW-lesson-details-page.md | Draft (updated 2026-08-19) | Navigation to /dashboard/level/{level}/{lesson} | Frontend (page orchestrator) | 2026-08-19 |
| **RF-17** | **Mobile Divider Dragging** | **Missing** | `frontend/app/composables/useDragResize.ts` | Touch/mouse drag on the canvas/control-deck divider resizes panels. No spec covers: touch event handling, boundary constraints (0.25–0.85), `user-select` suppression during drag, `prefers-reduced-motion` interaction, window resize during drag. |
| **RF-18** | **Generation History + Cleanup** | **Missing** | `backend/app.py:507-625` (`/api/history`, `/api/cleanup`) | Two endpoints, one reads history (with optional inline cleanup), the other explicitly cleans old files. No spec covers: what is the difference between inline cleanup (history) and explicit cleanup? What happens if the JSON sidecar is missing? What is the 24h TTL boundary? |
| **RF-19** | **Container Startup/Health** | **Missing** | `docker-compose.yml` (health check, depends_on) | Docker health check polls `/health` every 15s with 60 retries and 60s start_period. Frontend container waits for `backend: service_healthy`. No spec covers: what happens if the backend never becomes healthy? What is the frontend timeout? |
| **RF-20** | **CI Pipeline Execution** | **Missing** | `.github/workflows/frontend.yml`, `.github/workflows/backend.yml` | Frontend CI: pnpm → lint → typecheck → vitest. Backend CI: Python 3.12 → pytest + coverage. No spec covers: what happens when CI fails? Are there manual re-run procedures? Do pipelines run in parallel or sequentially? |
| **RF-21** | **E2E Stack Test** | **Missing** | `scripts/test-e2e.sh` | Brings up containers, tests health, tests frontend, tests TTS (mock), tests volume persistence (down/up), tears down. No spec covers: what is the expected duration? What if Docker is not installed? |
| **RF-22** | **Docker Optimization** | **Missing** | `scripts/optimize-docker.sh` | Generates temp Dockerfiles in `/tmp/`, builds optimized images, shows sizes, cleans up. No spec covers: is this used in CI? (Answer: no — it is a manual tool.) What are the optimization differences from the production Dockerfiles? |
| **RF-23** | **Frontend SPA Routing** | **Missing** | `frontend/nuxt.config.ts` (routeRules), `frontend/app/app.vue` (route matching) | Nuxt file-based routing with prerender rules. `app.vue` manually accesses route via `globalThis.useNuxtApp()` (not `useRoute()`) to avoid test failures. No spec covers: what happens with unknown routes (404)? What is the SPA fallback behavior? |
| **RF-24** | **Cross-Page Composable Lifecycle** | **Missing** | `frontend/app/composables/useHealthPoll.ts` (singleton), `frontend/app/composables/useVoices.ts` (page-scoped) | `useHealthPoll` returns a singleton (shared across all pages). `useVoices` is page-scoped (reloads on every page mount). No spec covers: what happens when navigating between pages? Does the singleton prevent memory leaks? |
| **RF-25** | **In-Flight Synthesis Cleanup** | **Missing** | `frontend/app/composables/useCleanupNavigation.ts`, `frontend/app/components/CleanupDialog.vue` | Shows confirmation dialog when navigating away during active synthesis. Options: "Clean & Leave" (dispose + POST /api/cleanup) or "Stay" (cancel navigation). No spec covers: what happens if the cleanup POST fails (503 vs other error)? What about rapid dialog dismissal? |
| **RF-26** | **Session Cleanup (24h TTL)** | **Missing** | `backend/app.py:562-583` (inline cleanup in `/api/history`), `backend/app.py:591-625` (`/api/cleanup`) | Files older than 24 hours are removed. Two code paths: inline (during history fetch) and explicit (POST /api/cleanup). No spec covers: race conditions (file modified during scan)? What about the `.json` sidecar (always removed with the MP3)? |
| **RF-27** | **Global Navbar Navigation** | **Draft** (exists: `WORKFLOW-global-navbar-navigation.md`) | `frontend/app/components/GlobalNavbar.vue`, `frontend/app/app.vue` | The spec exists but has not been verified against the actual code. Key discrepancy: `app.vue` uses `globalThis.useNuxtApp()` (not `useRoute()`), and the progress bar uses a lesson number heuristic (not actual lesson data). Status: **Review** until verified. |

---

## View 1: By Workflow (Master List)

| # | Workflow | Spec File | Status | Trigger | Primary Actor | Last Reviewed |
|---|---|---|---|---|---|---|
| 1 | **Model Initialization** | — | **Missing** | Container start (lifespan) | Backend (daemon thread) | 2026-08-08 |
| 2 | **Text Synthesis** | — | **Missing** | User clicks "Generate Speech" | Frontend → Backend | 2026-08-08 |
| 3 | **Health Monitoring** | — | **Missing** | Frontend `onMounted` | Frontend (polling) | 2026-08-08 |
| 4 | **Voice Discovery** | — | **Missing** | Frontend `onMounted` | Frontend → Backend | 2026-08-08 |
| 5 | **Audio Playback Lifecycle** | — | **Missing** | Successful synthesis | Frontend (useAudioModule) | 2026-08-08 |
| 6 | **Generation History + Cleanup** | — | **Missing** | `GET /api/history`, `POST /api/cleanup` | Backend | 2026-08-08 |
| 7 | **Model Reload on Failure** | — | **Missing** | `GET /health?reload=1` | Backend | 2026-08-08 |
| 8 | **Model Loading Failure Recovery** | — | **Missing** | `/health` returns `error` | Backend + Frontend | 2026-08-08 |
| 9 | **Frontend Application Lifecycle** | — | **Missing** | SPA load/unload | Frontend | 2026-08-08 |
| 10 | **Container Startup/Health** | — | **Missing** | `docker compose up` | Docker Compose | 2026-08-08 |
| 11 | **CI Pipeline Execution** | — | **Missing** | Push/PR to main/develop | GitHub Actions | 2026-08-08 |
| 12 | **Volume Persistence Lifecycle** | — | **Missing** | Container restart | Docker Compose | 2026-08-08 |
| 13 | **Nginx Large-File Streaming** | — | **Missing** | `/api/*`, `/downloads/*` requests | Nginx | 2026-08-08 |
| 14 | **Startup Validation Sequence** | — | **Missing** | `scripts/init.sh` (manual) | DevOps (manual) | 2026-08-08 |
| 15 | **E2E Stack Test** | — | **Missing** | `scripts/test-e2e.sh` (manual) | QA (manual) | 2026-08-08 |
| 16 | **Docker Optimization** | — | **Missing** | `scripts/optimize-docker.sh` (manual) | DevOps (manual) | 2026-08-08 |
| 17 | **Frontend SPA Routing** | — | **Missing** | User navigates, types URL, browser back/forward | Frontend (Nuxt Router) | 2026-08-08 |
| 18 | **Cross-Page Composable Lifecycle** | — | **Missing** | Page navigation | Frontend (composables) | 2026-08-08 |
| 19 | **In-Flight Synthesis Cleanup** | — | **Missing** | Navigate away during synthesis | Frontend (cleanup composable) | 2026-08-08 |
| 20 | **Keyboard Shortcut: Ctrl/Cmd+Enter** | — | **Missing** | Key press | Frontend (index.vue) | 2026-08-08 |
| 21 | **Responsive Layout Toggle** | — | **Missing** | Window resize (≥768px ↔ <768px) | Frontend (usePanelToggle) | 2026-08-08 |
| 22 | **Scroll Reveal Animation** | — | **Missing** | Element enters viewport | Frontend (useScrollReveal) | 2026-08-08 |
| 23 | **Toast Notification System** | — | **Missing** | `showToast()` call | Frontend (useToast) | 2026-08-08 |
| 24 | **Panel Focus Management** | — | **Missing** | Panel switch | Frontend (usePanelToggle) | 2026-08-08 |
| 25 | **Focus Halo Effect** | — | **Missing** | Textarea focus/blur | Frontend (FocusHaloCanvas) | 2026-08-08 |
| 26 | **Voice Preview (Dead Code)** | — | **Missing** | Voice selector hover/click | Frontend (VoiceSelector) | 2026-08-08 |
| 27 | **Mobile Divider Dragging** | — | **Missing** | Touch/mouse drag | Frontend (useDragResize) | 2026-08-08 |
| 28 | **Session Cleanup (24h TTL)** | — | **Missing** | Time passes, API calls | Backend (file system) | 2026-08-08 |
| 29 | **Multi-Page SPA Routing** | `WORKFLOW-multi-page-spa-routing.md` | **Draft** | User clicks nav link / types URL / browser back-forward | Frontend (Nuxt Router + GlobalNavbar) | 2026-08-08 |
| 31 | **Lesson Data Model Alignment** | `WORKFLOW-lesson-data-model-alignment.md` | **Draft** | Developer restructures curriculum.ts | Frontend (data layer) | 2026-08-16 |

---

## View 2: By Component (Code → Workflows)

### Backend

| Component | File(s) | Workflows it participates in |
|---|---|---|
| `app.py` (FastAPI) | `backend/app.py` (626 lines) | Model Initialization, Text Synthesis, Health Monitoring, Voice Discovery, Generation History + Cleanup, Session Cleanup (24h TTL), Model Reload on Failure, Model Loading Failure Recovery |
| `lifespan()` | `backend/app.py:147-220` | Model Initialization, Model Loading Failure Recovery |
| `generate_speech()` | `backend/app.py:342-504` | Text Synthesis, Session Cleanup (24h TTL) |
| `get_history()` | `backend/app.py:507-588` | Generation History + Cleanup, Session Cleanup (24h TTL) |
| `cleanup_old_files()` | `backend/app.py:591-625` | Generation History + Cleanup |
| `health()` | `backend/app.py:272-333` | Health Monitoring, Model Reload on Failure, Model Loading Failure Recovery |
| `list_voices()` | `backend/app.py:336-339` | Voice Discovery |
| `discover_voices()` | `backend/app.py:116-129` | Voice Discovery |

### Frontend — Pages

| Page | File | Workflows it participates in |
|---|---|---|
| TTS Studio (`/`) | `frontend/app/pages/index.vue` (239 lines) | Text Synthesis, Frontend Application Lifecycle, Keyboard Shortcut: Ctrl/Cmd+Enter, In-Flight Synthesis Cleanup, Responsive Layout Toggle, Audio Playback Lifecycle |
| Dashboard (`/dashboard`) | `frontend/app/pages/dashboard.vue` (73 lines) | Frontend Application Lifecycle, Frontend SPA Routing |
| Level Index (`/dashboard/level/[level]`) | `frontend/app/pages/dashboard/level/index.vue` (57 lines) | Frontend SPA Routing |
| Lesson page (`[lesson].vue`) | `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (197 lines) | Lesson Details Page Session (Draft) |

### Frontend — Composables

| Composable | File | Workflows it participates in |
|---|---|---|
| `useHealthPoll` | `frontend/app/composables/useHealthPoll.ts` | Health Monitoring, Frontend Application Lifecycle, Cross-Page Composable Lifecycle |
| Audio Module (`useAudioModule.ts`) | `frontend/app/composables/useAudioModule.ts` | TTS Flow (Draft), Lesson Details Page Session (Draft) |
| TTS API Client (`useTtsApi.ts`) | `frontend/app/composables/useTtsApi.ts` | TTS Flow (Draft), Lesson Details Page Session (Draft) |
| `useVoices` | `frontend/app/composables/useVoices.ts` | Voice Discovery, Frontend Application Lifecycle, Cross-Page Composable Lifecycle |
| `useInputValidation` | `frontend/app/composables/useInputValidation.ts` | Text Synthesis (precondition) |
| `usePanelToggle` | `frontend/app/composables/usePanelToggle.ts` | Responsive Layout Toggle, Panel Focus Management, Cross-Page Composable Lifecycle |
| `useScrollReveal` | `frontend/app/composables/useScrollReveal.ts` | Scroll Reveal Animation |
| `useToast` | `frontend/app/composables/useToast.ts` | Toast Notification System, Voice Preview (Dead Code) |
| `useCleanupNavigation` | `frontend/app/composables/useCleanupNavigation.ts` | In-Flight Synthesis Cleanup |
| `useDragResize` | `frontend/app/composables/useDragResize.ts` | Mobile Divider Dragging, Responsive Layout Toggle |

### Frontend — Components

| Component | File | Workflows it participates in |
|---|---|---|
| Global Navbar (`GlobalNavbar.vue`) | `frontend/app/components/GlobalNavbar.vue` | Health Monitoring (Approved), Lesson Details Page Session (Draft) |
| `CleanupDialog.vue` | `frontend/app/components/CleanupDialog.vue` (57 lines) | In-Flight Synthesis Cleanup |
| Sticky Audio Bar (`StickyAudioBar.vue`) | `frontend/app/components/StickyAudioBar.vue` | TTS Flow (Draft), Lesson Details Page Session (Draft) |
| `VoiceSelector.vue` | `frontend/app/components/VoiceSelector.vue` (231 lines) | Voice Discovery, Voice Preview (Dead Code) |
| `GenerateButton.vue` | `frontend/app/components/GenerateButton.vue` (163 lines) | Text Synthesis (trigger) |
| `ModelStatusIndicator.vue` | `frontend/app/components/ModelStatusIndicator.vue` (45 lines) | Health Monitoring |
| `MobileStatusIndicator.vue` | `frontend/app/components/MobileStatusIndicator.vue` (45 lines) | Health Monitoring (mobile) |
| `FocusHaloCanvas.vue` | `frontend/app/components/FocusHaloCanvas.vue` (71 lines) | Focus Halo Effect |
| `SpeedSlider.vue` | `frontend/app/components/SpeedSlider.vue` (123 lines) | Text Synthesis (parameter), Audio Playback Lifecycle (parameter) |
| `ToastNotification.vue` | `frontend/app/components/ToastNotification.vue` (84 lines) | Toast Notification System |
| `WaveformCanvas.vue` | `frontend/app/components/WaveformCanvas.vue` (164 lines) | Audio Playback Lifecycle (visualization) |
| `DesktopPanels.vue` | `frontend/app/components/DesktopPanels.vue` (307 lines) | Responsive Layout Toggle, Scroll Reveal Animation |
| `MobileSplitScreen.vue` | `frontend/app/components/MobileSplitScreen.vue` (294 lines) | Mobile Divider Dragging, Responsive Layout Toggle |
| `curriculum.ts` | `frontend/app/data/curriculum.ts` (786 lines) | Lesson Data Model Alignment |
| Lesson Hero (`LessonHero.vue`) | `frontend/app/components/LessonHero.vue` | Lesson Details Page Session (Draft) |
### Infrastructure

| Component | File(s) | Workflows it participates in |
|---|---|---|
| `docker-compose.yml` | `docker-compose.yml` (55 lines) | Container Startup/Health, Volume Persistence Lifecycle |
| `nginx.conf` | `frontend/nginx.conf` (63 lines) | Nginx Large-File Streaming, Frontend SPA Routing (SPA fallback) |
| `frontend.yml` | `.github/workflows/frontend.yml` | CI Pipeline Execution |
| `backend.yml` | `.github/workflows/backend.yml` | CI Pipeline Execution |
| `init.sh` | `scripts/init.sh` (205 lines) | Startup Validation Sequence |
| `test-e2e.sh` | `scripts/test-e2e.sh` (108 lines) | E2E Stack Test |
| `optimize-docker.sh` | `scripts/optimize-docker.sh` (162 lines) | Docker Optimization |
| `test-phase5.sh` | `scripts/test-phase5.sh` (111 lines) | Deprecated (Phase 5 wrapper) |
| `test-volume-persistence.sh` | `scripts/test-volume-persistence.sh` (159 lines) | Volume Persistence Lifecycle (test) |
| `nuxt.config.ts` | `frontend/nuxt.config.ts` (75 lines) | Frontend SPA Routing (routeRules) |

---

## View 3: By User Journey (User-Facing → Workflows)

### Customer Journeys

| What the customer experiences | Underlying workflow(s) | Entry point |
|---|---|---|
| Opens the app | Frontend Application Lifecycle → Health Monitoring → Voice Discovery | `GET /` (SPA load) |
| Sees model status | Health Monitoring (live polling) | `useHealthPoll` on mount |
| Selects a voice | Voice Discovery → Voice Preview (Dead Code) | `VoiceSelector` dropdown |
| Types Arabic text | Text Synthesis (validation phase) | `textarea` input |
| Clicks "Generate Speech" | Text Synthesis → Audio Playback Lifecycle | `GenerateButton @click` |
| Hears synthesized speech | Audio Playback Lifecycle (playback, seek, download) | `StickyAudioBar` |
| Views generation history | Generation History + Cleanup → Session Cleanup (24h TTL) | `/api/history` |
| Drags panel divider (mobile) | Mobile Divider Dragging → Responsive Layout Toggle | Touch/mouse on divider |
| Switches panels (desktop/mobile) | Responsive Layout Toggle → Panel Focus Management | `usePanelToggle.togglePanel()` |
| Uses keyboard shortcut | Keyboard Shortcut: Ctrl/Cmd+Enter | `handleKeyDown` |
| Sees scroll animations | Scroll Reveal Animation | IntersectionObserver |
| Sees toasts/notifications | Toast Notification System | `showToast()` |
| Sees focus glow behind textarea | Focus Halo Effect | Textarea focus/blur |
| Navigates during synthesis | In-Flight Synthesis Cleanup | `onBeforeRouteLeave` |
| Navigates between pages | Frontend SPA Routing → Cross-Page Composable Lifecycle | `<NuxtLink>`, URL, back/forward |
| Opens a lesson and studies it (sections, audio, competencies) | Lesson Details Page Session → Text Synthesis (TTS handoff) → Audio Playback Lifecycle | `/dashboard/level/{level}/{lesson}` |

### Operator Journeys

| What the operator does | Underlying workflow(s) | Entry point |
|---|---|---|
| Deploys the stack | Container Startup/Health → Startup Validation Sequence | `docker compose up` |
| Checks service health | Health Monitoring (via `/health`) | `curl localhost:9000/health` |
| Adds a new voice | Voice Discovery (file-based) | Drop `.wav` into `speaker_wavs/` |
| Troubleshoots model loading | Model Initialization → Model Loading Failure Recovery → Model Reload on Failure | `/health?reload=1` |
| Manages disk space | Session Cleanup (24h TTL) → Generation History + Cleanup | `POST /api/cleanup` or `GET /api/history?cleanup=true` |
| Runs quality checks | CI Pipeline Execution | GitHub Actions (push/PR) |
| Tests full stack | E2E Stack Test → Volume Persistence Lifecycle | `scripts/test-e2e.sh` |
| Optimizes Docker images | Docker Optimization | `scripts/optimize-docker.sh` |
| Validates container startup | Startup Validation Sequence | `scripts/init.sh` |

### System-to-System Journeys

| What happens automatically | Underlying workflow(s) | Trigger |
|---|---|---|
| TTS model loads on container start | Model Initialization | `lifespan()` daemon thread |
| Frontend polls backend health | Health Monitoring | 2s interval, stops on terminal state |
| Nginx proxies API to backend | Nginx Large-File Streaming | Request routing |
| Generated audio persists across restarts | Volume Persistence Lifecycle | Named Docker volumes |
| Frontend waits for backend health | Container Startup/Health | `depends_on: service_healthy` |
| CI runs tests on push/PR | CI Pipeline Execution | GitHub Actions trigger |
| Old files are cleaned up (24h) | Session Cleanup (24h TTL) | Time passes, API calls |

---

## View 4: By State (State → Workflows)

### TTS Model States

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| `loading` (backend) | Container start (`lifespan()`) | → `ready`, `error` | Model Initialization (step 1), Model Reload on Failure (via `/health?reload=1`) |
| `ready` (backend) | Model Initialization (success), Model Reload (success) | (terminal until reload) | Model Reload on Failure (via `/health?reload=1`) |
| `error` (backend) | Model Initialization (failure), Model Reload (failure), Health check (non-200) | (terminal until reload) | Model Reload on Failure (via `/health?reload=1`), Model Loading Failure Recovery (frontend polling) |
| `loading` (frontend) | `useHealthPoll` on mount | → `ready`, `error` | Health Monitoring (polling result) |
| `ready` (frontend) | Health Monitoring (status === "ready") | (terminal — stops polling) | — |
| `error` (frontend) | Health Monitoring (non-200, or max retries) | (terminal — stops polling) | — |

### Audio Generation States

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| `idle` (no audio) | App load | → `loading` | Text Synthesis (user action) |
| `loading` (synthesizing) | `handleSynthesize()` sets `isGenerating=true` | → `playing`, `error` | Text Synthesis (backend response), In-Flight Synthesis Cleanup (navigation) |
| `playing` | `audioModule.load()` + `play()` | → `paused`, `ended`, `idle` | Audio Playback Lifecycle (pause, end, close) |
| `paused` | `audioModule.pause()` | → `playing`, `idle` | Audio Playback Lifecycle (toggle, close) |
| `error` (generation) | Non-200 response from `/api/generate` | → `idle` | Text Synthesis (error toast) |
| `error` (playback) | Audio element error event | → `idle` | Audio Playback Lifecycle (error toast) |

### File System States

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Orphaned MP3 + .json | Client disconnect during streaming | → deleted | Session Cleanup (24h TTL), In-Flight Synthesis Cleanup (finally block) |
| Old MP3 + .json (>24h) | Time passes | → deleted | Session Cleanup (24h TTL) |
| Orphaned WAV | FFmpeg failure | → deleted | Session Cleanup (24h TTL) (WAV always cleaned) |
| Persisted model cache | `TTS("tts_models/multilingual/xtts_v2")` | (persists across restarts) | Volume Persistence Lifecycle (named volume) |
| Persisted audio cache | Generated files in `/app/downloads/` | (persists across restarts) | Session Cleanup (24h TTL), Volume Persistence Lifecycle (named volume) |

### Frontend UI States

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Panel: `control-deck` (active) | App load, panel toggle | → `canvas` | Panel Focus Management (switch), Responsive Layout Toggle |
| Panel: `canvas` (active) | Panel toggle | → `control-deck` | Panel Focus Management (switch), Responsive Layout Toggle |
| Panel: mobile (stacked) | Window < 768px | → desktop (≥768px) | Responsive Layout Toggle (resize) |
| Panel: desktop (side-by-side) | Window ≥ 768px | → mobile (<768px) | Responsive Layout Toggle (resize) |
| Divider dragging | `onDragStart` | → not dragging | Mobile Divider Dragging (drag end) |
| Toast visible | `showToast()` | → dismissed (5s) | Toast Notification System (auto-dismiss, manual close) |
| Halo active | Textarea focus | → not active (blur) | Focus Halo Effect (blur) |
| Synthesis dialog visible | `onBeforeRouteLeave` detects `isGenerating=true` | → dismissed | In-Flight Synthesis Cleanup (user response: "Clean & Leave" or "Stay") |

### Lesson Page States

| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Loading | Route resolution start | → Ready \| 404 \| Redirect | Lesson Details Page Session |
| Ready (shell) | Lesson data resolved | → Section nav \| Audio interaction \| Leave | Lesson Details Page Session |
| Section active | Tab / keyboard navigation | → Next section \| Leave | Lesson Details Page Session |
| Audio: fetching | User taps a line | → Loaded \| Error \| Aborted | Lesson Details Page Session |
| Audio: loaded / playing | TTS 200 received | → Paused \| Idle \| Error \| Cleanup | Lesson Details Page Session |
| Audio: error | TTS failure (422 / 500 / 503 / network / timeout) | → Retry \| Closed \| Leave | Lesson Details Page Session |
| Progress: in-memory | Line ended / competency check | → Reset (lesson change or leave) | Lesson Details Page Session |
| Page leaving | Navigation away | (terminal) | Lesson Details Page Session (ABORT_CLEANUP) |

---

## Test Coverage Map

| Workflow | Has Tests? | Test Files | Coverage Quality |
|---|---|---|---|
| Model Initialization | Partial | `test_health.py` (health endpoint) | Endpoint tested, but background thread behavior not tested |
| Text Synthesis | Yes | `test_generate.py`, `test_generate_blob.py`, `test_ffmpeg_fallback.py` | Strong — validates validation, 503, 500, success, English, custom voice |
| Health Monitoring | Partial | `useHealthPoll.test.ts` | Frontend polling tested, but backend reload logic not tested |
| Voice Discovery | Yes | `test_voices.py`, `useVoices.test.ts` | Both backend and frontend tested |
| Audio Playback Lifecycle | Yes | `useAudioModule.test.ts`, `AC1-StickyAudioBar.test.ts`, `StickyAudioBar.test.ts` | Strong — load, play, pause, seek, download, dispose |
| Generation History + Cleanup | Yes | `test_history.py` | Backend tested (history, cleanup endpoint, sidecar JSON) |
| Model Reload on Failure | Partial | `test_health.py` (reload param) | Reload endpoint tested but failure recovery path not tested |
| Frontend Application Lifecycle | Partial | Integration tests (mount/unmount patterns) | Lifecycle tested implicitly, but not as a dedicated workflow spec |
| Container Startup/Health | Partial | `test-volume-persistence.sh` (restarts), `test-e2e.sh` | Manual scripts, no automated test |
| CI Pipeline Execution | N/A (infra) | N/A | — |
| Volume Persistence Lifecycle | Partial | `test-volume-persistence.sh` | Manual script, no automated test |
| Startup Validation Sequence | No | — | Manual script, no automated test |
| E2E Stack Test | No | `test-e2e.sh` | Manual script, uses wrong endpoint (`/api/tts` instead of `/api/generate`) |
| Docker Optimization | No | `optimize-docker.sh` | Manual script, not used in CI/production |
| Frontend SPA Routing | Partial | `cross-page-navigation.test.ts` (AC-1 through AC-15) | Navigation tested, but SPA fallback behavior not tested |
| Cross-Page Composable Lifecycle | Partial | `journeys.test.ts` (11 customer journeys) | Page-scoped vs singleton composable behavior tested implicitly |
| In-Flight Synthesis Cleanup | Partial | `CleanupDialog.test.ts` | Dialog rendering tested, but cleanup POST failure paths not tested |
| Keyboard Shortcut: Ctrl/Cmd+Enter | Partial | `journeys.test.ts` (Journey 11) | Keyboard shortcut tested, but edge cases (model loading, validation) not tested |
| Responsive Layout Toggle | Partial | `PanelSliding.test.ts` | Layout tested, but divider dragging logic not tested |
| Scroll Reveal Animation | No | — | **No tests** — composable exists, behavior untested |
| Toast Notification System | Partial | `useToast.test.ts`, `ToastNotification.test.ts`, `ToastShortcut.test.ts` | Core toast tested, but auto-dismiss timer behavior not tested |
| Panel Focus Management | No | — | **No tests** — composable exists, behavior untested |
| Focus Halo Effect | No | — | **No tests** — component exists, behavior untested |
| Voice Preview (Dead Code) | No | — | **No tests** — dead code (toast only, no audio played) |
| Mobile Divider Dragging | No | — | **No tests** — composable exists, behavior untested |
| Session Cleanup (24h TTL) | Partial | `test_history.py` (cleanup param) | Only inline cleanup tested, explicit `/api/cleanup` endpoint tested but 24h boundary not tested |
| Global Navbar Navigation | Partial | `GlobalNavbar.test.ts` | Navigation rendering tested, but route matching edge cases not tested |
| Multi-Page SPA Routing | Partial | `cross-page-navigation.test.ts`, `journeys.test.ts` | Navigation tested, but SPA fallback and 404 behavior not tested |
| Lesson Details Page Session | No | - | New spec (2026-08-19); page is a 197-line skeleton, no tests yet (36 test cases planned in spec) |

---

## Deprecated Workflows

These workflows exist in the codebase but are no longer actively used or have been superseded.

| Workflow | Replaced By | Reason |
|---|---|---|
| Phase 5 Test Suite | `./run-tests.sh` (quality gate) | `test-phase5.sh` is a wrapper that calls other scripts — now redundant since `run-tests.sh` is the single source of truth |
| e2e.sh TTS endpoint test | `test_generate.py` (unit tests) | `test-e2e.sh` uses `/api/tts` (wrong endpoint — actual is `/api/generate`), mock-only test |
| optimize-docker.sh | Manual multi-stage builds | Generates temp Dockerfiles in `/tmp/` — not used in CI or production |
| `/api/tts` endpoint (e2e script) | `/api/generate` | e2e script references wrong endpoint name |
| `SynthesisResponse` interface (frontend) | Dead code | Frontend defines `SynthesisResponse` with `audio_url` and `duration_seconds` but the actual backend returns `FileResponse` (binary MP3), not JSON. Unused in both layers. |

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
| A9 | The startup validation script (`init.sh`) is **not run in production** | Not referenced in `Dockerfile` or `docker-compose.yml` | If it IS run, container startup fails on any validation step |
| A10 | The `useHealthPoll` singleton is **shared across all pages** (not per-page) | `useHealthPoll.ts:8-19` (module-level `sharedStatus`) | Navigating between pages does NOT restart polling — status persists |
| A11 | The `useVoices` composable is **page-scoped** (reloads on every page mount) | `useVoices.ts:34-36` (`onMounted` calls `loadVoices()`) | Every page navigation triggers a new `/api/voices` call |
| A12 | The `model_load_status` variable is **module-level** (not Pydantic) | `app.py:140` (inferred from `lifespan()` usage) | Concurrent health checks may read stale status without the lock |
| A13 | The `proxy_read_timeout 1800s` (30min) is the **maximum synthesis duration** | `frontend/nginx.conf:16-18` | If synthesis exceeds 30min, Nginx returns 504 |
| A14 | The `client_max_body_size 50m` in Nginx is **far more than needed** (3000 char limit) | `frontend/nginx.conf:6` | Overly generous — but no security risk (text is small) |
| A15 | The `CORSMiddleware` `allow_credentials=True` + `allow_origins=["*"]` is **technically invalid** per CORS spec | `app.py:229-235` | Works in development; production may reject the combination |
| A16 | The `seed` default of 42 is **applied in the handler**, not in the Pydantic model | `app.py:385` (`seed = request.seed if request.seed is not None else 42`) | Frontend must explicitly pass `seed: 42` for deterministic output |
| A17 | The `temperature=0.4` is **hardcoded** in `tts_to_file()` | `app.py:402` | Cannot be adjusted via API — voice consistency is fixed |
| A18 | The `SynthesisRequest.language` is **constrained** to `"ar" | "en"` via regex | `app.py:253` (`pattern="^(ar|en)$"`) | Other languages rejected at validation layer (422) |
| A19 | Lesson progress is in-memory only; backend "SQLite: lessons + progress" has no progress API endpoint | Backend `app.py` (no route) | Future persistence work is bigger than spec assumes (new endpoint + API surface) |

---

## Open Questions

1. **Model reload during active synthesis** — If `/health?reload=1` is called while a synthesis is in progress, the `_model_lock` serializes access. Does the in-flight synthesis fail? What does the client see?

2. **Voice preview intent** — `VoiceSelector.vue:62-64` calls `showToast()` with "Playing 1-second preview of {name}..." but no audio is played. Is this intentional (placeholder) or a bug?

3. **Concurrent synthesis limit** — The single `_model_lock` serializes all synthesis requests. What happens under concurrent load? Is there a queue?

4. **Cache size growth** — TTS model cache is ~2GB. Audio cache grows indefinitely (only 24h TTL). What is the expected disk usage at scale?

5. **Nginx `proxy_buffering off` under load** — Without buffering, Nginx holds the connection open for up to 1800s. What is the memory impact?

6. **Deterministic seed** — Coqui XTTS-v2 may not honor `torch.manual_seed()` for all random operations (attention, sampling). Is the seed truly deterministic?

7. **Startup validation in production** — `init.sh` validates model weights, speaker directory, etc. Is this script run in production? It is not referenced in `Dockerfile` or `docker-compose.yml`.

8. **Mobile keyboard shortcut** — Ctrl/Cmd+Enter synthesis shortcut is meaningless on mobile devices. Is this expected?

9. **Singleton health poll across pages** — Since `useHealthPoll` returns a singleton, does the frontend restart polling when navigating from `/` to `/dashboard`? (Answer: no — the singleton persists, polling continues.)

10. **`/api/history` inline cleanup vs explicit cleanup** — Both endpoints perform the same 24h TTL cleanup. Is the inline cleanup in `GET /api/history` intentional (side effect on read), or a code duplication that should be consolidated?

11. **`SynthesisResponse` dead code** — The frontend defines `SynthesisResponse` with `audio_url` and `duration_seconds` but the actual backend returns `FileResponse` (binary MP3). This interface is never used. Should it be removed?

12. **e2e script uses wrong endpoint** — `test-e2e.sh` calls `/api/tts` (which doesn't exist). The actual endpoint is `/api/generate`. Should this script be fixed or removed?

13. **`test-phase5.sh` calls `test-e2e.sh`** — Which itself calls the wrong endpoint. The entire Phase 5 test suite is broken by design.

14. **Missing `PanelSliding.vue` and `PanelSliding.test.ts`** — A test file exists (`tests/components/PanelSliding.test.ts`) but no corresponding component. Is this legacy test?

15. **Missing `ToastShortcut.vue` and `ToastShortcut.test.ts`** — A test file exists (`tests/components/ToastShortcut.test.ts`) but no corresponding component. Is this legacy test?

16. **Missing `useNavbarLayoutAdaptation.ts` and `useNavbarLayoutAdaptation.test.ts`** — A test file exists (`tests/composables/useNavbarLayoutAdaptation.test.ts`) but no corresponding composable. Is this legacy test?

17. **`shared/types/` directory** — Empty directory exists at `frontend/app/shared/types/`. Is this a planned but unused feature?

18. **`content/` and `frontend_source/` backend directories** — Empty directories exist at `backend/content/` and `backend/frontend_source/`. Are these placeholders for future features?
19. **Lesson progress persistence** — Should lesson progress persist, or stay in-memory per session? (2026-08-19)
20. **"Lesson complete" state** — Is "lesson complete" ever a required state (badge / auto-advance)? (2026-08-19)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|---|---|---|
| 2026-08-08 | Full codebase scan completed. 30 workflows discovered (28 Missing, 1 Draft, 1 Review). 27 were previously unlisted. | Updated REGISTRY.md — complete rewrite with accurate status. |
| 2026-08-08 | `Text Synthesis` and `Model Initialization` were listed as "Approved" in the old registry but had no spec. | Changed to **Missing** (no spec document exists). |
| 2026-08-08 | `SynthesisResponse` interface dead code identified in both frontend and backend. | Flagged in Deprecated Workflows. |
| 2026-08-08 | `test-e2e.sh` references wrong endpoint (`/api/tts`). | Flagged in Open Questions #12. |
| 2026-08-08 | Multiple orphan test files (`PanelSliding`, `ToastShortcut`, `useNavbarLayoutAdaptation`) reference non-existent components. | Flagged in Open Questions #14-16. |
| 2026-08-08 | `useHealthPoll` singleton behavior across pages not documented. | Flagged as Assumption A10 and Open Question #9. |
| 2026-08-08 | `app.vue` uses `globalThis.useNuxtApp()` instead of `useRoute()` — workaround for test environments. | Documented in BLUEPRINT.md §9.21. |
| 2026-08-19 | Lesson Details Page Session spec updated: added 4 findings (F8–F11) from code audit — `SectionDefinition.name?` vs skeleton `s.title` bug, `SectionType` includes `'activity'`, `SectionItem.audioUrl?/options?` unused, `ActivityDefinition.maxAttempts` from data model; 13 assumptions, 36 test cases, 11 findings total |
