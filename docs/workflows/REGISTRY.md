# Workflow Registry — Lughat Chat
**Last updated**: 2026-07-10
**Status**: Active discovery — 4 new learning workflows specced

---

## View 1: By Workflow (Master List)

| Workflow | Spec file | Status | Trigger | Primary actor | Last reviewed |
|---|---|---|---|---|---|
| Speech synthesis | WORKFLOW-speech-synthesis.md | **Draft** | User clicks "Generate Speech" or Ctrl+Enter | Frontend → Backend → XTTS | 2026-07-10 |
| Model loading & readiness | WORKFLOW-model-loading-readiness.md | **Draft** | Container start / restart | Docker → Backend → Frontend health polling | 2026-07-10 |
| Lesson browsing and access | WORKFLOW-lesson-browsing-and-access.md | **Draft** | User opens Dashboard (`/`) | Frontend → Backend → Content + Progress | 2026-07-10 |
| Activity submission and scoring | WORKFLOW-activity-submission-and-scoring.md | **Draft** | User submits answer in lesson view | Frontend → Backend → Content + Progress | 2026-07-10 |
| Lesson content serving | WORKFLOW-lesson-content-serving.md | **Draft** | API call (`GET /api/lessons*`) | Backend → Content Module → JSON files | 2026-07-10 |
| Dashboard navigation and roadmap | WORKFLOW-dashboard-navigation-and-roadmap.md | **Draft** | User opens Dashboard (`/`) | Frontend (UI/UX) | 2026-07-10 |
| Playground (TTS Studio) access | WORKFLOW-playground-access.md | **Draft** | User clicks "Playground" in nav bar | Frontend (existing TTS Studio) | 2026-07-10 |
| Voice discovery | — | **Missing** | Page load (`onMounted` in `useVoices`) | Frontend → `/api/voices` | — |
| Audio history browsing | — | **Missing** | User views history (not yet implemented in UI) | Frontend → `/api/history` | — |
| Speaker WAV generation | — | **Missing** | Manual execution of `generate_speaker_wavs.py` | Operator (one-time setup) | — |
| Container orchestration | — | **Missing** | `docker compose up` | Docker Compose | — |
| Frontend health polling | — | **Missing** | Page load (`onMounted` in `useHealthPoll`) | Frontend → `/health` | — |
| Health check (Docker) | — | **Missing** | Every 15s (configured in `docker-compose.yml`) | Docker | — |
| Audio playback | — | **Missing** | User clicks play, synthesis completes | Frontend `<audio>` element | — |
| Audio download | — | **Missing** | User clicks download button | Frontend (client-side) | — |
| Panel toggle (mobile) | — | **Missing** | User drags divider, switches panels | Frontend (client-side) | — |
| Text input validation | — | **Missing** | User types, clicks generate | Frontend (`useInputValidation`) | — |
| Toast notification lifecycle | — | **Missing** | Any error/success/info event | Frontend (`useToast`) | — |
| CI/CD pipeline execution | — | **Missing** | Push/PR to main or develop | GitHub Actions | — |
| Pre-commit quality gate | — | **Missing** | `git commit` | Pre-commit hooks (`run-tests.sh`) | — |
| Nginx reverse proxy routing | — | **Missing** | Any HTTP request to frontend | Nginx | — |
| Model cache persistence | — | **Missing** | Container restart (or lack thereof) | Docker volumes | — |

**Summary**: 22 discovered workflows. 8 specced (Draft). 14 **Missing** (exist in code but have no spec). 6 new learning workflows specced in this session.

---

## View 2: By Component (Code → Workflows)

### Backend Components
| Component | File(s) | Workflows it participates in |
|---|---|---|
| FastAPI app (`app.py`) | `backend/app.py` | Speech synthesis, Model loading, Health check, Voice discovery, Audio history |
| `generate_speaker_wavs.py` | `backend/generate_speaker_wavs.py` | Speaker WAV generation |
| `/health` endpoint | `backend/app.py` (line ~148) | Model loading, Health check (Docker), Frontend health polling |
| `/api/voices` endpoint | `backend/app.py` (line ~155) | Voice discovery |
| `/api/generate` endpoint | `backend/app.py` (line ~160) | Speech synthesis |
| `/api/history` endpoint | `backend/app.py` (line ~220) | Audio history browsing |
| `discover_voices()` | `backend/app.py` (line ~74) | Voice discovery |
| `_validate_speaker_wav()` | `backend/app.py` (line ~30) | Speech synthesis (validation) |

### Frontend Components
| Component | File(s) | Workflows it participates in |
|---|---|---|
| `index.vue` (main page) | `frontend/app/pages/index.vue` | Speech synthesis, Text input validation, Audio playback, Audio download, Panel toggle |
| `index.vue` (Dashboard variant) | `frontend/app/pages/index.vue` (new) | Lesson browsing, Dashboard navigation |
| `playground.vue` (new) | `frontend/app/pages/playground.vue` (new) | Playground access, Speech synthesis |
| `LessonSidebar.vue` (new) | `frontend/app/components/LessonSidebar.vue` (new) | Dashboard navigation, Lesson browsing |
| `NavigationBar.vue` (new) | `frontend/app/components/NavigationBar.vue` (new) | Dashboard navigation, Playground access |
| `ActivityRenderer.vue` (new) | `frontend/app/components/ActivityRenderer.vue` (new) | Activity submission |
| `useActivitySubmission.ts` (new) | `frontend/app/composables/useActivitySubmission.ts` (new) | Activity submission |
| `useTtsApi` composable | `frontend/app/composables/useTtsApi.ts` | Speech synthesis |
| `useHealthPoll` composable | `frontend/app/composables/useHealthPoll.ts` | Frontend health polling, Model loading |
| `useVoices` composable | `frontend/app/composables/useVoices.ts` | Voice discovery |
| `useAudioModule` composable | `frontend/app/composables/useAudioModule.ts` | Audio playback, Audio download |
| `useInputValidation` composable | `frontend/app/composables/useInputValidation.ts` | Text input validation |
| `useToast` composable | `frontend/app/composables/useToast.ts` | Toast notification lifecycle |
| `usePanelToggle` composable | `frontend/app/composables/usePanelToggle.ts` | Panel toggle (mobile) |
| `GenerateButton` component | `frontend/app/components/GenerateButton.vue` | Speech synthesis (UI gating) |
| `ModelStatusIndicator` component | `frontend/app/components/ModelStatusIndicator.vue` | Model loading (UI display) |
| `MobileStatusIndicator` component | `frontend/app/components/MobileStatusIndicator.vue` | Model loading (UI display) |
| `AudioPlayerPanel` component | `frontend/app/components/AudioPlayerPanel.vue` | Audio playback |
| `VoiceSelector` component | `frontend/app/components/VoiceSelector.vue` | Voice discovery (UI) |
| `SpeedSlider` component | `frontend/app/components/SpeedSlider.vue` | Speech synthesis (parameter) |
| `WaveformCanvas` component | `frontend/app/components/WaveformCanvas.vue` | Audio playback (visualization) |
| `ToastNotification` component | `frontend/app/components/ToastNotification.vue` | Toast notification lifecycle (UI) |
| `FocusHaloCanvas` component | `frontend/app/components/FocusHaloCanvas.vue` | Text input validation (visual feedback) |

### Infrastructure Components
| Component | File(s) | Workflows it participates in |
|---|---|---|
| `docker-compose.yml` | `docker-compose.yml` | Container orchestration, Health check (Docker), Model cache persistence |
| `frontend/nginx.conf` | `frontend/nginx.conf` | Nginx reverse proxy routing |
| `frontend/Dockerfile` | `frontend/Dockerfile` | Container orchestration |
| `backend/Dockerfile` | `backend/Dockerfile` | Container orchestration |
| `.github/workflows/backend.yml` | `.github/workflows/backend.yml` | CI/CD pipeline execution |
| `.github/workflows/frontend.yml` | `.github/workflows/frontend.yml` | CI/CD pipeline execution |
| `.pre-commit-config.yaml` | `.pre-commit-config.yaml` | Pre-commit quality gate |
| `run-tests.sh` | `run-tests.sh` | Pre-commit quality gate, CI/CD pipeline |
| `scripts/init.sh` | `scripts/init.sh` | Container orchestration (startup validation) |
| `scripts/run-backend-tests.sh` | `scripts/run-backend-tests.sh` | CI/CD pipeline, Pre-commit quality gate |

---

## View 3: By User Journey (User-Facing → Workflows)

### Customer Journeys
| What the customer experiences | Underlying workflow(s) | Entry point |
|---|---|---|
| Opens the app | Model loading, Frontend health polling | Page load |
| Sees the roadmap | Lesson browsing, Dashboard navigation | `/` (Dashboard) |
| Clicks a lesson | Lesson browsing, Lesson content serving | Dashboard lesson card |
| Completes activities | Activity submission and scoring | `/lesson/:id` |
| Returns to roadmap | Dashboard navigation (refresh) | `/` (Dashboard) |
| Uses Playground | Playground access, Speech synthesis | Navigation bar → `/playground` |
| Types Arabic/English text | Text input validation | Textarea input |
| Selects a voice | Voice discovery | VoiceSelector dropdown |
| Adjusts speech speed | Speech synthesis (parameter) | SpeedSlider |
| Clicks "Generate Speech" | Speech synthesis | GenerateButton click / Ctrl+Enter |
| Listens to generated audio | Audio playback | AudioPlayerPanel |
| Downloads generated audio | Audio download | Download button |
| Sees error messages | Toast notification lifecycle | Any failure point |
| Sees "Loading..." status | Model loading, Frontend health polling | Page load → 120s |
| Sees "Error" status (bug) | Model loading, Frontend health polling | **BUG**: Frontend gives up after 20s, model takes 120s |

### Operator Journeys
| What the operator does | Underlying workflow(s) | Entry point |
|---|---|---|
| Deploys the application | Container orchestration | `docker compose up` |
| Generates speaker WAV files | Speaker WAV generation | `python generate_speaker_wavs.py` |
| Checks backend health | Health check (Docker), Model loading | `docker compose ps`, `/health` |
| Views generated audio files | Audio history browsing | Not yet in UI (exists in code) |
| Adds new voice presets | Speaker WAV generation | Place `.wav` file in `speaker_wavs/` |
| Runs CI/CD pipeline | CI/CD pipeline execution | Push/PR to GitHub |
| Runs pre-commit checks | Pre-commit quality gate | `git commit` |
| Inspects container logs | Container orchestration | `docker compose logs` |

### System-to-System Journeys
| What happens automatically | Underlying workflow(s) | Trigger |
|---|---|---|
| Model downloads (~2GB) on container start | Model loading | Container start |
| Frontend polls `/health` every 2s | Frontend health polling | Page load (`onMounted`) |
| Docker health check runs every 15s | Health check (Docker) | Every 15s (configured) |
| Frontend container starts after backend is healthy | Container orchestration | Backend health check passes |
| Nginx proxies API requests to backend | Nginx reverse proxy routing | Any HTTP request |
| CI runs tests on push/PR | CI/CD pipeline execution | Push/PR to main or develop |
| Pre-commit runs quality gate on commit | Pre-commit quality gate | `git commit` |
| Model cache volume persists ~2GB (unused) | Model cache persistence | Container restart |

---

## View 4: By State (Entity → Workflows)

### TTS Model States
| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| `loading` (backend) | Container start, model loading thread starts | → `ready`, `error` | Model load success/failure (Step 3) |
| `ready` (backend) | Model load thread completes | → `loading` (restart) | Container restart |
| `error` (backend) | Model load thread fails | → `loading` (restart) | Container restart |
| `loading` (frontend) | Page load, health polling starts | → `ready`, `error` | Health polling result (Step 5) |
| `ready` (frontend) | Health polling returns `status: "ready"` | → `error` (polling failure) | 10 consecutive polling failures |
| `error` (frontend) | 10 polling retries exhausted | → `loading` (page reload) | Page reload |

### Audio States (Generated Files)
| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Intermediate WAV (temporary) | XTTS generation (Step 2) | → deleted (by FFmpeg success) | FFmpeg conversion success |
| Output MP3 (permanent) | FFmpeg conversion (Step 2) | → **NEVER deleted** | — (no cleanup mechanism) |

### Speaker WAV States (Reference Audio)
| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| Exists in `speaker_wavs/` | Placed by operator or `generate_speaker_wavs.py` | → deleted (manual) | Operator removes file |
| Valid (≥ 0.33s) | Placed or generated | → invalid (file edited) | File content changes |
| Invalid (< 0.33s) | Short file placed | → valid (replaced) | Operator replaces with longer file |

### Container States
| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| `starting` | `docker compose up` | → `running` | FastAPI starts, listens on port 8000 |
| `running` (unhealthy) | FastAPI starts, model loading in progress | → `healthy`, `unhealthy` | Health check passes (120s+) or fails (50min) |
| `healthy` | Health check passes | → `unhealthy` (if health check fails) | Model crashes, port conflict |
| `unhealthy` | 200 health check retries exhausted | → `starting` (restart) | `docker compose restart` |
| `stopped` | `docker compose down` | → `starting` (restart) | `docker compose up` |

---

## Known Critical Issues (from Reality Checker Findings)

| # | Issue | Severity | Workflows affected |
|---|---|---|---|
| **RC-1** | Frontend health polling window (20s) is 6× shorter than model load time (120s) — frontend shows "Error" long before model loads | **Critical** | Model loading, Frontend health polling |
| **RC-3** (Synthesis) | Default voice name mismatch: frontend defaults to `"female"` but deployed WAV files are `"KSA Hamed - Male"` and `"KSA Zariyah - Female"` | **Critical** | Speech synthesis |
| **RC-5** (Model) | Named volume `tts-model-cache` mounted at `/root/.local/share/tts` but app writes to `/app/.cache/tts` — volume is unused, 2GB re-downloaded every restart | **High** | Model loading, Container orchestration |
| **RC-1** (Synthesis) | `/api/history` always returns `text: ""` — original synthesized text is lost | **High** | Audio history browsing |
| **RC-4** (Synthesis) | FFmpeg fallback copies WAV to `.mp3` extension — browser may not decode | **Medium** | Speech synthesis |
| **RC-5** (Synthesis) | No rate limiting on `/api/generate` — disk fills indefinitely | **Medium** | Speech synthesis |
| **RC-2** (Learning) | Only 1 of 30 lesson JSON files exists — **not a blocker**: all 3 learning workflow implementations are written to work with lesson-01.json first. Remaining 29 files are a separate data-creation task (no code changes needed once populated). | **High** | Lesson content serving, Lesson browsing and access, Activity submission and scoring |

---

## Phased Rollout — Learning Workflows

The 3 learning workflows (Lesson Content Serving, Lesson Browsing and Access, Activity Submission and Scoring) share a common data dependency: only 1 of 30 lesson JSON files exists. **This does NOT block implementation.** All 3 implementation plans are written to work with `backend/content/a1/lesson-01.json` (5 sections, 5 activities) as the test subject:

| Phase | Content | Implementation Work | Data-creation Work |
|-------|---------|--------------------|--------------------|
| **Phase 1** | `a1/lesson-01.json` (exists) | Build all backend + frontend infrastructure | None — data already exists |
| **Phase 2** | `a1/lessons 2-10` (29 missing) | **No code changes needed** — system auto-discovers new JSON files | Content authors create 9 JSON files |
| **Phase 3** | `a2/lessons 1-10` (10 missing) | **No code changes needed** | Content authors create 10 JSON files |
| **Phase 4** | `b1/lessons 1-10` (10 missing) | **No code changes needed** | Content authors create 10 JSON files |

Each implementation file documents this explicitly in its Open Questions. See:
- `docs/implementation/IMPLEMENTATION-lesson-content-serving.md` — Open Question 1
- `docs/implementation/IMPLEMENTATION-lesson-browsing-and-access.md` — Open Question 1
- `docs/implementation/IMPLEMENTATION-activity-submission-and-scoring.md` — Open Question 2

---

## Spec Priorities (Recommended Order)
1. **WORKFLOW-model-loading-readiness.md** — Fix RC-1 (critical: frontend shows error after 20s, model takes 120s)
2. **WORKFLOW-speech-synthesis.md** — Fix RC-3 (critical: default voice name mismatch)
3. **WORKFLOW-voice-discovery.md** — Voice selection UI + API integration
4. **WORKFLOW-audio-playback.md** — Playback, seek, waveform visualization
5. **WORKFLOW-container-orchestration.md** — Docker compose, volumes, health checks
6. **WORKFLOW-ci-cd-pipeline.md** — GitHub Actions, pre-commit hooks
7. Remaining 10 workflows as capacity allows
