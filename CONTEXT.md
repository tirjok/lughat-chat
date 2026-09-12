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
| TTS Studio | The synthesis page at `/`: on desktop, side-by-side editor + waveform panels (drag-resizable); on mobile, a toggle between editor view and player view. Free-form text input + audio generation/playback. |
| Dashboard | The learning content catalog (`/dashboard`): displays CEFR levels (A1, A2, B1, B2...) with lesson lists, progress, and completion status. |
| CEFR Level | Curriculum tier (A1, A2, B1, B2) encoding difficulty progression. Each level has a title, Arabic title, description, lesson range, vocabulary count, speaking/reading WPM targets, goals, and key skills. |
| Lesson | A single unit within a CEFR Level, identified by a composite ID (`{level}-{number}`), with a title, Arabic title, description, and sections. |
| Section | A category within a Lesson: Dialogue, Vocabulary, Pronouns, Expressions, Grammar, or Activities. |
| Section Item | A single learnable unit within a Section: Arabic text with optional transliteration, English translation, and notes. For Activity sections, also carries an `activityType` (listen-translate, role-play, fill-blank, matching) and expected answer/options. |
| Activity | An interactive exercise type within a Lesson: `listen-translate` (hear Arabic, type translation), `role-play` (dialogue practice), `fill-blank` (complete sentence), `matching` (pair concepts). |
| Speaker | The raw reference audio (`.wav` file) used for voice cloning in XTTS-v2. A speaker must be ≥ 0.33 seconds. Resolved at the API level as `speaker ?? voice ?? "female"`. |
| Voice | The user-facing label for a speaker: `{ id, name, dialect, tag, icon, speaker_wav }`. A voice maps to exactly one speaker WAV file. Voices are discovered dynamically from `speaker_wavs/`. |
| Dialect | The regional variant of a voice (e.g., "KSA" for Saudi Arabian). Stored per-voice. |
| Reference Audio | The `.wav` file used by XTTS-v2 for voice cloning. Same as "speaker" in API terms; "reference audio" is the domain concept. Minimum duration: 0.33 seconds. |
| Synthesis | The end-to-end lifecycle: user submits text → server runs TTS model → MP3 audio blob returned → client creates an object URL → plays via `<audio>`. If the user navigates away before playback completes, the audio file becomes an orphan (no consumer), but synthesis continues server-side. No cancellation mechanism exists. |
| Synthesis Request | The client's synthesis call: text + optional speaker/speed/seed. The API endpoint is `POST /api/generate`; the frontend composable calls it `synthesize()`. The word "synthesis" is canonical (more precise than "generation"). |
| Orphan File | A generated MP3 on the server with no active consumer — the user navigated away during synthesis. The 24-hour cleanup endpoint (`POST /api/cleanup`) removes these. The frontend also disposes client-side object URLs on navigation (`useAudioModule.dispose()`). |
| Curriculum | Static, in-app curriculum data (`frontend/app/data/curriculum.ts`) defining all CEFR levels, lessons, sections, and section items. Serves as the single source of truth for the learning catalog. When backend endpoints exist, this file can be replaced with a composable that fetches from the API. |
| Learning Progress | Per-lesson completion state (`completed: true/false`, `progress: 0-100`). Stored in backend SQLite. |
| Theme | Partially rebranded. Light mode: `primary` (teal scale, 50–900) + `gold` (accent scale, 400–600) — complete. Dark mode: gradient orbs still use `#DD2476` (sunrise-magenta) and `#FF512F` (sunrise-orange). Color tokens fully migrated; dark gradient background not yet migrated. |

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
│   └── dashboard/
│       └── level/
│           ├── [level]/
│           │   ├── index.vue        → /dashboard/level/{level}
│           │   └── [lesson].vue     → /dashboard/level/{level}/{lesson}
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

- `vitest.config.ts`: uses `@nuxt/test-utils/config` (`defineVitestConfig`) with `environmentOptions.nuxt.rootDir`, jsdom, setup `tests/setup.ts` (browser-level mocks only — IntersectionObserver, URL, matchMedia). Nuxt auto-imports (ref, computed, useRoute, onMounted, etc.) are provided by the Nuxt test environment. `nuxt.config.ts` includes a `testUtils` config block (`startOnBoot: true, logToConsole: true`).
- `vitest.component.config.ts`: uses `@nuxt/test-utils/config` (`defineVitestConfig`) with `environmentOptions.nuxt.rootDir`, jsdom, setup `tests/setup.component.ts` (browser-level mocks + viewport mocks + `setBreakpoint()` helper).
- Existing tests: run `ls frontend/tests/` — do not rely on hardcoded lists.

---

## AI Agent Development Standards (Vue 3 / Nuxt 4)

When acting as an AI Agent developing this frontend, strictly adhere to the canonical, highly optimized standards established by Evan You (Vue) and Anthony Fu (Nuxt Core).

### Reference Architecture
Mimic the structure, patterns, and type-safety found in the following gold-standard repositories:
- **Elk (`elk-zone/elk`)**: For large-scale Nuxt app structure, state management, and server routes.
- **Nuxt UI (`nuxt/ui`)**: For building highly reusable, headless-accessible, strongly typed UI components.
- **Vitesse (`antfu/vitesse`)**: For `<script setup>` mastery, auto-imports, UnoCSS integration, and Pinia.
- **VueUse (`vueuse/vueuse`)**: For headless, pure-logic Composition API utilities (composables).

### Strict Constraints
1. **Structure**: Follow Nuxt 4 conventions explicitly (UI components in `app/components/`, pages in `app/pages/`, and universal utilities in `shared/`).
2. **Syntax**: Exclusively use `<script setup lang="ts">` with the Composition API. The Options API is strictly forbidden.
3. **Reactivity**: Default to `ref()` and `computed()`. Only use `reactive()` when grouping heavily related object mutations. Use Nuxt 4's singleton data fetching (defaulting to `shallowRef` for performance).
4. **Props & Emits**: Always use type-based declarations (`defineProps<{ ... }>()` and `defineEmits<{ ... }>()`).
5. **Styling**: Use atomic, utility-first styling via UnoCSS (`@apply` or inline utility classes). Avoid heavily scoped `<style>` blocks unless structurally necessary.
6. **Auto-imports**: Do not manually import Vue APIs (`ref`, `computed`) or Nuxt utilities (`useFetch`) unless enforced by strict linter configurations; Nuxt 4 handles these automatically.

### Component Template Standard
Structure components following this exact sequential flow:
1. Imports (only those not auto-imported).
2. Type definitions (`interface Props`, etc.).
3. Macros (`defineProps`, `defineEmits`, `defineSlots`).
4. Composables (`useClipboard`, custom, etc.).
5. Reactive State & Computed properties.
6. Methods/Functions.

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
5. Orphan MP3s accumulate between cleanup cycles (24h TTL). The `POST /api/cleanup` endpoint removes them, and the frontend calls it during navigation (`useCleanupNavigation`). Files older than 24 hours are removed automatically.
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