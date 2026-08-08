# Project Architecture Blueprint — Lughat Chat

> **Generated:** 2026-08-08 (updated)
> **System:** Lughat Chat — Language Learning Platform (Arabic TTS)
> **Scope:** Full monorepo (frontend + backend + deployment)

---

## 1. Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| **Frontend framework** | Nuxt 4 | 4.4.5 | SPA shell, file-based routing, auto-imports |
| **UI framework** | Vue 3 | 3.5.13 | Composition API, `<script setup lang="ts">` |
| **CSS** | UnoCSS | 66.7.5 | Atomic CSS engine (presetWind3, presetTypography) |
| **Composables** | VueUse | 14.3.0 | `useEventListener`, `tryOnMounted` |
| **Linting** | ESLint + @nuxt/eslint | 10.3.0 / 1.15.2 | `commaDangle: never`, `braceStyle: 1tbs` |
| **TypeScript** | TypeScript | 6.0.3 | `nuxt typecheck` |
| **Testing** | Vitest | 4.1.7 | jsdom environment, two configs (unit + component) |
| **Package manager** | pnpm | 11.20.0 | `pnpm-workspace.yaml` (root + frontend) |
| **Node** | Node.js | 20 (Docker builder) / 24 (CI + dev) | Runtime |
| **Backend framework** | FastAPI | 0.115.6 | REST API, async endpoints, Pydantic models |
| **ASGI server** | uvicorn | 0.34.0 | `uvicorn app:app --host 0.0.0.0 --port 8000` |
| **TTS engine** | Coqui TTS | 0.27.5 | `tts_models/multilingual/xtts_v2` (CPU-only PyTorch) |
| **Audio encoding** | ffmpeg | — | WAV → MP3 conversion (192k, speed filter) |
| **Proxy** | Nginx | alpine | Reverse proxy, SPA fallback, large-file streaming |
| **Orchestration** | Docker Compose | — | Two services, named volumes, health checks |

---

## 2. Architecture Pattern

**Multi-page Nuxt SPA with a modularized backend (source deleted; bytecode only).**

- **Frontend:** Nuxt file-based routing. 4 pages (TTS Studio, Dashboard, Level Index, Lesson). 13 Vue components. 10 composables. State lives in composables via `ref`/`computed` — no Pinia or global store. Two-panel desktop layout (control deck + canvas), mobile split-screen with draggable divider.
- **Backend:** `app.py` (single file, ~626 lines) provides TTS endpoints. Additional modules (`tts/`, `storage/`, `learning/`, `db/`, `content/`) exist only as compiled `__pycache__` — source files have been removed. Inferred from pycache: these modules cover voice resolution, audio pipeline, lesson/progress databases, content scanning, and scoring.
- **Deployment:** Docker Compose with two containers on a bridge network (`lughat-network`). Nginx reverse proxy at host port 9001 (container port 80) routes `/api/` and `/health` to the backend (host 9000).

### Pattern Summary

| Pattern | Where | How |
|---------|-------|-----|
| **File-based routing** | Nuxt pages | 4 pages: `/`, `/dashboard`, `/dashboard/level/[level]`, `/dashboard/level/[level]/[lesson]` |
| **Auto-imports** | Nuxt components + composables | No explicit imports needed (pages use explicit imports for clarity) |
| **Composable-based state** | Frontend composables | `ref`/`computed` per composable; no global store |
| **Singleton health poll** | `useHealthPoll` | Module-level singleton — one status, one interval, shared across all callers |
| **Global mutable state** | Backend `app.py` | Module-level `tts_model`, `model_load_status` with `_model_lock` |
| **Background thread** | Backend lifespan | Daemon thread loads TTS model on startup (3 retries, exponential backoff, 5 min hard timeout) |
| **Reverse proxy** | Nginx | `/api/*` → backend:8000, `/downloads/*` → backend:8000, `/health` → backend:8000, `/` → SPA |
| **Health polling** | Frontend `useHealthPoll` | 2s interval, max 150 retries, singleton pattern, stops on terminal state |
| **Cleanup navigation** | `useCleanupNavigation` | In-flight synthesis cleanup dialog: POST /api/cleanup on leave, "Stay" cancels |
| **Route-aware layout** | `app.vue` | `KNOWN_PATHS` check (`'/'`, `'/dashboard'`, `'/dashboard/level'`) controls `GlobalNavbar` visibility |
| **SPA prerender** | Nuxt routeRules | `/` prerendered; `/dashboard` and `/dashboard/level/**` client-rendered |

---

## 3. Directory Structure

```
lughat-chat/
├── AGENTS.md                      # Agent behavioral contract
├── CONTEXT.md                     # Deep reference (architecture, API, Docker)
├── docker-compose.yml             # Two services, volumes, network
├── .env                           # Environment variables (host config)
├── .pre-commit-config.yaml        # Ruff + backend tests (Docker only)
├── run-tests.sh                   # Quality gate: backend → lint → typecheck → tests
├── .github/
│   ├── workflows/
│   │   ├── backend.yml            # CI: Python 3.12, pytest + coverage
│   │   └── frontend.yml           # CI: pnpm 11.20.0, lint → typecheck → vitest
│   ├── CONTRIBUTING.md
│   ├── CODEOWNERS
│   ├── SECURITY.md
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE/
│       └── pull_request_template.md
├── scripts/
│   ├── init.sh                    # Initial setup script
│   ├── run-backend-tests.sh       # Docker-based pytest runner
│   ├── test-e2e.sh                # End-to-end test script
│   ├── test-phase5.sh             # Phase-specific test script
│   ├── test-volume-persistence.sh # Volume mount verification
│   └── optimize-docker.sh         # Docker image optimization
├── docs/
│   ├── PRD.md                     # Product requirements document
│   ├── workflows/
│   │   ├── WORKFLOW-multi-page-spa-routing.md
│   │   └── WORKFLOW-global-navbar-navigation.md
│   ├── issues/
│   │   ├── MAPPING.md
│   │   ├── ISSUE-001-global-navbar.md
│   │   ├── ISSUE-002-app-vue-layout.md
│   │   ├── ISSUE-003-adapt-tts-layout.md
│   │   ├── ISSUE-004-dashboard-page.md
│   │   ├── ISSUE-005-level-index-page.md
│   │   ├── ISSUE-006-lesson-page.md
│   │   ├── ISSUE-007-route-rules.md
│   │   ├── ISSUE-008-cleanup-guard.md
│   │   ├── ISSUE-009-sticky-audio-bar.md
│   │   ├── ISSUE-010-migrate-to-sticky-bar.md
│   │   ├── ISSUE-011-verify-journeys.md
│   │   ├── ISSUE-012-cross-page-navigation.md
│   │   └── ISSUE-014-theme-token-migration.md
│   ├── requirements/
│   │   └── navigation-dashboard.md
│   ├── adr/
│   │   ├── ADR-001-shared-layout-with-global-navbar.md
│   │   ├── ADR-002-multi-page-spa-routing.md
│   │   ├── ADR-003-theme-rebrand.md
│   │   └── ADR-004-sticky-audio-bar.md
│   ├── proto/
│   │   └── lesson-details.html
│   ├── implementation/
│   │   └── IMPLEMENTATION_PROMPT_SEQUENCE.md
│   ├── architecture/
│   │   ├── c4-context.md          # C4 Level 1: System Context
│   │   ├── c4-containers.md       # C4 Level 2: Containers
│   │   ├── c4-components-backend.md  # C4 Level 3: Backend components
│   │   ├── c4-components-spa.md       # C4 Level 3: Frontend components
│   │   ├── c4-deployment.md       # C4 Level 4: Deployment
│   │   └── README.md              # Architecture docs index
│   └── BLUEPRINT.md               # This file
├── frontend/
│   ├── Dockerfile                 # Multi-stage: Node 20 builder → Nginx production
│   ├── nginx.conf                 # Reverse proxy config (production)
│   ├── nuxt.config.ts             # Modules, UnoCSS, ESLint, devProxy, routeRules
│   ├── uno.config.ts              # Presets, theme, shortcuts, rules
│   ├── package.json               # Dependencies + devDependencies
│   ├── pnpm-workspace.yaml        # Workspace root
│   ├── tsconfig.json              # TypeScript config (Nuxt-generated references)
│   ├── vitest.config.ts           # Unit test config (jsdom, setup.ts)
│   ├── vitest.component.config.ts # Component test config (jsdom, setup.component.ts)
│   ├── eslint.config.mjs          # ESLint config (extends @nuxt/eslint)
│   ├── app/
│   │   ├── app.config.ts          # UI theme (primary: green, neutral: slate)
│   │   ├── app.vue                # Layout shell (GlobalNavbar conditional + NuxtPage)
│   │   ├── pages/
│   │   │   ├── index.vue          # TTS Studio (/) — two-panel layout (desktop + mobile)
│   │   │   ├── dashboard.vue      # Dashboard (/dashboard) — learning catalog (placeholder)
│   │   │   └── dashboard/
│   │   │       └── level/
│   │   │           ├── index.vue  # Level index (/dashboard/level/[level])
│   │   │           └── [lesson].vue # Lesson page (/dashboard/level/{level}/{id})
│   │   ├── components/
│   │   │   ├── CleanupDialog.vue           # In-flight synthesis cleanup dialog
│   │   │   ├── DesktopPanels.vue           # Desktop side-by-side layout
│   │   │   ├── FocusHaloCanvas.vue         # Focus glow effect behind textarea
│   │   │   ├── GenerateButton.vue          # Synthesis trigger with loading states
│   │   │   ├── GlobalNavbar.vue            # Shared navigation bar (route-aware)
│   │   │   ├── MobileSplitScreen.vue       # Mobile split-screen with draggable divider
│   │   │   ├── MobileStatusIndicator.vue   # Compact model status (mobile)
│   │   │   ├── ModelStatusIndicator.vue    # Desktop model status pill
│   │   │   ├── SpeedSlider.vue             # Speed control (0.5x–2.0x)
│   │   │   ├── StickyAudioBar.vue          # Fixed bottom audio playback bar
│   │   │   ├── ToastNotification.vue       # Toast display (auto-dismiss)
│   │   │   ├── VoiceSelector.vue           # Voice/dialect dropdown with preview
│   │   │   └── WaveformCanvas.vue          # Canvas-based waveform visualization
│   │   ├── composables/
│   │   │   ├── useAudioModule.ts           # Audio playback state machine
│   │   │   ├── useCleanupNavigation.ts     # In-flight synthesis cleanup + navigation
│   │   │   ├── useDragResize.ts            # Mobile split-screen drag resize
│   │   │   ├── useHealthPoll.ts            # Backend health polling (singleton)
│   │   │   ├── useInputValidation.ts       # Text validation (pure function)
│   │   │   ├── usePanelToggle.ts           # Panel toggle (desktop/mobile)
│   │   │   ├── useScrollReveal.ts          # IntersectionObserver fade-up
│   │   │   ├── useToast.ts                 # Toast notification management
│   │   │   ├── useTtsApi.ts                # TTS API client (synthesize, healthCheck)
│   │   │   └── useVoices.ts                # Voice list fetching
│   │   └── utils/
│   │       └── formatTime.ts               # Seconds → "m:ss" string
│   ├── public/
│   │   ├── favicon.ico
│   │   └── fonts/                         # 12 self-hosted font files (woff2)
│   │       ├── cairo-arabic-{400,600,700}-normal.woff2
│   │       ├── noto-sans-arabic-{400,500,600,700}-normal.woff2
│   │       └── plus-jakarta-sans-{300,400,500,600,700}-normal.woff2
│   └── tests/
│       ├── setup.ts                       # Unit test setup (browser API mocks)
│       ├── setup.component.ts             # Component test setup (browser + Nuxt stubs)
│       ├── mocks.ts                       # Mock factory functions
│       ├── mocks/
│       │   ├── nuxt-app.ts                # Nuxt app mock (route switching)
│       │   └── nuxt-router.ts             # Router mock (push, route)
│       ├── composables/
│       │   ├── useAudioModule.test.ts
│       │   ├── useHealthPoll.test.ts
│       │   ├── useInputValidation.test.ts
│       │   ├── usePanelToggle.test.ts
│       │   ├── useTtsApi.test.ts
│       │   ├── useToast.test.ts
│       │   ├── useVoices.test.ts
│       │   ├── useNavbarLayoutAdaptation.test.ts
│       │   └── index.test.ts
│       ├── components/
│       │   ├── AC1-StickyAudioBar.test.ts
│       │   ├── CleanupDialog.test.ts
│       │   ├── Dashboard.test.ts
│       │   ├── GlobalNavbar.test.ts
│       │   ├── LessonPage.test.ts
│       │   ├── LevelIndex.test.ts
│       │   ├── ModelStatusIndicator.test.ts
│       │   ├── PanelSliding.test.ts
│       │   ├── SpeedSlider.test.ts
│       │   ├── StickyAudioBar.test.ts
│       │   ├── ToastNotification.test.ts
│       │   ├── ToastShortcut.test.ts
│       │   ├── VoiceSelector.test.ts
│       │   ├── VoiceSelector.animation.test.ts
│       │   ├── VoiceSelector.click.test.ts
│       │   └── VoiceSelector.data-attrs.test.ts
│       └── integration/
│           ├── cross-page-navigation.test.ts
│           └── journeys.test.ts
├── backend/
│   ├── Dockerfile                         # Python 3.12 → build torchcodec from source
│   ├── app.py                             # Single-file FastAPI (~626 lines)
│   ├── generate_speaker_wavs.py           # Speaker reference WAV generator (fallback: silence)
│   ├── requirements.txt                   # Runtime dependencies
│   ├── requirements-test.txt              # Test dependencies (httpx, pytest, pytest-cov)
│   ├── pytest.ini                         # Test paths + pythonpath
│   ├── speaker_wavs/                      # Voice reference WAV files (dynamically discovered)
│   ├── downloads/                         # Generated audio (MP3 + WAV + JSON sidecars)
│   ├── tts/                               # [SOURCE DELETED] __pycache__ only:
│   │                                    #     engine.py, voice_resolver.py, audio_pipeline.py
│   ├── storage/                           # [SOURCE DELETED] __pycache__ only:
│   │                                    #     service.py, helpers.py
│   ├── learning/                          # [SOURCE DELETED] __pycache__ only:
│   │                                    #     sqlite_repository.py, repository.py,
│   │                                    #     domain.py, service.py
│   ├── db/                                # [SOURCE DELETED] __pycache__ only:
│   │                                    #     safety.py
│   ├── content/                           # (empty directory)
│   ├── frontend_source/                   # (empty directory)
│   └── tests/
│       ├── test_ffmpeg_fallback.py        # FFmpeg conversion failure behavior
│       ├── test_generate.py               # POST /api/generate validation tests
│       ├── test_generate_blob.py          # Binary response tests
│       ├── test_health.py                 # /health endpoint tests
│       ├── test_history.py                # /api/history + cleanup endpoint tests
│       ├── test_voices.py                 # /api/voices endpoint tests
│       └── test_orphan_cleanup.py         # Orphan file cleanup (client disconnect)
```

---

## 4. Architecture Diagrams

### 4.1 System Context

```
┌──────────┐     ┌─────────────┐     ┌──────────────────────────┐
│  Browser │◄───►│   Nginx     │◄───►│  FastAPI + Coqui XTTS-v2 │
│  (User)  │ HTTP│ (port 80)   │ HTTP│  (port 8000, host 9000)  │
└──────────┘     └─────────────┘     └──────────────────────────┘
                         │
                         ├─► /api/* → POST /api/generate (text → MP3)
                         ├─► /api/voices → GET (voice list)
                         ├─► /api/history → GET (generation history)
                         ├─► /api/cleanup → POST (orphan cleanup)
                         ├─► /health → GET (model status)
                         └─► /downloads/* → GET (static audio files)
```

### 4.2 Frontend Page Routing

```
/                              → index.vue (TTS Studio)
/dashboard                     → dashboard.vue (Learning Catalog)
/dashboard/level/[level]       → dashboard/level/index.vue (Level Index)
/dashboard/level/[level]/[id]  → dashboard/level/[lesson].vue (Lesson Page)

app.vue (layout shell)
├── GlobalNavbar (conditional — shown on /, /dashboard, /dashboard/level/**)
└── <NuxtPage />
```

### 4.3 Frontend Component Graph

```
index.vue (TTS Studio — root page)
│
├── GlobalNavbar (from app.vue, conditional)
├── ToastNotification
│
├── MobileSplitScreen (mobile, v-if)
│   ├── MobileStatusIndicator
│   ├── FocusHaloCanvas
│   ├── VoiceSelector
│   ├── SpeedSlider
│   ├── GenerateButton
│   └── WaveformCanvas
│
├── DesktopPanels (desktop, v-if)
│   ├── ModelStatusIndicator
│   ├── MobileStatusIndicator
│   ├── FocusHaloCanvas
│   ├── VoiceSelector
│   ├── SpeedSlider
│   ├── GenerateButton
│   ├── WaveformCanvas
│   └── StickyAudioBar
│
└── CleanupDialog (in-flight synthesis)


dashboard.vue (Learning Catalog — placeholder)
└── ModelStatusIndicator


[lesson].vue (Lesson Page)
├── Section tabs (Dialogue, Vocabulary, Pronouns, Expressions, Grammar, Activities)
├── Breadcrumb trail (Dashboard → Level → Lesson)
└── Lesson content area (placeholder)
```

### 4.4 Frontend Composables

```
useHealthPoll (singleton)
├── status: 'loading' | 'ready' | 'error'
├── modelLoaded: computed (status === 'ready')
└── 2s polling interval, max 150 retries, stops on terminal state

useAudioModule
├── isPlaying, isPaused, currentTime, duration
├── error, isLoading, audioUrl
├── load(blob), play(), pause(), toggle(), seek(), download()
└── dispose() — revokes object URLs, removes listeners

useTtsApi
├── synthesize(request: SynthesisRequest): Promise<Blob>
└── healthCheck(): Promise<HealthResponse>

useVoices
├── voices: ref<Voice[]> (id, name, dialect, tag, icon, speaker_wav)
├── loading, error
└── loadVoices(): Promise<Voice[]>

useInputValidation
├── isValid: boolean
└── error: string | null

usePanelToggle
├── activePanel: 'control-deck' | 'canvas'
├── isMobile: boolean (breakpoint 768px)
└── togglePanel(), focusFirstInteractiveElement()

useScrollReveal
├── observe(), disconnect()
└── Respects prefers-reduced-motion

useToast
├── toastState: ref<ToastEntry[]>(id, message, type)
└── showToast(message, type) — auto-dismiss after 5s

useCleanupNavigation
├── dialogVisible: Ref<boolean>
├── handleCleanupAndLeave() — dispose audio + POST /api/cleanup
└── handleStay() — cancel navigation

useDragResize
├── canvasRatio: shallowRef (0.25–0.85)
├── isDragging: shallowRef
└── onDragStart/Move/End (touch + mouse)
```

### 4.5 Backend Module Graph (app.py)

```
app.py (~626 lines, single file)
│
├── Configuration
│   ├── AUDIO_DIR = {backend}/downloads
│   ├── MODEL_CACHE_DIR = env(TTS_MODEL_CACHE) → /app/.cache/tts
│   └── SPEAKER_WAV_DIR = {backend}/speaker_wavs
│
├── Model Management
│   ├── _ensure_torch()          → patches isin_mps_friendly, load_library
│   ├── lifespan()               → background daemon thread (3 retries, exponential backoff, 5 min hard timeout)
│   └── load_model()             → TTS("tts_models/multilingual/xtts_v2")
│
├── API Endpoints
│   ├── GET  /health             → {status, model_loaded} (query: reload?: string)
│   ├── GET  /api/voices         → [{id, name}]
│   ├── POST /api/generate       → FileResponse (MP3 binary)
│   ├── GET  /api/history        → [{filename, text, language, voice, ...}]
│   └── POST /api/cleanup        → {removed_count}
│
├── Data Models (Pydantic)
│   ├── SynthesisRequest         → text, language, voice, speaker, speed, pitch, seed
│   ├── SynthesisResponse        → audio_url, filename, duration_seconds (UNUSED)
│   └── HealthResponse           → status, model_loaded
│
├── Utilities
│   ├── discover_voices()        → scan .wav files
│   └── _validate_speaker_wav() → check duration ≥ 0.33s

Inferred modules (source deleted, __pycache__ only):
│
├── tts/
│   ├── engine.py                → TTS model wrapper
│   ├── voice_resolver.py        → Voice selection logic
│   └── audio_pipeline.py        → WAV → MP3 conversion pipeline
│
├── storage/
│   ├── service.py               → Audio file storage/management
│   └── helpers.py               → File system utilities
│
├── learning/
│   ├── sqlite_repository.py     → SQLite data access
│   ├── repository.py            → Domain repository interface
│   ├── domain.py                → Domain models (lessons, progress)
│   └── service.py               → Business logic layer
│
├── db/
│   └── safety.py                → SQLite safety pragmas
│
└── content/
    └── scoring.py               → Lesson scoring logic
```

### 4.6 Data Flow (Synthesis)

```
User types Arabic text
    │
    ▼
useInputValidation(text, modelStatus)
    │  isValid: text.trim().length > 0 && modelStatus === 'ready'
    ▼
GenerateButton @click
    │
    ▼
useTtsApi.synthesize({ text, speaker, speed, seed: 42 })
    │  browser fetch() → POST /api/generate → application/json
    ▼
FastAPI.generate_speech()
    │  1. Check: tts_model is not None AND status == "ready" → 503
    │  2. Resolve voice: speaker ?? voice ?? "female"
    │  3. Generate filename: {lang}_{voice}_{uuid8}.mp3
    │  4. Find speaker WAV: speaker_wavs/{voice}.wav → 500 if missing
    │  5. Validate WAV duration ≥ 0.33s → 500 if too short
    │  6. torch.manual_seed(seed) (default 42)
    │  7. model.tts_to_file(text, speaker_wav, language, wav_path)
    │  8. ffmpeg: WAV → MP3 (192k, speed filter)
    │  9. Clean up intermediate WAV
    │  10. Write metadata sidecar JSON
    │  11. Track mp3_path + meta_path in intermediate_files (finally block)
    │  12. FileResponse(path=mp3_path, media_type="audio/mpeg")
    ▼
useAudioModule.load(blob)
    │  URL.createObjectURL(blob) → wire <audio> element
    │  await nextTick() → play()
    ▼
User hears speech (waveform renders, audio player bar slides up)
```

---

## 5. API Reference

### 5.1 Endpoints

| Method | Path | Auth | Request | Response | Status Codes |
|--------|------|------|---------|----------|-------------|
| `GET` | `/health` | — | Query: `reload?: string` | `{ status: "loading"|"ready"|"error", model_loaded: boolean }` | 200 |
| `GET` | `/api/voices` | — | — | `[{ id: string, name: string }]` | 200 |
| `POST` | `/api/generate` | — | `SynthesisRequest` (JSON) | `audio/mpeg` (binary MP3) | 200, 400, 422, 500, 503 |
| `GET` | `/api/history` | — | Query: `cleanup?: string` | `[{ filename, text, language, voice, speed, pitch, created_at }]` | 200, 500 |
| `POST` | `/api/cleanup` | — | — | `{ removed_count: number }` | 200, 500 |

### 5.2 Request/Response Models

```python
# Pydantic models in app.py
class SynthesisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)
    language: str = Field(default="ar", pattern="^(ar|en)$")
    voice: Optional[str] = Field(default=None)  # any string accepted; validated at runtime
    speaker: Optional[str] = Field(default=None)  # alias for voice
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=0.0, ge=-4.0, le=4.0)
    seed: Optional[int] = Field(default=None, ge=0)  # deterministic (default 42)

class HealthResponse(BaseModel):
    status: str  # "loading" | "ready" | "error"
    model_loaded: bool

class SynthesisResponse(BaseModel):
    audio_url: str
    filename: str
    duration_seconds: float  # UNUSED — endpoint returns FileResponse, not JSON
```

### 5.3 Nginx Routing (Production)

| Location | Backend Target | Notes |
|----------|---------------|-------|
| `/api/` | `http://backend:8000` | `proxy_buffering off`, 1800s timeout |
| `/downloads/` | `http://backend:8000` | `proxy_buffering off`, large file support |
| `/health` | `http://backend:8000` | 30s timeout |
| `/nginx-health` | — | Returns 200 "healthy\n" (Docker health check) |
| `/` | SPA (static files) | `try_files $uri $uri/ /index.html` |

### 5.4 Nuxt DevProxy (Development)

| Path | Target | Notes |
|------|--------|-------|
| `/api/` | `http://localhost:9000/api/` | `changeOrigin: true` |
| `/health` | `http://localhost:9000/health` | `changeOrigin: true` |

---

## 6. Deployment

### 6.1 Docker Compose

```
services:
  backend:
    container: lughat-backend
    host port: 9000 → container: 8000
    volumes: tts-model-cache, tts-audio-cache, ./backend/speaker_wavs
    env: TZ=UTC, TTS_MODEL_CACHE=/app/.cache/tts, COQUI_TOS_AGREED=1
    healthcheck: 15s interval, 60 retries, 60s start_period

  frontend:
    container: lughat-frontend
    host port: 9001 → container: 80
    depends_on: backend (service_healthy)
```

### 6.2 Frontend Dockerfile (Multi-Stage)

```
Stage 1 (builder): node:20-alpine, pnpm 10.33.4, `pnpm build`
Stage 2 (production): nginx:alpine, custom nginx.conf, built SPA at /usr/share/nginx/html
```

### 6.3 Backend Dockerfile (Single Stage)

```
python:3.12-slim → install ffmpeg, libsndfile1, build tools
→ pip install CPU PyTorch, Coqui TTS
→ Build torchcodec from source (no CUDA)
→ EXPOSE 8000, CMD: uvicorn app:app --host 0.0.0.0 --port 8000
```

---

## 7. Frontend Theme

- **Primary:** `#14b8a6` (teal) → `#0f766e` (hover)
- **Gold:** `#f59e0b`
- **Stone scale:** 50–950 (neutral)
- **Fonts:** Plus Jakarta Sans (Latin UI), Noto Sans Arabic (Arabic body), Cairo (Arabic fallback) — 12 self-hosted woff2 files
- **Icons:** Phosphor (CDN via unpkg), Lucide, Simple Icons
- **Theme:** Fixed dark (no toggle) — stone-900 background with teal/gold accents

### UnoCSS Shortcuts

| Shortcut | Expands To |
|----------|------------|
| `btn` | `px-4 py-2 rounded font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors` |
| `card` | `rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800` |
| `flex-center` | `flex items-center justify-center` |
| `flex-between` | `flex items-center justify-between` |

### UnoCSS Custom Rules

| Rule | Expands To |
|------|------------|
| `text-gradient` | `background: linear-gradient(to right, #3b82f6, #8b5cf6)`, `-webkit-background-clip: text`, `-webkit-text-fill-color: transparent` |

### UnoCSS Theme

| Key | Value |
|-----|-------|
| `fontFamily.sans` | `['"Plus Jakarta Sans"', 'sans-serif']` |
| `fontFamily.arabic` | `['"Noto Sans Arabic"', 'Cairo', 'sans-serif']` |
| `colors.primary.500` | `#14b8a6` |
| `colors.primary.600` | `#0f766e` |
| `colors.gold.500` | `#f59e0b` |
| `breakpoints` | `xs: 375px, sm: 414px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px` |

---

## 8. Testing

### 8.1 Frontend Tests

| Config | Scope | Setup | Include |
|--------|-------|-------|---------|
| `vitest.config.ts` | Composables (unit) | `tests/setup.ts` (browser mocks) | `tests/composables/**/*.test.ts` |
| `vitest.component.config.ts` | Components + integration | `tests/setup.component.ts` (browser + Nuxt stubs) | `tests/components/**`, `tests/integration/**` |

- **Globals:** `describe`, `it`, `expect`, `vi`, `beforeEach` available without imports.
- **Test helpers:** `resetHealthPoll()`, `resetCleanupNavigation()`, mock factories in `tests/mocks.ts`.
- **Component test files:** 18 files (including 4 VoiceSelector sub-tests).
- **Integration tests:** `journeys.test.ts` (11 customer journeys), `cross-page-navigation.test.ts` (AC-1 through AC-15).
- **Mock infrastructure:** `tests/mocks/nuxt-app.ts` (mutable route state), `tests/mocks/nuxt-router.ts` (router push, route).

### 8.2 Backend Tests

| Test File | Coverage |
|-----------|----------|
| `test_generate.py` | `/api/generate` validation (text, language, speed, pitch, voice) |
| `test_generate_blob.py` | MP3 binary response validation |
| `test_ffmpeg_fallback.py` | FFmpeg failure → HTTP error (not WAV-as-MP3) |
| `test_health.py` | `/health` status transitions, reload behavior |
| `test_history.py` | `/api/history`, cleanup endpoint, sidecar JSON |
| `test_voices.py` | `/api/voices`, `discover_voices()` |
| `test_orphan_cleanup.py` | Orphan file cleanup (client disconnect handling) |

---

## 9. Discrepancies: Docs vs. Code

### 9.1 Frontend — `app.vue` Route Matching (Updated)

The existing blueprint described `app.vue` as an "SEO meta" root component. **The actual `app.vue` performs route matching** — it checks `KNOWN_PATHS` (`'/'`, `'/dashboard'`, `'/dashboard/level'`) to conditionally render `GlobalNavbar`. This is a deliberate design: the navbar is hidden on pages outside the main navigation tree.

### 9.2 Frontend — API Client Uses Browser `fetch()` (Updated)

The existing blueprint noted the frontend using `$fetch` from `#unjs/ofetch`. **The actual code uses browser `fetch()` directly** in `useTtsApi` — consistent with the AGENTS.md rule ("Do not use raw `$fetch` in component setup").

### 9.3 Frontend — `SynthesisResponse` Interface in Frontend

The existing blueprint only noted `SynthesisResponse` as unused in the backend. **The frontend also defines a `SynthesisResponse` interface** (in `useTtsApi.ts`) with `audio_url` and `duration_seconds` fields — but these are never used since the actual backend returns `FileResponse` (binary MP3), not JSON. This is dead code in both layers.

### 9.4 Frontend — `useNavbarLayoutAdaptation.test.ts`

The existing blueprint did not list this composable test. **`tests/composables/useNavbarLayoutAdaptation.test.ts` exists** but there is no corresponding `useNavbarLayoutAdaptation.ts` composable in the source. This test file tests a composable that does not exist in the codebase.

### 9.5 Frontend — `PanelSliding.test.ts`

The existing blueprint did not list this component test. **`tests/components/PanelSliding.test.ts` exists** but there is no `PanelSliding.vue` component in `app/components/`. This test file tests a component that does not exist in the codebase.

### 9.6 Frontend — `ToastShortcut.test.ts`

The existing blueprint did not list this component test. **`tests/components/ToastShortcut.test.ts` exists** but there is no `ToastShortcut.vue` component in `app/components/`. This test file tests a component that does not exist in the codebase.

### 9.7 Frontend — `AC1-StickyAudioBar.test.ts`

The existing blueprint did not list this component test. **`tests/components/AC1-StickyAudioBar.test.ts` exists** as a legacy test file (the "AC1" prefix suggests it was from an earlier acceptance criteria phase). The `StickyAudioBar` component itself exists, but this is a separate test from `StickyAudioBar.test.ts`.

### 9.8 Backend — Volume Path Mismatch (Still Unresolved)

The existing CONTEXT.md documented the `tts-model-cache` volume path mismatch. **This remains unresolved** — the volume mounts at `/root/.local/share/tts` but the app writes to `/app/.cache/tts` (env var overrides the mount point). The ~2GB model is re-downloaded on every container restart.

### 9.9 Backend — Speaker WAV Directory Empty

The existing blueprint listed `KSA Hamed - Male.wav` and `KSA Zariyah - Female.wav` as the two speaker files. **The `speaker_wavs/` directory on disk contains these two files** (confirmed by glob), but they are not committed to the repository (`.gitignore` may be relevant). The `generate_speaker_wavs.py` script can regenerate them.

### 9.10 Frontend — `shared/types/` Directory

The existing blueprint noted `shared/` as "(empty directory)". **`shared/types/` still exists** (empty) under `frontend/app/shared/types/`.

### 9.11 Frontend — `content/` and `frontend_source/` Backend Directories

The existing blueprint did not document these empty backend directories. **`backend/content/` and `backend/frontend_source/` exist as empty directories** — likely placeholders for future content management and frontend source distribution.

### 9.12 Backend — `generate_speaker_wavs.py`

The existing blueprint did not document this script. **`backend/generate_speaker_wavs.py` exists** and generates speaker reference WAV files (with silence as fallback).

### 9.13 Backend — `test_orphan_cleanup.py`

The existing blueprint did not list this test file. **`backend/tests/test_orphan_cleanup.py` exists** and tests the client-disconnect cleanup path in `POST /api/generate` (the `finally` block that removes intermediate files when `_response_delivered` is false).

### 9.14 Backend — `SynthesisRequest` Language Pattern

The existing blueprint described `language` as `"ar" | "en"` (freeform). **The actual `SynthesisRequest` uses `pattern="^(ar|en)$"`** — a Pydantic regex constraint that rejects any other language value at the validation layer.

### 9.15 Backend — Health Endpoint `?reload=1` Query Parameter

The existing blueprint did not document the `reload` parameter. **`/health?reload=1` triggers a model reload attempt** when the status is `"error"` — resets `tts_model` to `None`, spawns a new background thread. The health check returns immediately (spawning the thread) and the thread reports back asynchronously.

### 9.16 Backend — `lifespan()` Retry Logic

The existing blueprint described the model loading as "~120s". **The actual `lifespan()` implements exponential backoff** (2s, 4s, 8s delays between 3 retries) with a 300-second (5-minute) hard timeout. This is significantly more robust than a simple 120s estimate.

### 9.17 Backend — FFmpeg Does NOT Fall Back to WAV

The existing blueprint's `test_ffmpeg_fallback.py` title suggested WAV-as-MP3 fallback. **The actual code raises HTTP 500 on FFmpeg failure** — it does NOT serve WAV as MP3. The comment in the code explicitly states: "Do NOT fall back to serving WAV as MP3 — browsers' `<audio>` elements refuse to play PCM WAV data labeled as `audio/mpeg`."

### 9.18 Backend — `/api/history` Returns `created_at` Without `seed`

The existing blueprint's API table listed `seed` in the `/api/history` response. **The actual `/api/history` response does NOT include `seed`** — the metadata sidecar JSON stores `seed` but the history endpoint only returns `filename`, `text`, `language`, `voice`, `speed`, `pitch`, and `created_at`.

### 9.19 Frontend — `app.config.ts` vs. `uno.config.ts` Color Mismatch

The existing blueprint noted the theme rebrand. **`app.config.ts` still declares `primary: 'green'`** but `uno.config.ts` defines `colors.primary.500: '#14b8a6'` (teal) and `colors.primary.600: '#0f766e'`. The UnoCSS config overrides the Nuxt app config at runtime.

### 9.20 Frontend — Fixed Dark Theme (No Toggle)

The existing blueprint mentioned "dark theme" but implied it was toggleable. **The codebase has a fixed dark theme** — there is no dark/light toggle. The `main.css` uses `.dark:` variants but the `.dark` class is never toggled on `<html>`. The entire UI is styled for dark mode only (stone-900 background).

### 9.21 Frontend — `app.vue` Uses Manual Route Access

The existing blueprint did not document how `app.vue` accesses the route. **`app.vue` manually accesses `useNuxtApp()` from `globalThis`** with a try/catch fallback — it does not use the official `useRoute()` composable (which would fail in test environments). This is a workaround for test environments where the Nuxt runtime is not fully available.

### 9.22 Backend — CORS `allow_credentials=True`

The existing blueprint noted CORS is `*`. **The actual `CORSMiddleware` sets `allow_credentials=True`** in addition to `allow_origins=["*"]`. This combination is technically invalid per CORS spec (browsers will reject it), but it works in development. Should be restricted to the frontend container IP in production.

### 9.23 Backend — `tts_to_file()` Uses `temperature=0.4`

The existing blueprint did not document the temperature parameter. **`model.tts_to_file()` is called with `temperature=0.4`** — a low temperature for consistent, deterministic voice output.

### 9.24 Backend — `SynthesisRequest` `seed` is `Optional[int]`

The existing blueprint described `seed` as `int = Field(default=None, ge=0)`. **The actual code uses `Optional[int]`** — making the field nullable rather than requiring an int default of None. The default seed value of 42 is applied in the handler, not in the model.

### 9.25 Frontend — `usePanelToggle.BREAKPOINT_MOBILE = 768`

The existing blueprint did not document the mobile breakpoint constant. **`usePanelToggle` exports `BREAKPOINT_MOBILE = 768`** — the threshold below which `isMobile` becomes true. This is used by `index.vue` to conditionally render `MobileSplitScreen` vs `DesktopPanels`.

### 9.26 Frontend — `formatTime()` Pure Utility

The existing blueprint did not document the `formatTime` utility. **`app/utils/formatTime.ts`** converts seconds to `"m:ss"` string format. Pure function, no reactive state. Used by `StickyAudioBar` and `MobileSplitScreen`.

### 9.27 Frontend — `FocusHaloCanvas` Uses Active Element Detection

The existing blueprint did not document how `FocusHaloCanvas` works. **It detects the active `<textarea>` by checking `document.activeElement`** and adds an "active" class to a radial gradient halo that appears below the textarea when focused. It handles RTL textareas specifically (checking `dir === 'rtl'`).

### 9.28 Backend — `generate_speech()` Writes Metadata Sidecar JSON

The existing blueprint noted the metadata sidecar. **The actual code writes a `.json` sidecar** next to each `.mp3` containing: `text`, `language`, `voice`, `speed`, `pitch`, `seed`, and `created_at` (Unix timestamp). The `/api/history` endpoint reads this JSON first, falling back to filename parsing if the sidecar is missing or corrupted.

### 9.29 Backend — `generate_speech()` Cleans Up Intermediate Files on Client Disconnect

The existing blueprint did not document the client-disconnect cleanup path. **The `finally` block in `generate_speech()` checks `_response_delivered`** — if the FileResponse was never delivered (client disconnected during streaming), it removes the `.mp3` and `.json` files. Successful responses leave files on disk. The `test_orphan_cleanup.py` test verifies this behavior.

### 9.30 Frontend — `GlobalNavbar` Progress Bar Uses Lesson Number Heuristic

The existing blueprint did not document how the progress bar works. **`GlobalNavbar` calculates progress as `Math.min(100, Math.round((lessonNum / 12) * 100))`** — a hardcoded estimate based on extracting the lesson number from the URL path and dividing by an assumed 12 total lessons.
