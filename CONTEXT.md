# Project Context — Lughat Chat

## Overview
A **text-to-speech (TTS) web app** for Arabic speech synthesis using Coqui XTTS-v2. Deployed via Docker Compose with Nginx as reverse proxy.

## Architecture
```
┌──────────┐     ┌─────────────┐     ┌──────────┐
│  Browser  │◄──►│   Nginx     │◄──►│ Backend  │
└──────────┘     │ (port 80)   │     │(port 8000)│
                  └─────────────┘     └──────────┘
                                       Coqui XTTS-v2
```

- **Frontend**: Nuxt 4.4+ + Vue 3.5+ + UnoCSS 66 (runs on port 80 via Nginx)
- **Backend**: Python FastAPI 0.115.6 + Coqui TTS 0.27.5 (runs on port 8000)
- **TTS Model**: XTTS-v2 (multilingual, Arabic-focused)
- **Icons**: Phosphor Icons (via `@phosphor-icons/web` CDN) — NOT Lucide or Simple Icons
- **Fonts**: Google Fonts — "Inter" (UI labels) + "Cairo" (Arabic text)

---

## Frontend (`frontend/`)

### Tech Stack
- **Framework**: Nuxt 4.4+ (file-based routing, auto-imports)
- **Language**: TypeScript
- **Package Manager**: pnpm 10.33.4
- **Styling**: UnoCSS (with presetIcons, presetTypography, presetWebFonts)
- **UI Config**: `app.config.ts` — primary: green, neutral: slate
- **Icons**: Phosphor Icons (via `@phosphor-icons/web` CDN script)
- **Fonts**: Google Fonts — "Cairo" (sans-serif)

### Key Files
| File | Purpose |
|------|---------|
| `nuxt.config.ts` | Nuxt config with modules, ESLint, UnoCSS, CSS import |
| `uno.config.ts` | UnoCSS presets + shortcuts (`btn`, `card`, `flex-center`, etc.) |
| `app/app.config.ts` | UI theme config (green primary, slate neutral) |
| `app/assets/css/main.css` | Global BEM styles using UnoCSS `@apply` directives |

### App Structure (`app/`)
```
app/
├── app.config.ts          # UI theme config
├── app.vue                # Root component
├── assets/css/main.css    # Global styles (@apply)
├── pages/index.vue        # Full-page TTS Studio (two-panel layout)
├── components/            # 10 Vue components
│   ├── AudioPlayerPanel.vue       # Audio playback panel (waveform + controls)
│   ├── FocusHaloCanvas.vue        # Focus halo effect for textarea
│   ├── GenerateButton.vue         # Generate speech button with loading states
│   ├── MobileStatusIndicator.vue  # Compact model status (mobile FAB)
│   ├── ModelStatusIndicator.vue   # Desktop model status indicator
│   ├── PanelToggle.vue            # Mobile panel toggle FAB
│   ├── SpeedSlider.vue            # Speed adjustment slider (0.5×–2.0×)
│   ├── ToastNotification.vue      # Toast messages (success/error/info)
│   ├── VoiceSelector.vue          # Voice/dialect selector dropdown
│   └── WaveformCanvas.vue         # Animated waveform visualization
└── composables/           # 7 composables (+ test files)
    ├── useAudioModule.ts     # Audio playback state management (replaces useAudioPlayer)
    ├── useHealthPoll.ts      # Backend health check polling
    ├── useInputValidation.ts # Text input validation logic
    ├── usePanelToggle.ts     # Panel toggle state (control-deck ↔ canvas)
    ├── useToast.ts           # Toast notification management
    ├── useTtsApi.ts          # TTS API calls (synthesize, healthCheck)
    └── useVoices.ts          # Voice list fetching and management
```

### ESLint Config
- **Config file**: `eslint.config.mjs` (flat config via `@nuxt/eslint`)
- **Style rules**: commaDangle: `'never'`, braceStyle: `'1tbs'`

### Test Setup (Vitest)
**Two separate vitest configs:**

1. **Unit tests**: `vitest.config.ts`
   - Environment: `jsdom`
   - Setup file: `tests/setup.ts` (mocks Nuxt auto-imports: `ref`, `computed`, `watch`, `onMounted`)
   - Excludes: `**/*.component.test.ts`, `tests/ModelStatusIndicator.test.ts`

2. **Component tests**: `vitest.component.config.ts`
   - Environment: `jsdom`
   - Setup file: `tests/setup.component.ts` (mocks URL APIs, fetch)
   - Excludes: `tests/useHealthPoll.test.ts`

**Test commands:**
```bash
# Run all tests (unit)
pnpm test          # → vitest run

# Run component tests only
npx vitest --config vitest.component.config.ts
```

**Run all tests (backend + frontend) from project root:**
```bash
./run-tests.sh     # Runs pytest (backend) then pnpm test (frontend)
```

**Test files location:** `frontend/tests/`
- Naming: `<name>.test.ts`
- All 23 test files live in `frontend/tests/` (no inline test files in source directories).

---

## Backend (`backend/`)

### Tech Stack
- **Framework**: Python FastAPI 0.115.6
- **Server**: uvicorn 0.34.0 (standard)
- **TTS Engine**: Coqui TTS 0.27.5 (with codec support)
- **Package Manager**: pip (requirements.txt)

### Key Files
| File | Purpose |
|------|---------|
| `app.py` | Main FastAPI app with TTS model loading, synthesis endpoint, health check |
| `requirements.txt` | Python dependencies (fastapi, uvicorn, pydantic, coqui-tts, ffmpeg-python) |
| `pytest.ini` | pytest config — testpaths: tests, pythonpath: . |

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check + model loading status |
| `/api/voices` | GET | List available voices/speakers |
| `/api/generate` | POST | Generate speech from text (returns MP3 binary) |
| `/api/history` | GET | List previously generated audio files |

### Model Loading
- Model: `tts_models/multilingual/xtts_v2` (loaded on startup via lifespan)
- Cache dir: `/app/.cache/tts` (persisted as named volume `tts-model-cache`)
- Status states: `"loading"` → `"ready"` | `"error"`
- Audio output dir: `/app/downloads` (persisted as `tts-audio-cache`)

### Test Setup (Pytest)
```bash
# Run backend tests (inside Docker — no host Python needed)
./scripts/run-backend-tests.sh
```

**Run all tests (backend + frontend) from project root:**
```bash
./run-tests.sh     # Runs backend tests in Docker, then pnpm test (frontend)
```

**Test files:** `backend/tests/`
- `test_generate.py` — synthesis endpoint tests
- `test_generate_blob.py` — blob response tests
- `test_health.py` — health check endpoint tests
- `test_history.py` — audio history endpoint tests
- `test_voices.py` — voices listing tests

---

## Docker Deployment (`docker-compose.yml`)

### Services
| Service | Image | Ports | Notes |
|---------|-------|-------|-------|
| `backend` | Python (custom Dockerfile) | 9000:8000 | Health check: start_period 120s, 200 retries (15s interval) |
| `frontend` | Nuxt + Nginx (custom Dockerfile) | 9001:80 | Depends on backend being healthy (service_healthy condition) |

### Volumes
| Volume | Purpose |
|--------|---------|
| `tts-model-cache` | Persist TTS model (~2GB, downloaded once) |
| `tts-audio-cache` | Persist generated audio files |

### Environment Variables (`.env`)
```
BACKEND_PORT=9000, BACKEND_HOST=backend
FRONTEND_PORT=9001, FRONTEND_HOST=localhost
NGINX_PORT=80, NGINX_HOST=localhost
API_BASE_URL=http://backend:9000
TTS_MODEL_CACHE=/app/.cache/tts
COQUI_TOS_AGREED=1
MODEL_VOLUME_NAME=arabic-tts-models
AUDIO_CACHE_VOLUME_NAME=arabic-tts-audio
```

---

## UnoCSS Shortcuts (Reusable Classes)
| Shortcut | Expands To |
|----------|------------|
| `btn` | `px-4 py-2 rounded font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors` |
| `card` | `rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800` |
| `flex-center` | `flex items-center justify-center` |
| `flex-between` | `flex items-center justify-between` |

## BEM CSS Classes (in main.css)
All styles use `@apply` with UnoCSS utilities. Key blocks:
- `.tts-page`, `.tts-card`, `.tts-section` — layout blocks
- `.tts-input`, `.tts-select`, `.tts-range` — form controls
- `.tts-btn-generate` — generate button with loading state
- `.tts-audio`, `.tts-error`, `.tts-footer` — media/error blocks
- `.tts-spinner`, `.tts-fade-*`, `.tts-slide-up-*` — animations

---

---

## Known Issues & Debugging Patterns

### Audio Playback Timing Issue (Fixed 2026-06-05)
**Symptom**: Audio doesn't play after first "Generate Speech" click, but works on second click.
**Root cause**: Vue's DOM updates are async. `loadAudio()` sets `audioUrl.value` which triggers a `<Transition>` to mount `<audio ref="audioRef">`, but the element doesn't exist in DOM yet when `play()` is called immediately after. The guard `if (audioRef.value && url)` fails because `audioRef.value` is still `null`.
**Fix**: Add `await nextTick()` between `loadAudio()` and `play()` in `index.vue`. Also added `{ flush: 'post' }` to the `watch(audioUrl)` in `useAudioModule.ts` as a safety net.
**Pattern to watch for**: Anytime you call a method that depends on a `ref` bound to an element inside a `<Transition>` or conditional (`v-if`), you need `await nextTick()` first.

---

## Key Conventions
1. **Nuxt file-based routing**: pages go in `app/pages/`, auto-imported
2. **Composables** in `app/composables/` are auto-imported (no explicit imports needed)
3. **Components** in `app/components/` are auto-imported by name
4. **Tests mirror source**: all test files live in `frontend/tests/` (no inline test files)
5. **Dark mode**: all BEM classes have `dark:` variants defined in main.css
6. **RTL support**: Arabic text handled via Cairo font + RTL direction
7. **Phosphor Icons**: Uses `ph ph-<name>` classes (via CDN), NOT Lucide or Simple Icons
8. **Host ports**: Docker backend on 9000, frontend on 9001. Local dev proxies to localhost:9000.

---

## Codebase Orientation Map

### One-Line Summary
Lughat Chat is a **Dockerized Arabic text-to-speech (TTS) web app** using Coqui XTTS-v2, composed of a Python FastAPI backend (TTS inference) and a Nuxt 4 frontend (TTS studio UI), served through Nginx as a reverse proxy.

### Five-Minute Explanation
- **Primary tasks in code**: Convert Arabic/English text to speech using XTTS-v2 voice cloning, play back the result, manage voice presets, and display waveform visualizations.
- **Primary inputs**: User text (up to 3000 chars), voice/voice-selector selection, speed/pitch parameters, keyboard shortcut (Ctrl+Enter).
- **Primary outputs**: MP3 audio blob returned from `/api/generate`, played via browser `<audio>` element; voice list from `/api/voices`; model health from `/health`.
- **Key files**:
  - `backend/app.py` — FastAPI server: routes `/health`, `/api/voices`, `/api/generate`, `/api/history`; loads XTTS-v2 model at startup; generates speech via `TTS.tts_to_file()` and converts WAV→MP3 via ffmpeg.
  - `frontend/app/pages/index.vue` — Single-page TTS Studio: two-panel layout (Control Deck + Canvas), integrates all 10 components and 7 composables.
  - `frontend/app/composables/` — 7 composables handling API calls, audio playback, health polling, voice management, panel toggling, input validation, and toast notifications.
  - `frontend/app/components/` — 10 Vue components (AudioPlayerPanel, WaveformCanvas, VoiceSelector, SpeedSlider, GenerateButton, etc.).
  - `docker-compose.yml` — Orchestrates `backend` (port 9000:8000) and `frontend` (port 9001:80) on `lughat-network`.
  - `nginx/nginx.conf` — Host Nginx config routing `/api/` and `/health` to backend, `/` to frontend container.
  - `frontend/Dockerfile` — Multi-stage build: Node 20 builder → Nginx production serving static + reverse proxy.
  - `backend/Dockerfile` — Python 3.12-slim with CPU-only PyTorch, Coqui TTS, ffmpeg.
- **Main code paths**:
  1. **Page load** → `app.vue` renders `<ToastNotification>` + `<NuxtPage>` → `pages/index.vue` mounts, triggers `useHealthPoll()` (interval 2s), `useVoices()` (fetches `/api/voices`), `usePanelToggle()` (listens to resize).
  2. **User types text + clicks Generate** → `handleSynthesize()` in `index.vue` validates via `useInputValidation()` → calls `useTtsApi().synthesize()` → `fetch('/api/generate', POST)` → backend generates WAV via XTTS, converts to MP3 via ffmpeg, returns `FileResponse`.
  3. **Audio playback** → Frontend receives Blob → `useAudioModule.load(blob)` creates `URL.createObjectURL(blob)` → wires to `<audio>` element → plays, tracks `currentTime`/`duration` via event listeners.

### Deep Dive

**Type**: Hybrid web application (single-page TTS studio) with separate backend API service.

**Primary runtime(s)**:
- Backend: Python 3.12 / FastAPI / uvicorn / Coqui TTS (CPU-only PyTorch)
- Frontend: Node.js 20 / Nuxt 4.4 / Vue 3.5 / UnoCSS 66

**Entry points**:
| File | Why it matters |
|------|----------------|
| `backend/app.py` | FastAPI app definition, TTS model loading (lifespan), all 4 API endpoints (`/health`, `/api/voices`, `/api/generate`, `/api/history`) |
| `frontend/app/pages/index.vue` | Root page component — full-page TTS Studio, integrates all components and composables |
| `frontend/app/app.vue` | Root layout — renders `<ToastNotification>` globally + `<NuxtPage>` |
| `docker-compose.yml` | Service orchestration — 2 services (backend + frontend), 2 named volumes (tts-model-cache, tts-audio-cache) |
| `frontend/Dockerfile` | Multi-stage build: `node:20-alpine` (builder) → `nginx:alpine` (production) with embedded Nginx config |
| `backend/Dockerfile` | Python 3.12-slim with CPU PyTorch, Coqui TTS, ffmpeg, torchcodec rebuild |

### Top-Level Structure
| Path | Purpose | Notes |
|------|---------|-------|
| `backend/app.py` | FastAPI application (4 endpoints, model loading, synthesis) | Single-file backend — all routes, models, and logic in one file |
| `backend/speaker_wavs/` | Voice reference audio (.wav files) | 2 files: `KSA Hamed - Male.wav`, `KSA Zariyah - Female.wav` |
| `backend/downloads/` | Generated audio cache (WAV + MP3) | ~1000+ files from testing (not tracked in git) |
| `backend/tests/` | 5 Pytest test files | `test_generate.py`, `test_generate_blob.py`, `test_health.py`, `test_history.py`, `test_voices.py` |
| `frontend/app/pages/index.vue` | Main TTS Studio page (full-page layout) | ~400 lines: script + template + style |
| `frontend/app/components/` | 10 Vue components | AudioPlayerPanel, WaveformCanvas, VoiceSelector, SpeedSlider, GenerateButton, etc. |
| `frontend/app/composables/` | 7 Vue composables | useTtsApi, useAudioModule, useHealthPoll, useVoices, usePanelToggle, useToast, useInputValidation |
| `frontend/app/assets/css/main.css` | Global styles with UnoCSS `@apply` | Dark theme, animations, scrollbar, safe-area insets |
| `frontend/uno.config.ts` | UnoCSS config | Custom theme (studio colors, sunrise orange/magenta), breakpoints, shortcuts |
| `frontend/tests/` | 23 Vitest test files | Unit + component tests mirroring source structure |
| `docker-compose.yml` | Docker orchestration | 2 services (backend + frontend), 2 named volumes (tts-model-cache, tts-audio-cache) |
| `nginx/nginx.conf` | Host Nginx reverse proxy | Routes `/api/`, `/health` → backend; `/` → frontend container |
| `scripts/` | Operational scripts | `run-backend-tests.sh`, `test-e2e.sh`, `test-phase5.sh`, `optimize-docker.sh`, `init.sh` |
| `docs/` | PRDs and design docs | 6 PRDs + pixel-perfect redesign plan (12 phases) |

### Key Boundaries

**Presentation (Frontend)**:
- `frontend/app/pages/index.vue` — Main page, ~400 lines, two-panel layout (desktop side-by-side, mobile stacked with draggable divider)
- 10 components in `frontend/app/components/`: AudioPlayerPanel, FocusHaloCanvas, GenerateButton, MobileStatusIndicator, ModelStatusIndicator, PanelToggle, SpeedSlider, ToastNotification, VoiceSelector, WaveformCanvas
- 7 composables in `frontend/app/composables/`: useAudioModule, useHealthPoll, useInputValidation, usePanelToggle, useToast, useTtsApi, useVoices

**Application/Domain (Backend)**:
- `backend/app.py` — All business logic in a single file: voice discovery, speech synthesis, health checks, audio history
- `backend/generate_speaker_wavs.py` — Utility script for generating speaker WAV files

**Persistence/External I/O**:
- `backend/speaker_wavs/` — Directory for voice reference audio (dynamically discovered)
- `backend/downloads/` — Generated audio cache (WAV + MP3, persisted via Docker volume)
- Docker volumes: `tts-model-cache` (~2GB XTTS model), `tts-audio-cache` (generated audio)

**Cross-cutting concerns**:
- **Health monitoring**: `useHealthPoll` (frontend, 2s interval, 10 retries) ↔ `/health` (backend, exposes `model_load_status`)
- **CORS**: Backend allows all origins (`*`); Nginx adds CORS headers
- **Theming**: UnoCSS custom theme (studio 900/800/700, sunrise orange/magenta), dark mode only
- **Fonts**: Inter (UI labels) + Cairo (Arabic text) via Google Fonts CDN

**Detailed code flows**:

1. **Application startup**:
   - `docker compose up` starts `backend` (port 9000:8000) and `frontend` (port 9001:80)
   - Backend: `backend/Dockerfile` → `uvicorn app:app` → `lifespan()` in `app.py` spawns background thread loading XTTS-v2 model (~120s)
   - Frontend: `frontend/Dockerfile` → Nginx serves SPA static files, proxies `/api/` and `/health` to backend
   - Host Nginx (`nginx/nginx.conf`) proxies `/api/` and `/health` to backend, `/` to frontend container

2. **Page load flow**:
   - `app.vue` renders `<ToastNotification>` (global toast state) + `<NuxtPage />`
   - `pages/index.vue` mounts → `useHealthPoll()` starts polling `/health` every 2s (10 retries) → `useVoices()` fetches `/api/voices` → `usePanelToggle()` checks `window.innerWidth < 768`

3. **Speech synthesis flow** (the core user action):
   - User types text → clicks Generate (or Ctrl+Enter)
   - `handleSynthesize()` in `index.vue` calls `useInputValidation(textInput.value, modelStatus.value)` → checks `isValid`
   - Calls `useTtsApi().synthesize({ text, speaker, speed })` → `fetch('/api/generate', POST)` with JSON body
   - Backend `/api/generate`: resolves voice (`speaker ?? voice ?? "female"`) → looks up `{voice}.wav` in `SPEAKER_WAV_DIR` → validates duration ≥ 0.33s → calls `tts_model.tts_to_file(text, speaker_wav, language)` → generates WAV → converts to MP3 via `ffmpeg -filter:a atempo={speed}` → returns `FileResponse(path, media_type="audio/mpeg")`
   - Frontend receives Blob → `useAudioModule.load(blob)` creates `URL.createObjectURL(blob)` → sets `<audio ref>.src` → calls `audioModule.play()` → event listeners track `currentTime`, `duration`, `isPlaying`, `isPaused`

4. **Audio playback flow**:
   - `useAudioModule` manages `<audio>` element lifecycle: `load(blob)` → `URL.createObjectURL(blob)` → wires `loadedmetadata`, `timeupdate`, `ended`, `play`, `pause` events → exposes `isPlaying`, `isPaused`, `currentTime`, `duration`, `toggle()`, `seek()`, `pause()`, `download()`

5. **Voice discovery flow**:
   - Frontend `useVoices()` calls `fetch('/api/voices')` on mount
   - Backend `/api/voices` calls `discover_voices(SPEAKER_WAV_DIR)` → scans for `.wav` files → returns `[{ id, name }]` for each

### How the Pieces Map Together

```
Browser (port 9001)
  │
  ├─ Nuxt SPA (Nginx serves static)
  │   ├─ index.vue (main page)
  │   │   ├─ useTtsApi → fetch('/api/generate')
  │   │   ├─ useHealthPoll → fetch('/health') [interval 2s]
  │   │   ├─ useVoices → fetch('/api/voices')
  │   │   ├─ useAudioModule → <audio> element management
  │   │   ├─ usePanelToggle → panel switching (mobile/desktop)
  │   │   ├─ useInputValidation → text + model status check
  │   │   └─ useToast → global toast notifications
  │   │   └─ 10 components (AudioPlayerPanel, WaveformCanvas, etc.)
  │   │
  │   └─ Nginx reverse proxy (in-container)
  │       ├─ /api/* → http://backend:8000
  │       ├─ /health → http://backend:8000
  │       └─ /* → /usr/share/nginx/html (static SPA)
  │
  └─ Host Nginx (port 80)
      ├─ /api/* → http://lughat-backend:8000
      ├─ /health → http://lughat-backend:8000
      └─ /* → http://frontend:80 (Nginx container)

Backend (port 9000:8000)
  │
  └─ FastAPI (app.py)
      ├─ lifespan() → background thread loads XTTS-v2 model
      ├─ GET /health → { status, model_loaded }
      ├─ GET /api/voices → discover_voices(speaker_wavs/)
      ├─ POST /api/generate → TTS synthesis + ffmpeg WAV→MP3
      ├─ GET /api/history → list generated audio files
      └─ Static files: /downloads/*, /speaker_wavs/*
```

### Files Inspected
- `backend/app.py` — Full backend application (4 endpoints, model loading, synthesis logic)
- `backend/Dockerfile` — Python 3.12 Docker image (PyTorch CPU, Coqui TTS, ffmpeg)
- `backend/requirements.txt` — Python dependencies (fastapi, uvicorn, pydantic, coqui-tts, ffmpeg-python)
- `docker-compose.yml` — Service orchestration (2 services, 2 volumes, 1 network)
- `nginx/nginx.conf` — Host Nginx reverse proxy configuration
- `frontend/nuxt.config.ts` — Nuxt configuration (modules, devProxy, UnoCSS)
- `frontend/package.json` — Node dependencies (nuxt, vue, unocss, vueuse)
- `frontend/Dockerfile` — Multi-stage build (node builder → nginx production)
- `frontend/uno.config.ts` — UnoCSS configuration (theme, presets, shortcuts)
- `frontend/app/app.vue` — Root layout component
- `frontend/app/pages/index.vue` — Main TTS Studio page (~400 lines)
- `frontend/app/composables/useTtsApi.ts` — TTS API client (synthesize, healthCheck)
- `frontend/app/composables/useAudioModule.ts` — Audio playback state management
- `frontend/app/composables/useHealthPoll.ts` — Backend health polling (2s interval)
- `frontend/app/composables/useVoices.ts` — Voice list fetching
- `frontend/app/composables/usePanelToggle.ts` — Panel switching logic
- `frontend/app/composables/useInputValidation.ts` — Text + model status validation
- `frontend/app/composables/useToast.ts` — Toast notification management
- `frontend/app/assets/css/main.css` — Global styles (dark theme, animations)
- `frontend/app/components/` — 10 Vue component files (listed)
- `frontend/tests/` — 23 test files (listed)

**Files NOT inspected**: Individual component `.vue` files in `app/components/`, remaining test files, PRD documents, GitHub workflow files, scripts.
