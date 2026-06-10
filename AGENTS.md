# Project Context — Lughat Chat

## Overview
A **text-to-speech (TTS) web app** for Arabic speech synthesis using Coqui XTTS-v2. Deployed via Docker Compose with Nginx as reverse proxy.

## Architecture
```
┌──────────┐     ┌─────────────┐     ┌──────────┐
│  Browser  │◄──►│   Nginx     │◦──►│ Backend  │
└──────────┘     │ (port 80)   │     │(port 8000)│
                  └─────────────┘     └──────────┘
                                       Coqui XTTS-v2
```

- **Frontend**: Nuxt 4 + Vue 3 + UnoCSS (runs on port 80 via Nginx)
- **Backend**: Python FastAPI + Coqui TTS (runs on port 8000)
- **TTS Model**: XTTS-v2 (multilingual, Arabic-focused)

---

## Frontend (`frontend/`)

### Tech Stack
- **Framework**: Nuxt 4.4+ (file-based routing, auto-imports)
- **Language**: TypeScript
- **Package Manager**: pnpm 10.33.4
- **Styling**: UnoCSS (with presetIcons, presetTypography, presetWebFonts)
- **UI Config**: `app.config.ts` — primary: green, neutral: slate
- **Icons**: Lucide + Simple Icons (via `@iconify-json/*`)
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
├── assets/css/main.css    # Global BEM styles (@apply)
├── pages/index.vue        # Single-page TTS app (main page)
├── components/            # 6 Vue components
│   ├── ArabicTextarea.vue       # RTL Arabic text input with char count
│   ├── ModelStatusIndicator.vue  # Shows TTS model loading status
│   ├── PlayPauseButton.vue       # Audio play/pause toggle
│   ├── SeekableProgressBar.vue   # Draggable audio progress bar
│   ├── TimeDisplay.vue           # Audio time formatting (mm:ss)
│   └── ToastNotification.vue     # Toast messages (success/error/info)
└── composables/           # 5 composables (+ test files)
    ├── useAudioPlayer.ts     # Audio playback state management
    ├── useHealthPoll.ts      # Backend health check polling
    ├── useInputValidation.ts # Text input validation logic
    ├── useTimeDisplay.ts     # Time formatting utilities
    └── useTtsApi.ts          # TTS API calls (synthesize, healthCheck)
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
- Also has inline `.test.ts` files inside `app/composables/`

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
| `/voices` | GET | List available voices/speakers |
| `/api/generate` | POST | Generate speech from text (returns MP3 binary) |

### Model Loading
- Model: `tts_models/multilingual/xtts_v2` (loaded on startup via lifespan)
- Cache dir: `/app/.cache/tts` (persisted as named volume `tts-model-cache`)
- Status states: `"loading"` → `"ready"` | `"error"`
- Audio output dir: `/app/downloads` (persisted as `tts-audio-cache`)

### Test Setup (Pytest)
```bash
# Run backend tests
cd backend && pytest
```

**Run all tests (backend + frontend) from project root:**
```bash
./run-tests.sh     # Runs pytest (backend) then pnpm test (frontend)
```

**Test files:** `backend/tests/`
- `test_generate.py` — synthesis endpoint tests
- `test_generate_blob.py` — blob response tests
- `test_health.py` — health check endpoint tests
- `test_voices.py` — voices listing tests

---

## Docker Deployment (`docker-compose.yml`)

### Services
| Service | Image | Ports | Notes |
|---------|-------|-------|-------|
| `backend` | Python (custom Dockerfile) | 8000:8000 | Health check waits for model load (start_period: 60s) |
| `frontend` | Nuxt + Nginx (custom Dockerfile) | 80:80 | Depends on backend being healthy |

### Volumes
| Volume | Purpose |
|--------|---------|
| `tts-model-cache` | Persist TTS model (~2GB, downloaded once) |
| `tts-audio-cache` | Persist generated audio files |

### Environment Variables (`.env`)
```
BACKEND_PORT=8000, BACKEND_HOST=backend
FRONTEND_PORT=3000, FRONTEND_HOST=localhost
NGINX_PORT=80, NGINX_HOST=localhost
API_BASE_URL=http://backend:8000
TTS_MODEL_CACHE=/app/.cache/tts
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

## Key Conventions
1. **Nuxt file-based routing**: pages go in `app/pages/`, auto-imported
2. **Composables** in `app/composables/` are auto-imported (no explicit imports needed)
3. **Components** in `app/components/` are auto-imported by name
4. **Tests mirror source**: composables have `.test.ts` alongside them in `app/composables/`, plus additional tests in `tests/`
5. **Dark mode**: all BEM classes have `dark:` variants defined in main.css
6. **RTL support**: ArabicTextarea component handles RTL text input

---

## Quick-Start Commands

### Local Development (without Docker)
```bash
# Start frontend dev server (hot reload, port 3000)
cd frontend && pnpm dev

# Start backend dev server (port 8000)
cd backend && uvicorn app:app --reload
```

### Docker (production / full stack)
```bash
# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild after dependency changes (model cache persists)
docker compose up --build -d
```

### Frontend Scripts (from `frontend/`)
```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm preview      # Preview production build locally
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
pnpm test         # Run Vitest unit tests
pnpm test:coverage  # Tests with coverage report
```

### Backend Scripts (from `backend/`)
```bash
pytest            # Run pytest tests
uvicorn app:app --reload  # Start dev server with hot reload
```

---

## API Reference

### `POST /api/generate` — Generate Speech
**Request body:**
```json
{
  "text": "مرحبا بك في لغةات",
  "language": "ar",        // optional, default: "ar" | allowed: "ar" | "en"
  "voice": "female",       // optional, default: "female" | allowed: "female" | "male"
  "speaker": "female",     // alias for `voice` (accepts "default" → maps to "female")
  "speed": 1.0,            // optional, default: 1.0 | range: 0.5 – 2.0
  "pitch": 0.0,            // optional, default: 0.0 | range: -4.0 – 4.0
  "seed": 42               // optional, deterministic seed (defaults to fixed per voice: female=42, male=123)
}
```
**Response:** Returns `audio/mpeg` (MP3 binary blob via `FileResponse`). The frontend loads this into an `<audio>` element via `URL.createObjectURL()`.

> **Note:** The `SynthesisResponse` Pydantic model (audio_url, filename, duration_seconds) is defined but **not used** — the endpoint returns a raw file response instead of JSON.

**Error responses:**
| Status | Meaning |
|--------|---------|
| 400    | Invalid text (empty or too long) |
| 503    | TTS model not ready yet (still loading) |
| 500    | Server error (missing speaker WAV, generation failure) |

### `GET /health` — Health Check
**Response:**
```json
{
  "status": "ready",       // "loading" | "ready" | "error"
  "model_loaded": true
}
```

### `GET /api/voices` — List Voices
**Response:**
```json
[
  { "id": "female", "name": "Female Voice" },
  { "id": "male", "name": "Male Voice" }
]
```

### `GET /api/history` — Audio History
**Response:** Array of previously generated audio files with metadata (filename, language, voice, created_at).

---

## Local Development Setup

### Prerequisites
- Node.js 20+ (or via nvm)
- pnpm 10.33.4
- Python 3.10+ (for backend)
- ffmpeg (for WAV→MP3 conversion)

### Running Both Services Locally
```bash
# Terminal 1 — Backend (port 8000)
cd backend && uvicorn app:app --reload

# Terminal 2 — Frontend (port 3000, proxies to localhost:8000)
cd frontend && pnpm dev
```
> **Note:** When running locally, the frontend dev server proxies API calls to `localhost:8000`. In Docker, Nginx handles this proxying.

### Speaker WAV Files
Voice presets use reference audio files stored in `backend/speaker_wavs/`:
- `female.wav` — Female voice reference
- `male.wav` — Male voice reference

These must be ≥ 0.33 seconds (XTTS-v2 minimum). Add custom voices by placing WAV files here.

---

## Error Handling Patterns

### Frontend (Vue)
- **Toast notifications**: All user-facing errors use `showToast()` from `useToast` composable — appears at top-center with auto-dismiss
- **Input validation**: `useInputValidation` composable validates text length + model status before API call
- **Loading states**: `isGenerating` flag disables button and shows spinner during synthesis
- **Keyboard shortcut**: `Ctrl+Enter` triggers generation (handled in `@keydown` on root element)

### Backend (FastAPI)
- **HTTPException**: Used for all business errors with descriptive `detail` messages
- **CORS**: All origins allowed (`*`) — restrict in production to frontend container IP
- **Model readiness**: 503 returned if synthesis called before model finishes loading (~60s startup)

---

## Known Gotchas & Limitations

1. **Model loading takes ~60 seconds** — The first request after startup will get 503. Health polling (`useHealthPoll`) handles this by checking `/health` every few seconds.
2. **TTS model is ~2GB** — Persisted in `tts-model-cache` volume. Docker rebuilds won't re-download.
3. **CPU-only inference** — No GPU support; generation takes several seconds per request.
4. **Speaker WAV validation** — XTTS-v2 requires ≥ 0.33s reference audio. Shorter files raise a 500 error.
5. **Audio file persistence** — Generated MP3s accumulate in `tts-audio-cache`. No cleanup mechanism.
6. **Language support** — Only `ar` (Arabic) and `en` (English) are accepted. Other languages will be rejected.
7. **Deterministic output** — Seeds are fixed per voice preset (female=42, male=123) for consistent results. Override via `seed` field in request.

---

## CI/CD Pipeline (GitHub Actions)

Two separate workflows — one per service. Both run on `ubuntu-latest` and trigger on pushes/PRs to `main` and `develop`.

### Backend CI (`.github/workflows/backend.yml`)
- **Triggers**: Push/PR to `main` or `develop` when files under `backend/**` change
- **Steps**:
  1. Checkout (actions/checkout@v5)
  2. Python 3.12 setup (actions/setup-python@v6)
  3. Install ffmpeg (`apt-get`)
  4. `pip install -r backend/requirements-test.txt`
  5. Run: `pytest --cov=app --cov-report=term-missing -v`

### Frontend CI (`.github/workflows/frontend.yml`)
- **Triggers**: Push/PR to `main` or `develop` when files under `frontend/**` change
- **Steps**:
  1. Checkout (actions/checkout@v5)
  2. pnpm v4 action, Node.js 24 (cached via `pnpm`)
  3. `pnpm install --frozen-lockfile`
  4. `pnpm lint` (ESLint)
  5. `pnpm typecheck` (TypeScript)
  6. `pnpm test -- --coverage`

### Requirements Files
- **Backend**: `backend/requirements-test.txt` (test deps separate from runtime)
- **Frontend**: Standard `package.json` + `pnpm-lock.yaml`

---

## Agent Instructions — Do NOT Explore

When the user asks about building features, modifying existing code, or understanding patterns:
1. **Do NOT say "let me explore the codebase"** — you already have full context
2. Read specific files directly using `read` tool when needed for current task details
3. Summarize findings immediately and proceed with implementation
4. When adding new components, check existing ones in `app/components/` for patterns first
5. When modifying composables, read the existing one in `app/composables/` for patterns first
6. Frontend work: run from `frontend/` directory using pnpm commands
7. Backend work: run from `backend/` directory using pip/pytest
8. Running all tests: use `./run-tests.sh` from the project root to run both backend and frontend tests
