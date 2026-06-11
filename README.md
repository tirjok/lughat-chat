# Lughat Chat

A **text-to-speech (TTS) web application** for Arabic speech synthesis, powered by [Coqui XTTS-v2](https://github.com/coqui-ai/TTS).

## Features

- **Instant Arabic TTS** — generate speech from Arabic text in seconds
- **Two voice presets** — female and male voices with adjustable speed (0.5×–2.0×)
- **Download MP3** — save generated audio files locally
- **Keyboard shortcut** — press `Ctrl+Enter` to generate without clicking
- **Dark mode** — full dark theme support with automatic toggle
- **RTL text input** — ArabicTextarea handles right-to-left direction automatically
- **Health monitoring** — auto-polling backend status with loading indicator

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

- **Frontend**: Nuxt 4 + Vue 3 + UnoCSS (served via Nginx on port 80)
- **Backend**: Python FastAPI + Coqui TTS (port 8000)
- **TTS Model**: XTTS-v2 — multilingual with Arabic focus

## Quick Start

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- At least 4GB RAM (XTTS-v2 model loads into memory)

### Run with Docker Compose

```bash
# Start all services (model downloads on first run — ~2GB)
docker compose up --build

# Access the app at http://localhost
```

The TTS model is cached in a named volume (`tts-model-cache`) so it only downloads once. Generated audio files are persisted in `tts-audio-cache`.

#### Environment Variables (in `.env`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `COQUI_TOS_AGREED` | `1` | Required by Coqui TTS to accept the license |
| `TTS_MODEL_CACHE` | `/app/.cache/tts` | Path to the TTS model cache directory |
| `TZ` | `UTC` | Timezone for log timestamps |

> **Note:** These are pre-configured in `docker-compose.yml`. You only need to change them if you want custom behavior.

### Run Locally (Development)

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check + model loading status |
| `/voices` | GET | List available voices/speakers |
| `/api/generate` | POST | Generate speech from text (returns MP3 audio blob) |

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
| `speaker` | string | No | `"female"` | Voice preset (`"female"` or `"male"`) |
| `speed` | float | No | `1.0` | Speech speed (range: 0.5–2.0) |
| `seed` | int | No | — | Random seed for deterministic output (optional) |

#### Response

Returns `audio/mpeg` (MP3 binary). On error:

| Status | Meaning |
|--------|---------|
| 400    | Invalid text (empty or too long) |
| 503    | TTS model not ready yet (still loading — ~60s startup) |
| 500    | Server error (missing speaker WAV, generation failure) |

## Project Structure

```
├── backend/                  # Python FastAPI server
│   ├── app.py               # Main app: model loading, endpoints
│   ├── requirements.txt     # Python dependencies
│   └── tests/               # Pytest test suite
├── frontend/                 # Nuxt 4 + Vue 3 SPA
│   ├── app/
│   │   ├── pages/index.vue  # Main TTS page
│   │   ├── components/      # Vue UI components (6)
│   │   └── composables/     # Reusable logic hooks (5)
│   ├── nuxt.config.ts       # Nuxt configuration
│   ├── uno.config.ts        # UnoCSS presets & shortcuts
│   └── tests/               # Vitest test suite
├── docker-compose.yml        # Docker deployment config
└── nginx/                    # Nginx reverse proxy (routes frontend → backend)
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

## Dark Mode

All UI components support dark mode via CSS `dark:` variants. Toggle with the class on `<html>`.

## RTL Support

The Arabic text input component (`ArabicTextarea`) handles right-to-left text direction automatically.

## Key Conventions

1. **Nuxt file-based routing**: pages in `app/pages/` are auto-imported
2. **Composables** in `app/composables/` are auto-imported (no explicit imports needed)
3. **Components** in `app/components/` are auto-imported by PascalCase name
4. **Tests mirror source**: composables have `.test.ts` alongside them, plus additional tests in `tests/`
5. **ESLint**: flat config via `@nuxt/eslint`, rules: `commaDangle: 'never'`, `braceStyle: '1tbs'`

## Custom Voices

To add a custom voice preset, place a WAV file in `backend/speaker_wavs/`:

```bash
cp my_voice.wav backend/speaker_wavs/custom.wav
```

Requirements:
- Format: WAV (any sample rate)
- Duration: ≥ 0.33 seconds (XTTS-v2 minimum)
- Content: Clear speech in the target language

After adding a file, restart the backend container. The new voice will appear in the `/api/voices` response.

## Known Limitations

- **Model loading takes ~60 seconds** — The first request after startup returns 503. Health polling handles this automatically.
- **CPU-only inference** — No GPU support; generation takes several seconds per request.
- **Language support** — Only `ar` (Arabic) and `en` (English) are accepted.
- **Audio file persistence** — Generated MP3s accumulate in `tts-audio-cache`. No automatic cleanup.

## Contributing

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) for details on how to contribute.

## License

This project is licensed under the [MIT License](LICENSE).
