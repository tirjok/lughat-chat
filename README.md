# Lughat Chat

A **text-to-speech (TTS) web application** for Arabic speech synthesis, powered by [Coqui XTTS-v2](https://github.com/coqui-ai/TTS).

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
| `/synthesize` | POST | Generate speech from text (returns audio file) |

### Synthesize Example

```bash
curl -X POST http://localhost:8000/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "مرحبا بك في لغات شات", "speaker_wav": "", "language": "ar"}' \
  -o output.wav
```

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
└── nginx/                    # Nginx reverse proxy config
```

## Testing

### Run All Tests (Recommended)
From the project root, run both backend and frontend tests in one command:
```bash
./run-tests.sh          # Run all tests (backend + frontend)
./run-tests.sh -v       # With verbose output
```

### Frontend (Vitest)
```bash
cd frontend
pnpm test              # Run all unit tests
npx vitest --config vitest.component.config.ts  # Component tests only
```

### Backend (Pytest)
```bash
cd backend
pytest
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

## Contributing

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) for details on how to contribute.

## License

This project is licensed under the [MIT License](LICENSE).
