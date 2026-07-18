# Project Architecture Blueprint — Lughat Chat

> **System:** Lughat Chat — Arabic Text-to-Speech Studio
> **Generated:** 2026-07-10
> **Stack:** Nuxt 4.4.5 + Vue 3.5 + TypeScript + UnoCSS / FastAPI 0.115.6 + Coqui XTTS-v2 0.27.5 / Docker Compose + Nginx
> **Scope:** High-level architecture — tech stack, components, connections

---

## 1. Executive Summary

Lughat Chat is a **text-to-speech (TTS) web application** specialized for Arabic speech synthesis. It combines a modern, premium-feel single-page application with a Python-based API server running the Coqui XTTS-v2 multilingual TTS model. The system supports voice cloning from reference WAV files, real-time waveform visualization, and a responsive two-panel layout that adapts from desktop side-by-side to mobile split-screen.

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend Framework** | Nuxt 4 | 4.4.5 | Full-stack Vue framework with file-based routing, auto-imports, Nitro server engine |
| **UI Library** | Vue 3 | 3.5.13 | Composition API with `<script setup>` and TypeScript |
| **Styling** | UnoCSS | 66.6.8+ | Atomic CSS engine (superset of Tailwind) with presetWind3, presetTypography, presetWebFonts |
| **Language** | TypeScript | 6.0.3 | Type-safe frontend code |
| **Package Manager** | pnpm | 10.33.4 | Dependency management with frozen lockfiles |
| **Backend Framework** | FastAPI | 0.115.6 | Async Python REST API with automatic OpenAPI docs |
| **TTS Engine** | Coqui TTS | 0.27.5 | XTTS-v2 multilingual model with voice cloning (CPU-only) |
| **Server** | uvicorn | 0.34.0 | ASGI server for FastAPI |
| **Reverse Proxy** | Nginx | Alpine | Serves SPA static files, proxies API/health to backend |
| **Containerization** | Docker Compose | — | Two-service orchestration with bridge networking |
| **Testing** | Vitest 4 + Pytest 7 | — | Frontend (jsdom) + Backend (TestClient) |

### External Dependencies

| External System | Role |
|----------------|------|
| **Coqui XTTS-v2** | Core TTS inference engine (~2 GB model, CPU-only, ~120s load time) |
| **Phosphor Icons** | UI icon library loaded via CDN (`@phosphor-icons/web`) |
| **Google Fonts** | Self-hosted web fonts: Plus Jakarta Sans (Latin UI), Noto Sans Arabic (body text), Cairo (Arabic fallback) |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Browser                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Nuxt 4 SPA (Vue 3 + TypeScript + UnoCSS)               │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ Control     │  │ Waveform     │  │ Audio Player   │  │   │
│  │  │ Deck        │  │ Canvas       │  │ Panel          │  │   │
│  │  │             │  │              │  │                │  │   │
│  │  │ Text Input  │  │ Animated     │  │ Play/Pause     │  │   │
│  │  │ Voice Sel.  │  │ Bars         │  │ Seek/Download  │  │   │
│  │  │ Speed Ctrl  │  │              │  │                │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │  HTTP (Nginx proxies)              │  WebSocket (none)
         ▼                                    ▼
┌──────────────────────┐         ┌──────────────────────────────┐
│  Nginx Container     │         │  Backend Container           │
│  (port 80)           │         │  (port 8000)                 │
│                      │         │                              │
│  Routes:             │         │  FastAPI Server              │
│    /  → SPA files    │         │    /health → GET            │
│    /api/* → backend  │         │    /api/voices → GET        │
│    /health → backend │         │    /api/generate → POST     │
│    /downloads/*→back │         │    /api/history → GET       │
│                      │         │                              │
│  Nginx config:       │         │  Model Management:           │
│    proxy_pass,       │         │    Background thread loads   │
│    buffering off,    │         │    XTTS-v2 on startup        │
│    large body size   │         │    Status: loading→ready     │
└──────────────────────┘         │                              │
         │                       │  Speaker WAV Discovery:      │
         │                       │    Dynamic from directory    │
         │                       │                              │
         │                       │  Audio Pipeline:             │
         │                       │    XTTS → WAV → FFmpeg→MP3  │
         │                       │                              │
         │                       │  Storage:                    │
         │                       │    /app/downloads (MP3/WAV)  │
         │                       │    /app/.cache/tts (model)   │
         └───────────────────────┼──────────────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │  Docker Volumes     │
                    │  tts-model-cache    │  (~2 GB, TTS model)
                    │  tts-audio-cache    │  (generated audio)
                    └─────────────────────┘
```

### 3.2 Request Flow

```
User types Arabic text → Frontend validates → POST /api/generate
                                              │
                                              ▼
                                         Nginx (reverse proxy)
                                              │
                                              ▼
                                         FastAPI: validate →
                                         find speaker WAV →
                                         XTTS generate WAV →
                                         FFmpeg convert MP3 →
                                         FileResponse (audio/mpeg)
                                              │
                                              ▼
                                         Frontend: Blob →
                                         URL.createObjectURL →
                                         <audio> element →
                                         Playback
```

---

## 4. Frontend Architecture

### 4.1 Layer Overview

```
Frontend (frontend/)
├── app/                          # Source code (auto-imported by Nuxt)
│   ├── app.vue                   # Root: SEO metadata, <NuxtPage>
│   ├── app.config.ts             # UI theme config (green primary, slate neutral)
│   ├── pages/
│   │   └── index.vue             # Single page: full-page TTS Studio
│   ├── components/               # 9 Vue components (auto-imported)
│   │   ├── AudioPlayerPanel.vue  # Playback: play/pause, seek, waveform, download
│   │   ├── WaveformCanvas.vue    # Canvas-based animated waveform (requestAnimationFrame)
│   │   ├── FocusHaloCanvas.vue   # Radial gradient glow behind textarea on focus
│   │   ├── GenerateButton.vue    # Generate speech with loading states
│   │   ├── MobileStatusIndicator.vue  # Compact model status (mobile FAB)
│   │   ├── ModelStatusIndicator.vue   # Desktop model status pill
│   │   ├── SpeedSlider.vue       # Speech speed control (0.5×–2.0×)
│   │   ├── ToastNotification.vue # Toast messages (success/error/info)
│   │   └── VoiceSelector.vue     # Voice/dialect selector dropdown
│   └── composables/              # 8 composables (auto-imported)
│       ├── useAudioModule.ts     # Audio playback state + HTML <audio> wiring
│       ├── useHealthPoll.ts      # Backend health check polling (2s interval)
│       ├── useInputValidation.ts # Pure validation: text + model status
│       ├── usePanelToggle.ts     # Panel focus management (desktop/mobile)
│       ├── useScrollReveal.ts    # IntersectionObserver fade-up animations
│       ├── useToast.ts           # Toast notification state (shared singleton)
│       ├── useTtsApi.ts          # API client: synthesize() + healthCheck()
│       └── useVoices.ts          # Voice list fetching from /api/voices
├── uno.config.ts                 # UnoCSS presets, theme, shortcuts, rules
├── nuxt.config.ts                # Nuxt modules, devProxy, ESLint, UnoCSS
├── nginx.conf                    # Nginx reverse proxy configuration
├── Dockerfile                    # Multi-stage build (builder → nginx:alpine)
├── package.json                  # Dependencies (pnpm)
├── vitest.config.ts              # Unit test config (jsdom)
├── vitest.component.config.ts    # Component test config (jsdom)
└── tests/                        # 19 test files (all tests live here)
```

### 4.2 Key Frontend Components

| Component | Responsibility |
|-----------|---------------|
| **`index.vue`** (Page) | Orchestrator: manages text input, voice/speed state, synthesis flow, two-panel layout (desktop: side-by-side, mobile: split-screen with draggable divider) |
| **`VoiceSelector`** | Dropdown component: selects from dynamically-discovered voices, teleported to body, animated |
| **`SpeedSlider`** | Range input (0.5–2.0×) with gradient track fill matching brand colors |
| **`GenerateButton`** | Dual-state button: ready (play icon) / loading (spinner), model-status aware, disabled when invalid |
| **`AudioPlayerPanel`** | Floating panel: play/pause, seek, waveform, download, close — slides up from bottom |
| **`WaveformCanvas`** | Canvas-based animated bar visualization: 60 bars, gradient colored by play progress, click-to-seek |
| **`FocusHaloCanvas`** | Radial gradient glow beneath textarea on focus (visual feedback) |
| **`ModelStatusIndicator`** | Desktop: pill with colored dot (orange=loading, green=ready, red=error) |
| **`MobileStatusIndicator`** | Mobile: compact version of status indicator |
| **`ToastNotification`** | Auto-dismissing notifications (success/error/info), positioned top-center |

### 4.3 Key Frontend Composables

| Composable | Responsibility |
|------------|---------------|
| **`useTtsApi`** | API client: `synthesize(text, speaker, speed)` → Blob, `healthCheck()` → status |
| **`useHealthPoll`** | Auto-polls `/health` every 2 seconds on mount, stops on `ready` or `error` (max 10 retries) |
| **`useVoices`** | Fetches `/api/voices` on mount, returns reactive voice list |
| **`useAudioModule`** | Manages `<audio>` element lifecycle: `load(blob)`, `play()`, `pause()`, `toggle()`, `seek(ratio)`, `download(filename)`, event wiring (loadedmetadata, timeupdate, ended, error) |
| **`useInputValidation`** | Pure function: returns `{ isValid, error }` based on text length + model status |
| **`useToast`** | Shared singleton state: `showToast(message, type)` pushes entries with 5s auto-dismiss |
| **`usePanelToggle`** | Tracks active panel (`control-deck` / `canvas`), detects mobile breakpoint (768px), manages focus |
| **`useScrollReveal`** | IntersectionObserver-based fade-up animations, respects `prefers-reduced-motion` |

---

## 5. Backend Architecture

### 5.1 Layer Overview

```
Backend (backend/)
├── app.py                      # Thin FastAPI controller (~312 lines, 8 routes)
│                               # Delegates to deep domain modules:
│                               #   - tts.TtsEngine (TTS synthesis)
│                               #   - learning.LessonService (learning management)
│                               #   - storage.StorageService (audio history)
├── config.py                   # Path constants (AUDIO_DIR, DB_PATH, etc.)
├── lifespan.py                 # Model loading + DB initialization (lifespan handler)
├── schemas.py                  # Request/response Pydantic models
├── tts/                        # TTS domain module
│   ├── engine.py               # TtsEngine class (load_model, synthesize, health)
│   ├── audio_pipeline.py       # _discover_voices, _cleanup_audio_dir
│   └── voice_resolver.py       # resolve_voice()
├── learning/                   # Learning domain module
│   └── service.py              # LessonService class (list_lessons, get_lesson, submit_activity)
├── storage/                    # Storage domain module
│   ├── service.py              # StorageService class (get_history, cleanup)
│   └── helpers.py              # write_sidecar, read_sidecar, cleanup_audio_dir
├── db/                         # Data access layer
│   ├── __init__.py             # get_db_connection(), get_db_connection_from_app()
│   └── safety.py               # apply_safety_pragmas()
├── content/                    # Scoring library (unchanged)
│   └── scoring.py              # 5 scoring algorithms
├── speaker_wavs/               # Voice reference audio (dynamically discovered)
│   ├── KSA Hamed - Male.wav    # Male voice preset (Saudi dialect)
│   └── KSA Zariyah - Female.wav # Female voice preset (Saudi dialect)
├── downloads/                  # Generated audio (MP3 + WAV, persisted via volume)
├── requirements.txt            # Runtime dependencies
├── requirements-test.txt       # Test dependencies (pytest, httpx, coverage)
├── pytest.ini                  # Test configuration
├── Dockerfile                  # Python 3.12-slim, CPU-only PyTorch, torchcodec rebuild
└── tests/                      # 5 test files
    ├── test_generate.py        # Synthesis endpoint (16 tests)
    ├── test_generate_blob.py   # Blob response tests
    ├── test_health.py          # Health endpoint (3 tests)
    ├── test_history.py         # Audio history endpoint
    └── test_voices.py          # Voice discovery (8 tests)
```

### 5.2 Backend Components

| Component | Responsibility |
|-----------|---------------|
| **`FastAPI(app)`** | App initialization: title, CORS middleware (all origins), static mounts (`/downloads`, `/speaker_wavs`) |
| **`lifespan()`** | Context manager: starts background thread for TTS model loading, yields during server lifetime |
| **`load_model()`** | Background thread: loads `tts_models/multilingual/xtts_v2`, updates `model_load_status` (`loading` → `ready`/`error`) |
| **`torch patches`** | Compatibility shims: `isin_mps_friendly` patch, `load_library` patch (suppresses libnvrtc/libcuda errors for CPU-only) |
| **`SynthesisRequest`** | Pydantic model: `text` (1–3000 chars), `language` (ar/en), `voice`/`speaker` (optional), `speed` (0.5–2.0), `pitch` (-4.0–4.0), `seed` (optional int) |
| **`SynthesisResponse`** | Pydantic model: defined but **not used** — endpoint returns raw file, not JSON |
| **`HealthResponse`** | Pydantic model: `{ status, model_loaded }` |
| **`discover_voices()`** | Scans `speaker_wavs/` for `.wav` files, returns `{ id, name }` entries (sorted) |
| **`_validate_speaker_wav()`** | Validates WAV duration ≥ 0.33s (XTTS-v2 minimum), raises 500 if too short |

### 5.3 REST Endpoints

| Endpoint | Method | Status Codes | Purpose |
|----------|--------|-------------|---------|
| `/health` | GET | 200 | Returns `{ status, model_loaded }` — model load status |
| `/api/voices` | GET | 200 | Returns array of `{ id, name }` from `speaker_wavs/` |
| `/api/generate` | POST | 200, 400, 422, 500, 503 | Generates speech from text (returns `audio/mpeg` binary) |
| `/api/history` | GET | 200, 500 | Returns array of previously generated audio files |

### 5.4 Synthesis Pipeline

```
POST /api/generate
    │
    ├─ 1. Validate request (Pydantic: text length, language, speed, pitch)
    │
    ├─ 2. Check model ready (503 if loading/error)
    │
    ├─ 3. Resolve voice: speaker ?? voice ?? "female"
    │
    ├─ 4. Find speaker WAV in speaker_wavs/ (500 if missing)
    │
    ├─ 5. Validate WAV duration ≥ 0.33s (500 if too short)
    │
    ├─ 6. Set PyTorch seed for deterministic output
    │
    ├─ 7. XTTS: tts_to_file(text, speaker_wav, language) → WAV
    │
    ├─ 8. FFmpeg: WAV → MP3 (atempo=speed, 192k bitrate)
    │         (fallback: copy WAV if FFmpeg fails)
    │
    ├─ 9. Clean up intermediate WAV
    │
    └─ 10. FileResponse(path, media_type="audio/mpeg", filename)
```

---

## 6. Infrastructure & Deployment

### 6.1 Docker Compose Architecture

```
docker-compose.yml
├── services:
│   ├── backend (lughat-backend)
│   │   ├── Image: python:3.12-slim (custom Dockerfile)
│   │   ├── Port: 9000:8000 (host:container)
│   │   ├── Volumes: tts-model-cache, tts-audio-cache, speaker_wavs/
│   │   ├── Health: Python urllib → /health (200 retries, 15s interval, 120s start_period)
│   │   └── Env: TZ, TTS_MODEL_CACHE, COQUI_TOS_AGREED, LD_LIBRARY_PATH
│   │
│   └── frontend (lughat-frontend)
│       ├── Image: nginx:alpine (multi-stage: node builder → nginx)
│       ├── Port: 9001:80 (host:container)
│       ├── Depends: backend (condition: service_healthy)
│       └── Config: nginx.conf (reverse proxy rules)
│
├── networks:
│   └── lughat-network (bridge)
│
└── volumes:
    ├── tts-model-cache     (~2 GB, TTS model — not used for persistence)
    └── tts-audio-cache     (generated audio files)
```

### 6.2 Nginx Configuration

| Location | Proxy Target | Notes |
|----------|-------------|-------|
| `/` | SPA static files | `try_files $uri $uri/ /index.html` (SPA fallback) |
| `/api/*` | `http://backend:8000` | `proxy_buffering off` for large audio responses, 1800s timeout |
| `/health` | `http://backend:8000` | 30s timeout |
| `/downloads/*` | `http://backend:8000` | Large file support, no buffering |
| `/nginx-health` | Local 200 OK | Docker health check endpoint |

### 6.3 Network Topology

```
Browser (host:9001)
    │
    ▼
Nginx (container:80)
    │  /api/*  ──────────────────────► Backend (container:8000)
    │  /health  ─────────────────────► Backend (container:8000)
    │  /downloads/* ─────────────────► Backend (container:8000)
    │  /* (static)  ─────────────────► Nginx serve from /usr/share/nginx/html
```

---

## 7. Cross-Cutting Concerns

### 7.1 State Management

| Concern | Approach |
|---------|----------|
| **Global toast state** | Singleton `ref<ToastEntry[]>` shared across components via `useToast()` |
| **Model status** | Reactive `ref<'loading'|'ready'|'error'>` managed by `useHealthPoll()` (auto-polling) |
| **Audio playback** | HTML `<audio>` element ref + composable state (`isPlaying`, `isPaused`, `currentTime`, `duration`) |
| **Text input** | `shallowRef<string>` bound via `v-model` in page component |
| **Voice/speed selection** | `shallowRef<string>` / `shallowRef<number>` with computed display values |

### 7.2 Error Handling

| Layer | Strategy |
|-------|----------|
| **Frontend** | Toast notifications (`showToast(message, type)`) for all user-facing errors |
| **Frontend** | Input validation (`useInputValidation`) prevents synthesis when text empty or model not ready |
| **Backend** | `HTTPException` with descriptive `detail` messages (400, 422, 500, 503) |
| **Backend** | 503 returned if synthesis called before model finishes loading |

### 7.3 Security

| Concern | Status |
|---------|--------|
| **CORS** | All origins allowed (`*`) — noted as restrict-in-production TODO |
| **Input validation** | Pydantic enforces text length (1–3000), language (ar/en), speed/pitch ranges |
| **File upload** | None — audio generated server-side from text input |
| **Model cache** | Named Docker volume (not exposed externally) |

### 7.4 Accessibility

| Feature | Implementation |
|---------|---------------|
| **ARIA labels** | All interactive elements have descriptive `aria-label` or `aria-labelledby` |
| **Screen reader** | Live region (`role="status"`, `aria-live="polite"`) for panel announcements |
| **Keyboard shortcuts** | `Ctrl+Enter` triggers synthesis |
| **Focus management** | `usePanelToggle` manages focus on panel transitions |
| **Touch targets** | Minimum 44px touch targets (WCAG compliant) |
| **Reduced motion** | `prefers-reduced-motion: reduce` disables all animations |
| **RTL support** | Arabic textarea with `dir="rtl"`, Cairo/Noto Sans Arabic fonts |

---

## 8. Component Interaction Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         index.vue (Page)                            │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ Voice    │  │ Speed    │  │ Generate  │  │ Text Input       │  │
│  │ Selector │  │ Slider   │  │ Button    │  │ (textarea)       │
│  └────┬─────┘  └────┬─────┘  └────┬──────┘  └────────┬─────────┘  │
│       │             │             │                   │             │
│       └─────────────┴─────────────┴───────────────────┘             │
│                                     │                               │
│                        handleSynthesize()                           │
│                                     │                               │
│              ┌──────────────────────┼──────────────────────┐       │
│              ▼                      ▼                      ▼       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ useTtsApi       │  │ useAudioModule   │  │ useHealthPoll   │  │
│  │ synthesize()    │  │ load(blob)       │  │ poll /health    │  │
│  │ healthCheck()   │  │ play/pause/seek  │  │ (2s interval)   │  │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬────────┘  │
│           │                    │                     │            │
│           ▼                    ▼                     ▼            │
│  POST /api/generate  ──►  <audio> element  ◄── GET /health        │
│           │                    │                                    │
│           ▼                    ▼                                    │
│  ┌─────────────────┐  ┌──────────────────┐                        │
│  │ Backend:        │  │ AudioPlayerPanel  │                        │
│  │ XTTS → WAV→MP3  │  │ (slide-up panel)  │                        │
│  └─────────────────┘  │  WaveformCanvas   │                        │
│                        └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Flow Summary

### 9.1 Text-to-Speech Request

```
User input (Arabic text)
    │  v-model
    ▼
TextInput (shallowRef<string>)
    │  validation (useInputValidation)
    ▼
{ text, speaker, speed }
    │  POST /api/generate (JSON)
    ▼
Backend: Pydantic validation → 422 on failure
    │  model ready check → 503 on failure
    │  speaker WAV lookup → 500 on failure
    │  XTTS inference → WAV file
    │  FFmpeg conversion → MP3 file
    │  FileResponse (audio/mpeg)
    ▼
Frontend: response.blob() → URL.createObjectURL(blob)
    │  audioModule.load(blob)
    │  await nextTick()
    │  audioRef.value.play()
    ▼
<audio> element → User hears speech
```

### 9.2 Health Monitoring

```
onMounted()
    │
    ▼
setInterval(checkHealth, 2000)  ← 2-second polling
    │  GET /health
    ▼
{ status: 'loading'|'ready'|'error' }
    │  reactive ref (useHealthPoll)
    ▼
ModelStatusIndicator (desktop + mobile)
    │  displayed as colored dot
    ▼
GenerateButton (disabled when status !== 'ready')
```

### 9.3 Voice Discovery

```
onMounted()
    │
    ▼
GET /api/voices
    │
    ▼
Backend: discover_voices(speaker_wavs/)
    │  scan .wav files → { id, name }[]
    ▼
Frontend: reactive ref<Voice[]>
    │  auto-select first voice
    ▼
VoiceSelector (dropdown)
```

---

## 10. Testing Architecture

| Layer | Framework | Environment | Coverage |
|-------|-----------|-------------|----------|
| **Backend** | pytest 7 + httpx TestClient | Docker container (full stack simulation) | Synthesis, health, voices, history |
| **Frontend (unit)** | Vitest 4 + jsdom | jsdom with Nuxt auto-import mocks | Composables (8 composables) |
| **Frontend (component)** | Vitest 4 + jsdom + @vue/test-utils | jsdom with URL/fetch mocks | Components (9 components) |
| **CI Pipeline** | GitHub Actions | ubuntu-latest | Backend: test + coverage; Frontend: lint + typecheck + test |

### Pre-Commit Quality Gate

```
run-tests.sh (single source of truth)
    ├── 1. Backend tests (pytest inside Docker)
    ├── 2. Frontend lint (ESLint)
    ├── 3. Frontend typecheck (TypeScript)
    └── 4. Frontend tests (Vitest)
```

---

## 11. Known Architectural Constraints

| Constraint | Impact |
|-----------|--------|
| **CPU-only inference** | No GPU support; generation takes several seconds per request |
| **Model loading ~120s** | First request after startup gets 503; health polling handles this |
| **TTS model ~2 GB** | Not persisted across container restarts (cache volume path mismatch) |
| **Modular monolith backend** | Thin controller (312 lines) with 4 deep domain modules (TtsEngine, LessonService, StorageService) — fully testable without FastAPI/HTTP. See ADR-014. |
| **No text persistence** | `/api/history` returns files but original text is always empty string |
| **CORS `*`** | All origins allowed — should be restricted in production |
| **No cleanup mechanism** | Generated MP3s accumulate in `tts-audio-cache` indefinitely |
| **Language restricted** | Only `ar` (Arabic) and `en` (English) accepted |

---

## 12. Extension Points

| Area | Extension Opportunity |
|------|----------------------|
| **Voice library** | Add `.wav` files to `speaker_wavs/` — dynamically discovered, no code change needed |
| **Language support** | Extend `SynthesisRequest.language` pattern to additional languages |
| **Health check** | Add `/api/history` cleanup endpoint for audio cache management |
| **Text persistence** | Store original text with each generated file (currently always empty string) |
| **GPU support** | Replace CPU-only PyTorch with CUDA build for faster inference |
| **WebSocket** | Real-time streaming audio instead of file-response |
| **User auth** | JWT-based authentication for API endpoints |
| **Rate limiting** | Nginx `limit_req` or FastAPI middleware for API throttling |

---

*Blueprint generated: 2026-07-10*
*Review with: `./run-tests.sh` (all quality gates) or individual C4 diagrams in `docs/architecture/`*
