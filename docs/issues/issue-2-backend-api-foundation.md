# Issue 2: Backend API Foundation — FastAPI Endpoints & Health Check

## What to build

Implement the core backend API endpoints that the frontend will consume: health check endpoint returning model load status, voices listing endpoint, and CORS middleware for cross-container communication.

After this is complete, the API is callable from the frontend with structured JSON responses — even if TTS model isn't loaded yet.

## Acceptance criteria

- [ ] `/health` endpoint returns JSON with `status` field (`loading` | `ready` | `error`) and `model_loaded` boolean
- [ ] `/api/voices` endpoint returns list of available voice presets (male/female)
- [ ] CORS middleware configured to allow frontend container to call backend API
- [ ] `/api/generate` endpoint skeleton exists (returns 503 if model not ready)
- [ ] Health check returns `status: "loading"` on startup, changes to `"ready"` when model loads
- [ ] All endpoints return proper HTTP status codes (200, 400, 503)
- [ ] API is accessible at http://localhost:8000 (for debugging)

## Blocked by

- Issue 1: Infrastructure Foundation — Docker Compose & Nginx Proxy
