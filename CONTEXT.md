# CONTEXT.md — Lughat Chat (Deep Reference)

> On-demand reference. AGENTS.md (rules, commands, conventions) is the
> contract — read THIS file only when a task needs architecture, API,
> Docker, debugging, or CI details. Do not duplicate AGENTS.md content here.

---

## Architecture

```
┌──────────┐     ┌─────────────┐     ┌──────────┐
│  Browser │◄───►│   Nginx     │◄───►│ Backend  │
└──────────┘     │ (port 80)   │     │(port 8000)│
                 └─────────────┘     └──────────┘
                                       Coqui XTTS-v2
                                       SQLite (lessons + progress)
```

- Frontend: Nuxt 4.4.5 + Vue 3 + UnoCSS 66.7.2 + `@vueuse/core` — served on port 80 via Nginx.
- Backend: FastAPI 0.115.6 + uvicorn 0.34.0 + Coqui TTS 0.27.5 — port 8000 (container), 9000 (host).
- TTS model: `tts_models/multilingual/xtts_v2` (multilingual, Arabic-focused).
- Fonts: Google Fonts — "Inter" (UI) + "Cairo" (Arabic). Theme: under full rebrand (OQ-3).
- App identity: Language Learning Platform (was "Arabic TTS web app"). TTS is a tool within the platform.
- SQLite: lesson data + progress tracking for single anonymous user. Schema TBD (OQ-8).

---

## Glossary

| Term | Definition |
|------|-----------|
| Language Learning Platform | The app's identity — Arabic learning with integrated TTS. Supersedes the previous "Arabic TTS web app" identity. |
| TTS Studio | The original two-panel page (`/`): free-form text input + audio generation/playback. Moved from root concept to one page among many. |
| Dashboard | The learning content catalog (`/dashboard`): displays CEFR levels (A1, A2, B1, B2...) with lesson lists, progress, and completion status. |
| Lesson Page | Dynamic route (`/level/{level}/{lesson_id}`): displays lesson content (dialogues, vocabulary, grammar, activities) from JSON files. |
| Shared Layout | `app.vue` acts as a layout shell with a shared navbar. All pages include the navbar. |
| Single Anonymous User | No authentication. Progress is tracked per-device via backend SQLite. |
| Lesson Content | JSON files containing structured Arabic learning material: sections (dialogue, vocabulary, grammar) and activities (listen-translate, role-play, etc.). Stored location TBD (OQ-5). |
| Lesson Progress | Per-lesson completion state (`completed: true/false`, `progress: 0-100`). Stored in backend SQLite. |
| Theme | Under full rebrand (D6). Current: green primary, slate neutral. New color TBD (OQ-3). |
| Page Title | Pattern: `LughatChat - [page-name]` (e.g., "LughatChat - Playground", "LughatChat - Dashboard"). Mechanism TBD (OQ-4). |

---

## Frontend Structure (`frontend/app/`)

```
app/
├── app.config.ts          # UI theme config
├── app.vue                # Layout shell (shared navbar + NuxtPage)
├── assets/css/main.css    # Global styles via UnoCSS @apply (dark theme, scrollbar, safe-area)
├── pages/
│   ├── index.vue          # TTS Studio (/) — two-panel layout
│   ├── dashboard.vue      # Dashboard (/dashboard) — learning catalog
│   └── level/[level]/[lesson_id].vue  # Lesson page (/level/a1/1)
├── components/            # 9 Vue components (list dir for current set)
└── composables/           # 8 composables (list dir for current set)
```

Key config files: `nuxt.config.ts` (modules, ESLint, UnoCSS, Nitro devProxy),
`uno.config.ts` (presetWind3, presetTypography, presetWebFonts, transformerDirectives, shortcuts, theme).

### UnoCSS Shortcuts (`uno.config.ts`)

| Shortcut | Expands To |
|----------|------------|
| `btn` | `px-4 py-2 rounded font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors` |
| `card` | `rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800` |
| `flex-center` | `flex items-center justify-center` |
| `flex-between` | `flex items-center justify-between` |

Main CSS blocks (`.tts-*`): page/card/section layout, input/select/range controls,
btn-generate (loading state), audio/error/footer, spinner/fade/slide-up animations.

### Vitest Setup Detail

- `vitest.config.ts`: jsdom, setup `tests/setup.ts` (stubs `ref`, `computed`, `watch`, `onMounted`).
  Excludes `**/*.component.test.ts`, `tests/ModelStatusIndicator.test.ts`.
- `vitest.component.config.ts`: jsdom, setup `tests/setup.component.ts` (stubs URL APIs, fetch).
  Excludes `tests/useHealthPoll.test.ts`.
- Existing tests: run `ls frontend/tests/` — do not rely on hardcoded lists.

---

## Backend (`backend/`)

- `app.py` — FastAPI app: model loading via lifespan, synthesis, health, voices, history.
- `requirements.txt` — runtime deps; `backend/requirements-test.txt` — test deps (used by CI).
- `pytest.ini` — testpaths: tests, pythonpath: .
- Speaker references: `backend/speaker_wavs/*.wav` — dynamically discovered (≥ 0.33s each,
  XTTS-v2 minimum). Current: `KSA Hamed - Male.wav`, `KSA Zariyah - Female.wav`.
- SQLite database: lesson data + progress tracking. Schema TBD (OQ-8).
  New API endpoints required: `GET /api/levels`, `GET /api/lessons`, `GET /api/lessons/{id}`,
  `POST /api/progress` (OQ-9).

### Model Loading

- Loads on startup via lifespan. Status: `loading → ready | error`.
- Cache dir: `/app/.cache/tts` (`TTS_MODEL_CACHE` env var).
- KNOWN ISSUE: `tts-model-cache` volume mounts at `/root/.local/share/tts` but the app writes
  to `/app/.cache/tts` — volume is NOT used; the ~2GB model re-downloads every container restart.
- Audio output: `/app/downloads` (persisted via `tts-audio-cache`). No cleanup mechanism — files accumulate.

---

## API Reference

### `POST /api/generate` — Generate Speech

```json
{
  "text": "مرحبا بك في لغةات",
  "language": "ar",      // optional, default "ar" | allowed: "ar" | "en"
  "voice": "female",     // optional, any string (validated at runtime)
  "speaker": "female",   // alias for voice; resolved as speaker ?? voice ?? "female"
  "speed": 1.0,          // optional, 0.5–2.0
  "pitch": 0.0,          // optional, -4.0–4.0
  "seed": 42             // optional, deterministic (default 42)
}
```

Response: `audio/mpeg` binary via `FileResponse` — NOT JSON. Frontend uses `URL.createObjectURL()`.
Note: `SynthesisResponse` Pydantic model exists but is unused.

Errors: 400 (empty/too-long text), 503 (model still loading), 500 (missing speaker WAV / generation failure).

### `GET /health`

```json
{ "status": "ready", "model_loaded": true }   // status: "loading" | "ready" | "error"
```

### `GET /api/voices`

Array of `{ id, name }` from `.wav` filenames in `speaker_wavs/`.

### `GET /api/history`

Array of generated files with metadata (filename, text, language, voice, speed, pitch, created_at);
text comes from sidecar `.json` written during synthesis.

---

## Docker (`docker-compose.yml`)

| Service | Ports | Notes |
|---------|-------|-------|
| backend | 9000:8000 | Health check: start_period 120s, 200 retries @ 15s |
| frontend | 9001:80 | depends_on: backend service_healthy |

Volumes: `tts-model-cache` (ineffective — see Model Loading), `tts-audio-cache` (audio persistence).

Backend container env: `TZ=UTC`, `TTS_MODEL_CACHE=/app/.cache/tts`, `COQUI_TOS_AGREED=1`,
`LD_LIBRARY_PATH=/usr/local/lib:/usr/lib/x86_64-linux-gnu`. Full env list: see `.env` at project root.

---

## Error Handling Patterns

Frontend: all user-facing errors via `showToast()` (`useToast`); input validation via
`useInputValidation`; `isGenerating` disables button + spinner; `Ctrl+Enter` triggers generation.

Backend: `HTTPException` with descriptive `detail`; CORS is `*` (dev-only — restrict in production);
503 while model loads (~120s).

---

## Known Gotchas

1. Model loading ~120s — first requests get 503. `useHealthPoll` polls `/health` every 2s (max 10 retries).
2. ~2GB model re-downloads per container restart (volume path mismatch above).
3. CPU-only inference — generation takes several seconds.
4. Speaker WAVs < 0.33s cause 500 errors.
5. Generated MP3s accumulate — no cleanup.
6. Only `ar` and `en` accepted; other languages rejected.
7. Seed defaults to 42 — outputs are deterministic unless overridden.
8. Host ports are 9000/9001, not 8000/80. Local dev proxies to localhost:9000.
9. Navigating away from TTS Studio during synthesis triggers `onUnmounted` — `useHealthPoll` stops,
   `useAudioModule` disposes. In-flight synthesis request behavior TBD (OQ-1).
10. Shared layout navbar eats viewport space. TTS Studio currently uses `100vh` — layout adaptation TBD (OQ-2).

---

## Debugging History

### Audio playback timing (fixed 2026-06-05)

Symptom: audio plays on second "Generate" click, not first.
Root cause: `loadAudio()` sets `audioUrl.value`, which mounts `<audio ref>` inside a `<Transition>`
asynchronously — `audioRef.value` is still `null` when `play()` runs.
Fix: `await nextTick()` between `loadAudio()` and `play()`; `watch(audioUrl, ..., { flush: 'post' })`
as safety net.
Pattern: any `ref` bound inside `<Transition>`/`v-if` needs `await nextTick()` before use.

---

## CI/CD (GitHub Actions)

Both workflows trigger on push/PR to `main`/`develop` for their path, `ubuntu-latest`.

- `backend.yml` (on `backend/**`): checkout → Python 3.12 → ffmpeg →
  `pip install -r backend/requirements-test.txt` → `pytest --cov=app --cov-report=term-missing -v`.
- `frontend.yml` (on `frontend/**`): checkout → pnpm 10.33.4 + Node 24 →
  `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test -- --coverage`.
  Working directory: `frontend`.

---

## Local Setup

Prereqs: Node 24, pnpm 10.33.4, Docker + Compose, Git, `pre-commit` (pip). No host Python.

```bash
# Terminal 1 — backend :8000
cd backend && uvicorn app:app --reload   # or: docker compose up backend

# Terminal 2 — frontend :3000 (Nitro devProxy → localhost:9000)
cd frontend && pnpm dev
```

Pre-commit hooks: call `./run-tests.sh` + `ruff` / `ruff-format` (Python lint/format).