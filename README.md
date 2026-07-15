# Lughat Chat

A **text-to-speech (TTS) web application** for Arabic speech synthesis, powered by [Coqui XTTS-v2](https://github.com/coqui-ai/TTS).

## Features

- **Instant Arabic TTS** — generate speech from Arabic text using Coqui XTTS-v2
- **Multiple voice presets** — dynamically discovered from `backend/speaker_wavs/`
- **Adjustable speed** — 0.5× to 2.0× via slider
- **Download MP3** — save generated audio files locally
- **Keyboard shortcut** — `Ctrl+Enter` to generate
- **Premium dark theme** — "Sunrise Surge" palette (orange → magenta gradients)
- **RTL text input** — Arabic text via Cairo/Noto Sans Arabic fonts
- **Health monitoring** — auto-polling backend status with loading indicator
- **Two-panel layout** — Control Deck (left) + Editor Canvas (right), stacked on mobile

[![Frontend CI](https://github.com/tirjok/lughat-chat/actions/workflows/frontend.yml/badge.svg)](https://github.com/tirjok/lughat-chat/actions/workflows/frontend.yml)
[![Backend CI](https://github.com/tirjok/lughat-chat/actions/workflows/backend.yml/badge.svg)](https://github.com/tirjok/lughat-chat/actions/workflows/backend.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Architecture

```
┌──────────┐     ┌─────────────┐     ┌──────────┐
│  Browser  │◄──►│   Nginx     │◄──►│ Backend  │
└──────────┘     │ (port 80)   │     │(port 8000)│
                  └─────────────┘     └──────────┘
                                       Coqui XTTS-v2
```

- **Frontend**: Nuxt 4.4+ + Vue 3.5+ + UnoCSS 66 (Nginx reverse proxy, port 80)
- **Backend**: Python FastAPI 0.115.6 + Coqui TTS 0.27.5 (port 8000)
- **TTS Model**: XTTS-v2 — multilingual with Arabic focus
- **Icons**: Phosphor Icons (via `@phosphor-icons/web` CDN script)
- **Fonts**: Google Fonts — "Inter" (UI labels) + "Cairo" (Arabic text)

## Quick Start

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- At least 4GB RAM (XTTS-v2 model loads into memory)

### Run with Docker Compose

```bash
# Start all services (model downloads on first run — ~2GB)
docker compose up --build

# Access the app at http://localhost:9001
```

The TTS model is cached in a named volume (`tts-model-cache`) so it only downloads once. Generated audio files are persisted in `tts-audio-cache`.

### Start Development + Production Simultaneously

```bash
# Start both environments (see docs/docker/DOCKER-GUIDE.md)
./dev.sh up

# Development:  http://localhost:3000  (hot reload)
# Production:   http://localhost:9001  (Nginx)
```

> **Full Docker reference:** [`docs/docker/DOCKER-GUIDE.md`](docs/docker/DOCKER-GUIDE.md) — environments, Dockerfiles, Nginx config, volumes, networks, troubleshooting.

#### Environment Variables (in `.env`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `COQUI_TOS_AGREED` | `1` | Required by Coqui TTS to accept the license |
| `TTS_MODEL_CACHE` | `/app/.cache/tts` | Path to the TTS model cache directory |
| `TZ` | `UTC` | Timezone for log timestamps |

> **Note:** These are pre-configured in `docker-compose.yml`. You only need to change them if you want custom behavior.

### Run Locally (Development)

> **Note:** Backend requires Docker (Coqui TTS dependencies are complex). Use `docker compose up backend` or run the full stack with `docker compose up --build -d`.

#### Frontend
```bash
cd frontend
pnpm install
pnpm dev  # Hot-reload dev server on port 3000, proxies API to localhost:9000
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check + model loading status |
| `/api/voices` | GET | List available voices/speakers |
| `/api/generate` | POST | Generate speech from text (returns MP3 audio blob) |
| `/api/history` | GET | List previously generated audio files |

### Generate Example

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "مرحبا بك في لغات شات", "speaker": "female", "language": "ar"}' \
  -o output.mp3
```

#### Request Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | Yes | — | Arabic or English text to synthesize |
| `language` | string | No | `"ar"` | Language code (`"ar"` or `"en"`) |
| `speaker` | string | No | `"female"` | Voice preset (any string, resolved dynamically) |
| `voice` | string | No | `"female"` | Alias for speaker (any string, resolved dynamically) |
| `speed` | float | No | `1.0` | Speech speed (range: 0.5–2.0) |
| `seed` | int | No | 42 | Random seed for deterministic output (optional) |

#### Response

Returns `audio/mpeg` (MP3 binary). On error:

| Status | Meaning |
|--------|---------|
| 400    | Invalid text (empty or too long) |
| 503    | TTS model not ready yet (still loading — ~120s startup) |
| 500    | Server error (missing speaker WAV, generation failure) |

## Project Structure

```
├── backend/                  # Python FastAPI server
│   ├── app.py               # Main app: model loading, endpoints
│   ├── requirements.txt     # Python dependencies
│   ├── requirements-test.txt # Test dependencies (no coqui-tts)
│   └── tests/               # Pytest test suite (5 tests)
├── frontend/                 # Nuxt 4.4+ + Vue 3.5+ SPA
│   ├── app/
│   │   ├── pages/index.vue  # Full-page TTS Studio (two-panel layout)
│   │   ├── components/      # Vue UI components (9)
│   │   └── composables/     # Reusable logic hooks (8)
│   ├── nuxt.config.ts       # Nuxt configuration
│   ├── uno.config.ts        # UnoCSS presets (presetWind3) & shortcuts
│   └── tests/               # Vitest test suite
├── docker-compose.yml        # Docker deployment (backend: 9000, frontend: 9001)
└── scripts/                  # Backend test runner (Docker)
```

## Testing

### Run All Tests (Recommended)
From the project root, run both backend and frontend tests in one command:
```bash
./run-tests.sh          # Run all tests (backend + frontend)
./run-tests.sh -v       # With verbose output
```

All **backend tests run inside Docker** — no Python installation needed on your host machine.

### Frontend (Vitest)
```bash
cd frontend
pnpm test              # Run all unit tests
npx vitest --config vitest.component.config.ts  # Component tests only
```

### Backend (Pytest — inside Docker)
```bash
./scripts/run-backend-tests.sh          # Run backend tests in Docker
./scripts/run-backend-tests.sh -v       # With verbose output
```

> **Note:** The backend Docker image includes `pytest`, `fastapi`, and all test dependencies. No Python is installed on the host — everything runs in the container.

### Pre-commit Hooks
All hooks run automatically on `git commit`. Backend tests execute inside Docker:
```bash
pre-commit install    # (already done — see setup below)
git add . && git commit -m "fix: something"
```

## UnoCSS Shortcuts

| Shortcut | Expands To |
|----------|------------|
| `btn` | `px-4 py-2 rounded font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors` |
| `card` | `rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800` |
| `flex-center` | `flex items-center justify-center` |
| `flex-between` | `flex items-center justify-between` |

## Key Conventions

1. **Nuxt file-based routing**: pages in `app/pages/` are auto-imported
2. **Composables** in `app/composables/` are auto-imported (no explicit imports needed)
3. **Components** in `app/components/` are auto-imported by PascalCase name
4. **Tests mirror source**: all test files live in `frontend/tests/` (no inline test files)
5. **ESLint**: flat config via `@nuxt/eslint`, rules: `commaDangle: 'never'`, `braceStyle: '1tbs'`
6. **Icons**: Phosphor Icons (via `@phosphor-icons/web` CDN script) + Lucide + Simple Icons
7. **Host ports**: Docker backend on 9000, frontend on 9001. Local dev proxies to localhost:9000.

## Custom Voices

To add a custom voice preset, place a WAV file in `backend/speaker_wavs/`:

```bash
cp my_voice.wav backend/speaker_wavs/custom.wav
```

Requirements:
- Format: WAV (any sample rate)
- Duration: ≥ 0.33 seconds (XTTS-v2 minimum)
- Content: Clear speech in the target language

After adding a file, restart the backend container. The new voice will appear in the `/api/voices` response (voices are dynamically discovered).

**Current voices:**
- `KSA Hamed - Male.wav` — Male voice reference (KSA dialect)
- `KSA Zariyah - Female.wav` — Female voice reference (KSA dialect)

## Known Limitations

- **Model loading takes ~120 seconds** — The first request after startup returns 503. Health polling handles this automatically (Docker health check: `start_period: 120s`, 200 retries).
- **CPU-only inference** — No GPU support; generation takes several seconds per request.
- **Language support** — Only `ar` (Arabic) and `en` (English) are accepted.
- **Audio file persistence** — Generated MP3s accumulate in `tts-audio-cache`. No automatic cleanup.
- **Host ports** — Backend on 9000, frontend on 9001 (not 8000/80).

## Contributing

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) for details on how to contribute.

## License

This project is licensed under the [MIT License](LICENSE).
