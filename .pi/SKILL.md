---
name: lughat-chat
description: Project-specific guidance for Lughat Chat — a Nuxt 4 + FastAPI text-to-speech web app for Arabic speech synthesis using Coqui XTTS-v2. Covers frontend components, composables, backend API, Docker deployment, and testing patterns.
license: MIT
---

# Lughat Chat — Project Guidance

A **text-to-speech (TTS) web app** for Arabic speech synthesis using Coqui XTTS-v2. Deployed via Docker Compose with Nginx as reverse proxy.

## When to Use

Working on:
- Frontend Vue components or composables (`frontend/app/`)
- Backend FastAPI endpoints (`backend/app.py`)
- Docker Compose deployment (`docker-compose.yml`, `Dockerfile.*`)
- Nginx configuration (`nginx/`)
- Testing (Vitest for frontend, Pytest for backend)

## Architecture Overview

```
┌──────────┐     ┌─────────────┐     ┌──────────┐
│  Browser  │◄──►│   Nginx     │◄──►│ Backend  │
└──────────┘     │ (port 80)   │     │(port 8000)│
                  └─────────────┘     └──────────┘
                                       Coqui XTTS-v2
```

- **Frontend**: Nuxt 4 + Vue 3 + UnoCSS (served on port 80 via Nginx)
- **Backend**: Python FastAPI + Coqui TTS (runs on port 8000)
- **TTS Model**: XTTS-v2 (multilingual, Arabic-focused)

## Frontend (`frontend/`)

### Key Patterns
- **Nuxt file-based routing**: pages in `app/pages/`, auto-imported
- **Composables** in `app/composables/` are auto-imported (no explicit imports needed)
- **Components** in `app/components/` are auto-imported by PascalCase name
- **UnoCSS shortcuts**: use `btn`, `card`, `flex-center`, `flex-between`
- **BEM CSS classes**: all prefixed with `.tts-` (e.g., `.tts-page`, `.tts-card`)
- **Dark mode**: all BEM classes have `dark:` variants in `app/assets/css/main.css`
- **RTL support**: ArabicTextarea handles RTL text input

### Components (`frontend/app/components/`)
| Component | Purpose |
|-----------|---------|
| `ArabicTextarea.vue` | RTL Arabic text input with character count |
| `ModelStatusIndicator.vue` | Shows TTS model loading status (loading/ready/error) |
| `PlayPauseButton.vue` | Audio play/pause toggle with icon |
| `SeekableProgressBar.vue` | Draggable audio progress bar |
| `TimeDisplay.vue` | Audio time formatting (mm:ss) |
| `ToastNotification.vue` | Toast messages (success/error/info) with auto-dismiss |

### Composables (`frontend/app/composables/`)
| Composable | Purpose |
|------------|---------|
| `useAudioPlayer.ts` | Audio playback state management (play, pause, seek, volume) |
| `useHealthPoll.ts` | Backend health check polling (checks `/health` endpoint) |
| `useInputValidation.ts` | Text input validation logic (Arabic text, length limits) |
| `useTimeDisplay.ts` | Time formatting utilities (seconds → mm:ss) |
| `useTtsApi.ts` | TTS API calls (synthesize, healthCheck) |

### Testing
**Two separate Vitest configs:**
```bash
# Unit tests (composables)
pnpm test          # → vitest run

# Component tests
npx vitest --config vitest.component.config.ts
```
- Test files: `frontend/tests/` and inline `.test.ts` alongside composables
- Setup mocks Nuxt auto-imports (`ref`, `computed`, `watch`, `onMounted`)

### ESLint
- Flat config: `eslint.config.mjs` via `@nuxt/eslint`
- Style rules: `commaDangle: 'never'`, `braceStyle: '1tbs'`

## Backend (`backend/`)

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check + model loading status (`loading` → `ready` / `error`) |
| `/voices` | GET | List available voices/speakers |
| `/synthesize` | POST | Generate speech from text (returns audio file) |

### Model Loading
- Model: `tts_models/multilingual/xtts_v2` (loaded on startup via lifespan)
- Cache dir: `/app/.cache/tts` (persisted as named volume `tts-model-cache`)
- Audio output dir: `/app/downloads` (persisted as named volume `tts-audio-cache`)

### Testing
```bash
cd backend && pytest
```
- Test files: `backend/tests/` (`test_generate.py`, `test_generate_blob.py`, `test_health.py`, `test_voices.py`)

**Run all tests (backend + frontend) from project root:**
```bash
./run-tests.sh     # Runs pytest (backend) then pnpm test (frontend)
```

## Docker Deployment (`docker-compose.yml`)

### Services
| Service | Image | Ports | Notes |
|---------|-------|-------|-------|
| `backend` | Python (custom Dockerfile) | 8000:8000 | Health check waits for model load (`start_period: 60s`) |
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

## Key Conventions

1. **Frontend work**: run from `frontend/` directory using pnpm commands
2. **Backend work**: run from `backend/` directory using pip/pytest
3. **Adding components**: check existing ones in `app/components/` for patterns first
4. **Modifying composables**: read the existing one in `app/composables/` for patterns first
5. **Tests mirror source**: composables have `.test.ts` alongside them in `app/composables/`, plus additional tests in `tests/`
6. **UnoCSS presets**: configured in `uno.config.ts` — uses presetIcons (Lucide + Simple Icons), presetTypography, presetWebFonts
7. **UI theme**: configured in `app/app.config.ts` — primary: green, neutral: slate
