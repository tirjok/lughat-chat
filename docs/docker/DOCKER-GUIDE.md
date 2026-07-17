# Container Deployment Guide — Lughat Chat

> **System:** Lughat Chat — Arabic Text-to-Speech Studio
> **Last Updated:** 2025-07-15
> **Stack:** Podman / Docker Compose · Nginx Alpine · Python 3.12 · Node 20 · pnpm 10.33.4

> **Podman Support:** This project supports both Docker and Podman. Podman is the recommended runtime for rootless containers. Install [`podman-compose`](https://github.com/containers/podman-compose) for Docker Compose file support.

> **Migration from Docker:** All scripts now auto-detect the container runtime (podman-compose → docker-compose → docker compose). No code changes needed — just install `podman-compose` and run `./dev.sh up`.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environments: Production vs Development](#2-environments-production-vs-development)
3. [Quick Start](#3-quick-start)
4. [Docker Compose Files](#4-docker-compose-files)
5. [Dockerfiles](#5-dockerfiles)
6. [Nginx Configuration](#6-nginx-configuration)
7. [Network & Port Mapping](#7-network--port-mapping)
8. [Volumes & Persistence](#8-volumes--persistence)
9. [Environment Variables](#9-environment-variables)
10. [Scripts & Tooling](#10-scripts--tooling)
11. [Troubleshooting](#11-troubleshooting)
12. [Security Considerations](#12-security-considerations)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         User's Browser                                 │
│                     (Chrome / Firefox / Safari)                        │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │ HTTP (port 9001 / 3000)
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Docker Host                                       │
│                                                                         │
│  ┌──────────────────────────┐    ┌──────────────────────────────────┐  │
│  │  Frontend Container      │    │  Backend Container               │  │
│  │  (nginx:alpine)          │    │  (python:3.12-slim)              │  │
│  │                          │    │                                  │  │
│  │  Host Port: 9001 (prod)  │    │  Host Port: 9000                 │  │
│  │  Host Port: 3000 (dev)   │    │  Container Port: 8000            │  │
│  │  Container Port: 80      │    │                                  │  │
│  │                          │    │  FastAPI + uvicorn               │  │
│  │  Nginx reverse proxy:    │──►│  XTTS-v2 model (CPU)             │  │
│  │   / → SPA static files   │    │  Speaker WAVs (mounted)          │  │
│  │   /api/* → backend:8000  │    │  Audio cache (mounted)           │  │
│  │   /health → backend:8000 │    └──────────────────────────────────┘  │
│  └──────────────────────────┘                                         │
│                                                                         │
│  Named Volumes:                                                        │
│  • tts-model-cache     → /app/.cache/tts  (TTS model, ~2GB)           │
│  • tts-audio-cache     → /app/downloads   (generated MP3s)            │
│  • tts-model-cache-dev → /app/.cache/tts  (dev TTS model)             │
│  • tts-audio-cache-dev → /app/downloads   (dev audio)                 │
│                                                                         │
│  Bridge Networks:                                                      │
│  • lughat-network       (production)                                   │
│  • lughat-dev-network   (development)                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Browser** loads the Nuxt SPA from Nginx (static files)
2. **Browser** sends text synthesis requests to `/api/generate`
3. **Nginx** proxies `/api/*` and `/health` to the backend container
4. **FastAPI** invokes the XTTS-v2 model to generate speech
5. **XTTS-v2** uses speaker reference WAV files for voice cloning
6. **FastAPI** returns the generated MP3 binary to Nginx
7. **Nginx** streams the MP3 back to the browser (buffering disabled for large files)

---

## 2. Environments: Production vs Development

The project runs **two independent Docker Compose environments simultaneously**:

| Aspect | Production (`docker-compose.yml`) | Development (`docker-compose.dev.yml`) |
|--------|-----------------------------------|----------------------------------------|
| **Frontend port** | `9001:80` | `3000:3000` |
| **Backend port** | `9000:8000` | `9000:8000` |
| **Frontend image** | `frontend/Dockerfile` (multi-stage: builder + nginx) | `frontend/Dockerfile.dev` (node dev server) |
| **Backend image** | `backend/Dockerfile` (uvicorn, no --reload) | `backend/Dockerfile` (uvicorn with `--reload`) |
| **Source mounting** | No source mounted | `./backend:/app`, `./frontend:/app` |
| **Model cache** | `tts-model-cache` | `tts-model-cache-dev` |
| **Audio cache** | `tts-audio-cache` | `tts-audio-cache-dev` |
| **Container names** | `lughat-backend`, `lughat-frontend` | `lughat-backend-dev`, `lughat-frontend-dev` |
| **Network** | `lughat-network` | `lughat-dev-network` |
| **Frontend → Backend** | Waits `service_healthy` | Waits `service_started` |
| **Health check** | Docker health check (120s start, 200 retries) | None (would block dev startup) |
| **Frontend env** | `NODE_ENV=production` (implicit) | `NODE_ENV=development`, `HOST=0.0.0.0` |
| **Proxy target** | Nginx config: `backend:8000` | Nuxt devProxy: `backend-dev:8000` |
| **Extra env** | — | `MAX_AUDIO_FILES=100` |
| **Use case** | Testing, staging, user access | Active development, hot reload |

### Key Differences Explained

#### Frontend: Multi-stage Build (prod) vs Dev Server (dev)

**Production** (`Dockerfile`):
- **Stage 1 (builder)**: Node 20 Alpine, installs pnpm, runs `pnpm build` → produces `.output/public/`
- **Stage 2 (nginx)**: Nginx Alpine, serves static files from builder output, reverse-proxies API calls to backend
- Result: A single static SPA served by Nginx. Zero Node.js at runtime.

**Development** (`Dockerfile.dev`):
- Single-stage: Node 20 Alpine, runs `pnpm dev` (Nuxt dev server with hot reload)
- Source code mounted from host (`./frontend:/app`) — changes reflected immediately
- Nuxt dev server runs on port 3000 inside the container

#### Backend: Hot Reload (dev)

Both environments use the same `backend/Dockerfile` (multi-stage build with PyTorch, Coqui TTS, torchcodec). The difference is the **CMD override** in `docker-compose.dev.yml`:

```yaml
command: ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

The `--reload` flag enables uvicorn's hot-reload mode — source changes are picked up without restarting the container.

#### Health Check: Prod Only

Production backend has a Docker health check that polls `/health` every 15 seconds (200 retries, 120s start period). The frontend container waits for `service_healthy` before starting.

In development, the health check is **deliberately omitted** because:
- The 120s start_period + 15s interval = up to 3000s (50 minutes) before frontend starts
- In dev, you want the frontend available immediately for rapid iteration
- The frontend uses `service_started` (not `service_healthy`) as the dependency

---

## 3. Quick Start

### Prerequisites

- **Podman** 5+ with `podman-compose` (recommended) **or** Docker 24+ with Docker Compose v2
- **Disk space**: ~8–10 GB (TTS model ~2GB + audio cache + container images ~5GB)
- **RAM**: 4–8 GB minimum (XTTS-v2 model loads into memory)
- **CPU**: Modern multi-core (CPU-only inference; no GPU support)

### Install podman-compose (Podman users)

```bash
# macOS (Homebrew)
brew install podman-compose

# Linux (pip)
pip install podman-compose

# Or via your package manager
```

### Start Both Environments

```bash
# From project root (auto-detects container runtime)
./dev.sh up
```

This starts:
- **Production**: Backend on `localhost:9000`, Frontend on `localhost:9001`
- **Development**: Backend on `localhost:9000`, Frontend on `localhost:3000`

### Access URLs

| Environment | Frontend | Backend API |
|-------------|----------|-------------|
| Development | http://localhost:3000 | http://localhost:9000 |
| Production  | http://localhost:9001 | http://localhost:9000 |

> **Note:** Both environments share the same backend port (9000). They use **separate networks** so there's no port conflict — production and development each have their own backend container.

### Stop All Services

```bash
./dev.sh down
```

### Restart All Services

```bash
./dev.sh restart
```

### View Logs

```bash
./dev.sh logs          # Production backend logs
./dev.sh logs backend-dev    # Development backend logs (via dev.sh wrapper)
podman-compose -f docker-compose.dev.yml logs -f backend-dev  # Direct (Podman)
# or
docker compose -f docker-compose.dev.yml logs -f backend-dev  # Direct (Docker)
```

---

## 4. Docker Compose Files

### Production: `docker-compose.yml`

```yaml
services:
  backend:
    build: ./backend/Dockerfile
    container_name: lughat-backend
    ports: ["9000:8000"]
    volumes:
      - tts-model-cache:/app/.cache/tts
      - tts-audio-cache:/app/downloads
      - ./backend/speaker_wavs:/app/speaker_wavs
    environment:
      - TZ=UTC
      - TTS_MODEL_CACHE=/app/.cache/tts
      - COQUI_TOS_AGREED=1
      - LD_LIBRARY_PATH=/usr/local/lib:/usr/lib/x86_64-linux-gnu
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 15s
      timeout: 5s
      retries: 200
      start_period: 120s

  frontend:
    build: ./frontend/Dockerfile
    container_name: lughat-frontend
    ports: ["9001:80"]
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

networks:
  lughat-network:
    driver: bridge

volumes:
  tts-model-cache:
  tts-audio-cache:
```

**Key production behaviors:**
- Backend health check prevents frontend from starting until the server is running (model may still be loading)
- Frontend waits for `service_healthy` — the health check passes once `/health` returns HTTP 200 (model may still be loading)
- Speaker WAVs mounted from host for dynamic voice discovery
- Named volumes persist TTS model and generated audio

### Development: `docker-compose.dev.yml`

```yaml
services:
  backend-dev:
    build: ./backend/Dockerfile
    container_name: lughat-backend-dev
    ports: ["9000:8000"]
    volumes:
      - ./backend:/app              # Full source mount — hot reload
      - tts-model-cache-dev:/app/.cache/tts
      - tts-audio-cache-dev:/app/downloads
      - ./backend/speaker_wavs:/app/speaker_wavs
    environment:
      - TZ=UTC
      - TTS_MODEL_CACHE=/app/.cache/tts
      - COQUI_TOS_AGREED=1
      - LD_LIBRARY_PATH=/usr/local/lib:/usr/lib/x86_64-linux-gnu
      - MAX_AUDIO_FILES=100         # Dev-only: limit audio files
    command: ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    restart: unless-stopped

  frontend-dev:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: lughat-frontend-dev
    ports: ["3000:3000"]
    volumes:
      - ./frontend:/app            # Full source mount — hot reload
    environment:
      - NODE_ENV=development
      - HOST=0.0.0.0
    depends_on:
      backend-dev:
        condition: service_started  # Don't wait for health
    restart: unless-stopped

networks:
  lughat-dev-network:
    driver: bridge

volumes:
  tts-model-cache-dev:
  tts-audio-cache-dev:
```

**Key development behaviors:**
- Source code mounted from host → code changes reflected without rebuild
- `--reload` flag on uvicorn → Python changes hot-reloaded
- No health check → frontend starts immediately
- Separate named volumes for dev (don't pollute prod data)

---

## 5. Dockerfiles

### Backend: `backend/Dockerfile`

**Base image**: `python:3.12-slim`

**Build steps:**
1. Set `COQUI_TOS_AGREED=1` (bypasses Coqui license agreement)
2. Install system deps: `ffmpeg`, `libsndfile1`, `build-essential`, `cmake`, `git`, `pybind11-dev`
3. Install CPU-only PyTorch from `https://download.pytorch.org/whl/cpu`
4. Install Python deps from `requirements.txt` (fastapi, uvicorn, pydantic, coqui-tts, ffmpeg-python)
5. Install test deps from `requirements-test.txt` (pytest, fastapi, no coqui-tts)
6. **Rebuild torchcodec from source** (pre-built wheel requires CUDA/nvrtc — incompatible on CPU)
   - Clones torchcodec v0.13.0, removes `license-files` field from pyproject.toml
   - Installs with `--no-build-isolation`
7. Create `/app/downloads` and `/app/.cache/tts` directories
8. Copy application code (`COPY . .`)
9. Expose port 8000

**Runtime CMD**: `uvicorn app:app --host 0.0.0.0 --port 8000`

**Docker health check** (in Dockerfile):
```dockerfile
HEALTHCHECK --interval=15s --timeout=5s --retries=20 --start-period=60s \
    CMD python -c "import urllib.request; import sys; r = urllib.request.urlopen('http://localhost:8000/health'); d = eval(r.read().decode()); sys.exit(0 if d.get('model_loaded') else 1)"
```

This checks `model_loaded` field from `/health` endpoint — returns 1 (failure) while model is loading.

### Frontend Production: `frontend/Dockerfile`

**Stage 1 (builder)**: `node:20-alpine`
- Installs pnpm 10.33.4 via corepack
- Copies `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- Runs `pnpm install --frozen-lockfile`
- Copies source code
- Runs `pnpm build` → produces `.output/public/`

**Stage 2 (nginx)**: `nginx:alpine`
- Replaces default Nginx config with custom `nginx.conf`
- Copies built SPA from builder stage to `/usr/share/nginx/html`
- Exposes port 80
- Runs `nginx -g 'daemon off;'`

### Frontend Development: `frontend/Dockerfile.dev`

**Single stage**: `node:20-alpine`
- Installs pnpm 10.33.4 via corepack
- Copies package files, runs `pnpm install --frozen-lockfile`
- Copies source code
- Exposes port 3000
- Runs `pnpm dev` (Nuxt dev server with hot reload)

**Environment**: `NODE_ENV=docker`, `HOST=0.0.0.0`

---

## 6. Nginx Configuration

**File**: `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    client_max_body_size 50m;

    # API proxy (largest timeout for TTS synthesis)
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_read_timeout 1800s;
        proxy_send_timeout 1800s;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Downloads proxy
    location /downloads/ {
        proxy_pass http://backend:8000;
        proxy_read_timeout 1800s;
        proxy_send_timeout 1800s;
        proxy_buffering off;
    }

    # Health proxy
    location /health {
        proxy_pass http://backend:8000;
        proxy_read_timeout 30s;
    }

    # Local health check (for Docker Compose)
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
    }

    # SPA fallback
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Static asset caching (30 days)
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Route Summary

| Route | Behavior | Proxy Target | Timeout |
|-------|----------|-------------|---------|
| `/` | Serves SPA static files | Local (Nginx) | — |
| `/api/*` | Proxies to backend | `http://backend:8000` | 1800s (30 min) |
| `/downloads/*` | Proxies to backend | `http://backend:8000` | 1800s (30 min) |
| `/health` | Proxies to backend | `http://backend:8000` | 30s |
| `/nginx-health` | Returns 200 OK | Local (Nginx) | — |
| `/*.{js,css,etc}` | Cached static assets | Local (Nginx) | 30d cache |

### Important Nginx Settings

- **`proxy_buffering off`**: Required for large audio responses (MP3 files). Without this, Nginx buffers the entire response before sending, which can cause memory issues with large files.
- **`proxy_request_buffering off`**: Allows streaming large POST requests (text payloads up to 3000 chars).
- **`proxy_read_timeout 1800s`**: 30-minute timeout for TTS synthesis. Long texts on CPU can take several minutes.
- **`client_max_body_size 50m`**: Allows large text payloads to be sent to the backend.

---

## 7. Network & Port Mapping

### Production

| Service | Host Port | Container Port | Container Name | Network |
|---------|-----------|---------------|----------------|---------|
| Backend | 9000 | 8000 | `lughat-backend` | `lughat-network` |
| Frontend | 9001 | 80 | `lughat-frontend` | `lughat-network` |

### Development

| Service | Host Port | Container Port | Container Name | Network |
|---------|-----------|---------------|----------------|---------|
| Backend | 9000 | 8000 | `lughat-backend-dev` | `lughat-dev-network` |
| Frontend | 3000 | 3000 | `lughat-frontend-dev` | `lughat-dev-network` |

### Cross-Container Communication

- **Production**: Frontend Nginx proxies to `http://backend:8000` (Docker DNS resolves `backend` to the backend container on `lughat-network`)
- **Development (frontend)**: Nuxt devProxy proxies to `http://backend-dev:8000` (Docker DNS resolves `backend-dev`)
- **Development (backend)**: `--reload` flag enables hot-reload of Python source changes

### Network Isolation

Production and development environments use **separate bridge networks** (`lughat-network` vs `lughat-dev-network`). This allows both environments to run simultaneously on the same host port (9000) without conflict, because each container has its own network namespace.

---

## 8. Volumes & Persistence

### Production Volumes

| Volume Name | Mount Point | Size | Purpose | Persistent? |
|-------------|-------------|------|---------|-------------|
| `tts-model-cache` | `/app/.cache/tts` | ~2 GB | TTS model files (XTTS-v2) | ⚠️ **Not used** (see note below) |
| `tts-audio-cache` | `/app/downloads` | Unbounded | Generated MP3 files | ✅ Yes |

### Development Volumes

| Volume Name | Mount Point | Size | Purpose | Persistent? |
|-------------|-------------|------|---------|-------------|
| `tts-model-cache-dev` | `/app/.cache/tts` | ~2 GB | TTS model files (XTTS-v2) | ⚠️ **Not used** (see note below) |
| `tts-audio-cache-dev` | `/app/downloads` | Unbounded | Generated MP3 files | ✅ Yes |

### ⚠️ Model Cache Behavior

The `tts-model-cache` volume is mounted at `/app/.cache/tts` and the `TTS_MODEL_CACHE` env var also points to `/app/.cache/tts`. These match, so the model **should** persist across restarts.

If the model is being re-downloaded on restart, verify:
1. The volume is named `tts-model-cache` (not `tts-model-cache-dev`)
2. The `TTS_MODEL_CACHE` env var matches the volume mount point
3. Docker is not recreating the volume (check `docker volume ls`)

### Speaker WAVs (Host Mount)

```
Host: ./backend/speaker_wavs/
Container: /app/speaker_wavs/
```

This is a **bind mount**, not a volume. Changes on the host are immediately visible in the container without restart.

**Current voices:**
- `KSA Hamed - Male.wav` — Male voice reference (KSA dialect)
- `KSA Zariyah - Female.wav` — Female voice reference (KSA dialect)

Add custom voices by placing `.wav` files (≥ 0.33 seconds) in this directory.

---

## 9. Environment Variables

### Shared (Production & Development)

| Variable | Value | Purpose |
|----------|-------|---------|
| `TZ` | `UTC` | Timezone for log timestamps |
| `TTS_MODEL_CACHE` | `/app/.cache/tts` | Path where TTS model files are stored (must match volume mount) |
| `COQUI_TOS_AGREED` | `1` | Required by Coqui TTS to bypass interactive license agreement |
| `LD_LIBRARY_PATH` | `/usr/local/lib:/usr/lib/x86_64-linux-gnu` | Required by torchcodec to find FFmpeg shared libraries |

### Production-Only

| Variable | Value | Purpose |
|----------|-------|---------|
| (none) | — | Production inherits from backend Dockerfile defaults |

### Development-Only

| Variable | Value | Purpose |
|----------|-------|---------|
| `MAX_AUDIO_FILES` | `100` | Limits the number of stored audio files (prevents unbounded disk growth during dev) |
| `NODE_ENV` | `development` | Enables Nuxt dev features (devtools, hot reload) |
| `HOST` | `0.0.0.0` | Binds Nuxt dev server to all interfaces (required for Docker) |

### `.env` File (Project Root)

The `.env` file at the project root defines configuration values used by documentation and CI/CD, but **is NOT consumed by Docker Compose** (values are hardcoded in the compose files):

| Variable | Current Value | Notes |
|----------|--------------|-------|
| `BACKEND_PORT` | `9000` | Host port for backend |
| `BACKEND_HOST` | `backend` | Docker service name for backend |
| `FRONTEND_PORT` | `9001` | Host port for frontend (prod) |
| `FRONTEND_HOST` | `localhost` | Host for frontend access |
| `NGINX_PORT` | `80` | Container port for Nginx |
| `NGINX_HOST` | `localhost` | Nginx server name |
| `API_BASE_URL` | `http://backend:9000` | Internal API base URL (not used by Docker) |
| `MODEL_PATH` | `/data/models` | Not used (model path controlled by `TTS_MODEL_CACHE`) |
| `MODEL_NAME` | `default-arabic-tts` | Not used (model name is XTTS-v2) |
| `LOG_LEVEL` | `INFO` | Backend log level |
| `LOG_FORMAT` | `json` | Backend log format |

> **Note:** The `.env` file is largely **documentation** at this point. The actual values are hardcoded in `docker-compose.yml` and `docker-compose.dev.yml`. Consider migrating to use `env_file` directives for consistency.

---

## 10. Scripts & Tooling

### `./dev.sh` — Development Environment Manager

```bash
./dev.sh [up|down|restart|logs]
```

| Command | Action |
|---------|--------|
| `up` | Builds backend + frontend-dev images, starts both production and development environments |
| `down` | Stops all services (production + development) |
| `restart` | Stops all, then runs `up` |
| `logs` | Shows production backend logs (`docker compose logs -f backend`) |

### `./run-tests.sh` — Quality Gate

```bash
./run-tests.sh
```

Runs 4 checks in order (stops at first failure):
1. **Backend tests** — `./scripts/run-backend-tests.sh` (pytest inside container)
2. **Frontend lint** — `pnpm lint` (inside container dev environment)
3. **Frontend typecheck** — `pnpm typecheck` (inside container dev environment)
4. **Frontend tests** — `pnpm test` (Vitest inside container dev environment)

All frontend checks run **inside the container dev environment** (auto-detects podman-compose or docker compose), ensuring test environments match production behavior.

### `./scripts/run-backend-tests.sh` — Backend Test Runner

```bash
./scripts/run-backend-tests.sh
```

Runs pytest inside the backend Docker container:
- Mounts `tts-model-cache` and `tts-audio-cache` for test fixtures
- Mounts `./backend/speaker_wavs/` for voice discovery tests
- Mounts `./backend/tests/` so test changes are picked up without rebuild
- `app.py` comes from the Docker image (not host-mounted)

### `./scripts/optimize-docker.sh` — Image Optimizer

```bash
./scripts/optimize-docker.sh
```

Generates optimized Dockerfiles with:
- Multi-stage builds (builder + production stages)
- Non-root user for security
- Reduced image sizes
- ⚠️ **Note:** This script generates temp files in `/tmp/` and is primarily for reference/evaluation.

---

## 11. Troubleshooting

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Model re-downloads on every restart | Volume mount path mismatch | Verify `docker volume inspect tts-model-cache` shows correct path |
| Frontend starts before backend is ready | Health check not passing | Check `docker compose logs backend` for model loading progress |
| TTS synthesis returns 503 | Model still loading (~120s) | Wait for model to load; check `/health` endpoint |
| Audio playback fails | Nginx buffering large responses | Ensure `proxy_buffering off` is set in nginx.conf |
| Frontend can't reach backend | Network misconfiguration | Verify both containers are on the same network |
| `pnpm dev` inside Docker can't reach backend | Wrong proxy target | In dev mode, Nuxt proxies to `backend-dev:8000` (not `backend:8000`) |
| Speaker WAV files not visible | Bind mount not refreshed | Restart backend container after adding WAV files |
| Container won't start | Port conflict | Check if port 9000/9001/3000 is already in use |

### Debug Commands

> **Note:** Replace `docker compose` with `podman-compose` for Podman users. The `./dev.sh` wrapper auto-detects the runtime.

```bash
# List all containers (production + development)
podman-compose ps
podman-compose -f docker-compose.dev.yml ps
# or
docker compose ps
docker compose -f docker-compose.dev.yml ps

# View production backend logs (model loading progress)
podman-compose logs -f backend
# or
docker compose logs -f backend

# View development backend logs
podman-compose -f docker-compose.dev.yml logs -f backend-dev
docker compose -f docker-compose.dev.yml logs -f backend-dev

# View development frontend logs
podman-compose -f docker-compose.dev.yml logs -f frontend-dev
docker compose -f docker-compose.dev.yml logs -f frontend-dev

# Check volume status (Podman uses "storage" instead of "volumes")
podman volume ls | grep lughat
podman volume inspect tts-model-cache
# or (Docker)
docker volume ls | grep lughat
docker volume inspect tts-model-cache

# Check network status (Podman uses "network" instead of "networks")
podman network ls | grep lughat
podman network inspect lughat-network
# or (Docker)
docker network ls | grep lughat
docker network inspect lughat-network

# Execute shell inside container
podman exec -it lughat-backend /bin/bash
podman exec -it lughat-backend-dev /bin/bash
# or (Docker)
docker exec -it lughat-backend /bin/bash
docker exec -it lughat-backend-dev /bin/bash

# Clean up all container resources (DANGEROUS — removes volumes!)
podman-compose down -v
podman-compose -f docker-compose.dev.yml down -v
# or (Docker)
docker compose down -v
docker compose -f docker-compose.dev.yml down -v
```

### Verifying Model Cache Persistence

```bash
# Check if model cache volume exists and has content
docker volume inspect tts-model-cache

# Check the actual path inside the volume
docker run --rm -v tts-model-cache:/data alpine ls -la /data/.cache/tts/

# If the model is NOT persisting:
# 1. Verify the volume mount point matches TTS_MODEL_CACHE env var
# 2. Check that the volume name is exactly "tts-model-cache" (not "tts-model-cache-dev")
# 3. Ensure the backend container is using the correct Dockerfile (not Dockerfile.dev)
```

---

## 11.5. Podman Migration Guide

### What changes when switching from Docker to Podman?

Podman is **API-compatible** with Docker — the main difference is that Podman is rootless by default and doesn't run a daemon. The project's scripts now auto-detect the container runtime.

### Installation

**macOS (Homebrew):**
```bash
brew install podman podman-compose
podman machine init    # Create the Linux VM
podman machine start   # Start the VM
```

**Linux:**
```bash
# Fedora/RHEL
sudo dnf install podman podman-compose

# Debian/Ubuntu
sudo apt install podman podman-compose

# Arch
sudo pacman -S podman podman-compose
```

### What stays the same
- `docker-compose.yml` and `docker-compose.dev.yml` — no changes needed
- `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/Dockerfile.dev` — no changes needed
- `frontend/nginx.conf` — no changes needed
- All volume names, network names, port mappings — identical
- All environment variables — identical

### What changes
- `docker compose` → `podman-compose` (or `podman compose` via podman-docker compat)
- `docker build` → `podman build`
- `docker run` → `podman run`
- `docker exec` → `podman exec`
- `docker volume` → `podman volume`
- `docker network` → `podman network`
- `docker ps` → `podman ps`
- `docker logs` → `podman logs`

### Key differences to be aware of

1. **Rootless operation**: Podman runs as your user, not root. Volume mounts may have different permissions. Use `--privileged` flag if needed for specific mounts.

2. **macOS**: Podman runs in a Linux VM (podman machine). Network bindings to `localhost` work via the VM's networking.

3. **Named volumes**: Podman uses `podman volume ls` instead of `docker volume ls`. Volume data is stored under `~/.local/share/containers/storage/volumes/`.

4. **Network isolation**: Bridge networks work the same way. Podman uses `slirp4netns` for user-space networking on macOS.

5. **Health checks**: Podman supports the same `HEALTHCHECK` directive. The `--health-*` flags work identically.

### Scripts that auto-detect the runtime

All project scripts now auto-detect the container runtime in this priority order:
1. `podman-compose` (if installed)
2. `docker-compose` (if installed)
3. `docker compose` (if Docker is installed with Compose plugin)

Scripts updated:
- `dev.sh` — environment manager
- `run-tests.sh` — quality gate
- `scripts/run-backend-tests.sh` — backend test runner
- `scripts/optimize-docker.sh` — image optimizer
- `scripts/test-e2e.sh` — end-to-end tests
- `scripts/test-volume-persistence.sh` — volume persistence tests
- `scripts/test-phase5.sh` — phase 5 validation

### Quick comparison: Docker vs Podman commands

| Action | Docker | Podman |
|--------|--------|--------|
| List containers | `docker ps` | `podman ps` |
| Start services | `docker compose up -d` | `podman-compose up -d` |
| Stop services | `docker compose down` | `podman-compose down` |
| View logs | `docker compose logs -f` | `podman-compose logs -f` |
| Shell into container | `docker exec -it <name> /bin/bash` | `podman exec -it <name> /bin/bash` |
| List volumes | `docker volume ls` | `podman volume ls` |
| List networks | `docker network ls` | `podman network ls` |
| Build image | `docker build -t <name> .` | `podman build -t <name> .` |
| Clean up | `docker compose down -v` | `podman-compose down -v` |

> **Bottom line**: The `docker-compose.yml` files need **zero changes**. The only change is installing `podman-compose` and running `./dev.sh up` instead of `docker compose up --build`.

---

## 12. Security Considerations

### Current State (Development / Evaluation)

| Concern | Status | Recommendation |
|---------|--------|---------------|
| **CORS** | All origins allowed (`*`) | Restrict to frontend container IP in production |
| **Authentication** | None | Add API key or JWT authentication for `/api/generate` |
| **Rate limiting** | None | Add rate limiting to prevent abuse |
| **Input validation** | Text length limit (3000 chars) | Add sanitization for malicious payloads |
| **Container security** | Running as root | Add non-root user to Dockerfiles |
| **Network isolation** | Separate networks for prod/dev | ✅ Good |
| **TLS/HTTPS** | None (HTTP only) | Add reverse proxy with TLS for production |

### Production Hardening Checklist

- [ ] Restrict CORS to known frontend origins
- [ ] Add authentication middleware to API endpoints
- [ ] Implement rate limiting (e.g., 10 requests/minute per IP)
- [ ] Add TLS termination (reverse proxy with Let's Encrypt)
- [ ] Run containers as non-root user
- [ ] Set resource limits (`deploy.resources.limits` in Docker Compose)
- [ ] Add log rotation for audio cache (prevent unbounded disk growth)
- [ ] Use `.env` files with `env_file` directive instead of hardcoded values
- [ ] Add `security_opt: [no-new-privileges:true]` to Docker Compose

---

## Appendix A: File Reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Production container compose (2 services, bridge network, named volumes) |
| `docker-compose.dev.yml` | Development container compose (hot reload, separate network) |
| `backend/Dockerfile` | Backend image: Python 3.12, PyTorch CPU, Coqui TTS, torchcodec |
| `frontend/Dockerfile` | Frontend production: multi-stage (builder + Nginx) |
| `frontend/Dockerfile.dev` | Frontend development: Node 20, pnpm dev server |
| `frontend/nginx.conf` | Nginx reverse proxy configuration (SPA serving, API proxy) |
| `frontend/.dockerignore` | Files excluded from frontend container build context |
| `backend/.dockerignore` | Files excluded from backend container build context |
| `.env` | Project configuration (documentation, not consumed by containers) |
| `dev.sh` | Development environment manager (up/down/restart/logs, auto-detects runtime) |
| `run-tests.sh` | Quality gate (backend tests → lint → typecheck → frontend tests, auto-detects runtime) |
| `scripts/run-backend-tests.sh` | Backend test runner (pytest inside container, auto-detects runtime) |
| `scripts/optimize-docker.sh` | Container image optimizer (reference/evaluation, supports Docker/Podman) |

## Appendix B: Container Inventory

| Container | Image | Ports | Name | Purpose |
|-----------|-------|-------|------|---------|
| Backend (prod) | `python:3.12-slim` | 9000:8000 | `lughat-backend` | FastAPI + XTTS-v2 |
| Frontend (prod) | `nginx:alpine` | 9001:80 | `lughat-frontend` | Nginx reverse proxy + SPA |
| Backend (dev) | `python:3.12-slim` | 9000:8000 | `lughat-backend-dev` | FastAPI + XTTS-v2 (hot reload) |
| Frontend (dev) | `node:20-alpine` | 3000:3000 | `lughat-frontend-dev` | Nuxt dev server (hot reload) |

> **Note:** Container names are set via `container_name` in compose files. Podman uses the same names. On macOS with Podman, containers run in a Linux VM (podman machine) rather than natively.

## Appendix C: Volume Inventory

| Volume | Type | Mount Point | Size | Used By |
|--------|------|-------------|------|---------|
| `tts-model-cache` | Named | `/app/.cache/tts` | ~2 GB | Production backend |
| `tts-audio-cache` | Named | `/app/downloads` | Unbounded | Production backend |
| `tts-model-cache-dev` | Named | `/app/.cache/tts` | ~2 GB | Development backend |
| `tts-audio-cache-dev` | Named | `/app/downloads` | Unbounded | Development backend |

## Appendix D: Network Inventory

| Network | Driver | Scope | Containers |
|---------|--------|-------|------------|
| `lughat-network` | bridge | Production | `lughat-backend`, `lughat-frontend` |
| `lughat-dev-network` | bridge | Development | `lughat-backend-dev`, `lughat-frontend-dev` |
