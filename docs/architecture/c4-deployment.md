# C4 Deployment Diagram — Lughat Chat

> **System:** Lughat Chat — Arabic Text-to-Speech Studio
> **Generated:** 2026-07-05
> **Updated:** 2025-07-15 (Docker dev vs prod documentation)
> **Level:** 4 — Deployment (Infrastructure nodes, containers, volumes, and network topology)

---

## Diagram

```mermaid
C4Deployment
  title Deployment Diagram - Lughat Chat (Docker Compose)

  Deployment_Node(browser, "User's Browser", "Modern browser (Chrome/Firefox/Safari)", "Loads SPA, enters text, listens to synthesized speech")

  Deployment_Node(docker, "Docker Host", "Linux server with Docker Compose", "Runs both services on a shared bridge network")

  Deployment_Node(nginx_container, "Frontend Container", "nginx:alpine", "Serves SPA static files, proxies API/health to backend", "Host port 9001 → Container port 80") {

    Container(nginx_serve, "Nginx Server", "nginx:alpine", "Serves / (SPA static files), proxies /api/* and /health to backend, adds CORS headers, disables buffering for large audio")
    Container(nginx_proxy, "Reverse Proxy", "Nginx config", "Routes: / → SPA files, /api/* → backend:8000, /health → backend:8000, /downloads/* → backend:8000, /nginx-health → local 200 OK")
  }

  Deployment_Node(backend_container, "Backend Container", "Python 3.12-slim", "FastAPI + Coqui XTTS-v2 (CPU-only)", "Host port 9000 → Container port 8000") {

    Container(fastapi_app, "FastAPI Server", "uvicorn (standard)", "REST API: /health, /api/voices, /api/generate, /api/history. Static file serving for /downloads and /speaker_wavs.")
    Container(tts_engine, "XTTS-v2 Model", "Coqui TTS 0.27.5 + PyTorch (CPU)", "Multilingual TTS engine. Loaded in background thread (~120s). Voice cloning from speaker reference WAV files.")
  }

  Deployment_Node(model_vol, "TTS Model Cache Volume", "Docker named volume (~2 GB)", "Persists TTS model files. Mounted at /app/.cache/tts matching TTS_MODEL_CACHE env var.")
  Deployment_Node(audio_vol, "Audio Cache Volume", "Docker named volume (unbounded)", "Persists generated MP3 files. Cleanup enforced via MAX_AUDIO_FILES env var (default: 100).")

  Rel(browser, nginx_serve, "Loads SPA; sends synthesis requests", "HTTP/HTTPS / Port 9001")
  Rel(nginx_proxy, fastapi_app, "Proxies API/health requests", "HTTP / Internal network")

  Rel(fastapi_app, tts_engine, "Invokes TTS inference", "Python API / In-process")
  Rel(fastapi_app, model_vol, "Stores model files", "File system (volume mounted at /app/.cache/tts)")
  Rel(fastapi_app, audio_vol, "Writes generated MP3s", "File system (mounted)")

  Rel(backend_container, speaker_wavs_mount, "Reads reference WAV files", "Host mount: ./backend/speaker_wavs → /app/speaker_wavs/")

  Element(speaker_wavs_mount, "Host Directory", "Speaker WAV library", "KSA Hamed - Male.wav, KSA Zariyah - Female.wav")

  Rel(speaker_wavs_mount, fastapi_app, "Mounted into container", "Host → /app/speaker_wavs/")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")
```

## Deployment Inventory

| Node | Technology | Purpose | Port Mapping |
|------|-----------|---------|-------------|
| **User's Browser** | Chrome/Firefox/Safari | Loads the SPA, enters text, listens to synthesized speech | — |
| **Docker Host** | Linux + Docker Compose | Runs both services on a shared bridge network (`lughat-network`) | — |
| **Frontend Container** | `nginx:alpine` | Serves SPA static files, reverse-proxies API/health to backend | `9001:80` (host:container) |
| **Backend Container** | `python:3.12-slim` | FastAPI server + Coqui XTTS-v2 (CPU-only inference) | `9000:8000` (host:container) |

### Frontend Container Details

| Component | Technology | Configuration |
|-----------|-----------|---------------|
| Nginx Server | `nginx:alpine` | Custom config: SPA serving, API proxy, CORS headers, large-file support |
| Reverse Proxy | Nginx config | Routes: `/` → SPA files, `/api/*` → backend:8000, `/health` → backend:8000, `/downloads/*` → backend:8000, `/nginx-health` → local `200 OK` |

### Backend Container Details

| Component | Technology | Configuration |
|-----------|-----------|---------------|
| FastAPI Server | `uvicorn (standard)` | `--host 0.0.0.0 --port 8000` |
| XTTS-v2 Model | Coqui TTS 0.27.5 + PyTorch (CPU) | Loaded in background thread. Model path: `/app/.cache/tts` (env `TTS_MODEL_CACHE`) |

## Volume Inventory

| Volume | Mount Point | Size | Persistence |
|--------|-------------|------|-------------|
| `tts-model-cache` | `/app/.cache/tts` (in container) | ~2 GB | **Used** — persists TTS model across restarts (RC-004 fixed) |
| `tts-audio-cache` | `/app/downloads` (in container) | ~2 GB (capped) | **Used** — persists generated MP3 files (cleanup via MAX_AUDIO_FILES) |

## Network Topology

```
Browser (Port 9001)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Docker Host (Bridge Network: lughat-network)               │
│                                                               │
│  ┌─────────────────────┐         ┌────────────────────────┐ │
│  │  Frontend Container  │         │  Backend Container     │ │
│  │  (port 80)          │◄────────│  (port 8000)           │ │
│  │                     │ HTTP  │                         │ │
│  │  Nginx:             │ Proxy │  FastAPI:               │ │
│  │  • SPA serve (/)    │──────►│  • /health              │ │
│  │  • API proxy (/api) │       │  • /api/voices          │ │
│  │  • Health proxy     │       │  • /api/generate        │ │
│  │  • CORS headers     │       │  • /api/history         │ │
│  └─────────────────────┘       │  • Static files         │ │
│                                 │    /downloads           │ │
│                                 │    /speaker_wavs        │ │
│                                 └────────────────────────┘ │
│                                                               │
│  Volumes:                                                   │
│  • tts-model-cache → /app/.cache/tts (used, RC-004 fixed)  │
│  • tts-audio-cache → /app/downloads (used, cleanup enabled) │
└─────────────────────────────────────────────────────────────┘
```

## Container Dependencies

| Dependency | Condition | Description |
|------------|-----------|-------------|
| Frontend → Backend | `service_healthy` | Frontend container waits until backend's Docker health check passes before starting. Health check runs `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"` every 15s with 200 retries and 120s start period. |

## Docker Compose Configuration

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
```

## Key Deployment Notes

1. **No GPU support** — CPU-only inference; generation takes several seconds per request.
2. **Model cache persists** — The `tts-model-cache` volume is mounted at `/app/.cache/tts`, matching the `TTS_MODEL_CACHE` env var. The ~2GB model is downloaded once and persisted across restarts (RC-004 fixed).
3. **1800s timeouts** — Nginx allows up to 30 minutes for TTS synthesis (long texts on CPU can take minutes).
4. **Speaker WAV persistence** — `./backend/speaker_wavs/` is mounted from the host, so new `.wav` files are visible without rebuilding.
5. **Audio cleanup** — Generated MP3s are capped at `MAX_AUDIO_FILES` (default: 100). Oldest files are deleted when the limit is exceeded (RC-007 fixed).
6. **CORS** — Both Nginx and FastAPI allow all origins (`*`). Should be restricted to the frontend container IP in production.
7. **History stores text** — `/api/history` now returns the original synthesized text via sidecar JSON files (RC-005 fixed).
