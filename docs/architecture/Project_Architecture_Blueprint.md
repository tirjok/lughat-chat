# Project Architecture Blueprint — Lughat Chat

> **Generated:** 2026-08-01
> **Project:** Lughat Chat — Arabic Text-to-Speech Web Application
> **Stack:** Nuxt 4 (Vue 3) + FastAPI + Coqui XTTS-v2 + Docker

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
- **Health-polling pattern**: The frontend polls `/health` every 2 seconds during model loading, with a configurable retry limit.

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
│  │  │  │  └─ /api/history (GET)                          │  │ │
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
│   ├── app.vue                   # Root component (auto-imported)
│   ├── pages/
│   │   └── index.vue             # Main page (prerendered, full-page studio)
│   ├── components/               # 9 Vue components (auto-imported)
│   │   ├── AudioPlayerPanel.vue  # Audio playback: play/pause/seek/download
│   │   ├── FocusHaloCanvas.vue   # Focus glow effect (textarea focus/blur)
│   │   ├── GenerateButton.vue    # Generate speech button (loading states)
│   │   ├── MobileStatusIndicator.vue  # Compact model status (mobile FAB)
│   │   ├── ModelStatusIndicator.vue   # Desktop model status indicator
│   │   ├── SpeedSlider.vue       # Speed adjustment (0.5×–2.0×)
│   │   ├── ToastNotification.vue # Toast messages (success/error/info)
│   │   ├── VoiceSelector.vue     # Voice/dialect selector dropdown
│   │   └── WaveformCanvas.vue    # Animated waveform visualization
│   └── composables/              # 8 Vue composables (auto-imported)
│       ├── useAudioModule.ts     # Audio playback state management
│       ├── useHealthPoll.ts      # Backend health check polling
│       ├── useInputValidation.ts # Text input validation logic
│       ├── usePanelToggle.ts     # Panel toggle state (control-deck ↔ canvas)
│       ├── useScrollReveal.ts    # Scroll-reveal fade-up animations
│       ├── useToast.ts           # Toast notification management
│       ├── useTtsApi.ts          # TTS API calls (synthesize, healthCheck)
│       └── useVoices.ts          # Voice list fetching and management
├── assets/css/
│   └── main.css                  # Global styles (@apply with UnoCSS)
├── nuxt.config.ts                # Nuxt configuration
├── uno.config.ts                 # UnoCSS configuration (presets, theme, shortcuts)
└── nginx.conf                    # Nginx reverse proxy config (production)
```

**Internal Structure:**

- **Components:** Pure Vue 3 components using `<script setup lang="ts">` with Composition API. Each component encapsulates its own state, lifecycle management, and scoped styles.
- **Composables:** Reusable Vue composables (functions returning reactive state). They follow the naming convention `use<Name>.ts` and are auto-imported by Nuxt.
- **State Management:** No Vuex/Pinia. State is managed locally within components and composables using Vue's `ref()` and `computed()`.

**Key Design Decisions:**

- **No global state management library** — State is co-located in composables and components. The global `useToast()` composable uses a module-level `ref<ToastEntry[]>` as a shared store.
- **Nuxt auto-imports** — All components in `app/components/` and composables in `app/composables/` are auto-imported without explicit `import` statements.
- **Prerendered single page** — `routeRules: { '/': { prerender: true } }` — The entire app is a single prerendered HTML page.

### 4.2 Backend — FastAPI REST API

**Purpose:** Text-to-speech synthesis API using Coqui XTTS-v2 model.

**Architecture:**

```
backend/
├── app.py                        # Main FastAPI application (single file)
├── requirements.txt              # Runtime dependencies
├── requirements-test.txt         # Test dependencies
├── Dockerfile                    # Multi-stage build (Python 3.12 + Coqui TTS)
├── pytest.ini                    # Pytest configuration
├── generate_speaker_wavs.py      # Utility script (unused in production)
├── speaker_wavs/                 # Voice reference audio files (mounted volume)
│   ├── KSA Hamed - Male.wav
│   └── KSA Zariyah - Female.wav
├── downloads/                    # Generated audio files (persisted volume)
└── tests/                        # Pytest test suite
    ├── test_generate.py
    ├── test_generate_blob.py
    ├── test_health.py
    ├── test_history.py
    └── test_voices.py
```

**Endpoints:**

| Endpoint | Method | Response | Purpose |
|---|---|---|---|
| `/health` | GET | `{ status, model_loaded }` | Model load status |
| `/api/voices` | GET | `Voice[]` | Discover voices from filesystem |
| `/api/generate` | POST | `audio/mpeg` (binary) | Generate speech from text |
| `/api/history` | GET | `HistoryEntry[]` | List previously generated files |

**Internal Structure:**

- **Single-file architecture** (`app.py`): All logic in one file — model loading, API endpoints, request/response models, and static file serving.
- **Pydantic models**: `SynthesisRequest`, `SynthesisResponse` (defined but unused), `HealthResponse`.
- **Lifespan context manager**: Background thread loads the TTS model on startup; server becomes immediately available.
- **Global mutable state**: `tts_model` (TTS instance) and `model_load_status` (string: `"loading"|"ready"|"error"`).

**Key Design Decisions:**

- **In-memory model** — The TTS model is loaded once into a global variable at startup. No model caching or reloading.
- **Dynamic voice discovery** — Voices are discovered by scanning the `speaker_wavs/` directory for `.wav` files at request time. No database or configuration file.
- **File-based audio persistence** — Generated MP3 files are written to `/app/downloads/` and listed by the `/api/history` endpoint. Filenames encode metadata (`{lang}_{voice}_{timestamp}.mp3`).
- **Direct file response** — The `/api/generate` endpoint returns `FileResponse` (binary MP3), not a JSON wrapper. The `SynthesisResponse` model is defined but unused.

### 4.3 Infrastructure — Docker Compose

**Purpose:** Multi-container orchestration with bridge networking and named volumes.

```
docker-compose.yml
├── services:
│   ├── backend (lughat-backend)
│   │   ├── ports: 9000:8000
│   │   ├── volumes: tts-model-cache, tts-audio-cache, speaker_wavs/
│   │   ├── healthcheck: /health endpoint (start_period: 120s, 200 retries)
│   │   └── networks: lughat-network
│   └── frontend (lughat-frontend)
│       ├── ports: 9001:80
│       ├── depends_on: backend (service_healthy)
│       └── networks: lughat-network
├── networks: lughat-network (bridge)
└── volumes: tts-model-cache, tts-audio-cache
```

---

## 5. Architectural Layers and Dependencies

### Layer Structure

```
┌─────────────────────────────────────────────────────┐
│  Presentation Layer (Frontend)                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Vue Components (9)                           │  │
│  │  Vue Composables (8)                          │  │
│  │  UnoCSS (atomic CSS)                          │  │
│  │  Nginx (reverse proxy + static files)         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │ HTTP/REST (JSON + binary)
                        ▼
┌─────────────────────────────────────────────────────┐
│  Application/API Layer (Backend)                    │
│  ┌───────────────────────────────────────────────┐  │
│  │  FastAPI (routing, validation, CORS)          │  │
│  │  Pydantic (request/response models)           │  │
│  │  Business logic (voice resolution, validation)│  │
│  │  FFmpeg subprocess (WAV → MP3 conversion)     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │ Process-local
                        ▼
┌─────────────────────────────────────────────────────┐
│  Infrastructure Layer                               │
│  ┌───────────────────────────────────────────────┐  │
│  │  Coqui XTTS-v2 (in-memory ML model)           │  │
│  │  PyTorch (CPU-only inference)                 │  │
│  │  Filesystem (speaker_wavs/, downloads/)       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Dependency Rules

- **Frontend → Backend**: Unidirectional HTTP calls. The frontend knows nothing about the backend implementation; it only knows the API contract (URLs, request/response shapes).
- **Backend → Filesystem**: The backend reads `.wav` files from `speaker_wavs/` and writes `.mp3` files to `downloads/`. No external services.
- **No circular dependencies** — The monorepo has two independent services with a single unidirectional data flow (frontend → backend).

### Frontend Dependency Graph

```
index.vue (main page)
├── VoiceSelector (component)
│   └── useVoices (composable)
│       └── fetch('/api/voices')
├── SpeedSlider (component)
├── GenerateButton (component)
│   └── handleSynthesize()
│       └── useTtsApi().synthesize()
│           └── fetch('/api/generate')
├── AudioPlayerPanel (component)
│   └── useAudioModule()
│       └── HTMLAudioElement
├── WaveformCanvas (component)
│   └── Canvas API (requestAnimationFrame)
├── FocusHaloCanvas (component)
├── ModelStatusIndicator (component)
│   └── useHealthPoll()
│       └── fetch('/health')
├── MobileStatusIndicator (component)
│   └── useHealthPoll() (same composable)
├── ToastNotification (component)
│   └── useToast()
│       └── showToast()
├── useInputValidation()
├── usePanelToggle()
└── useScrollReveal()
```

---

## 6. Data Architecture

### Domain Models

**Voice** (frontend `useVoices.ts`):
```typescript
interface Voice {
  id: string
  name: string
  dialect: string
  tag: string
  icon: string
  speaker_wav: string
}
```

**SynthesisRequest** (frontend `useTtsApi.ts`):
```typescript
interface SynthesisRequest {
  text: string
  speaker?: string
  speed?: number
}
```

**SynthesisRequest** (backend `app.py`, Pydantic):
```python
class SynthesisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)
    language: str = Field(default="ar", pattern="^(ar|en)$")
    voice: Optional[str] = Field(default=None)
    speaker: Optional[str] = Field(default=None)
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=0.0, ge=-4.0, le=4.0)
    seed: Optional[int] = Field(default=None, ge=0)
```

**HealthResponse** (both frontend and backend):
```typescript
interface HealthResponse {
  status: 'loading' | 'ready' | 'error'
  model_loaded: boolean
}
```

### Data Flow Patterns

| Data | Source | Destination | Format |
|---|---|---|---|
| Voice list | Backend `/api/voices` | Frontend `useVoices.voices` | JSON array |
| Text input | User typing | Backend `/api/generate` | JSON string (≤3000 chars) |
| Generated audio | Backend `/api/generate` | Frontend `audioUrl` (Blob) | `audio/mpeg` binary |
| Health status | Backend `/health` | Frontend `useHealthPoll.status` | JSON |
| Audio history | Backend `/api/history` | Frontend (unused in UI) | JSON array |

### Caching Strategy

- **Static assets**: Nginx serves JS/CSS/fonts with `Cache-Control: public, immutable; max-age=30d`.
- **TTS model**: Re-downloaded on every container restart (model cache volume is NOT used for persistence per project notes).
- **Generated audio**: Accumulates in `tts-audio-cache` volume with no cleanup mechanism.

---

## 7. Cross-Cutting Concerns

### 7.1 Error Handling

**Frontend:**
- All user-facing errors use `showToast()` from `useToast` composable — appears at top-center with auto-dismiss (5 seconds).
- `useInputValidation` returns `{ isValid, error }` for input validation (empty text, model not ready).
- API errors are mapped to user-friendly messages (400 → "Invalid text", 503 → "Server unavailable", 500 → "Server error").

**Backend:**
- `HTTPException` raised for all business errors with descriptive `detail` messages.
- 503 returned if synthesis called before model finishes loading.
- 500 for missing speaker WAV files, generation failures, or FFmpeg errors.

### 7.2 Validation

**Input validation layers:**
1. **Frontend**: `useInputValidation` checks text length (trimmed) and model readiness.
2. **Backend**: Pydantic `Field(..., min_length=1, max_length=3000)` enforces text constraints.
3. **Backend**: `Field(default="ar", pattern="^(ar|en)$")` restricts language to Arabic or English.
4. **Backend**: `Field(default=1.0, ge=0.5, le=2.0)` clamps speed to valid range.
5. **Backend**: `_validate_speaker_wav()` checks WAV file duration ≥ 0.33 seconds (XTTS-v2 minimum).

### 7.3 Configuration Management

| Source | Key | Value |
|---|---|---|
| `.env` (project root) | `BACKEND_PORT` | `9000` |
| `.env` | `FRONTEND_PORT` | `9001` |
| `.env` | `API_BASE_URL` | `http://backend:8000` |
| Docker (backend) | `TTS_MODEL_CACHE` | `/app/.cache/tts` |
| Docker (backend) | `COQUI_TOS_AGREED` | `1` |
| Docker (backend) | `TZ` | `UTC` |
| `nuxt.config.ts` | `nitro.devProxy` | `localhost:9000` (dev only) |
| `uno.config.ts` | `theme.colors.studio` | `#121212`, `#1A1A1A`, `#333333` |
| `uno.config.ts` | `theme.colors.sunrise` | `#FF512F`, `#DD2476` |

### 7.4 Logging & Monitoring

- **Backend**: Structured logging via `print()` statements during model loading and synthesis. Configured via `LOG_LEVEL` and `LOG_FORMAT` environment variables (JSON format).
- **Frontend**: Console errors for failed API calls (`console.error('Failed to load voices:', e)`).
- **Health monitoring**: Docker health check on backend (`start_period: 120s`, 200 retries at 15s intervals). Nginx exposes `/nginx-health` for container health.

---

## 8. Service Communication Patterns

### Protocol and Format

- **Transport**: HTTP/1.1 over Docker bridge network (`lughat-network`).
- **Request format**: JSON bodies for `/api/generate` and `/health`.
- **Response format**: `audio/mpeg` binary for `/api/generate`; JSON for `/health`, `/api/voices`, `/api/history`.

### Communication Patterns

| Communication | Type | Pattern |
|---|---|---|
| Frontend → Backend API | Synchronous REST | `fetch()` → `Blob`/`JSON` |
| Frontend → Backend health | Polling | `setInterval(checkHealth, 2000)` |
| Backend → TTS model | Process-local | In-memory object (`tts_model` global) |
| Backend → Filesystem | File I/O | `os.listdir()`, `subprocess.run()` |

### Resilience

- **CORS**: All origins allowed (`allow_origins=["*"]`). In production, should be restricted to the frontend container IP.
- **Timeout**: Nginx sets `proxy_read_timeout 1800s` (30 minutes) for long TTS synthesis.
- **Buffering**: `proxy_buffering off` for large audio responses to prevent OOM.
- **Model loading**: Non-blocking background thread; server starts immediately, model loads asynchronously.

---

## 9. Technology-Specific Architectural Patterns

### 9.1 Vue 3 / Nuxt 4 Patterns

- **`<script setup lang="ts">`** — All components use Composition API with `<script setup>` syntax. No Options API.
- **Nuxt auto-imports** — Components and composables are auto-imported by convention (file location → name).
- **Composable pattern** — All business logic extracted into `use*` composables for testability and reuse.
- **Reactive state** — `ref()` for mutable state, `computed()` for derived state. No Vuex/Pinia.
- **Lifecycle management** — `onMounted()` / `onUnmounted()` for resource management (event listeners, observers, animations).

### 9.2 FastAPI / Python Patterns

- **Single-file application** — `app.py` contains all logic (routes, models, configuration).
- **Lifespan context manager** — `@asynccontextmanager` for background resource loading (TTS model).
- **Pydantic validation** — `BaseModel` with `Field()` constraints for request validation (types, ranges, patterns).
- **Global mutable state** — `tts_model` and `model_load_status` as module-level globals. Simple but effective for a single-model server.
- **Lazy imports** — `TTS` library imported in a `try/except` block to allow test environments without torch.

### 9.3 Docker / Nginx Patterns

- **Multi-stage build** (frontend): `node:20-alpine` (builder) → `nginx:alpine` (production).
- **Multi-stage build** (backend): `python:3.12-slim` with CPU-only PyTorch + Coqui TTS + torchcodec from source.
- **Nginx as reverse proxy**: Routes `/api/` and `/health` to backend container. Serves static files directly.
- **Bridge networking**: Both containers on `lughat-network`; Nginx resolves `backend:8000` via Docker DNS.
- **Named volumes**: `tts-model-cache` (TTS model ~2GB), `tts-audio-cache` (generated audio).

---

## 10. Implementation Patterns

### 10.1 Component Composition

Components are composed hierarchically within `index.vue`:

```
index.vue (root)
├── ToastNotification (global, always mounted)
├── Mobile split-screen layout (≤767px)
│   ├── MobileStatusIndicator (header)
│   ├── Canvas panel (top)
│   │   └── FocusHaloCanvas
│   └── Control Deck panel (bottom)
│       ├── VoiceSelector
│       └── SpeedSlider
└── Desktop side-by-side layout (≥768px)
    ├── Control Deck (left, 25-35% width)
    │   ├── Header (logo + status)
    │   ├── VoiceSelector
    │   ├── SpeedSlider
    │   └── GenerateButton
    └── Canvas (right, 65-75% width)
        ├── FocusHaloCanvas
        ├── AI Smart Tools Toolbar (placeholder buttons)
        └── AudioPlayerPanel (slides up)
            └── WaveformCanvas
```

### 10.2 Composable Patterns

**Stateful composables** (return reactive state):
- `useHealthPoll()` — Returns `{ status, modelLoaded }`. Starts polling on `onMounted()`.
- `useVoices()` — Returns `{ voices, loading, error, loadVoices() }`. Fetches on mount.
- `useToast()` — Returns `ref<ToastEntry[]>`. Module-level shared state.

**Pure function composables** (no side effects):
- `useInputValidation(textInput, modelStatus)` — Returns `{ isValid, error }`.
- `useAudioModule(options)` — Returns `{ isPlaying, isPaused, currentTime, duration, error, isLoading, audioUrl, load(), play(), pause(), toggle(), seek(), download(), dispose() }`.
- `usePanelToggle()` — Returns `{ activePanel, isMobile, togglePanel(), focusFirstInteractiveElement() }`.
- `useScrollReveal(containerRef, options)` — Returns `{ observe(), disconnect() }`. Uses `IntersectionObserver`.

### 10.3 Animation Patterns

- **CSS transitions** — Spring easing (`cubic-bezier(0.32, 0.72, 0, 1)`) for all UI transitions.
- **Keyframe animations** — `spin`, `spin-slow`, `pulse-glow`, `slide-up`, `fade-out`.
- **Scroll-reveal** — `IntersectionObserver` adds `.animate.visible` classes to `.fade-up` elements.
- **Canvas animation** — `requestAnimationFrame` loop for waveform visualization (bar-by-bar rendering).
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` disables all animations.

### 10.4 Design System

**Color palette ("Sunrise Surge"):**
| Token | Value | Usage |
|---|---|---|
| `studio-900` | `#121212` | Background |
| `studio-800` | `#1A1A1A` | Panels |
| `studio-700` | `#333333` | Interactive elements |
| `sunrise-orange` | `#FF512F` | Primary accent (female voices) |
| `sunrise-magenta` | `#DD2476` | Secondary accent (male voices) |

**Typography:**
- **Latin UI**: "Plus Jakarta Sans" (self-hosted WOFF2, 300–700 weights)
- **Arabic body**: "Noto Sans Arabic" (self-hosted WOFF2, 400–700 weights)
- **Arabic fallback**: "Cairo" (self-hosted WOFF2, 400–700 weights)
- **Phosphor Icons**: Loaded via CDN (`unpkg.com/@phosphor-icons/web`)

**UnoCSS shortcuts:**
| Shortcut | Expands To |
|---|---|
| `btn` | `px-4 py-2 rounded font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors` |
| `card` | `rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800` |
| `flex-center` | `flex items-center justify-center` |
| `flex-between` | `flex items-center justify-between` |

---

## 11. Testing Architecture

### Test Infrastructure

| Layer | Framework | Config | Environment |
|---|---|---|---|
| Frontend unit tests | Vitest 4.x | `vitest.config.ts` | `jsdom` |
| Frontend component tests | Vitest 4.x | `vitest.component.config.ts` | `jsdom` |
| Backend tests | pytest | `pytest.ini` | Host (no Docker for tests) |

### Test Coverage (19 frontend + 5 backend tests)

**Frontend tests** (`frontend/tests/`):
- `app.test.ts` — Root app integration
- `index.test.ts` — Main page integration
- `AudioPlayerPanel.test.ts` — Audio player panel
- `ModelStatusIndicator.test.ts` — Model status indicator
- `PanelSliding.test.ts` — Panel sliding animation
- `SpeedSlider.test.ts` — Speed slider interaction
- `ToastNotification.test.ts` — Toast rendering
- `ToastShortcut.test.ts` — Toast keyboard shortcut
- `useAudioModule.test.ts` — Audio module logic
- `useHealthPoll.test.ts` — Health polling logic
- `useInputValidation.test.ts` — Input validation
- `usePanelToggle.test.ts` — Panel toggle
- `useToast.test.ts` — Toast composable
- `useTtsApi.test.ts` — TTS API composable
- `useVoices.test.ts` — Voices composable
- `VoiceSelector.test.ts` — Basic voice selector
- `VoiceSelector.animation.test.ts` — Voice selector animations
- `VoiceSelector.click.test.ts` — Voice selector interactions
- `VoiceSelector.data-attrs.test.ts` — Voice selector data attributes

**Backend tests** (`backend/tests/`):
- `test_generate.py` — Synthesis endpoint
- `test_generate_blob.py` — Blob response
- `test_health.py` — Health check endpoint
- `test_history.py` — Audio history endpoint
- `test_voices.py` — Voices listing

### Test Conventions

- All test files live in `tests/` directories (never inline in source).
- Frontend setup files mock Nuxt auto-imports (`ref`, `computed`, `watch`, `onMounted`).
- Component test setup mocks URL APIs and `fetch`.
- Backend tests run inside Docker (`./scripts/run-backend-tests.sh`); CI runs directly on host.

---

## 12. Deployment Architecture

### Production Topology

```
                    Host Machine
                    ┌──────────────┐
                    │  Port 9001   │
                    │  (frontend)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Nginx       │
                    │  (port 80)   │
                    │  ┌─────────┐ │
                    │  │ SPA     │ │  ← Static files (Nuxt build)
                    │  │ Proxy   │ │  ← /api/ → backend:8000
                    │  └─────────┘ │
                    └──────┬───────┘
                           │  Docker DNS
                    ┌──────▼───────┐
                    │  FastAPI     │
                    │  (port 8000) │
                    │  ┌─────────┐ │
                    │  │ XTTS-v2 │ │  ← In-memory model
                    │  └─────────┘ │
                    └──────────────┘
```

### Container Configuration

| Container | Image | Host Port | Container Port | Volumes |
|---|---|---|---|---|
| `lughat-frontend` | `node:20-alpine` → `nginx:alpine` | 9001 | 80 | None (static build) |
| `lughat-backend` | `python:3.12-slim` | 9000 | 8000 | `tts-model-cache`, `tts-audio-cache`, `speaker_wavs/` |

### Deployment Constraints

- **CPU-only inference** — No GPU support; generation takes several seconds per request.
- **Model loading takes ~120 seconds** — First request after startup returns 503.
- **TTS model ~2GB** — Re-downloaded on each container restart (model cache volume not used for persistence).
- **Speaker WAV ≥ 0.33 seconds** — Minimum duration for XTTS-v2 voice cloning.
- **30-minute synthesis timeout** — Nginx `proxy_read_timeout 1800s` for long TTS generation.

---

## 13. Extension and Evolution Patterns

### 13.1 Adding New Voices

1. Place a `.wav` file (≥ 0.33 seconds) in `backend/speaker_wavs/`.
2. Restart the backend container (or the file is discovered dynamically on the next `/api/voices` call).
3. The voice appears in `VoiceSelector` automatically.

### 13.2 Adding New API Endpoints

1. Define a Pydantic model for the request/response (in `app.py`).
2. Add a route decorator (`@app.get()`, `@app.post()`).
3. Implement the business logic (validate, process, return).
4. Add frontend composable in `app/composables/` (following `use<Name>.ts` convention).
5. Add frontend component (following `app/components/` convention, auto-imported).
6. Add tests in `backend/tests/` and `frontend/tests/`.

### 13.3 Adding New Components

1. Create `app/components/<Name>.vue` using `<script setup lang="ts">`.
2. Use Vue Composition API (`ref`, `computed`, `watch`, `onMounted`, `onUnmounted`).
3. Style with UnoCSS atomic classes via `@apply` in `main.css`.
4. Use auto-imported name in templates (no explicit `import` needed).
5. Write tests in `frontend/tests/<Name>.test.ts`.

### 13.4 Adding New Composables

1. Create `app/composables/use<Name>.ts`.
2. Return reactive state via `ref()` and `computed()`.
3. Handle lifecycle in `onMounted()`/`onUnmounted()`.
4. Write tests in `frontend/tests/use<Name>.test.ts`.

### 13.5 Adding New Services

To add a third service (e.g., a translation API):

1. Create a new directory (e.g., `services/translation/`).
2. Add a `Dockerfile` and `docker-compose.yml` service entry.
3. Define API endpoints following the existing pattern.
4. Update Nginx config to proxy to the new service.
5. Add a frontend composable for API calls.
6. Add CI workflow (`.github/workflows/<service>.yml`).

### 13.6 Known Limitations

- **No model persistence** — ~2GB model re-downloaded on restart.
- **No audio cleanup** — Generated MP3s accumulate indefinitely.
- **No authentication** — API is open (CORS allows all origins).
- **No rate limiting** — No throttling on `/api/generate`.
- **Single model** — Only XTTS-v2; no model switching.
- **No streaming** — Full audio generated before response (no SSE/WebSocket).

---

## 14. Architectural Decision Records

### ADR-001: Single-File Backend

**Context:** The backend API has 4 endpoints, 3 Pydantic models, and ~375 lines of code.

**Decision:** Keep all backend logic in a single `app.py` file.

**Rationale:** The project has a small scope (one model, four endpoints). A single file reduces cognitive overhead for navigation and is easier to maintain for a small team.

**Consequences:**
- **Positive:** Easy to find and modify any endpoint. Simple deployment.
- **Negative:** File grows linearly with features. Harder to test individual endpoints in isolation.

### ADR-002: No Global State Management Library

**Context:** The frontend needs to share state between components (toast messages, model status, voice list).

**Decision:** Use Vue composables with module-level `ref()` instead of Vuex/Pinia.

**Rationale:** The app is a single page with limited cross-component state. Composables provide sufficient sharing without the overhead of a state management library.

**Consequences:**
- **Positive:** No additional dependency. Simple mental model.
- **Negative:** Debugging shared mutable state across components. No devtools integration.

### ADR-003: Dynamic Voice Discovery

**Context:** Voice presets need to be configurable without code changes.

**Decision:** Discover voices at runtime by scanning the `speaker_wavs/` directory for `.wav` files.

**Rationale:** Allows adding new voices by simply placing a WAV file in the directory. No database or configuration file needed.

**Consequences:**
- **Positive:** Zero-config voice addition. Flexible.
- **Negative:** No validation of voice metadata (dialect, tag, icon). Voice file quality is the only quality gate.

### ADR-004: In-Memory TTS Model

**Context:** The TTS model (~2GB) needs to be available for all synthesis requests.

**Decision:** Load the model once at startup into a global variable. Do not reload or cache.

**Rationale:** Loading the model per-request would be prohibitively slow. An in-memory singleton is the simplest approach for a single-model server.

**Consequences:**
- **Positive:** Fastest possible inference (model already loaded). Simple code.
- **Negative:** ~2GB memory usage. Model re-downloaded on every container restart.

### ADR-005: File-Based Audio Persistence

**Context:** Generated audio files need to persist across requests for the `/api/history` endpoint.

**Decision:** Write generated MP3 files to a filesystem directory (`/app/downloads/`). List files by name to reconstruct metadata.

**Rationale:** Simple approach with no database dependency. Filenames encode enough metadata (language, voice, timestamp) for listing.

**Consequences:**
- **Positive:** No database required. Persistent across restarts (via volume).
- **Negative:** No cleanup mechanism. Metadata is incomplete (text is always empty string). Filenames must follow a strict naming convention.

### ADR-006: Nginx as Reverse Proxy

**Context:** The frontend SPA needs to serve static files and proxy API calls to the backend.

**Decision:** Use Nginx as a reverse proxy in production. API calls (`/api/`, `/health`) are proxied to the backend container.

**Rationale:** Nginx is lightweight, well-understood, and handles reverse proxying, static file serving, and SPA fallback natively.

**Consequences:**
- **Positive:** Single entry point (port 9001). No CORS issues (same origin).
- **Negative:** Nginx configuration is a second source of truth (also in `nuxt.config.ts` for dev).

### ADR-007: Health Polling Instead of WebSocket

**Context:** The frontend needs to know when the TTS model is ready after page load.

**Decision:** Poll `/health` every 2 seconds with a configurable retry limit (default: 10 retries = 20 seconds).

**Rationale:** Simple, reliable, and works with any HTTP client. No WebSocket infrastructure needed.

**Consequences:**
- **Positive:** Simple implementation. Works with caching proxies.
- **Negative:** 2-second delay before "Ready" state is detected. Extra HTTP requests during loading.

---

## 15. Blueprint for New Development

### 15.1 Development Workflow

**Adding a feature to the frontend:**

```
1. Create composable (app/composables/use<Feature>.ts)
   - Export reactive state via ref()/computed()
   - Handle lifecycle in onMounted()/onUnmounted()
   - Write unit test (tests/use<Feature>.test.ts)

2. Create component (app/components/<Component>.vue)
   - Use <script setup lang="ts">
   - Use UnoCSS atomic classes
   - Style with @apply in main.css (if custom CSS needed)
   - Write component test (tests/<Component>.test.ts)

3. Integrate into index.vue
   - Import via auto-import (no explicit import needed)
   - Add to appropriate layout panel (desktop or mobile)
   - Wire event handlers to composable methods

4. Run quality gate: ./run-tests.sh
   - Backend tests → Lint → Typecheck → Frontend tests
```

**Adding an endpoint to the backend:**

```
1. Define Pydantic models (in app.py)
   - Request model with Field() constraints
   - Response model (if returning JSON)

2. Add route handler (in app.py)
   - @app.get() or @app.post()
   - Validate model readiness
   - Implement business logic
   - Return FileResponse or JSONResponse

3. Write tests (backend/tests/test_<endpoint>.py)
   - Test happy path
   - Test error paths (400, 503, 500)

4. Run quality gate: ./run-tests.sh
```

### 15.2 Implementation Templates

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

### 15.3 Common Pitfalls

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

---

## 16. Architecture Governance

### Automated Quality Gates

The project enforces architectural consistency through a single quality gate script:

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

### Blueprint Maintenance

This blueprint should be regenerated when:
- A new service is added to `docker-compose.yml`.
- The technology stack changes (framework version, package manager).
- New architectural patterns are introduced (new composables, components, or API endpoints).
- Deployment topology changes (new services, new networking).

---

*This blueprint was generated on 2026-08-01 from a full analysis of the Lughat Chat codebase (375-line backend, 750-line frontend, 9 components, 8 composables, 24 test files, 2 Docker services, 4 CI workflows).*
