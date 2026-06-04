# Contributing to Lughat Chat

Thank you for your interest in contributing! This document covers how to get started and the conventions we follow.

## Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- Node.js 20+ (for frontend development)
- Python 3.11+ (for backend development)

### Local Development

#### Full Stack (Docker)
```bash
docker compose up --build
```

#### Frontend Only
```bash
cd frontend
pnpm install
pnpm dev
```

#### Backend Only
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

## Development Workflow

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit with a clear message:
   - `feat:` — new feature
   - `fix:` — bug fix
   - `chore:` — maintenance, config changes
   - `docs:` — documentation updates

3. Run tests before committing:
   ```bash
   # Frontend
   cd frontend && pnpm test

   # Backend
   cd backend && pytest
   ```

4. Push and open a Pull Request against `develop`.

## Project Conventions

### Frontend (Nuxt 4 + Vue 3)
- Use `<script setup lang="ts">` for all components
- Composables live in `app/composables/` (auto-imported)
- Components live in `app/components/` (auto-imported by PascalCase)
- Tests mirror source: `.test.ts` files alongside composables

### Backend (FastAPI + Python)
- Use `pytest` for tests, located in `backend/tests/`
- Follow the existing structure: model loading via lifespan, endpoints in `app.py`

### Docker
- Services defined in `docker-compose.yml`: `backend`, `frontend` (with Nginx)
- Model and audio caches use named volumes (`tts-model-cache`, `tts-audio-cache`)

## Need Help?
Open an issue or reach out to the maintainers.
