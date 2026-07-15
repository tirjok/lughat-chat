# Project Context — Lughat Chat

## Overview
A **text-to-speech (TTS) web app** for Arabic speech synthesis using Coqui XTTS-v2. Deployed via Docker Compose with Nginx as reverse proxy.

## Architecture
```
┌──────────┐     ┌─────────────┐     ┌──────────┐
│  Browser  │◄──►│   Nginx     │◄──►│ Backend  │
└──────────┘     │ (port 80)   │     │(port 8000)│
                  └─────────────┘     └──────────┘
                                       Coqui XTTS-v2
```

- **Frontend**: Nuxt 4.4+ + Vue 3.5+ + UnoCSS 66 (runs on port 80 via Nginx)
- **Backend**: Python FastAPI 0.115.6 + Coqui TTS 0.27.5 (runs on port 8000)
- **TTS Model**: XTTS-v2 (multilingual, Arabic-focused)
- **Icons**: Phosphor Icons (via `@phosphor-icons/web` CDN script)
- **Fonts**: Google Fonts — "Inter" (UI labels) + "Cairo" (Arabic text)

---

## Frontend (`frontend/`)

### Tech Stack
- **Framework**: Nuxt 4.4+ (file-based routing, auto-imports)
- **Language**: TypeScript
- **Package Manager**: pnpm 10.33.4
- **Styling**: UnoCSS (with presetIcons, presetTypography, presetWebFonts)
- **UI Config**: `app.config.ts` — primary: green, neutral: slate
- **Icons**: Phosphor Icons (via `@phosphor-icons/web` CDN script)
- **Fonts**: Google Fonts — "Cairo" (sans-serif)

### Key Files
| File | Purpose |
|------|---------|
| `nuxt.config.ts` | Nuxt config with modules, ESLint, UnoCSS, CSS import |
| `uno.config.ts` | UnoCSS presets + shortcuts (`btn`, `card`, `flex-center`, etc.) |
| `app/app.config.ts` | UI theme config (green primary, slate neutral) |
| `app/assets/css/main.css` | Global BEM styles using UnoCSS `@apply` directives |

### App Structure (`app/`)
```
app/
├── app.config.ts          # UI theme config
├── app.vue                # Root component
├── assets/css/main.css    # Global styles (@apply)
├── pages/index.vue        # Full-page TTS Studio (two-panel layout)
├── components/            # 9 Vue components
│   ├── AudioPlayerPanel.vue       # Audio playback panel (waveform + controls)
│   ├── FocusHaloCanvas.vue        # Focus halo effect for textarea
│   ├── GenerateButton.vue         # Generate speech button with loading states
│   ├── MobileStatusIndicator.vue  # Compact model status (mobile FAB)
│   ├── ModelStatusIndicator.vue   # Desktop model status indicator
│   ├── SpeedSlider.vue            # Speed adjustment slider (0.5×–2.0×)
│   ├── ToastNotification.vue      # Toast messages (success/error/info)
│   ├── VoiceSelector.vue          # Voice/dialect selector dropdown
│   └── WaveformCanvas.vue         # Animated waveform visualization
└── composables/           # 8 composables (+ test files)
    ├── useAudioModule.ts     # Audio playback state management
    ├── useHealthPoll.ts      # Backend health check polling
    ├── useInputValidation.ts # Text input validation logic
    ├── usePanelToggle.ts     # Panel toggle state (control-deck ↔ canvas)
    ├── useScrollReveal.ts    # Scroll-reveal fade-up animations
    ├── useToast.ts           # Toast notification management
    ├── useTtsApi.ts          # TTS API calls (synthesize, healthCheck)
    └── useVoices.ts          # Voice list fetching and management
```

### ESLint Config
- **Config file**: `eslint.config.mjs` (flat config via `@nuxt/eslint`)
- **Style rules**: commaDangle: `'never'`, braceStyle: `'1tbs'`

### Test Setup (Vitest)
**Two separate vitest configs:**

1. **Unit tests**: `vitest.config.ts`
   - Environment: `jsdom`
   - Setup file: `tests/setup.ts` (mocks Nuxt auto-imports: `ref`, `computed`, `watch`, `onMounted`)
   - Excludes: `**/*.component.test.ts`, `tests/ModelStatusIndicator.test.ts`

2. **Component tests**: `vitest.component.config.ts`
   - Environment: `jsdom`
   - Setup file: `tests/setup.component.ts` (mocks URL APIs, fetch)
   - Excludes: `tests/useHealthPoll.test.ts`

**Test commands:**
```bash
# Run all tests (unit)
pnpm test          # → vitest run

# Run component tests only
npx vitest --config vitest.component.config.ts
```

**Run all tests (backend + frontend) from project root:**
```bash
./run-tests.sh     # Runs pytest (backend) then pnpm test (frontend)
```

**Test files location:** `frontend/tests/`
- Naming: `<name>.test.ts`
- All test files live in `frontend/tests/` (no inline test files in source directories).

---

## Backend (`backend/`)

### Tech Stack
- **Framework**: Python FastAPI 0.115.6
- **Server**: uvicorn 0.34.0 (standard)
- **TTS Engine**: Coqui TTS 0.27.5 (with codec support)
- **Package Manager**: pip (requirements.txt)

### Key Files
| File | Purpose |
|------|---------|
| `app.py` | Main FastAPI app with TTS model loading, synthesis endpoint, health check |
| `requirements.txt` | Python dependencies (fastapi, uvicorn, pydantic, coqui-tts, ffmpeg-python) |
| `pytest.ini` | pytest config — testpaths: tests, pythonpath: . |

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check + model loading status |
| `/api/voices` | GET | List available voices/speakers |
| `/api/generate` | POST | Generate speech from text (returns MP3 binary) |
| `/api/history` | GET | List previously generated audio files |

### Model Loading
- Model: `tts_models/multilingual/xtts_v2` (loaded on startup via lifespan)
- Cache dir: `/app/.cache/tts` (env var `TTS_MODEL_CACHE`)
- **Note:** The `tts-model-cache` named volume is mounted at `/root/.local/share/tts` in Docker Compose, but the application writes to `/app/.cache/tts`. The model cache volume is **not used for persistence** — the ~2GB TTS model is re-downloaded on each container restart.
- Status states: `"loading"` → `"ready"` | `"error"`
- Audio output dir: `/app/downloads` (persisted as `tts-audio-cache`)

### Test Setup (Pytest)
```bash
# Run backend tests (inside Docker — no host Python needed)
./scripts/run-backend-tests.sh
```

**Run all tests (backend + frontend) from project root:**
```bash
./run-tests.sh     # Runs backend tests in Docker, then pnpm test (frontend)
```

**Test files:** `backend/tests/`
- `test_generate.py` — synthesis endpoint tests
- `test_generate_blob.py` — blob response tests
- `test_health.py` — health check endpoint tests
- `test_history.py` — audio history endpoint tests
- `test_voices.py` — voices listing tests

---

## Docker Deployment (`docker-compose.yml`)

### Services
| Service | Image | Ports | Notes |
|---------|-------|-------|-------|
| `backend` | Python (custom Dockerfile) | 9000:8000 | Health check: start_period 120s, 200 retries (15s interval) |
| `frontend` | Nuxt + Nginx (custom Dockerfile) | 9001:80 | Depends on backend being healthy (service_healthy condition) |

### Volumes
| Volume | Purpose |
|--------|---------|
| `tts-model-cache` | Persist TTS model (~2GB, downloaded once) |
| `tts-audio-cache` | Persist generated audio files |

### Environment Variables (`.env`)
```
BACKEND_PORT=9000, BACKEND_HOST=backend
FRONTEND_PORT=9001, FRONTEND_HOST=localhost
NGINX_PORT=80, NGINX_HOST=localhost
API_BASE_URL=http://backend:9000
TTS_MODEL_CACHE=/app/.cache/tts
COQUI_TOS_AGREED=1
MODEL_VOLUME_NAME=arabic-tts-models
AUDIO_CACHE_VOLUME_NAME=arabic-tts-audio
```

---

## UnoCSS Shortcuts (Reusable Classes)
| Shortcut | Expands To |
|----------|------------|
| `btn` | `px-4 py-2 rounded font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors` |
| `card` | `rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800` |
| `flex-center` | `flex items-center justify-center` |
| `flex-between` | `flex items-center justify-between` |

## BEM CSS Classes (in main.css)
All styles use `@apply` with UnoCSS utilities. Key blocks:
- `.tts-page`, `.tts-card`, `.tts-section` — layout blocks
- `.tts-input`, `.tts-select`, `.tts-range` — form controls
- `.tts-btn-generate` — generate button with loading state
- `.tts-audio`, `.tts-error`, `.tts-footer` — media/error blocks
- `.tts-spinner`, `.tts-fade-*`, `.tts-slide-up-*` — animations

---

---

## Docker Deployment

**Full reference:** [`docs/docker/DOCKER-GUIDE.md`](../docker/DOCKER-GUIDE.md)

The project runs **two independent Docker Compose environments** simultaneously — production and development — each with its own network, containers, and volumes.

### Quick Reference

| Aspect | Production | Development |
|--------|-----------|-------------|
| Frontend port | 9001:80 | 3000:3000 |
| Backend port | 9000:8000 | 9000:8000 |
| Frontend image | `frontend/Dockerfile` (multi-stage) | `frontend/Dockerfile.dev` |
| Backend CMD | `uvicorn` (no reload) | `uvicorn --reload` |
| Source mounting | None | `./backend:/app`, `./frontend:/app` |
| Model cache | `tts-model-cache` | `tts-model-cache-dev` |
| Audio cache | `tts-audio-cache` | `tts-audio-cache-dev` |
| Container names | `lughat-backend`, `lughat-frontend` | `lughat-backend-dev`, `lughat-frontend-dev` |
| Network | `lughat-network` | `lughat-dev-network` |
| Frontend waits | `service_healthy` | `service_started` |

### Key Docker Facts
- Backend Dockerfile rebuilds **torchcodec from source** (pre-built wheel requires CUDA)
- Frontend production: multi-stage build (Node 20 builder → Nginx Alpine, zero Node.js at runtime)
- Frontend development: Nuxt dev server with hot reload from mounted source
- Nginx proxies `/api/*` and `/health` to backend; 1800s timeout for TTS synthesis
- Health check: backend polls `/health` every 15s (200 retries, 120s start_period)
- Health check is **omitted in dev** — 120s start would delay frontend by 50 minutes
- Separate networks allow both environments to share host port 9000 without conflict
- Speaker WAVs are bind-mounted from host — changes visible without restart
- Model cache volume (`tts-model-cache`) mounted at `/app/.cache/tts` matching `TTS_MODEL_CACHE`
- `.env` file at project root is documentation only — values are hardcoded in compose files

---

## Known Issues & Debugging Patterns

### Audio Playback Timing Issue (Fixed 2026-06-05)
**Symptom**: Audio doesn't play after first "Generate Speech" click, but works on second click.
**Root cause**: Vue's DOM updates are async. `loadAudio()` sets `audioUrl.value` which triggers a `<Transition>` to mount `<audio ref="audioRef">`, but the element doesn't exist in DOM yet when `play()` is called immediately after. The guard `if (audioRef.value && url)` fails because `audioRef.value` is still `null`.
**Fix**: Add `await nextTick()` between `loadAudio()` and `play()` in `index.vue`. Also added `{ flush: 'post' }` to the `watch(audioUrl)` in `useAudioModule.ts` as a safety net.
**Pattern to watch for**: Anytime you call a method that depends on a `ref` bound to an element inside a `<Transition>` or conditional (`v-if`), you need `await nextTick()` first.

---

## Key Conventions
1. **Nuxt file-based routing**: pages go in `app/pages/`, auto-imported
2. **Composables** in `app/composables/` are auto-imported (no explicit imports needed)
3. **Components** in `app/components/` are auto-imported by name
4. **Tests mirror source**: all test files live in `frontend/tests/` (no inline test files)
5. **Dark mode**: all UnoCSS utility classes have `dark:` variants defined in main.css
6. **RTL support**: Arabic text handled via Cairo font + RTL direction
7. **Icons**: Phosphor Icons (via `@phosphor-icons/web` CDN script) + Lucide + Simple Icons
8. **Host ports**: Docker backend on 9000, frontend on 9001. Local dev proxies to localhost:9000.
