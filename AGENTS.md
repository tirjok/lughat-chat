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
- **Framework**: Nuxt 4.4.5 (file-based routing, auto-imports)
- **Language**: TypeScript
- **Package Manager**: pnpm 10.33.4
- **Styling**: UnoCSS 66.7.2 (presetWind3, presetTypography, presetWebFonts, transformerDirectives)
- **Utilities**: `@vueuse/core` ^14.3.0
- **UI Config**: `app.config.ts` — primary: green, neutral: slate
- **Icons**: Phosphor Icons (via `@phosphor-icons/web` CDN script) + Lucide + Simple Icons (via `@iconify-json`)
- **Fonts**: Google Fonts — "Inter" (UI labels) + "Cairo" (Arabic text)

### Key Files
| File | Purpose |
|------|---------|
| `nuxt.config.ts` | Nuxt config with modules, ESLint, UnoCSS, CSS import, Nitro devProxy |
| `uno.config.ts` | UnoCSS presets (presetWind3) + shortcuts + custom theme (studio colors, breakpoints) |
| `app/app.config.ts` | UI theme config (green primary, slate neutral) |
| `app/assets/css/main.css` | Global styles using UnoCSS `@apply` (dark theme, scrollbar, safe-area insets) |

### App Structure (`app/`)
```
app/
├── app.config.ts          # UI theme config
├── app.vue                # Root component
├── assets/css/main.css    # Global styles (@apply)
├── pages/index.vue        # Full-page TTS Studio (two-panel layout)
├── components/            # 9 Vue components
│   ├── AudioPlayerPanel.vue       # Audio playback panel (waveform + controls)
│   ├── FocusHaloCanvas.vue        # Focus halo effect for textarea
│   ├── GenerateButton.vue         # Generate speech button with loading states
│   ├── MobileStatusIndicator.vue  # Compact model status (mobile FAB)
│   ├── ModelStatusIndicator.vue   # Desktop model status indicator
│   ├── SpeedSlider.vue            # Speed adjustment slider (0.5×–2.0×)
│   ├── ToastNotification.vue      # Toast messages (success/error/info)
│   ├── VoiceSelector.vue          # Voice/dialect selector dropdown
│   └── WaveformCanvas.vue         # Animated waveform visualization
└── composables/           # 8 composables (+ test files)
    ├── useAudioModule.ts     # Audio playback state management
    ├── useHealthPoll.ts      # Backend health check polling
    ├── useInputValidation.ts # Text input validation logic
    ├── usePanelToggle.ts     # Panel toggle state (control-deck ↔ canvas)
    ├── useScrollReveal.ts    # Scroll-reveal fade-up animations
    ├── useToast.ts           # Toast notification management
    ├── useTtsApi.ts          # TTS API calls (synthesize, healthCheck)
    └── useVoices.ts          # Voice list fetching and management
```

### ESLint Config
- **Config file**: `eslint.config.mjs` (flat config via `@nuxt/eslint` — wraps `.nuxt/eslint.config.mjs`)
- **Style rules**: `commaDangle: 'never'`, `braceStyle: '1tbs'` (defined in `nuxt.config.ts` under `eslint.config.stylistic`)

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
- All test files MUST live in `frontend/tests/`. Never create test files inside `app/` or any source directory.

**Test files (19 total):
- `app.test.ts` — Root app integration test
- `AudioPlayerPanel.test.ts` — Audio player panel tests
- `index.test.ts` — Main page integration test
- `ModelStatusIndicator.test.ts` — Model status indicator tests
- `PanelSliding.test.ts` — Panel sliding animation tests
- `SpeedSlider.test.ts` — Speed slider interaction tests
- `ToastNotification.test.ts` — Toast notification rendering tests
- `ToastShortcut.test.ts` — Toast keyboard shortcut tests
- `useAudioModule.test.ts` — Audio module logic tests
- `useHealthPoll.test.ts` — Health polling logic tests
- `useInputValidation.test.ts` — Input validation logic tests
- `usePanelToggle.test.ts` — Panel toggle composable tests
- `useToast.test.ts` — Toast composable tests
- `useTtsApi.test.ts` — TTS API composable tests
- `useVoices.test.ts` — Voices composable tests
- `VoiceSelector.test.ts` — Voice selector basic tests
- `VoiceSelector.animation.test.ts` — Voice selector animation tests
- `VoiceSelector.click.test.ts` — Voice selector click interaction tests
- `VoiceSelector.data-attrs.test.ts` — Voice selector data attributes tests

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
| `requirements.txt` | Python dependencies (fastapi, uvicorn, pydantic, coqui-tts, ffmpeg-python, python-multipart) |
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
- Cache dir: `/app/.cache/tts` (env var `TTS_MODEL_CACHE`)
- **Note:** The `tts-model-cache` named volume is mounted at `/root/.local/share/tts` in Docker Compose, but the application writes to `/app/.cache/tts` (set via `TTS_MODEL_CACHE` env var). The model cache volume is **not used for persistence** — the ~2GB TTS model is re-downloaded on each container restart.
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
- All test files MUST live in `backend/tests/`. Never create test files inside `app/` or any source directory.
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

### Environment Variables (`.env` at project root)
```
BACKEND_PORT=9000, BACKEND_HOST=backend
FRONTEND_PORT=9001, FRONTEND_HOST=localhost
NGINX_PORT=80, NGINX_HOST=localhost
API_BASE_URL=http://backend:9000
TTS_MODEL_CACHE=/app/.cache/tts
COQUI_TOS_AGREED=1
MODEL_VOLUME_NAME=arabic-tts-models
AUDIO_CACHE_VOLUME_NAME=arabic-tts-audio
MODEL_PATH=/data/models
MODEL_NAME=default-arabic-tts
LOG_LEVEL=INFO
LOG_FORMAT=json
```

**Docker environment (backend service):**
- `TZ=UTC`
- `TTS_MODEL_CACHE=/app/.cache/tts`
- `COQUI_TOS_AGREED=1`
- `LD_LIBRARY_PATH=/usr/local/lib:/usr/lib/x86_64-linux-gnu`

---

## UnoCSS Shortcuts (Reusable Classes)
| Shortcut | Expands To |
|----------|------------|
| `btn` | `px-4 py-2 rounded font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors` |
| `card` | `rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800` |
| `flex-center` | `flex items-center justify-center` |
| `flex-between` | `flex items-center justify-between` |

## UnoCSS Utilities (in main.css)
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
4. **Tests mirror source**: additional tests go in `tests/` alongside their source counterparts
5. **TEST FILES NEVER LEAVE `tests/`**: All test files (`.test.ts`, `*.test.py`) MUST live inside `frontend/tests/` or `backend/tests/`. Never create test files inside `app/`, `components/`, `composables/`, or any other source directory. If you find inline `.test.ts` files in source directories, move them to `tests/`.
5. **Dark mode**: all UnoCSS utility classes have `dark:` variants defined in main.css
6. **RTL support**: Arabic text handled via Cairo font + RTL direction

---

## Quick-Start Commands

### Local Development (without Docker)
```bash
# Start frontend dev server (hot reload, port 3000)
cd frontend && pnpm dev

# Start backend dev server (port 8000)
# Note: backend still needs Docker for TTS model; use `docker compose up backend` or `uvicorn` with a local TTS setup
```

> **Pre-commit hooks** require `pre-commit` installed on the host (`pip install pre-commit`). All backend tests run inside Docker — no host Python needed.

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
pnpm dev          # Start dev server (port 3000, proxies to localhost:9000)
pnpm build        # Production build
pnpm preview      # Preview production build locally
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
pnpm test         # Run Vitest unit tests
pnpm test:coverage  # Tests with coverage report
pnpm clean        # Remove build artifacts
```

### Pre-commit & Full Check (from project root)
```bash
./run-tests.sh    # Run ALL checks: backend tests → lint → typecheck → frontend tests
```

**How it works:**
- `run-tests.sh` is the **single source of truth** for all quality gates.
- Pre-commit hooks call `./run-tests.sh` automatically on every commit.
- Run it manually before pushing: `./run-tests.sh` from the project root.
- It runs 4 checks in order (stops at first failure thanks to `set -e`):
  1. **Backend tests** — pytest inside Docker (`./scripts/run-backend-tests.sh`)
  2. **Frontend lint** — ESLint (`pnpm lint`)
  3. **Frontend typecheck** — TypeScript (`pnpm typecheck`)
  4. **Frontend tests** — Vitest (`pnpm test`)
- **Pre-commit hooks** also include `ruff` and `ruff-format` (from `astral-sh/ruff-pre-commit`) for Python linting and formatting.

### Backend Scripts (from project root)
```bash
./scripts/run-backend-tests.sh    # Run pytest inside Docker
uvicorn backend/app:app --reload  # Start backend dev server (port 8000)
```

> **Docker-first backend:** All backend dependencies (Python, pytest, FastAPI, Coqui TTS, ffmpeg) live **inside the Docker container**. Your host machine only needs Docker and Git. No Python installation required.

---

## API Reference

### `POST /api/generate` — Generate Speech
**Request body:**
```json
{
  "text": "مرحبا بك في لغةات",
  "language": "ar",        // optional, default: "ar" | allowed: "ar" | "en"
  "voice": "female",       // optional, any string accepted (validated at runtime)
  "speaker": "female",     // alias for `voice` (any string accepted)
  "speed": 1.0,            // optional, default: 1.0 | range: 0.5 – 2.0
  "pitch": 0.0,            // optional, default: 0.0 | range: -4.0 – 4.0
  "seed": 42               // optional, deterministic seed (defaults to 42)
}
```
**Response:** Returns `audio/mpeg` (MP3 binary blob via `FileResponse`). The frontend loads this into an `<audio>` element via `URL.createObjectURL()`.

> **Note:** The `SynthesisResponse` Pydantic model (audio_url, filename, duration_seconds) is defined but **not used** — the endpoint returns a raw file response instead of JSON.

> **Note:** The `SynthesisRequest` model accepts `voice` and `speaker` as optional strings (not restricted to "female"/"male"). The voice is resolved as `speaker ?? voice ?? "female"`. Speaker WAV files are discovered dynamically from `speaker_wavs/` directory.

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
**Response:** Array of voices discovered from `speaker_wavs/` directory.
```json
[
  { "id": "KSA Hamed - Male", "name": "KSA Hamed - Male" },
  { "id": "KSA Zariyah - Female", "name": "KSA Zariyah - Female" }
]
```
> **Note:** Voices are dynamically discovered from `.wav` files in `backend/speaker_wavs/`. Each file produces `{ id: filename_without_extension, name: filename_without_extension }`.

### `GET /api/history` — Audio History
**Response:** Array of previously generated audio files with metadata (filename, text (always empty string), language, voice, speed, pitch, created_at).

---

## Local Development Setup

### Prerequisites
- Node.js 24 (or via nvm)
- pnpm 10.33.4
- Docker & Docker Compose (backend runs entirely inside containers)
- Git (for pre-commit hooks)

> **No Python on the host** — all backend tooling runs inside Docker.

### Running Both Services Locally
```bash
# Terminal 1 — Backend (port 8000)
cd backend && uvicorn app:app --reload

# Terminal 2 — Frontend (port 3000, proxies to localhost:9000)
cd frontend && pnpm dev
```
> **Note:** When running locally, the frontend dev server proxies API calls to `localhost:9000` (configured in `nuxt.config.ts` Nitro devProxy). In Docker, Nginx handles this proxying.

### Speaker WAV Files
Voice presets use reference audio files stored in `backend/speaker_wavs/`:
- `KSA Hamed - Male.wav` — Male voice reference (KSA dialect)
- `KSA Zariyah - Female.wav` — Female voice reference (KSA dialect)

These must be ≥ 0.33 seconds (XTTS-v2 minimum). Add custom voices by placing WAV files here. Voices are dynamically discovered from the directory.

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
- **Model readiness**: 503 returned if synthesis called before model finishes loading (~120s startup)

---

## Known Gotchas & Limitations

1. **Model loading takes ~120 seconds** — The first request after startup will get 503. Health polling (`useHealthPoll`) handles this by checking `/health` every 2 seconds (max 10 retries). Docker health check has `start_period: 120s` with 200 retries at 15s intervals.
2. **TTS model is ~2GB** — Not persisted across container restarts (see Model Loading note above). Docker rebuilds will re-download.
3. **CPU-only inference** — No GPU support; generation takes several seconds per request.
4. **Speaker WAV validation** — XTTS-v2 requires ≥ 0.33s reference audio. Shorter files raise a 500 error.
5. **Audio file persistence** — Generated MP3s accumulate in `tts-audio-cache`. No cleanup mechanism.
6. **Language support** — Only `ar` (Arabic) and `en` (English) are accepted. Other languages will be rejected.
7. **Deterministic output** — Seed defaults to 42 per-request. Override via `seed` field in request.
8. **Host ports** — Backend runs on host port 9000, frontend on 9001 (not 8000/80). Local dev proxies to localhost:9000.

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
  2. pnpm v4 action (version: 10.33.4), Node.js 24 (cached via `pnpm`)
  3. `pnpm install --frozen-lockfile`
  4. `pnpm lint` (ESLint)
  5. `pnpm typecheck` (TypeScript)
  6. `pnpm test -- --coverage`
  7. Working directory: `frontend`

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
7. Backend work: run from `backend/` directory using Docker (all deps inside container)
8. **Quality gate:** `./run-tests.sh` is the single source of truth — runs backend tests, lint, typecheck, and frontend tests. Pre-commit hooks call it automatically. Use it before every commit/push.
9. Backend tests: `./scripts/run-backend-tests.sh` runs pytest inside Docker, no host Python needed.
10. **TEST FILES MUST STAY IN `tests/`**: Frontend tests → `frontend/tests/`. Backend tests → `backend/tests/`. Never create a `.test.ts` or `*_test.py` file inside `app/`, `components/`, `composables/`, or any source directory. If existing inline test files exist in source directories, move them to `tests/`.
11. **Icons** — The app uses Phosphor Icons (via `@phosphor-icons/web` CDN), Lucide, and Simple Icons. Icon classes use `ph ph-<name>` or `ph-fill ph-<name>` format.
12. **Two-panel layout** — The main page uses a split layout: Control Deck (left) + Waveform Canvas (right). On mobile (<768px), panels stack vertically with a draggable divider.
13. **Dynamic voice discovery** — Voices are discovered from `backend/speaker_wavs/` directory at runtime. The `/api/voices` endpoint returns all `.wav` files found. Current voices: `KSA Hamed - Male`, `KSA Zariyah - Female`.
14. **Host ports** — Docker: backend on 9000, frontend on 9001. Local dev: frontend proxies to `localhost:9000`.

---

## UI/UX Feedback Workflow

These skills handle **LLM-driven UI/UX review, audit, and improvement**. Use them when the user says "review the UI", "fix the UX", "audit accessibility", "make it look better", or reports visual/design issues.

### Workflow: "This UI feels off" → Fix It

```
User: "This UI feels off" / "Make the UI better"
    │
    ▼
ui-ux-reviewer        ← Audit: layout, spacing, typography, color contrast, interaction patterns
    │
    ▼
design-review         ← Evaluate: does this follow design best practices?
    │
    ▼
accessibility-auditor ← Check: WCAG barriers (contrast, focus, ARIA, screen reader)
    │
    ▼
frontend-design       ← Direction: what should it look like? (aesthetic, palette, typography)
    │
    ▼
ui-designer           ← Spec: component specs, design tokens, pixel-perfect implementation
    │
    ▼
ux-architect          ← Structure: CSS systems, responsive layout, component architecture
    │
    ▼
review                ← Verify: does the fix match the spec? (standards, spec, quality)
    │
    ▼
qa                    ← Final: any remaining bugs? (file issues for fixes)
```

### When to Use Each Skill

| User says... | Use this skill first |
|-------------|---------------------|
| "Review the UI" / "UI feels off" | `ui-ux-reviewer` |
| "Does this look right?" / "Design feedback" | `design-review` |
| "Check accessibility" / "WCAG issues" | `accessibility-auditor` |
| "Make it look better" / "Improve design" | `frontend-design` |
| "Design the component" / "Component library" | `ui-designer` |
| "Fix the layout" / "Responsive issues" | `ux-architect` |
| "Review since X" (code diff) | `review` |
| "Report a bug" / "QA session" | `qa` |
| "Make it feel premium" / "Polish the UI" | `high-end-visual-design` |
