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
- [Podman](https://podman.io/) 5+ with [`podman-compose`](https://github.com/containers/podman-compose) (recommended) **or** Docker 24+ with Docker Compose v2
- At least 4 GB RAM (XTTS-v2 model loads into memory)
- ~8–10 GB disk space (TTS model ~2 GB + container images ~5 GB + audio cache)

> **Note:** This project supports both Docker and Podman. Podman is the recommended runtime for rootless containers. All scripts auto-detect the container runtime.

### macOS (Podman)
```bash
brew install podman podman-compose
podman machine init    # Create the Linux VM
podman machine start   # Start the VM
```

### Linux
```bash
# Fedora/RHEL
sudo dnf install podman podman-compose
# Debian/Ubuntu
sudo apt install podman podman-compose
```

### Run with Podman (or Docker)

```bash
# Start production services (model downloads on first run — ~2 GB)
./dev.sh up

# Or directly (production only):
podman-compose up --build    # Podman (recommended)
# or
docker compose up --build    # Docker
```

The TTS model is cached in a named volume (`tts-model-cache`) so it only downloads once. Generated audio files are persisted in `tts-audio-cache`.

#### Backend Only

To run just the backend (no frontend):

```bash
./dev.sh up backend          # Start both prod + dev backends
./dev.sh up backend prod     # Production backend only
./dev.sh up backend dev      # Development backend only
./dev.sh backend prod        # Production backend only (shortcut)
./dev.sh backend dev         # Development backend only (shortcut)
podman-compose -f docker-compose.yml up -d backend    # Production backend only
podman-compose -f docker-compose.dev.yml up -d backend-dev  # Development backend only
```

### Run a Specific Service

```bash
./dev.sh up frontend         # Start development frontend only
```

### Access URLs

| Environment | Frontend | Backend API | Command |
|-------------|----------|-------------|---------|
| Production | http://localhost:9101 | http://localhost:9100 | `./dev.sh up` |
| Development | http://localhost:3000 | http://localhost:9100 | `podman-compose -f docker-compose.dev.yml up -d` |

> **Important:** Both environments share host port 9100 for the backend. They use **separate bridge networks** so there's no port conflict — each environment has its own backend container. You can run **either** production **or** development at a time, but not both simultaneously.

> **Full container reference:** [`docs/docker/DOCKER-GUIDE.md`](docs/docker/DOCKER-GUIDE.md) — environments, Dockerfiles, Nginx config, volumes, networks, troubleshooting.

#### Environment Variables (pre-configured in compose files)

| Variable | Value | Purpose |
|----------|-------|---------|
| `COQUI_TOS_AGREED` | `1` | Required by Coqui TTS to accept the license |
| `TTS_MODEL_CACHE` | `/app/.cache/tts` | Path to the TTS model cache directory |
| `TZ` | `UTC` | Timezone for log timestamps |

> **Note:** These values are hardcoded in `docker-compose.yml` and `docker-compose.dev.yml`. The `.env` file at the project root is documentation only.

### Run Locally (Development)

> **Note:** Backend requires a container runtime (Podman or Docker) for Coqui TTS dependencies. Use `./dev.sh up backend` or run the full stack with `./dev.sh up`.

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
├── docker-compose.yml        # Docker deployment (backend: 9100, frontend: 9101)
└── scripts/                  # Backend test runner (Docker)
```

## Testing

### Run All Tests (Recommended)
From the project root, run both backend and frontend tests in one command:
```bash
./run-tests.sh          # Run all tests (backend + frontend)
./run-tests.sh -v       # With verbose output
```

All **backend tests run inside a container** — no Python installation needed on your host machine.

### Frontend (Vitest)
```bash
cd frontend
pnpm test              # Run all unit tests
npx vitest --config vitest.component.config.ts  # Component tests only
```

### Backend (Pytest — inside container)
```bash
./scripts/run-backend-tests.sh          # Run backend tests in container
./scripts/run-backend-tests.sh -v       # With verbose output
```

> **Note:** The backend container image includes `pytest`, `fastapi`, and all test dependencies. No Python is installed on the host — everything runs in the container.

### Pre-commit Hooks
All hooks run automatically on `git commit`. Backend tests execute inside the container:
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
7. **Host ports**: Docker backend on 9100, frontend on 9101. Local dev proxies to localhost:9100.

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
- **Host ports** — Backend on 9100, frontend on 9101 (not 8000/80).
- **Port sharing** — Both environments share backend port 9100. Run **one environment at a time** (production or development, not both simultaneously).

## Docker / Podman Troubleshooting

### Containers stuck in `Created` state

```bash
# List all containers
podman ps -a

# Force-remove stale containers
podman rm -f $(podman ps -aq)

# Remove orphaned pods (left behind by crashed compose sessions)
podman pod rm -f $(podman pod ps -q)

# Remove orphaned networks
podman network ls | grep lughat  # find network IDs
podman network rm <network-id>
```

### Port already in use

```bash
# Check what's using port 9100 or 9101
lsof -i :9100  # macOS / Linux
lsof -i :9101

# Stop any existing containers using those ports
podman-compose down    # production
podman-compose -f docker-compose.dev.yml down    # development
```

### TTS model re-downloads on every restart

Verify the named volume exists and is mounted correctly:

```bash
podman volume inspect tts-model-cache    # Podman
# or
docker volume inspect tts-model-cache    # Docker
```

If the volume is missing or empty, remove it and restart — the model will re-download once:

```bash
podman volume rm tts-model-cache    # Podman
docker volume rm tts-model-cache    # Docker
```

### Frontend can't reach backend

Both containers must be on the same network. Check:

```bash
podman network inspect lughat-network    # Podman
docker network inspect lughat-network    # Docker
```

### Container won't start — check logs

```bash
podman-compose logs -f backend    # Production backend logs
podman-compose logs -f frontend   # Production frontend logs
podman-compose -f docker-compose.dev.yml logs -f backend-dev    # Development backend
podman-compose -f docker-compose.dev.yml logs -f frontend-dev   # Development frontend
```

### Full cleanup (removes all volumes!)

```bash
podman-compose down -v    # Production + dev
podman-compose -f docker-compose.dev.yml down -v    # Development only
```

## Contributing

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) for details on how to contribute.

## License

This project is licensed under the [MIT License](LICENSE).
