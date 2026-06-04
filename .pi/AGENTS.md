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
| `/synthesize` | POST | Generate speech from text (returns audio file) |

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

## Agent Instructions — Do NOT Explore

When the user asks about building features, modifying existing code, or understanding patterns:
1. **Do NOT say "let me explore the codebase"** — you already have full context
2. Read specific files directly using `read` tool when needed for current task details
3. Summarize findings immediately and proceed with implementation
4. When adding new components, check existing ones in `app/components/` for patterns first
5. When modifying composables, read the existing one in `app/composables/` for patterns first
6. Frontend work: run from `frontend/` directory using pnpm commands
7. Backend work: run from `backend/` directory using pip/pytest
