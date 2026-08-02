# Project Architecture Blueprint — Lughat Chat

> **Generated:** 2026-08-02
> **System:** Lughat Chat — Arabic Text-to-Speech Studio
> **Scope:** Full monorepo (frontend + backend + deployment)

---

## 1. Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| **Frontend framework** | Nuxt 4 | 4.4.5 | SPA shell, file-based routing, auto-imports |
| **UI framework** | Vue 3 | 3.5.13 | Composition API, `<script setup lang="ts">` |
| **CSS** | UnoCSS | 66.7.2 | Atomic CSS engine (presetWind3, presetTypography) |
| **Composables** | VueUse | 14.3.0 | `useEventListener`, `tryOnMounted` |
| **Linting** | ESLint + @nuxt/eslint | 10.3.0 / 1.15.2 | `commaDangle: never`, `braceStyle: 1tbs` |
| **TypeScript** | TypeScript | 6.0.3 | `vue-tsc` typecheck |
| **Testing** | Vitest | 4.1.7 | jsdom environment, two configs (unit + component) |
| **Package manager** | pnpm | 10.33.4 | `pnpm-workspace.yaml` (root + frontend) |
| **Backend framework** | FastAPI | 0.115.6 | REST API, async endpoints, Pydantic models |
| **ASGI server** | uvicorn | 0.34.0 | `uvicorn app:app --host 0.0.0.0 --port 8000` |
| **TTS engine** | Coqui TTS | 0.27.5 | `tts_models/multilingual/xtts_v2` (CPU-only PyTorch) |
| **Audio encoding** | ffmpeg | — | WAV → MP3 conversion (192k, speed filter) |
| **Proxy** | Nginx | alpine | Reverse proxy, SPA fallback, large-file streaming |
| **Orchestration** | Docker Compose | — | Two services, named volumes, health checks |

---

## 2. Architecture Pattern

**Monolithic two-tier with a single-file backend and a page-level frontend.**

- **Frontend:** Nuxt file-based routing. One page (`app/pages/index.vue`) orchestrates all 9 components and 8 composables. No state management library — reactive state lives in composables via `ref`/`computed`.
- **Backend:** Single-file FastAPI (`backend/app.py`, 626 lines). Global mutable state (`tts_model`, `model_load_status`) protected by a `threading.Lock`. No domain layer, no repository pattern — all logic inline in route handlers.
- **Deployment:** Docker Compose with two containers on a bridge network. Nginx reverse proxy at port 80 (host 9001) routes `/api/` and `/health` to the backend (host 9000).

### Pattern Summary

| Pattern | Where | How |
|---------|-------|-----|
| **File-based routing** | Nuxt pages | `app/pages/index.vue` → `/` |
| **Auto-imports** | Nuxt components + composables | No explicit imports needed (page uses explicit for clarity) |
| **Composable-based state** | Frontend composables | `ref`/`computed` per composable; no global store |
| **Global mutable state** | Backend `app.py` | Module-level `tts_model`, `model_load_status` with `_model_lock` |
| **Background thread** | Backend lifespan | Daemon thread loads TTS model on startup |
| **Reverse proxy** | Nginx | `/api/*` → backend:8000, `/downloads/*` → backend:8000, `/` → SPA |
| **Health polling** | Frontend `useHealthPoll` | 2s interval, max 150 retries, stops on terminal state |

---

## 3. Directory Structure

```
lughat-chat/
├── AGENTS.md                      # Agent behavioral contract
├── CONTEXT.md                     # Deep reference (architecture, API, Docker)
├── docker-compose.yml             # Two services, volumes, network
├── .env                           # Environment variables (host config)
├── .pre-commit-config.yaml        # Ruff + full-check hook
├── run-tests.sh                   # Quality gate: backend → lint → typecheck → tests
├── .github/workflows/
│   ├── backend.yml                # CI: Python 3.12, pytest + coverage
│   └── frontend.yml               # CI: pnpm 10.33.4, lint → typecheck → vitest
├── scripts/
│   ├── init.sh                    # Initial setup script
│   ├── run-backend-tests.sh       # Docker-based pytest runner
│   ├── test-e2e.sh                # End-to-end test script
│   ├── test-phase5.sh             # Phase-specific test script
│   ├── test-volume-persistence.sh # Volume mount verification
│   └── optimize-docker.sh         # Docker image optimization
├── docs/
│   ├── PRD.md                     # Product requirements document
│   └── architecture/
│       ├── c4-context.md          # C4 Level 1: System Context
│       ├── c4-containers.md       # C4 Level 2: Containers
│       ├── c4-components-backend.md  # C4 Level 3: Backend components
│       ├── c4-components-spa.md       # C4 Level 3: Frontend components
│       ├── c4-deployment.md       # C4 Level 4: Deployment
│       └── README.md              # Architecture docs index
├── frontend/
│   ├── Dockerfile                 # Multi-stage: Node builder → Nginx production
│   ├── nginx.conf                 # Reverse proxy config (production)
│   ├── nuxt.config.ts             # Modules, UnoCSS, ESLint, devProxy
│   ├── uno.config.ts              # Presets, theme, shortcuts, rules
│   ├── package.json               # Dependencies + devDependencies
│   ├── pnpm-workspace.yaml        # Workspace root
│   ├── tsconfig.json              # TypeScript config
│   ├── vitest.config.ts           # Unit test config (jsdom, setup.ts)
│   ├── vitest.component.config.ts # Component test config (jsdom, setup.component.ts)
│   ├── eslint.config.mjs          # ESLint config
│   ├── app/
│   │   ├── app.vue                # Root component (SEO meta)
│   │   ├── app.config.ts          # UnoCSS theme (primary: green, neutral: slate)
│   │   ├── pages/
│   │   │   └── index.vue          # Full-page TTS Studio (751 lines)
│   │   ├── components/
│   │   │   ├── AudioPlayerPanel.vue       # Audio playback UI (play/pause/seek/download)
│   │   │   ├── FocusHaloCanvas.vue        # Focus glow effect behind textarea
│   │   │   ├── GenerateButton.vue         # Synthesis trigger with loading states
│   │   │   ├── MobileStatusIndicator.vue  # Compact model status (mobile)
│   │   │   ├── ModelStatusIndicator.vue   # Desktop model status pill
│   │   │   ├── SpeedSlider.vue            # Speed control (0.5x–2.0x)
│   │   │   ├── ToastNotification.vue      # Toast display (auto-dismiss)
│   │   │   ├── VoiceSelector.vue          # Voice/dialect dropdown
│   │   │   └── WaveformCanvas.vue         # Canvas-based waveform visualization
│   │   ├── composables/
│   │   │   ├── useAudioModule.ts          # Audio playback state machine
│   │   │   ├── useHealthPoll.ts           # Backend health polling
│   │   │   ├── useInputValidation.ts      # Text validation (pure function)
│   │   │   ├── usePanelToggle.ts          # Panel toggle state (desktop/mobile)
│   │   │   ├── useScrollReveal.ts         # IntersectionObserver fade-up
│   │   │   ├── useToast.ts                # Toast notification management
│   │   │   ├── useTtsApi.ts               # TTS API client (synthesize, healthCheck)
│   │   │   └── useVoices.ts               # Voice list fetching
│   │   ├── assets/
│   │   │   └── css/
│   │   │       └── main.css               # Global styles (fonts, animations, dark theme)
│   │   └── plugins/                       # (empty directory)
│   ├── shared/
│   │   └── types/                         # (empty directory)
│   ├── public/
│   │   ├── favicon.ico
│   │   └── fonts/                         # 12 self-hosted font files (woff2)
│   └── tests/
│       ├── setup.ts                       # Unit test setup (Nuxt auto-import stubs)
│       ├── setup.component.ts             # Component test setup (browser API mocks)
│       ├── mocks.ts                       # Mock factory functions
│       ├── useHealthPoll.test.ts
│       ├── useAudioModule.test.ts
│       ├── useTtsApi.test.ts
│       ├── usePanelToggle.test.ts
│       ├── useVoices.test.ts
│       ├── useInputValidation.test.ts
│       ├── useToast.test.ts
│       ├── app.test.ts
│       ├── index.test.ts
│       ├── VoiceSelector.test.ts
│       ├── VoiceSelector.click.test.ts
│       ├── VoiceSelector.animation.test.ts
│       ├── VoiceSelector.data-attrs.test.ts
│       ├── AudioPlayerPanel.test.ts
│       ├── ModelStatusIndicator.test.ts
│       ├── SpeedSlider.test.ts
│       ├── ToastNotification.test.ts
│       ├── ToastShortcut.test.ts
│       └── PanelSliding.test.ts
├── backend/
│   ├── Dockerfile                         # Multi-stage: Python 3.12 → build torchcodec
│   ├── app.py                             # Single-file FastAPI (626 lines)
│   ├── generate_speaker_wavs.py           # Speaker reference WAV generator
│   ├── requirements.txt                   # Runtime dependencies
│   ├── requirements-test.txt              # Test dependencies (httpx, pytest, pytest-cov)
│   ├── pytest.ini                         # Test paths + pythonpath
│   ├── speaker_wavs/
│   │   ├── KSA Hamed - Male.wav           # Male Arabic voice reference
│   │   └── KSA Zariyah - Female.wav       # Female Arabic voice reference
│   ├── downloads/                         # Generated audio (MP3 + WAV + JSON sidecars)
│   ├── tts/                               # (empty — __pycache__ only, no source)
│   ├── storage/                           # (empty — __pycache__ only, no source)
│   ├── learning/                          # (empty — __pycache__ only, no source)
│   ├── content/
│   │   ├── a2/                            # (empty directory)
│   │   └── b1/                            # (empty directory)
│   ├── db/                                # (empty — __pycache__ only, no source)
│   ├── frontend_source/                   # (empty directory)
│   └── tests/
│       ├── test_generate.py               # POST /api/generate tests
│       ├── test_generate_blob.py          # Binary response tests
│       ├── test_ffmpeg_fallback.py        # FFmpeg conversion tests
│       ├── test_health.py                 # /health endpoint tests
│       ├── test_history.py                # /api/history endpoint tests
│       ├── test_orphan_cleanup.py         # Orphan file cleanup tests
│       └── test_voices.py                 # /api/voices endpoint tests
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
                         ├─► /health → GET (model status)
                         └─► /downloads/* → GET (static audio files)
```

### 4.2 Frontend Component Graph

```
index.vue (root page)
│
├── composables/
│   ├── useAudioModule.ts      → audio playback state machine
│   ├── useHealthPoll.ts       → /health polling (2s interval)
│   ├── useInputValidation.ts  → text validation (pure function)
│   ├── usePanelToggle.ts      → panel toggle (desktop/mobile)
│   ├── useScrollReveal.ts     → IntersectionObserver fade-up
│   ├── useToast.ts            → toast notifications
│   ├── useTtsApi.ts           → API client (synthesize, healthCheck)
│   └── useVoices.ts           → voice list fetching
│
└── components/
    ├── AudioPlayerPanel.vue       → playback UI (play/pause/seek/download)
    ├── FocusHaloCanvas.vue        → focus glow effect
    ├── GenerateButton.vue         → synthesis trigger
    ├── MobileStatusIndicator.vue  → compact status (mobile)
    ├── ModelStatusIndicator.vue   → status pill (desktop)
    ├── SpeedSlider.vue            → speed control (0.5x–2.0x)
    ├── ToastNotification.vue      → toast display
    ├── VoiceSelector.vue          → voice dropdown
    └── WaveformCanvas.vue         → waveform visualization
```

### 4.3 Backend Module Graph

```
app.py (626 lines, single file)
│
├── Configuration
│   ├── AUDIO_DIR = {backend}/downloads
│   ├── MODEL_CACHE_DIR = env(TTS_MODEL_CACHE) → /app/.cache/tts
│   └── SPEAKER_WAV_DIR = {backend}/speaker_wavs
│
├── Model Management
│   ├── _ensure_torch()          → patches isin_mps_friendly, load_library
│   ├── lifespan()               → background daemon thread
│   └── load_model()             → TTS("tts_models/multilingual/xtts_v2")
│
├── API Endpoints
│   ├── GET  /health             → {status, model_loaded}
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
└── Utilities
    ├── discover_voices()        → scan .wav files
    └── _validate_speaker_wav() → check duration ≥ 0.33s
```

### 4.4 Data Flow (Synthesis)

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
    │  POST /api/generate → application/json
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
    │  11. FileResponse(path=mp3_path, media_type="audio/mpeg")
    ▼
useAudioModule.load(blob)
    │  URL.createObjectURL(blob) → wire <audio> element
    │  await nextTick() → play()
    ▼
User hears speech (waveform renders, audio player panel slides up)
```

---

## 5. API Reference

### 5.1 Endpoints

| Method | Path | Auth | Request | Response | Status Codes |
|--------|------|------|---------|----------|-------------|
| `GET` | `/health` | — | Query: `reload?: string` | `{ status: "loading"|"ready"|"error", model_loaded: boolean }` | 200 |
| `GET` | `/api/voices` | — | — | `[{ id: string, name: string }]` | 200 |
| `POST` | `/api/generate` | — | `SynthesisRequest` (JSON) | `audio/mpeg` (binary MP3) | 200, 400, 500, 503 |
| `GET` | `/api/history` | — | Query: `cleanup?: string` | `[{ filename, text, language, voice, speed, pitch, created_at }]` | 200, 500 |
| `POST` | `/api/cleanup` | — | — | `{ removed_count: number }` | 200 |

### 5.2 Request Models

```typescript
interface SynthesisRequest {
  text: string          // 1–3000 characters, required
  language: 'ar' | 'en' // Default: 'ar'
  voice?: string        // Any string; validated at runtime via file existence
  speaker?: string      // Alias for voice (resolved: speaker ?? voice ?? "female")
  speed?: number        // 0.5–2.0, default: 1.0
  pitch?: number        // -4.0–4.0, default: 0.0
  seed?: number         // Non-negative integer, default: 42 (deterministic)
}
```

### 5.3 Error Responses

| Status | Condition | Detail |
|--------|-----------|--------|
| 400 | Empty or > 3000 char text | Pydantic validation |
| 503 | TTS model not ready | `tts_model is None or status != "ready"` |
| 500 | Speaker WAV not found | `{voice}.wav` missing from `speaker_wavs/` |
| 500 | WAV too short (< 0.33s) | XTTS-v2 minimum duration |
| 500 | Generation fails | WAV file not created after inference |
| 500 | FFmpeg conversion fails | Encoding error |

---

## 6. Cross-Cutting Concerns

### 6.1 State Management

| Concern | Frontend | Backend |
|---------|----------|---------|
| **Reactive state** | `ref`/`computed` per composable | Module-level globals (`tts_model`, `model_load_status`) |
| **Concurrency** | N/A (single-threaded browser) | `threading.Lock` protects global state |
| **Lifecycle** | `onMounted`/`onUnmounted` | `lifespan()` context manager |
| **No global store** | No Pinia/Vuex; composables own their state | N/A — single global state |

### 6.2 Error Handling

| Layer | Approach |
|-------|-----------|
| **Frontend** | `showToast(message, type)` — toast notifications with 5s auto-dismiss |
| **Frontend** | `useInputValidation()` — pure function returning `{ isValid, error }` |
| **Frontend** | `try/catch` in `handleSynthesize()` → `showToast(err.message, 'error')` |
| **Backend** | `HTTPException` with descriptive `detail` string |
| **Backend** | CORS: `allow_origins=["*"]` (dev-only; flag for production restriction) |

### 6.3 Audio Pipeline

```
XTTS-v2 → WAV (intermediate, 5–10× larger)
    │
    ▼
ffmpeg -i input.wav -filter:a "atempo={speed}" -b:a 192k output.mp3
    │
    ▼
WAV deleted (cleanup in finally block)
    │
    ▼
MP3 + sidecar JSON persisted in /app/downloads/
    │
    ▼
FileResponse (streaming, no buffering)
```

### 6.4 Model Lifecycle

```
Container start
    │
    ▼
lifespan() starts background daemon thread
    │
    ▼
load_model() with retry: 3 attempts, exponential backoff (2s, 4s, 8s)
    │  Hard timeout: 300s (5 minutes)
    ▼
Status: "loading" → "ready" (or "error")
    │
    ▼
Frontend polls /health every 2s (max 150 retries = 5 minutes)
    │
    ▼
On "ready": synthesis available. On "error": /health?reload=1 triggers reload.
```

### 6.5 Responsive Design

| Breakpoint | Layout |
|------------|--------|
| `< 768px` | Stacked: canvas top (55% default, draggable), controls bottom |
| `≥ 768px` | Side-by-side: Control Deck (25–35% width), Canvas (65–75%) |
| Mobile drag | Touch/mouse events on divider resize `canvasRatio` (0.25–0.85) |
| `prefers-reduced-motion` | Animations disabled; elements appear instantly |

---

## 7. Deployment Architecture

### 7.1 Docker Compose

| Service | Image | Host Port | Container Port | Dependencies |
|---------|-------|-----------|----------------|-------------|
| `backend` | python:3.12-slim (custom) | 9000 | 8000 | None |
| `frontend` | nginx:alpine (custom) | 9001 | 80 | `backend` (service_healthy) |

### 7.2 Volumes

| Volume | Mount Point | Purpose |
|--------|-------------|---------|
| `tts-model-cache` | `/app/.cache/tts` | TTS model files (~2GB) |
| `tts-audio-cache` | `/app/downloads` | Generated audio files |
| `./backend/speaker_wavs` | `/app/speaker_wavs` | Host-mounted voice references |

### 7.3 Nginx Configuration

| Location | Proxy Target | Special Config |
|----------|-------------|----------------|
| `/api/*` | `http://backend:8000` | `proxy_buffering off`, 1800s timeout |
| `/downloads/*` | `http://backend:8000` | `proxy_buffering off`, 1800s timeout |
| `/health` | `http://backend:8000` | 30s timeout |
| `/` | SPA static files | `try_files $uri $uri/ /index.html`, 30d cache |

### 7.4 CI/CD

| Pipeline | Trigger | Steps |
|----------|---------|-------|
| **Backend CI** | Push/PR to `main`/`develop` (backend/**) | Python 3.12 → ffmpeg → `pip install -r requirements-test.txt` → `pytest --cov` |
| **Frontend CI** | Push/PR to `main`/`develop` (frontend/**) | pnpm 10.33.4 + Node 24 → `pnpm install` → `pnpm lint` → `pnpm typecheck` → `pnpm test -- --coverage` |
| **Pre-commit** | All commits | `ruff --fix` + `ruff-format` + `./run-tests.sh` (backend → lint → typecheck → tests) |

---

## 8. Testing Architecture

### 8.1 Frontend Tests (19 files)

| Category | Files | Setup |
|----------|-------|-------|
| **Composable unit** | `useHealthPoll.test.ts`, `useAudioModule.test.ts`, `useTtsApi.test.ts`, `usePanelToggle.test.ts`, `useVoices.test.ts`, `useInputValidation.test.ts`, `useToast.test.ts` | `setup.ts` — stubs `ref`, `computed`, `watch`, `onMounted` |
| **Component** | `VoiceSelector.test.ts`, `VoiceSelector.click.test.ts`, `VoiceSelector.animation.test.ts`, `VoiceSelector.data-attrs.test.ts`, `AudioPlayerPanel.test.ts`, `ModelStatusIndicator.test.ts`, `SpeedSlider.test.ts`, `ToastNotification.test.ts` | `setup.component.ts` — mocks URL APIs, fetch, IntersectionObserver, matchMedia |
| **Page** | `app.test.ts`, `index.test.ts` | `setup.ts` |
| **Keyboard** | `ToastShortcut.test.ts` | `setup.ts` |
| **Layout** | `PanelSliding.test.ts` | `setup.component.ts` |

### 8.2 Backend Tests (7 source files)

| File | Tests |
|------|-------|
| `test_generate.py` | Full synthesis pipeline (mocked TTS model) |
| `test_generate_blob.py` | Binary MP3 response |
| `test_ffmpeg_fallback.py` | FFmpeg conversion error handling |
| `test_health.py` | `/health` endpoint, reload parameter |
| `test_history.py` | `/api/history` with metadata parsing |
| `test_orphan_cleanup.py` | Orphan file cleanup on client disconnect |
| `test_voices.py` | `/api/voices` discovery |

---

## 9. External Dependencies

| Dependency | Type | Loaded By | Notes |
|-----------|------|-----------|-------|
| **Phosphor Icons** | CDN script | Browser (nuxt.config.ts) | `@phosphor-icons/web` via unpkg |
| **Lucide Icons** | NPM | Frontend | `@iconify-json/lucide` |
| **Simple Icons** | NPM | Frontend | `@iconify-json/simple-icons` |
| **Plus Jakarta Sans** | Self-hosted fonts | Browser (main.css) | 4 woff2 files (300, 400, 500, 600, 700) |
| **Noto Sans Arabic** | Self-hosted fonts | Browser (main.css) | 3 woff2 files (400, 500, 600, 700) |
| **Cairo** | Self-hosted fonts | Browser (main.css) | 3 woff2 files (400, 600, 700) |

---

## 10. Discrepancies: Docs vs Code

The following items in `AGENTS.md`, `CONTEXT.md`, and the existing C4 architecture docs disagree with or are stale relative to the actual code:

### 10.1 Font Mismatch

| Document | Claims | Actual Code |
|----------|--------|-------------|
| `CONTEXT.md` (line 22) | Fonts: "Inter" (UI) + "Cairo" (Arabic) | **`uno.config.ts`**: `sans: '"Plus Jakarta Sans"'`, `arabic: '"Noto Sans Arabic"', 'Cairo'` |
| `C4 context.md` | "Inter (UI) and Cairo (Arabic)" | Same mismatch — Inter not used; Plus Jakarta Sans is the UI font |

### 10.2 Health Check Retries

| Document | Claims | Actual Code |
|----------|--------|-------------|
| `CONTEXT.md` (line 123) | "200 retries @ 15s" | **`docker-compose.yml`** (line 30): `retries: 60` (not 200) |
| `docker-compose.yml` (line 31) | `start_period: 60s` (not 120s) | |

### 10.3 Port Reference in `.env`

| Document | Claims | Actual Code |
|----------|--------|-------------|
| `AGENTS.md` (section 1) | "Host ports: backend 9000, frontend 9001" | **`.env`**: `BACKEND_PORT=9100` (not 9000) |
| `docker-compose.yml` (line 9) | `"9000:8000"` (matches AGENTS.md) | `.env` disagrees with docker-compose.yml |

### 10.4 Empty Backend Subdirectories

| Observation | Code | Documentation |
|-------------|------|---------------|
| **No source files** in `backend/tts/`, `backend/storage/`, `backend/learning/`, `backend/db/` | Only `__pycache__/` exists — no `.py` source files | Not mentioned in any documentation |
| **No source files** in `backend/content/a2/`, `backend/content/b1/` | Empty directories | Not mentioned in any documentation |
| **No source files** in `backend/frontend_source/` | Empty directory | Not mentioned in any documentation |
| **No source files** in `frontend/app/plugins/` | Empty directory | Not mentioned in any documentation |
| **No source files** in `frontend/shared/types/` | Empty directory | Not mentioned in any documentation |

These directories contain only Python bytecode cache (`.pyc` files), suggesting source files were removed or never committed. The presence of compiled modules like `engine.cpython-312.pyc`, `sqlite_repository.cpython-312.pyc`, `scoring.cpython-312.pyc` implies these modules existed at some point but have been deleted without their source.

### 10.5 Backend Test Files

| Observation | Code | Documentation |
|-------------|------|---------------|
| **35+ compiled test modules** in `backend/tests/__pycache__/` | Only 7 `.py` source files visible | The compiled bytecode references tests for `test_lesson_integration`, `test_session_state`, `test_phrases`, `test_health_live_engine`, `test_health_fields` — modules that don't exist as source files |

### 10.6 PRD vs Actual API

| Document | Claims | Actual Code |
|----------|--------|-------------|
| `docs/PRD.md` (lines 75–96) | `SynthesisRequest` has `voice: 'female' | 'male'` (constrained) | **`app.py`**: `voice: Optional[str]` (any string accepted, validated at runtime) |
| `docs/PRD.md` (lines 85–89) | `SynthesisResponse` returns `audio_url`, `filename`, `duration_seconds` | **`app.py`**: Returns raw `FileResponse` (binary MP3), not JSON |

### 10.7 `usePanelToggle` Component

| Document | Claims | Actual Code |
|----------|--------|-------------|
| `c4-components-spa.md` (line 33) | `PanelToggle.vue` component listed | **No `PanelToggle.vue`** file exists. The composable `usePanelToggle.ts` exists and is used directly in `index.vue`, but there is no separate component. |

### 10.8 Number of Composables

| Document | Claims | Actual Code |
|----------|--------|-------------|
| `c4-components-spa.md` (line 99) | "7 composables" | **Actual**: 8 composables (`useScrollReveal.ts` was added) |

### 10.9 Number of Backend Routes

| Document | Claims | Actual Code |
|----------|--------|-------------|
| `CONTEXT.md` (line 56) | 4 endpoints listed | **Actual**: 5 endpoints (`/health`, `/api/voices`, `/api/generate`, `/api/history`, `/api/cleanup`) — `POST /api/cleanup` not documented |
| `c4-components-backend.md` (lines 33–38) | 4 endpoints listed | **Actual**: 5 endpoints (missing `/api/cleanup`) |
