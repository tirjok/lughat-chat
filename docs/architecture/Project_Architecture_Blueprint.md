# Project Architecture Blueprint — Lughat Chat

> **Generated:** 2026-08-02
> **Project:** Lughat Chat — Arabic Text-to-Speech Web Application
> **Stack:** Nuxt 4 (Vue 3) + FastAPI + Coqui XTTS-v2 + Docker
> **Previous blueprint:** 2026-08-01 (see `docs/architecture/Project_Architecture_Blueprint.md` git history)

---

## 1. Architecture Detection and Analysis

### Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | Nuxt 4 | 4.4.5 | Full-stack Vue framework with file-based routing |
| **UI Library** | Vue 3 | 3.5.13 | Composition API + `<script setup>` |
| **Language** | TypeScript | 6.0.3 | Type-safe JavaScript superset |
| **Atomic CSS** | UnoCSS | 66.7.2 | Instant atomic CSS engine (Tailwind-compatible) |
| **Package Manager** | pnpm | 10.33.4 | Fast, disk-efficient package manager |
| **Backend Framework** | FastAPI | 0.115.6 | Async Python web framework |
| **TTS Engine** | Coqui TTS | 0.27.5 | XTTS-v2 multilingual speech synthesis |
| **Server** | uvicorn | 0.34.0 | ASGI server (standard mode) |
| **Proxy** | Nginx | alpine | Reverse proxy + static file serving |
| **Containerization** | Docker Compose | — | Multi-container orchestration |
| **CI/CD** | GitHub Actions | — | Automated testing pipeline |
| **Testing** | Vitest 4.x / pytest | — | Frontend + backend test frameworks |

### Architecture Pattern: **Layered Monolith with Client-Server Split**

The project follows a **layered monolithic architecture** split across two independently deployable services:

- **Presentation Layer** (Frontend): Nuxt SPA with Nginx serving static assets
- **Application/API Layer** (Backend): FastAPI REST API with business logic
- **Infrastructure Layer**: Docker Compose with bridge networking, named volumes

The architecture is **not** microservices — both services are tightly coupled, deployed together, and share a single Docker network. The split is organizational (separate codebases, separate CI pipelines) rather than architectural decoupling.

---

## 2. Architectural Overview

### Guiding Principles

1. **Single-page application with full-page studio layout** — The app is a single page (`/`) with a two-panel split layout (Control Deck + Canvas). No routing or navigation exists.
2. **Stateless API, stateful model** — The FastAPI backend is stateless for all HTTP endpoints except the in-memory TTS model, which is loaded once at startup and reused across all requests.
3. **Dynamic voice discovery** — Voices are discovered at runtime from the filesystem (`speaker_wavs/` directory). No hardcoded voice list or database.
4. **Offline-first fonts** — All fonts are self-hosted (bundled with the frontend build). Only Phosphor Icons load from CDN.
5. **Dark-mode-first design** — The entire UI is built on a dark theme ("Sunrise Surge" palette: `#121212` base, `#FF512F`/`#DD2476` accent).

### Architectural Boundaries

```
┌─────────────┐     HTTP/REST      ┌──────────────┐
│  Browser     │◄════════════════►│  FastAPI       │
│  (Nginx)     │  JSON + MP3      │  (uvicorn)     │
└─────────────┘                   └──────────────┘
                                   │
                              Coqui XTTS-v2
                              (in-memory model)
```

- **Frontend ↔ Backend boundary**: REST API over HTTP. All API calls go through Nginx proxy in production; Nitro devProxy in development.
- **Backend ↔ Model boundary**: Python process-local in-memory object (`tts_model` global). No serialization or IPC.
- **Frontend ↔ Filesystem boundary**: None directly. The frontend never accesses the filesystem; it communicates with the backend.

### Hybrid Patterns

- **Monolithic deployment, modular codebase**: Two services in one repo, one `docker-compose.yml`.
- **Lifespan-based resource management**: The TTS model is loaded in a FastAPI `lifespan` context manager (background thread), yielding server readiness immediately.
- **Health-polling pattern**: The frontend polls `/health` every 2 seconds during model loading, with a configurable retry limit (default 60).

---

## 3. Architecture Visualization

### C4 Context Diagram

```
┌──────────────┐         ┌─────────────────────────────────────────┐
│   User       │         │           Lughat Chat System            │
│   (Browser)  │         │                                         │
└──────┬───────┘         │  ┌─────────────┐        ┌─────────────┐ │
       │                 │  │  Frontend   │        │   Backend   │ │
       │  HTTP/REST      │  │  (Nginx)    │        │  (FastAPI)  │ │
       │  ──────────────►│  │             │◄──────►│             │ │
       │  (static + API) │  │  Port 9001  │  API   │  Port 9000  │ │
       │                 │  └─────────────┘        └──────┬──────┘ │
       │                 │                               │        │
       │                 │                    Coqui XTTS-v2       │
       │                 │                    (in-memory)         │
       │                 │                                    ┌───┴──────┐
       │                 │                                    │ Speaker  │
       │                 │                                    │ WAVs     │
       │                 │                                    │ (files)  │
       │                 │                                    └──────────┘
       └─────────────────┼─────────────────────────────────────────┘
                         ▼
              ┌──────────────────────┐
              │  Speaker WAV Files   │
              │  (filesystem)        │
              └──────────────────────┘
```

### Container Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Network: lughat-network              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  frontend (lughat-frontend)                               │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  Nginx (port 80)                                   │  │ │
│  │  │  ├─ Static files (Nuxt build output)               │  │ │
│  │  │  ├─ Reverse proxy /api/ → backend:8000             │  │ │
│  │  │  ├─ Reverse proxy /health → backend:8000           │  │ │
│  │  │  └─ SPA fallback (try_files $uri /index.html)      │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  Nuxt Build Output                                  │  │ │
│  │  │  ├─ index.html (prerendered)                       │  │ │
│  │  │  ├─ _nuxt/ (JS/CSS assets, 30d cache)              │  │ │
│  │  │  └─ fonts/ (self-hosted WOFF2)                     │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  backend (lughat-backend)                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  Python 3.12 + uvicorn                              │  │ │
│  │  │  ├─ FastAPI app (app.py)                            │  │ │
│  │  │  │  ├─ /health (GET)                               │  │ │
│  │  │  │  ├─ /api/voices (GET)                           │  │ │
│  │  │  │  ├─ /api/generate (POST)                        │  │ │
│  │  │  │  ├─ /api/history (GET)                          │  │ │
│  │  │  │  └─ /api/cleanup (POST)                         │  │ │
│  │  │  ├─ Coqui TTS (XTTS-v2 model, ~2GB)                │  │ │
│  │  │  ├─ Static files: /downloads, /speaker_wavs        │  │ │
│  │  │  └─ CORS middleware (allow_all)                    │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Named Volumes:                                                 │
│  ├─ tts-model-cache → /root/.local/share/tts (~2GB)           │
│  └─ tts-audio-cache → /app/downloads (generated MP3s)         │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram — Speech Generation

```
User types Arabic text
        │
        ▼
  Frontend (Vue)
  ┌─────────────────────────────┐
  │ 1. Input validation         │
  │    (useInputValidation)     │
  │ 2. Voice selection           │
  │ 3. Speed/pitch params        │
  └─────────────────────────────┘
        │
        │  POST /api/generate
        │  { text, language, speaker, speed }
        ▼
  Nginx (reverse proxy)
  ┌─────────────────────────────┐
  │ 4. Proxy to backend:8000    │
  │ 5. Set: proxy_buffering off │
  │ 6. timeout 1800s            │
  └─────────────────────────────┘
        │
        │  POST /api/generate
        ▼
  FastAPI (app.py)
  ┌─────────────────────────────┐
  │ 7. Validate model ready     │
  │ 8. Resolve speaker WAV      │
  │ 9. Validate duration ≥ 0.33s│
  │ 10. Set PyTorch seed        │
  │ 11. tts.tts_to_file()       │
  │ 12. ffmpeg: WAV → MP3       │
  │ 13. FileResponse (MP3)      │
  └─────────────────────────────┘
        │
        │  audio/mpeg (binary)
        ▼
  Frontend (Blob → URL.createObjectURL)
  ┌─────────────────────────────┐
  │ 14. Store in audioUrl       │
  │ 15. Wire to <audio> element │
  │ 16. Show AudioPlayerPanel   │
  │ 17. Play with WaveformCanvas│
  └─────────────────────────────┘
```

---

## 4. Core Architectural Components

### 4.1 Frontend — Nuxt SPA

**Purpose:** Single-page TTS Studio application providing text input, voice selection, speed control, and audio playback.

**Architecture:**

```
frontend/
├── app/                          # Source code (Nuxt srcDir)
│   ├── app.vue                   # Root component (sets SEO, viewport, favicon)
│   ├── app.config.ts             # Nuxt UI theme config (primary: green, neutral: slate)
│   ├── pages/
│   │   └── index.vue             # Main page (prerendered, full-page studio)
│   ├── components/               # 9 Vue components (auto-imported)
│   │   ├── AudioPlayerPanel.vue  # Audio playback: play/pause/seek/download
│   │   ├── FocusHaloCanvas.vue   # Focus glow effect (textarea focus/blur)
│   │   ├── GenerateButton.vue    # Generate speech button (loading states)
│   │   ├── MobileStatusIndicator.vue  # Compact model status (mobile)
│   │   ├── ModelStatusIndicator.vue   # Desktop model status indicator
│   │   ├── SpeedSlider.vue       # Speed adjustment (0.5×–2.0×)
│   │   ├── ToastNotification.vue # Toast messages (success/error/info)
│   │   ├── VoiceSelector.vue     # Voice/dialect selector dropdown
│   │   └── WaveformCanvas.vue    # Animated waveform visualization
│   └── composables/              # 8 Vue composables (auto-imported)
│       ├── useAudioModule.ts     # Audio playback state management (182 lines)
│       ├── useHealthPoll.ts      # Backend health check polling (64 lines)
│       ├── useInputValidation.ts # Text input validation logic (30 lines)
│       ├── usePanelToggle.ts     # Panel toggle state (46 lines)
│       ├── useScrollReveal.ts    # Scroll-reveal fade-up animations (74 lines)
│       ├── useToast.ts           # Toast notification management (58 lines)
│       ├── useTtsApi.ts          # TTS API calls (synthesize, healthCheck) (100 lines)
│       └── useVoices.ts          # Voice list fetching and management (39 lines)
├── assets/css/
│   └── main.css                  # Global styles (@apply with UnoCSS)
├── nuxt.config.ts                # Nuxt configuration
├── uno.config.ts                 # UnoCSS configuration (presets, theme, shortcuts)
├── nginx.conf                    # Nginx reverse proxy config (production)
├── Dockerfile                    # Multi-stage build (Node 20 → Nginx Alpine)
└── .github/workflows/ci.yml      # Pre-merge CI (lint + typecheck)
```

**Internal Structure:**

- **Components:** Pure Vue 3 components using `<script setup lang="ts">` with Composition API. 9 components totaling 1,093 lines.
- **Composables:** Reusable Vue composables (functions returning reactive state). 8 composables totaling 593 lines.
- **State Management:** No Vuex/Pinia. State is managed locally within components and composables using Vue's `ref()` and `computed()`.

**Key Design Decisions:**

- **No global state management library** — State is co-located in composables and components. The global `useToast()` composable uses a module-level `ref<ToastEntry[]>` as a shared store.
- **Nuxt auto-imports** — All components in `app/components/` and composables in `app/composables/` are auto-imported without explicit `import` statements. The main page (`index.vue`) uses explicit imports for clarity.
- **Prerendered single page** — `routeRules: { '/': { prerender: true } }` — The entire app is a single prerendered HTML page.
- **No plugins** — `app/plugins/` directory exists but is empty.
- **No shared types** — `frontend/shared/types/` directory exists but is empty.

**Component Inventory (9):**

| Component | Lines | Role |
|-----------|-------|------|
| `AudioPlayerPanel.vue` | 161 | Audio playback UI: play/pause/seek/download |
| `FocusHaloCanvas.vue` | 70 | Focus glow effect (textarea focus/blur) |
| `GenerateButton.vue` | 162 | Synthesis trigger with loading states |
| `MobileStatusIndicator.vue` | 43 | Compact model status (mobile FAB) |
| `ModelStatusIndicator.vue` | 43 | Desktop model status pill |
| `SpeedSlider.vue` | 126 | Speed control (0.5×–2.0×) |
| `ToastNotification.vue` | 82 | Toast display with auto-dismiss |
| `VoiceSelector.vue` | 230 | Voice selection dropdown |
| `WaveformCanvas.vue` | 176 | Waveform visualization |

**Composable Inventory (8):**

| Composable | Lines | Purpose | Exposed API |
|------------|-------|---------|-------------|
| `useAudioModule()` | 182 | Audio playback state | `load()`, `play()`, `pause()`, `toggle()`, `seek()`, `download()`, `dispose()`, `audioRef`, state refs |
| `useHealthPoll()` | 64 | Backend health polling | `status` (ref: loading/ready/error), `modelLoaded` (computed) |
| `useInputValidation()` | 30 | Text validation | `isValid` (computed), `error` (computed) |
| `usePanelToggle()` | 46 | Panel toggle state | `activePanel` (ref: "control-deck" | "canvas"), `isMobile`, `togglePanel()` |
| `useScrollReveal()` | 74 | Scroll-reveal animations | `observe()`, `disconnect()` |
| `useToast()` | 58 | Toast notifications | `showToast(message, type)`, toast list (ref) |
| `useTtsApi()` | 100 | TTS API client | `synthesize(request)`, `healthCheck()` |
| `useVoices()` | 39 | Voice management | `voices` (ref), `loading` (ref), `error` (ref), `loadVoices()` |

### 4.2 Backend — FastAPI REST API

**Purpose:** Text-to-speech synthesis API using Coqui XTTS-v2 model.

**Architecture:**

```
backend/
├── app.py                        # Main FastAPI application (593 lines)
├── requirements.txt              # Runtime dependencies (6 packages)
├── requirements-test.txt         # Test dependencies (8 packages)
├── Dockerfile                    # Multi-stage build (Python 3.12 + Coqui TTS)
├── pytest.ini                    # Pytest configuration (testpaths: tests)
├── generate_speaker_wavs.py      # Utility script: generates speaker WAV files from TTS
├── speaker_wavs/                 # Voice reference audio files (mounted volume)
│   ├── KSA Hamed - Male.wav
│   └── KSA Zariyah - Female.wav
├── downloads/                    # Generated audio files (persisted volume)
└── tests/                        # Pytest test suite (6 files, 1,082 lines)
    ├── test_ffmpeg_fallback.py   # FFmpeg fallback behavior
    ├── test_generate.py          # Speech generation happy/error paths
    ├── test_generate_blob.py     # Binary response handling
    ├── test_health.py            # Health endpoint
    ├── test_history.py           # History listing
    └── test_voices.py            # Voice discovery
```

**Endpoints (5):**

| Endpoint | Method | Response | Purpose |
|---|---|---|---|
| `/health` | GET | `{ status, model_loaded }` | Model load status (+ `?reload=1` to force reload) |
| `/api/voices` | GET | `Voice[]` | Discover voices from filesystem |
| `/api/generate` | POST | `audio/mpeg` (binary) | Generate speech from text |
| `/api/history` | GET | `HistoryEntry[]` | List previously generated files (+ `?cleanup=true`) |
| `/api/cleanup` | POST | `{ removed_count }` | Remove files older than 24 hours |

**Internal Structure (app.py, 593 lines):**

- **Single-file architecture** — All logic in one file: model loading, API endpoints, request/response models, and static file serving.
- **Pydantic models**: `SynthesisRequest`, `SynthesisResponse` (defined but unused), `HealthResponse`.
- **Lifespan context manager**: Background thread loads the TTS model on startup; server becomes immediately available.
- **Global mutable state**: `tts_model` (TTS instance) and `model_load_status` (string: `"loading"|"ready"|"error"`), protected by `_model_lock` (threading.Lock).
- **Torch compatibility patches**: Patches `isin_mps_friendly` and `load_library` for CPU-only environments.
- **Utility functions**: `discover_voices()`, `_validate_speaker_wav()`.

**Request/Response Models:**

| Model | Fields | Used By |
|-------|--------|---------|
| `SynthesisRequest` | `text` (1-3000), `language` (ar\|en), `voice`, `speaker`, `speed` (0.5-2.0), `pitch` (-4.0-4.0), `seed` (optional int) | `/api/generate` |
| `SynthesisResponse` | `audio_url`, `filename`, `duration_seconds` | **Defined but not used** — endpoint returns raw FileResponse |
| `HealthResponse` | `status`, `model_loaded` | `/health` |

### 4.3 Infrastructure — Docker Compose

**Services (2):**

| Service | Container | Host:Container Port | Dependencies |
|---------|-----------|---------------------|-------------|
| `backend` | `lughat-backend` (Python 3.12-slim) | 9000:8000 | None |
| `frontend` | `lughat-frontend` (nginx:alpine) | 9001:80 | `backend` (service_healthy) |

**Volumes (2):**

| Volume | Mount Point (container) | Size | Persistence |
|--------|------------------------|------|-------------|
| `tts-model-cache` | `/app/.cache/tts` (env var) | ~2 GB | **Not used** — env var `TTS_MODEL_CACHE=/app/.cache/tts` points to a path not mounted by the volume (volume actually mounts at `/root/.local/share/tts`) |
| `tts-audio-cache` | `/app/downloads` | Unbounded | **Used** — persists generated MP3 files |

**Network:** `lughat-network` (bridge driver).

**Dockerfile Details:**

- **Backend** (55 lines): Multi-stage not used — single-stage build from `python:3.12-slim`. Installs ffmpeg, libsndfile1, build tools, CPU-only PyTorch, Coqui TTS, then rebuilds torchcodec from source without CUDA. Health check verifies `/health` returns `model_loaded: true`.
- **Frontend** (33 lines): Two-stage build. Stage 1: `node:20-alpine` with pnpm 10.33.4, runs `pnpm build`. Stage 2: `nginx:alpine` with custom `nginx.conf`, copies build output.

**Nginx Configuration (62 lines):**

- Routes: `/` → SPA files, `/api/` → `backend:8000`, `/health` → `backend:8000`, `/downloads/` → `backend:8000`, `/nginx-health` → local `200 OK`.
- Large file support: `proxy_buffering off`, `proxy_request_buffering off`, 1800s timeout for TTS synthesis.
- SPA fallback: `try_files $uri $uri/ /index.html`.
- Static asset caching: 30 days with `Cache-Control: public, immutable`.

### 4.4 CI/CD Pipeline

**Workflows (3):**

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `backend.yml` | Push/PR to `main`/`develop`, path `backend/**` | Checkout → Python 3.12 → ffmpeg → `pip install -r requirements-test.txt` → `pytest --cov=app` |
| `frontend.yml` | Push/PR to `main`/`develop`, path `frontend/**` | Checkout → pnpm 10.33.4 + Node 24 → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test -- --coverage` |
| `ci.yml` (frontend root) | Push to any branch | Checkout → pnpm → Node 22 → `pnpm lint` → `pnpm typecheck` (no tests) |

**Quality Gate (`run-tests.sh`):** Runs sequentially, stops at first failure:
1. Backend tests (`./scripts/run-backend-tests.sh` — Docker + pytest)
2. Frontend lint (`pnpm lint`)
3. Frontend typecheck (`pnpm typecheck`)
4. Frontend tests (`pnpm test`)

**Pre-commit Hooks (`.pre-commit-config.yaml`):**
- `ruff` (lint + fix)
- `ruff-format` (format)
- `./run-tests.sh` (full quality gate, runs on every commit)

---

## 5. Architectural Layers and Dependencies

### Layer Structure

```
Browser (HTTP)
    │
    ▼
Nginx (Reverse Proxy)
    │
    ▼
FastAPI (API Layer)
    │
    ├─ Pydantic Models (validation layer)
    ├─ Business Logic (TTS generation, file handling)
    └─ Static File Serving (downloads, speaker_wavs)
```

### Dependency Rules

- **Frontend → Backend**: Only via `/api/*` and `/health` endpoints. No direct filesystem access.
- **Backend → TTS**: In-process Python API call (`TTS.api.TTS`). No IPC or serialization.
- **Backend → Filesystem**: Reads `speaker_wavs/` for reference audio, writes `downloads/` for generated audio.
- **No cross-service dependencies**: Frontend and backend are independent builds; only connected at runtime via the Docker network.

### Layer Violations

- **None detected**. The single-file backend (`app.py`) conflates multiple layers (API, business logic, data access) but this is intentional for a focused TTS service.

---

## 6. Data Architecture

### Domain Model

The application has no persistent database. All "data" is either:

1. **In-memory**: TTS model object (`tts_model` global), toast state (`toastState` module-level ref).
2. **File-based**: Speaker reference WAV files (`speaker_wavs/`), generated audio (`downloads/`), metadata sidecars (`downloads/*.json`).
3. **Client-side**: Vue reactive state (`ref`/`computed`) within composables.

### Entity Relationships

```
Speaker WAV (file)
    │
    ├─→ Voice entry (discovered at runtime)
    │       └─→ VoiceSelector (UI component)
    │
    └─→ generate_speech() (uses as speaker reference for voice cloning)

Generated MP3 (file)
    │
    ├─→ Metadata sidecar (.json) — text, language, voice, speed, pitch, seed, created_at
    ├─→ History entry (GET /api/history)
    └─→ Audio playback (Blob → URL.createObjectURL → <audio>)
```

### Data Access Patterns

- **Speaker WAVs**: Read-only directory scan at request time (`discover_voices()`).
- **Generated audio**: Write-once (POST /api/generate), read-many (GET /api/history, direct file serving via `/downloads/`).
- **Metadata sidecars**: Write alongside generated MP3, read during history listing. Falls back to filename parsing if JSON is missing/corrupt.

### Caching Strategy

- **TTS model**: In-memory, loaded once at startup. No cache invalidation (except `?reload=1` query parameter on `/health`).
- **Model cache volume**: `tts-model-cache` is defined but **not effectively used** — the app writes to `/app/.cache/tts` (env var), which is not the volume mount point (`/root/.local/share/tts`). Result: ~2GB model re-downloads every container restart.
- **Frontend static assets**: 30-day cache via Nginx (`expires 30d; Cache-Control: public, immutable`).

### Validation Patterns

- **Backend**: Pydantic `Field()` constraints (`min_length`, `max_length`, `pattern`, `ge`, `le`). Runtime validation of speaker WAV existence and duration (≥ 0.33s).
- **Frontend**: `useInputValidation()` returns `{ isValid, error }` based on text presence and model readiness.

---

## 7. Cross-Cutting Concerns Implementation

### Authentication & Authorization

- **None implemented**. The API is open to any caller on the Docker network. CORS allows all origins (`*`).
- **Security note**: Both Nginx and FastAPI allow `*` for CORS. Should be restricted to the frontend container IP in production.

### Error Handling & Resilience

- **Backend**: `HTTPException` with descriptive `detail` messages. Status codes: 400 (validation), 503 (model loading), 500 (generation failure, missing WAV, short WAV, FFmpeg failure).
- **Frontend**: All user-facing errors via `showToast()` (module-level function). Input validation via `useInputValidation()`. `isGenerating` disables button + spinner.
- **Resilience**: TTS model loading has retry logic (3 attempts, exponential backoff: 2s, 4s, 8s) with a 300-second hard timeout. Frontend health polling has configurable max retries (default 60).
- **FFmpeg fallback**: Explicitly disabled — if FFmpeg conversion fails, the request returns 500 rather than serving raw WAV as MP3 (browsers' `<audio>` elements refuse PCM WAV labeled as `audio/mpeg`).

### Logging & Monitoring

- **Backend**: `print()` statements to stderr for model loading, generation, cleanup events. No structured logging or metrics endpoint.
- **Frontend**: `console.error()` for voice loading failures. No telemetry or error reporting.
- **Docker**: Health check verifies `/health` returns `model_loaded: true`. 200 retries at 15s intervals with 60s start period (total ~30min before giving up).

### Validation

- **Input validation**: Pydantic `Field()` constraints on `SynthesisRequest` (text 1-3000 chars, language `ar|en`, speed 0.5-2.0, pitch -4.0-4.0).
- **Runtime validation**: Speaker WAV existence check, duration check (≥ 0.33s), TTS model readiness check before each generation.
- **Frontend validation**: `useInputValidation()` returns `{ isValid, error }` based on text presence and model readiness.

### Configuration Management

- **Environment variables**: `TZ=UTC`, `TTS_MODEL_CACHE=/app/.cache/tts`, `COQUI_TOS_AGREED=1`, `LD_LIBRARY_PATH`.
- **Configuration files**: `nuxt.config.ts` (Nuxt modules, routeRules, devProxy, ESLint, UnoCSS), `uno.config.ts` (presets, theme, shortcuts), `app.config.ts` (UI colors).
- **No feature flags**: The application has no feature flag system.

---

## 8. Service Communication Patterns

### Service Boundaries

- **Frontend container**: Nginx serves SPA static files and proxies API requests. No business logic.
- **Backend container**: FastAPI handles all business logic (TTS synthesis, file management, voice discovery).

### Communication Protocols

- **HTTP/REST**: JSON request bodies, binary MP3 responses.
- **Nginx proxy**: Relative URLs from frontend (`/api/generate`), resolved by Nginx to `backend:8000`.

### Synchronous vs Asynchronous

- **All synchronous**: HTTP request → response cycle. No message queues or event buses.
- **Background model loading**: The TTS model is loaded in a daemon thread during FastAPI startup, but this is an implementation detail — the API itself is synchronous.

### API Versioning

- **None**. The API is at version 1.0.0 (FastAPI metadata). No version prefix in routes (`/api/generate` not `/api/v1/generate`).

### Resilience in Service Communication

- **Health polling**: Frontend polls `/health` every 2 seconds until model is ready (max 60 retries).
- **Nginx timeouts**: 1800s (30 minutes) for API and download endpoints, 30s for health proxy.
- **CORS**: Both Nginx and FastAPI allow all origins (`*`).

---

## 9. Technology-Specific Architectural Patterns

### Nuxt 4 / Vue 3 Patterns

- **File-based routing**: Single page (`app/pages/index.vue`). No router configuration needed.
- **Auto-imports**: Components in `app/components/` and composables in `app/composables/` are auto-imported.
- **Composition API only**: All components use `<script setup lang="ts">`. No Options API.
- **Nuxt UI theme**: `app.config.ts` sets primary (`green`) and neutral (`slate`) colors.
- **Prerendered SPA**: `routeRules: { '/': { prerender: true } }` — single HTML file.
- **UnoCSS atomic CSS**: Presets (`presetWind3`, `presetTypography`, `presetWebFonts`), transformers (`transformerDirectives`), shortcuts (`btn`, `card`, `flex-center`, `flex-between`), custom rules (`text-gradient`).
- **State management**: No Pinia/Vuex. State co-located in composables using `ref()`/`computed()`.
- **No plugins**: `app/plugins/` directory exists but is empty.
- **No shared types**: `frontend/shared/types/` directory exists but is empty.

### FastAPI Patterns

- **Single-file application** (`app.py`): All logic in one file (593 lines).
- **Lifespan context manager**: Background thread loads TTS model on startup; server becomes immediately available.
- **Global mutable state**: `tts_model` and `model_load_status` are module-level globals, protected by `_model_lock` (threading.Lock).
- **Pydantic validation**: Request models with `Field()` constraints.
- **Static file serving**: `app.mount()` for `/downloads` and `/speaker_wavs`.
- **CORS middleware**: `CORSMiddleware` with `allow_origins=["*"]`.

### Docker Patterns

- **Two-service compose**: Backend (FastAPI + TTS) + Frontend (Nginx + SPA).
- **Bridge networking**: `lughat-network` connects both containers.
- **Named volumes**: `tts-model-cache` (ineffective), `tts-audio-cache` (used).
- **Health checks**: Backend health check (`/health`) with 200 retries, 15s interval, 60s start period.
- **Multi-stage frontend build**: Node 20 → Nginx Alpine.
- **Single-stage backend build**: Python 3.12-slim with CPU-only PyTorch + Coqui TTS + torchcodec rebuilt from source.

---

## 10. Implementation Patterns

### Interface Design Patterns

- **Frontend composables**: Named functions (`use<Name>`) returning reactive state objects. Convention: prefix with `use`, export as default function.
- **Backend Pydantic models**: Class-based request/response models with `Field()` constraints.

### Service Implementation Patterns

- **Background model loading**: `lifespan()` context manager starts a daemon thread (`threading.Thread(target=load_model, daemon=True)`).
- **Retry with backoff**: 3 attempts, delays [2s, 4s, 8s], 300s hard timeout.
- **Thread safety**: `_model_lock` (threading.Lock) protects `tts_model` and `model_load_status` reads/writes.

### Data Access Patterns

- **Directory scanning**: `os.listdir()` + `str.endswith('.wav')` for voice discovery.
- **Sidecar metadata**: JSON files written alongside generated MP3s. History endpoint reads JSON first, falls back to filename parsing.
- **Cleanup**: `/api/history?cleanup=true` (inline) and `/api/cleanup` (dedicated endpoint) both remove files older than 24 hours.

### API Implementation Patterns

- **POST /api/generate**: Returns `FileResponse` (binary MP3), not JSON. The `SynthesisResponse` model is defined but never used.
- **GET /api/voices**: Returns array of `{id, name}` from discovered `.wav` files.
- **GET /health**: Returns `{status, model_loaded}`. Accepts `?reload=1` to force model reload.
- **GET /api/history**: Returns array of history entries. Accepts `?cleanup=true` for inline cleanup.
- **POST /api/cleanup**: Dedicated cleanup endpoint.

### Domain Model Implementation

- **No ORM or database**. All "domain" data is file-based (speaker WAVs, generated audio) or in-memory (TTS model, toast state).

---

## 11. Testing Architecture

### Testing Strategies

| Layer | Framework | Location | Files | Lines |
|-------|-----------|----------|-------|-------|
| Frontend unit/component | Vitest 4.x + jsdom | `frontend/tests/` | 19 `.test.ts` | 2,770 |
| Backend unit | pytest | `backend/tests/` | 6 `.py` | 1,082 |

### Test Organization

- **Frontend**: 19 test files covering all 8 composables, 7 of 9 components, and the index page. Two test files per component (`VoiceSelector.test.ts`, `VoiceSelector.click.test.ts`, `VoiceSelector.animation.test.ts`, `VoiceSelector.data-attrs.test.ts`).
- **Backend**: 6 test files covering all endpoints (`test_generate.py`, `test_generate_blob.py`, `test_health.py`, `test_history.py`, `test_voices.py`, `test_ffmpeg_fallback.py`).

### Test Setup

- **Frontend**: Two Vitest configs: `vitest.config.ts` (unit tests, setup: `tests/setup.ts`) and `vitest.component.config.ts` (component tests, setup: `tests/setup.component.ts`). Setup files manually stub auto-imports (`ref`, `computed`, `watch`, `onMounted`).
- **Backend**: `pytest.ini` with `testpaths = tests`, `pythonpath = .`.

### Test Doubles

- **Frontend**: `mocks.ts` provides mock implementations. Tests use manual stubs for Vue auto-imports.
- **Backend**: Tests run inside Docker with the full stack (including Coqui TTS library). No mocking of the TTS library itself.

---

## 12. Deployment Architecture

### Deployment Topology

```
User Browser (Port 9001)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Docker Host (Bridge Network: lughat-network)               │
│                                                               │
│  ┌─────────────────────┐         ┌────────────────────────┐ │
│  │  Frontend Container  │         │  Backend Container     │ │
│  │  (port 80)          │◄────────│  (port 8000)           │ │
│  │                     │ HTTP  │                         │ │
│  │  Nginx:             │ Proxy │  FastAPI:               │ │
│  │  • SPA serve (/)    │──────►│  • /health              │ │
│  │  • API proxy (/api) │       │  • /api/voices          │ │
│  │  • Health proxy     │       │  • /api/generate        │ │
│  │  • CORS headers     │       │  • /api/history         │ │
│  │  • Cleanup endpoint │       │  • /api/cleanup         │ │
│  └─────────────────────┘       │  • Static files         │ │
│                                 │    /downloads           │ │
│                                 │    /speaker_wavs        │ │
│                                 └────────────────────────┘ │
│                                                               │
│  Volumes:                                                   │
│  • tts-model-cache → /root/.local/share/tts (not used)     │
│  • tts-audio-cache → /app/downloads (used)                 │
└─────────────────────────────────────────────────────────────┘
```

### Environment-Specific Adaptations

- **Development**: `nuxt.config.ts` `nitro.devProxy` forwards `/api/` and `/health` to `localhost:9000`. Frontend runs on `pnpm dev` (port 3000).
- **Production**: Nginx reverse proxy handles all routing. SPA prerendered as single HTML file.

### Containerization

- **Backend**: `python:3.12-slim` + ffmpeg + CPU-only PyTorch + Coqui TTS + torchcodec rebuilt from source.
- **Frontend**: Two-stage build: `node:20-alpine` (builder) → `nginx:alpine` (production).

### Runtime Dependencies

- **Model loading**: ~120 seconds on CPU. Health check: 200 retries × 15s = ~50 minutes maximum wait.
- **TTS generation**: Several seconds per request (CPU-only). Nginx timeout: 1800s (30 minutes).

---

## 13. Extension and Evolution Patterns

### Feature Addition Patterns

**Adding a new component:**
1. Create `app/components/<Name>.vue` with `<script setup lang="ts">`.
2. Use UnoCSS classes (no `<style scoped>` unless necessary).
3. Import explicitly from `index.vue` (auto-imports available but explicit imports preferred for the main page).

**Adding a new composable:**
1. Create `app/composables/use<Name>.ts`.
2. Follow naming convention: `use<Name>()` returning reactive state.
3. Export any interfaces needed by components.

**Adding an endpoint to the backend:**
1. Define Pydantic models (in `app.py`).
2. Add route handler (`@app.get()` or `@app.post()`).
3. Write tests (`backend/tests/test_<endpoint>.py`).
4. Run quality gate: `./run-tests.sh`.

### Modification Patterns

- **Single-file backend**: All changes to `app.py` affect the entire application. Test changes carefully.
- **Frontend components**: Each component is independent; modifying one component rarely affects others.

### Integration Patterns

- **Adding a new voice**: Place a `.wav` file in `backend/speaker_wavs/`. It will be discovered automatically by `/api/voices`.
- **Adding a new external service**: Update `nuxt.config.ts` (if frontend-facing) or `nginx.conf` (if proxying through Nginx).

---

## 14. Architectural Pattern Examples

### Layer Separation Example

```typescript
// Frontend composable (separation of concerns)
export const useHealthPoll = (options: UseHealthPollOptions = {}) => {
  const status = ref<'loading' | 'ready' | 'error'>('loading')
  const modelLoaded = computed(() => status.value === 'ready')
  // Polling logic with retry logic and auto-stop
  return { status, modelLoaded }
}
```

### Component Communication Example

```vue
<!-- index.vue orchestrates components and composables -->
<GenerateButton
  :isGenerating="isGenerating"
  :modelStatus="modelStatus"
  :disabled="!validationState.isValid"
  @click="handleGenerate"
/>
```

### Extension Point Example

```python
# Backend: Adding a new voice requires only a .wav file
# No code changes needed — discover_voices() scans speaker_wavs/
```

---

## 15. Blueprint for New Development

### Development Workflow

**Frontend feature:**
1. Create composable in `app/composables/use<Name>.ts`.
2. Create component in `app/components/<Name>.vue`.
3. Wire into `index.vue` (explicit imports).
4. Write test in `frontend/tests/<Name>.test.ts`.
5. Run quality gate: `./run-tests.sh`.

**Backend feature:**
1. Define Pydantic models (in `app.py`).
2. Add route handler (`@app.get()` or `@app.post()`).
3. Write tests (`backend/tests/test_<endpoint>.py`).
4. Run quality gate: `./run-tests.sh`.

### Implementation Templates

**New composable template:**
```typescript
// app/composables/use<Name>.ts
import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

export interface <Name>Options {
  // Optional configuration
}

export function use<Name>(options: <Name>Options = {}) {
  // 1. Reactive state
  const state = ref<InitialType>(initialValue)

  // 2. Derived state
  const derived = computed(() => /* ... */)

  // 3. Side effects (onMounted / onUnmounted)
  onMounted(() => { /* ... */ })
  onUnmounted(() => { /* ... */ })

  // 4. Expose
  return { state, derived }
}
```

**New component template:**
```vue
<!-- app/components/<Name>.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  // Define props with defaults
}

const props = withDefaults(defineProps<Props>(), { /* defaults */ })
const emit = defineEmits<{ /* events */ }>()

// State and logic
const state = ref<InitialType>(initialValue)

onMounted(() => { /* ... */ })
onUnmounted(() => { /* ... */ })
</script>

<template>
  <!-- Semantic HTML with UnoCSS classes -->
</template>

<style scoped>
/* Only if UnoCSS @apply is insufficient */
</style>
```

### Common Pitfalls

| Pitfall | How to Avoid |
|---|---|
| Reading inline `.test.ts` files in source directories | All tests MUST go in `tests/` directories |
| Using Options API instead of Composition API | Always use `<script setup lang="ts">` |
| Hardcoding voice names instead of using dynamic discovery | Use `useVoices()` composable |
| Ignoring `prefers-reduced-motion` | Wrap animations in `@media (prefers-reduced-motion: reduce)` |
| Not handling TTS model loading state (503) | Use `useHealthPoll()` to track model status |
| Creating new UnoCSS utilities without adding to `uno.config.ts` | Define custom rules in `uno.config.ts` or use `@apply` in `main.css` |
| Forgetting to handle RTL text direction | Set `dir="rtl"` on Arabic text elements |
| Not cleaning up event listeners / observers | Always pair `onMounted` setup with `onUnmounted` cleanup |
| Modifying exported symbols without running `lsp references` | Check all call sites before modifying exported APIs |
| Assuming empty directories contain files | `app/plugins/` and `frontend/shared/types/` are empty — do not assume files exist there |

---

## 16. Architecture Governance

### Automated Quality Gates

```bash
./run-tests.sh
```

This script runs (in order, stopping at first failure):

1. **Backend tests** — `./scripts/run-backend-tests.sh` (pytest in Docker)
2. **Frontend lint** — `pnpm lint` (ESLint via `@nuxt/eslint`)
3. **Frontend typecheck** — `pnpm typecheck` (TypeScript)
4. **Frontend tests** — `pnpm test` (Vitest)

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - ruff (lint + fix)
  - ruff-format (format)
  - local: ./run-tests.sh (full quality gate)
```

### Documentation Practices

- **PRD** (`docs/PRD.md`) — Product requirements document.
- **C4 diagrams** (`docs/architecture/c4-*.md`) — Context, containers, components (backend + SPA), deployment.
- **Contributing guidelines** (`.github/CONTRIBUTING.md`) — Development workflow.
- **Security policy** (`.github/SECURITY.md`) — Vulnerability reporting.
- **Issue templates** — Bug reports and feature requests.
- **Blueprint** (`docs/architecture/Project_Architecture_Blueprint.md`) — This document.

### Blueprint Maintenance

This blueprint should be regenerated when:
- A new service is added to `docker-compose.yml`.
- The technology stack changes (framework version, package manager).
- New architectural patterns are introduced (new composables, components, or API endpoints).
- Deployment topology changes (new services, new networking).

---

## 17. Discrepancies: Documentation vs. Code

The following items were found where the existing documentation (including the 2026-08-01 blueprint and C4 diagrams) disagrees with the actual codebase:

| # | Area | Claimed in Docs | Actual in Code | Severity |
|---|------|-----------------|----------------|----------|
| 1 | Backend file size | "375-line backend" (2026-08-01 blueprint) | `app.py` is **593 lines** (2026-08-02) | **High** — Blueprint footer statistics are stale |
| 2 | Frontend components count (C4 docs) | 10 components listed (includes `PanelToggle.vue`) | 9 components in `app/components/` (no `PanelToggle.vue`) | **Medium** — C4 components-spa.md references a non-existent component |
| 3 | Frontend components count (2026-08-01 blueprint) | "9 components" | 9 components — **matches** | None |
| 4 | Frontend composables count (C4 docs) | 7 composables listed | 8 composables in `app/composables/` (missing `useScrollReveal.ts`) | **Medium** — C4 components-spa.md omits `useScrollReveal` |
| 5 | Frontend composables count (2026-08-01 blueprint) | "8 composables" | 8 composables — **matches** | None |
| 6 | Test file count (2026-08-01 blueprint) | "24 test files" | 25 test files (19 frontend `.test.ts` + 6 backend `.py`) | **Low** — Off by 1 (new test added since) |
| 7 | `PanelToggle.vue` component | Listed in C4 components-spa.md (line 33: `"PanelToggle.vue"`) | Does not exist in `app/components/` | **Medium** — Dead reference in documentation |
| 8 | `useScrollReveal` composable | Not listed in C4 components-spa.md (only 7 listed) | Exists at `app/composables/useScrollReveal.ts` (74 lines) | **Medium** — Omitted from C4 documentation |
| 9 | `/api/cleanup` endpoint | Not mentioned in C4 components-backend.md or 2026-08-01 blueprint | Exists at `app.py:559-593` (POST endpoint, 35 lines) | **High** — New endpoint not documented |
| 10 | `?reload=1` on `/health` | Not mentioned in C4 diagrams or 2026-08-01 blueprint | Implemented at `app.py:269-320` (force model reload) | **High** — Feature undocumented |
| 11 | `generate_speaker_wavs.py` | Listed in 2026-08-01 blueprint as "unused in production" | Exists at `backend/generate_speaker_wavs.py` (96 lines) — generates speaker WAVs from TTS or creates silent fallback | **Low** — Accurate characterization |
| 12 | Empty directories | Not mentioned | `app/plugins/` (empty), `frontend/shared/types/` (empty) | **Low** — Dead directories in filesystem |
| 13 | `SynthesisResponse` usage | "Defined but unused" (C4 + 2026-08-01 blueprint) | Still defined but unused — **matches** | None |
| 14 | `tts-model-cache` volume effectiveness | "Not used" (C4 + 2026-08-01 blueprint) | Still not used — env var `TTS_MODEL_CACHE=/app/.cache/tts` overrides volume mount at `/root/.local/share/tts` — **matches** | None |
| 15 | `frontend/shared/types/` directory | Not referenced in any documentation | Directory exists but is empty — **undocumented** | **Low** — Empty directory in filesystem |

### Key Changes Since 2026-08-01 Blueprint

1. **New endpoint**: `/api/cleanup` (POST) — removes files older than 24 hours.
2. **New feature on `/health`**: `?reload=1` query parameter to force model reload.
3. **New composable**: `useScrollReveal.ts` (74 lines) — scroll-entry fade-up animations via IntersectionObserver.
4. **Backend grew from ~375 to 593 lines** — likely due to the two new endpoints/features.
5. **Test count increased from 24 to 25** — new test file added.
6. **`PanelToggle.vue` referenced in C4 but never existed** — the C4 documentation was generated from a hypothetical component list, not the actual filesystem.

---

*This blueprint was generated on 2026-08-02 from a full analysis of the Lughat Chat codebase (593-line backend, 750-line frontend, 9 components, 8 composables, 25 test files, 2 Docker services, 3 CI workflows, 5 API endpoints).*
