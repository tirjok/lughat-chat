# C4 Architecture Documentation — Lughat Chat

> **System:** Lughat Chat — Arabic Text-to-Speech Studio
> **Generated:** 2026-07-05
> **Stack:** Nuxt 4.4.5 + Vue 3 + TypeScript + UnoCSS / FastAPI 0.115.6 + Coqui XTTS-v2 + Docker Compose + Nginx

---

## Overview

Lughat Chat is a **text-to-speech (TTS) web application** focused on Arabic speech synthesis using the Coqui XTTS-v2 multilingual model. It features a full-page TTS studio with a two-panel layout (Control Deck + Waveform Canvas), voice cloning from reference WAV files, and real-time waveform visualization.

### System Summary

| Aspect | Detail |
|--------|--------|
| **Frontend** | Nuxt 4.4.5 + Vue 3 + TypeScript + UnoCSS (served via Nginx) |
| **Backend** | Python 3.12 + FastAPI 0.115.6 + Coqui TTS 0.27.5 (CPU-only) |
| **Deployment** | Docker Compose (2 services: backend + frontend, bridge network) |
| **TTS Engine** | XTTS-v2 — multilingual, Arabic-focused, voice cloning from WAV references |
| **Voices** | Dynamically discovered from `speaker_wavs/` directory (KSA Hamed - Male, KSA Zariyah - Female) |

---

## Diagram Index

| Document | C4 Level | Description |
|----------|----------|-------------|
| [`c4-context.md`](c4-context.md) | **Level 1** — System Context | External actors (User, Browser) and external systems (Coqui XTTS-v2, Google Fonts, Phosphor Icons) |
| [`c4-containers.md`](c4-containers.md) | **Level 2** — Containers | Nginx (reverse proxy), Nuxt SPA (frontend), FastAPI Server (backend), TTS Model, caches, and speaker WAV library |
| [`c4-components-spa.md`](c4-components-spa.md) | **Level 3** — Frontend Components | 1 page, 10 Vue components, 7 composables with their relationships and data flow |
| [`c4-components-backend.md`](c4-components-backend.md) | **Level 3** — Backend Components | Configuration, model management, 4 API endpoints, data models, utility functions |
| [`c4-deployment.md`](c4-deployment.md) | **Level 4** — Deployment | Docker Compose topology: 2 containers, 2 volumes, 1 bridge network, host-mounted speaker_wavs directory |

---

## Architecture Summary

### High-Level Flow

```
User → Browser → Nginx (port 9001) → FastAPI (port 9000) → XTTS-v2 Model
                                                    ↕
                                              Speaker WAVs (reference audio)
                                                    ↕
                                              Audio Cache (generated MP3s)
```

### Key Architectural Decisions

1. **Nginx as reverse proxy** — Decouples SPA serving from API proxying. Handles CORS, SPA routing, and large-file streaming.
2. **API proxy at Nginx level** — Frontend makes relative URL calls; Nginx routes to the backend container. No hardcoded backend URLs in frontend code.
3. **Background model loading** — FastAPI starts serving immediately; TTS model loads asynchronously (~120s). Frontend health polling handles the loading window.
4. **Dynamic voice discovery** — Voices discovered at runtime from `.wav` files in `speaker_wavs/`. No hardcoded voice list.
5. **Single-file backend** — All backend logic in `app.py` (~300 lines). Suitable for a focused TTS service.
6. **Composable-based frontend** — No global store; each composable manages its own reactive state.

### Known Limitations

- **CPU-only inference** — No GPU support; generation takes several seconds per request.
- **Model cache not persisted** — Despite `tts-model-cache` volume being defined, the model is re-downloaded on each restart.
- **No audio cleanup** — Generated MP3s accumulate indefinitely in `tts-audio-cache`.
- **Open CORS** — Both Nginx and FastAPI allow all origins (`*`). Should be restricted in production.
