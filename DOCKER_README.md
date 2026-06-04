# 🚀 Running Lughat Chat with Docker

Complete guide for deploying and running the Arabic Text-to-Speech (TTS) application using Docker Compose.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Architecture](#project-architecture)
- [Service Configuration](#service-configuration)
- [Volume Management](#volume-management)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Usage](#api-usage)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## Prerequisites

Before you begin, ensure your system meets these requirements:

| Requirement | Minimum Version | Notes |
|-------------|-----------------|-------|
| **Docker Engine** | v20.10+ | Required for multi-stage builds |
| **Docker Compose** | v2.20+ | Use `docker compose` (v2 syntax) |
| **RAM** | 4GB+ | For model loading and synthesis |
| **CPU** | 2 cores | Recommended for TTS processing |
| **Disk Space** | 5GB+ | For models, images, and volumes |

### Verify Installation

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker compose version

# Verify Docker is running
docker info
```

---

## Quick Start

Get the application up and running in 3 commands:

```bash
# 1. Clone the repository (if you haven't already)
git clone <repository-url>
cd lughat-chat

# 2. Build and start all services in detached mode
docker compose up --build -d

# 3. Verify everything is running
docker compose ps
```

**Access the application:**
- 🌐 **Frontend UI**: http://localhost
- 🔌 **Backend API**: http://localhost/api/generate

**Stop the application:**
```bash
docker compose down
```

---

## Project Architecture

The application uses a **two-service architecture** orchestrated by Docker Compose:

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Browser                         │
│                    http://localhost                         │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
                ▼                               │
        ┌───────────────┐                       │
        │   Nginx       │ ◄──── Port 80         │
        │  (Embedded in │                       │
        │  Frontend)    │                       │
        └───────┬───────┘                       │
                │                               │
    ┌───────────┴───────────┐                   │
    │                       │                   │
    ▼                       ▼                   │
┌─────────┐           ┌──────────┐             │
│ Frontend │           │ Backend  │ ◄──── Port  │
│ (Nuxt.js)│           │(FastAPI) │     8000    │
└─────────┘           └──────────┘             │
    │                       │                   │
    └───────────┬───────────┘                   │
                │                               │
                ▼                               │
        ┌───────────────┐                       │
        │  Docker Network│                      │
        │ (lughat-network)│                      │
        └───────────────┘                       │
                │                               │
                ▼                               │
        ┌───────────────┐                       │
        │  Named Volumes │                      │
        │ (persistent)   │                      │
        └───────────────┘                       │
┌─────────────────────────────────────────────────┐
│              Docker Host (Your Machine)         │
└─────────────────────────────────────────────────┘
```

### Service Breakdown

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **backend** | FastAPI (Python) + CPU PyTorch | 8000 (internal, exposed for debugging) | Arabic TTS synthesis engine |
| **frontend** | Nuxt.js (Vue 3) + embedded Nginx | 80 (external) | Arabic UI, reverse proxy to backend |

### How It Works

1. **Frontend** builds the Nuxt.js app in a Node 20 container, then serves it with embedded Nginx
2. **Nginx** (inside the frontend container) proxies `/api/*` and `/downloads/*` requests to the backend
3. **Backend** loads the TTS model on startup and serves synthesis endpoints

---

## Service Configuration

### 1. Backend (`backend`)

The core service that handles Arabic text-to-speech synthesis.

**Key Features:**
- Loads XTTS-v2 model on startup (first start takes time)
- Provides REST API for voice listing, generation, and history
- Health check endpoint that reports model loading status
- CPU-only PyTorch (lighter than CUDA version)

**Configuration:**
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: lughat-backend
  ports:
    - "8000:8000"  # For debugging only; frontend proxies through Nginx
  volumes:
    - tts-model-cache:/app/.cache/tts      # Persistent model cache (2GB, avoids re-downloading)
    - tts-audio-cache:/app/downloads       # Persistent generated audio files
  environment:
    - TZ=UTC
    - TTS_MODEL_CACHE=/app/.cache/tts
  restart: unless-stopped
  networks:
    - lughat-network
  healthcheck:
    test: ["CMD", "python", "-c", "import urllib.request; import sys; r = urllib.request.urlopen('http://localhost:8000/health'); d = eval(r.read().decode()); sys.exit(0 if d.get('model_loaded') else 1)"]
    interval: 15s
    timeout: 5s
    retries: 20
    start_period: 60s
```

**Dockerfile Details:**
- Base image: `python:3.12-slim`
- Installs `ffmpeg` and `libsndfile1` for audio processing
- Uses CPU-only PyTorch from official index URL
- Starts with `uvicorn` serving the FastAPI app

### 2. Frontend (`frontend`)

A Nuxt.js single-page application (SPA) served by embedded Nginx.

**Key Features:**
- Multi-stage build: Node 20 for building, Nginx Alpine for serving
- Embedded Nginx handles reverse proxy to backend
- SPA fallback for client-side routing
- CORS headers for cross-origin requests

**Configuration:**
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  container_name: lughat-frontend
  ports:
    - "80:80"  # Single port for everything!
  depends_on:
    backend:
      condition: service_healthy  # Wait until backend is ready
  restart: unless-stopped
  networks:
    - lughat-network
```

**Embedded Nginx Configuration:**
- `/api/*` → proxy to `backend:8000` (TTS API)
- `/downloads/*` → proxy to `backend:8000` (audio files)
- `/health` → proxy to backend health endpoint
- `/nginx-health` → returns 200 "healthy" (Docker health check)
- `/` → serves Nuxt SPA with fallback to `index.html`

---

## Volume Management

The application uses **named volumes** for persistent data storage. This ensures your models and generated audio survive container restarts.

### Available Volumes

| Volume Name | Purpose | Contents |
|-------------|---------|----------|
| `tts-model-cache` | TTS model cache | Model weights and config (2GB, downloaded once) |
| `tts-audio-cache` | Generated audio | WAV files from synthesis requests |

### Volume Operations

```bash
# List all Docker volumes
docker volume ls | grep lughat

# Inspect a specific volume
docker volume inspect lughat-chat_tts-model-cache

# Check volume usage
docker system df -v | grep lughat
```

### Backup Volumes

```bash
# Backup model cache
docker run --rm -v lughat-chat_tts-model-cache:/data \
  -v $(pwd):/backup alpine tar czf /backup/model-backup.tar.gz -C /data .

# Backup audio files
docker run --rm -v lughat-chat_tts-audio-cache:/data \
  -v $(pwd):/backup alpine tar czf /backup/audio-backup.tar.gz -C /data .
```

### Restore Volumes

```bash
# Restore model cache from backup
docker run --rm -v lughat-chat_tts-model-cache:/data \
  -v $(pwd):/backup alpine tar xzf /backup/model-backup.tar.gz -C /data .
```

---

## Environment Variables

### Project-Level (.env)

Create a `.env` file in the project root:

```bash
# Backend service configuration
BACKEND_PORT=8000
BACKEND_HOST=backend

# Frontend service configuration  
FRONTEND_PORT=3000
FRONTEND_HOST=localhost

# Nginx proxy configuration
NGINX_PORT=80
NGINX_HOST=localhost

# Model storage paths (named volumes)
MODEL_VOLUME_NAME=arabic-tts-models
AUDIO_CACHE_VOLUME_NAME=arabic-tts-audio

# Model configuration (for backend)
MODEL_PATH=/data/models
MODEL_NAME=default-arabic-tts

# API configuration
API_BASE_URL=http://backend:8000

# Logging configuration
LOG_LEVEL=INFO
LOG_FORMAT=json
```

### Service-Level Environment Variables

These are set directly in `docker-compose.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `TZ` | `UTC` | Timezone for logs and timestamps |
| `TTS_MODEL_CACHE` | `/app/.cache/tts` | Path to TTS model cache directory |

---

## Running the Application

### Standard Deployment

```bash
# 1. Navigate to project root
cd /Users/d504904/dev/tirjok/lughat-chat

# 2. Build and start all services
docker compose up --build -d

# 3. Check service status
docker compose ps

# Expected output:
# NAME                STATUS         PORTS
# lughat-backend      Up (healthy)   0.0.0.0:8000->8000/tcp
# lughat-frontend     Up             0.0.0.0:80->80/tcp
```

### View Logs

```bash
# View all service logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend

# View last 100 lines of logs
docker compose logs --tail=100 backend
```

### Stop and Clean Up

```bash
# Stop all services (keep volumes)
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v

# Remove all containers, networks, and images
docker compose down -v --rmi all
```

---

## API Usage

### Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check and model status (proxied through frontend) |
| `/api/voices` | GET | List available voices/speakers |
| `/api/generate` | POST | Main TTS endpoint (returns WAV file) |
| `/api/history` | GET | Get generation history |

### Testing the API

```bash
# Health check (via frontend proxy)
curl http://localhost/health

# Expected response:
{
  "status": "healthy",
  "model_loaded": true,
  "sample_rate": 16000
}

# Generate speech (returns WAV file)
curl -X POST http://localhost/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "مرحبا بكم في لوغات", "voice": "default"}' \
  -o output.wav

# Play the audio (macOS)
afplay output.wav

# List available voices
curl http://localhost/api/voices

# Get generation history
curl http://localhost/api/history
```

### Error Handling

```bash
# Invalid input (returns 400 Bad Request)
curl -X POST http://localhost/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text": ""}'

# Expected response:
{
  "detail": "Invalid input"
}
```

---

## Development Workflow

### Hot-Reload for Backend

The backend is configured with hot-reload during development:

```bash
# Start services in foreground (for debugging)
docker compose up

# In another terminal, modify backend code
# Changes will be reflected immediately (due to volume mount)

# Restart specific service after code changes
docker compose restart backend
```

### Frontend Development

For frontend development, you need to rebuild:

```bash
# Rebuild only the frontend service
docker compose build frontend

# Restart frontend with new build
docker compose up -d frontend
```

### Debugging Tips

```bash
# Access backend container shell
docker exec -it lughat-backend bash

# Check model files inside container
docker exec -it lughat-backend ls /app/.cache/tts

# Check Python packages installed
docker exec -it lughat-backend pip list

# View backend logs in real-time
docker compose logs -f backend

# Check container resource usage
docker stats
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Backend Not Becoming Healthy

The first startup takes time while the TTS model downloads and loads.

```bash
# Check backend logs (look for model loading progress)
docker compose logs -f backend

# Verify health check status
docker inspect lughat-backend | grep -A 10 Health

# The health check allows 60s start_period + 20 retries × 15s = up to 475s total
```

#### 2. Port Conflicts

```bash
# Check if port 80 is in use
sudo lsof -i :80

# Check if port 8000 is in use
sudo lsof -i :8000

# Change port mapping in docker-compose.yml if needed
# Example: change "80:80" to "8080:80"
```

#### 3. Model Loading Issues

```bash
# Verify model cache is present
docker exec -it lughat-backend ls /app/.cache/tts

# Check model config
docker exec -it lughat-backend cat /app/.cache/tts/config.json

# Restart backend to reload model
docker compose restart backend
```

#### 4. Frontend Not Loading

```bash
# Check frontend logs
docker compose logs frontend

# Rebuild frontend
docker compose build frontend
docker compose up -d frontend
```

#### 5. API Not Responding Through Frontend

The embedded Nginx in the frontend container proxies `/api/*` to `backend:8000`.

```bash
# Check nginx config inside frontend container
docker exec -it lughat-frontend cat /etc/nginx/conf.d/default.conf

# Test backend directly (bypassing Nginx)
curl http://localhost:8000/health

# Reload nginx config (after any changes)
docker exec -it lughat-frontend nginx -s reload
```

### Debug Commands

```bash
# View all logs with timestamps
docker compose logs --timestamps -f

# Check container resource usage
docker stats

# Inspect network configuration
docker network inspect lughat-chat_lughat-network

# Check volume status
docker volume ls | grep lughat

# View container environment variables
docker exec -it lughat-backend env | grep -E "TZ|TTS_"
```

---

## Maintenance

### Regular Updates

```bash
# Pull latest images
docker compose pull

# Rebuild and restart with new images
docker compose up --build -d

# Check for updates
docker compose ps
```

### Backup Strategy

```bash
# Create a full backup of all volumes
mkdir -p backups
docker run --rm \
  -v lughat-chat_tts-model-cache:/data/models \
  -v lughat-chat_tts-audio-cache:/data/audio \
  -v $(pwd)/backups:/backup alpine \
  tar czf /backup/full-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### Restore from Backup

```bash
# Stop services first
docker compose down

# Extract backup to volumes
docker run --rm \
  -v lughat-chat_tts-model-cache:/data/models \
  -v lughat-chat_tts-audio-cache:/data/audio \
  -v $(pwd)/backups:/backup alpine \
  tar xzf /backup/full-backup-YYYYMMDD.tar.gz -C /data

# Restart services
docker compose up -d
```

### Performance Monitoring

```bash
# Monitor resource usage in real-time
docker stats

# Check disk usage
docker system df

# Clean up unused images and containers
docker system prune -a
```

---

## Offline Distribution

For deploying the application in offline environments:

### Package for Offline Use

```bash
# Build all images
docker compose build

# Export images to tar file
docker save lughat-chat_backend lughat-chat_frontend > offline-images.tar

# Copy all necessary files
cp docker-compose.yml .
cp -r backend ./backend
cp -r frontend ./frontend

# Create distribution package
tar czf lughat-chat-offline.tar.gz \
  docker-compose.yml backend frontend offline-images.tar
```

### Install Offline

```bash
# Extract distribution package
tar xzf lughat-chat-offline.tar.gz

# Load Docker images
docker load < offline-images.tar

# Start services
docker compose up -d

# Verify installation
curl http://localhost/health
```

---

## Notes on Orphaned Files

The `nginx/nginx.conf` file in the project root is **not used** by the current deployment. Nginx configuration is embedded directly in `frontend/Dockerfile` via a multi-stage build. This file may be useful as a reference but should not be mounted or referenced in `docker-compose.yml`.

---

## Support

For issues with the Arabic TTS application:

1. **Check logs**: `docker compose logs -f`
2. **Verify Docker**: `docker info`
3. **Check resources**: `docker stats`
4. **Review documentation**: This README

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## Acknowledgments

- **XTTS-v2**: Cross-lingual TTS model by Coqui AI
- **FastAPI**: Modern Python web framework
- **Nuxt.js**: Vue.js framework for the frontend
- **Docker**: Containerization platform

---

*Last updated: May 2026*
