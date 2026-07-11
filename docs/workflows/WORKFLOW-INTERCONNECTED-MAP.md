# Workflow Interconnection Map — Lughat Chat

**Purpose:** One-page visual reference showing how all workflows connect. Use this instead of reading 8 separate 200+ line specs to understand "what happens when."

**Last updated:** 2026-07-11 (post-ADR-003 + ADR-008)

---

## The Big Picture: User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER OPENS APP (docker compose up)                                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 0: BOOTSTRAP (happens before user sees anything)              │  │
│  │                                                                       │  │
│  │  ┌─────────────┐   ┌──────────────┐   ┌───────────────────────────┐  │  │
│  │  │ Docker starts│──►│ Backend loads │──►│ Frontend polls /health   │  │  │
│  │  │ container    │   │ 2 models:     │   │ every 2s (fix: 120s+)   │  │  │
│  │  │              │   │ XTTS-v2 ~120s │   │                           │  │  │
│  │  │              │   │ Whisper ~60-90s│   │ Frontend shows "Loading" │  │  │
│  │  └─────────────┘   └──────────────┘   │ Generate button disabled  │  │  │
│  │              ┌──────────────┐         └───────────────────────────┘  │  │
│  │              │ Docker health│         STATUS: WORKFLOW-model-loading  │  │
│  │              │ check every  │         │                              │  │
│  │              │ 15s, 120s    │         └──────────────────────────────┘  │  │
│  │              │ start_period │                                         │  │
│  │              └──────────────┘                                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼ (model ready)                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 1: NAVIGATION (user chooses where to go)                        │  │
│  │                                                                       │  │
│  │  User sees 3 options:                                                 │  │
│  │                                                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │  / (Dashboard) │  │ /playground  │  │ (future:     │                │  │
│  │  │  Roadmap view  │  │  TTS Studio  │  │  /lesson/:id) │               │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                │  │
│  │         │                 │                 │                          │  │
│  │         ▼                 ▼                 ▼                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │ WORKFLOW:    │  │ WORKFLOW:    │  │ WORKFLOW:    │                │  │
│  │  │ Lesson       │  │ Playground   │  │ Activity     │                │  │
│  │  │ Browsing &   │  │ Access       │  │ Submission   │                │  │
│  │  │ Access       │  │              │  │ & Scoring    │                │  │
│  │  └──────┬───────┘  └──────────────┘  └──────┬───────┘                │  │
│  └─────────────────────────────────────────────┼─────────────────────────┘  │
│                                                │                           │
│                                                ▼                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 2: ACTION (user does something)                                │  │
│  │                                                                       │  │
│  │  Dashboard → clicks lesson → ─────────────────────────────────────┐   │  │
│  │  Playground  → types text + clicks Generate ────────────────────┐ │   │  │
│  │  Lesson View → submits answer (text or voice) ────────────────┐ │ │   │  │
│  │                                                │              │ │   │  │
│  │                                                ▼              ▼ │   │  │
│  │                                    ┌──────────────┐  ┌──────────────┐│   │  │
│  │                                    │ WORKFLOW:    │  │ WORKFLOW:    ││   │  │
│  │                                    │ Speech       │  │ Pronunciation││   │  │
│  │                                    │ Synthesis    │  │ Scoring      ││   │  │
│  │                                    │              │  │ (NEW)        ││   │  │
│  │                                    └──────────────┘  └──────────────┘│   │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: What Triggers What

```
User Action                    API Call                  Backend Path
────────────                   ───────                   ────────────

1. App starts                  GET  /health              Model loading thread
   (Docker container)           (every 2s)                XTTS-v2 + Whisper

2. User opens Dashboard         GET  /api/lessons         Content module (JSON)
   (roadmap view)               (list all lessons)        + Progress module (SQLite)

3. User clicks lesson           GET  /api/lessons/:id     Content module (full lesson)
   (enter lesson view)          (single lesson +          + Progress module (status)
                                 progress)

4. User generates speech        POST /api/generate        TTS module (XTTS-v2)
   (playground)                 (text → audio)            → FFmpeg (WAV→MP3)
                                 → FileResponse          → Save to downloads/

5. User submits answer          POST /api/lessons/:id/    Content module (score)
   (lesson activity)            activities/:id/submit     Progress module (SQLite)
                                 (answer → score)        → Write user_progress

6. User records voice           POST /api/pronounce       STT module (Whisper)
   (lesson activity)            (audio + expected text    → Fuzzy match scoring
                                 → transcription)         → Save score to SQLite
                                 → {transcription,
                                    confidence, score}

7. User browses history         GET  /api/history         List files in downloads/
   (not yet in UI)              (file list)               (no cleanup mechanism)

8. User selects voice           GET  /api/voices          discover_voices()
   (playground)                 (voice list)              Scan speaker_wavs/*.wav
```

---

## Workflow Dependency Graph

```
                    ┌──────────────────────────────────────────────────┐
                    │              INFRASTRUCTURE (always first)       │
                    │                                                  │
                    │  ┌──────────────────────────────────────────┐   │
                    │  │ WORKFLOW: Model Loading & Readiness      │   │
                    │  │   Backend loads 2 models (~180-210s)     │   │
                    │  │   Frontend polls /health until ready     │   │
                    │  └──────────────────────────────────────────┘   │
                    │           │                                     │
                    │           ▼ (model ready)                       │
                    └──────────┼─────────────────────────────────────┘
                               │
                    ┌──────────▼─────────────────────────────────────┐
                    │              FRONTEND LAYOUT                   │
                    │                                                  │
                    │  ┌──────────────────────────────────────────┐   │
                    │  │ WORKFLOW: Dashboard Navigation &         │   │
                    │  │          Roadmap Display                 │   │
                    │  │   UI only — no API calls                 │   │
                    │  └──────────────────────────────────────────┘   │
                    │           │                                     │
                    │           ▼ (user clicks lesson)                │
                    └──────────┼─────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
   ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
   │ WORKFLOW:        │ │ WORKFLOW:    │ │ WORKFLOW:        │
   │ Lesson Browsing  │ │ Playground   │ │ Activity         │
   │ & Access         │ │ Access       │ │ Submission       │
   │                  │ │              │ │ & Scoring        │
   │ GET /api/lessons │ │ Types text   │ │ Submits answer   │
   │ + progress       │ │ Generates    │ │ Text or Voice    │
   │ (JSON + SQLite)  │ │ Speech       │ │ (see below)      │
   └────────┬─────────┘ └──────┬───────┘ └────────┬───────┘
            │                   │                  │
            │                   ▼                  ▼
            │            ┌──────────────┐  ┌──────────────┐
            │            │ WORKFLOW:    │  │ WORKFLOW:    │
            └───────────►│ Speech       │  │ Pronunciation│
                       │ Synthesis    │  │ Scoring (NEW)│
                        └──────────────┘  │              │
                                          │ POST /api/  │
                                          │ pronounce     │
                                          │ (Whisper +    │
                                          │  fuzzy match) │
                                          └──────────────┘
```

---

## API Endpoint Map

```
Endpoint                    Method   Auth   Description
────────────                ──────   ────   ───────────

/health                     GET      None   Model loading status (TTS + STT)
/api/voices                 GET      None   List available voices
/api/generate               POST     None   TTS: text → audio (MP3)
/api/history                GET      None   List generated audio files
/api/lessons                GET      None   List all lessons + status
/api/lessons/:id            GET      None   Full lesson + progress
/api/lessons/:id/activities/:id/submit  POST  None  Submit activity answer
/api/pronounce              POST     None   STT: audio → transcription + score
```

---

## State Machine: User Progress

```
[Dashboard: no lesson selected]
  │
  ├─► User clicks lesson 1 (A1) → [Lesson 1: active]
  │     │
  │     ├─ User submits text answer → Score computed → user_progress updated
  │     │
  │     ├─ User records voice (role-play) → Whisper transcribes → score computed
  │     │                                        → user_progress updated
  │     │
  │     └─ All activities complete → [Lesson 1: completed ✓]
  │             │
  │             ▼ (sequential unlock)
  │         [Lesson 2: available →]
  │
  ├─► User clicks lesson 5 (A1, locked) → Toast: "This lesson is locked"
  │
  └─► User goes to Playground → [Free-form TTS, no progress tracking]
```

---

## State Machine: Backend Model Status

```
[Container starts]
  │
  ▼
[Loading: XTTS-v2 model] (~120s on CPU)
  │
  ▼
[XTTS-v2 loaded]
  │
  ▼
[Loading: Whisper model] (~60-90s on CPU)
  │
  ▼
[READY: both models loaded]
  │
  ├─► /health returns { status: "ready", tts_model_loaded: true, stt_model_loaded: true }
  │
  └─► All API endpoints active
```

**Failure paths:**
- XTTS fails → `/health` returns `{ status: "error", tts_model_loaded: false }` — synthesis blocked
- Whisper fails → `/health` returns `{ status: "ready", tts_model_loaded: true, stt_model_loaded: false }` — synthesis works, pronunciation scoring blocked
- Both fail → full system error

---

## Critical Known Issues (Cross-Workflow)

| # | Issue | Workflows affected | Severity | Fix |
|---|---|---|---|---|
| **RC-001** | Frontend polls /health for 20s, but model loads in ~180-210s (2 models) | Model Loading, Speech Synthesis, Playground, Activity Submission | **Critical** | Increase polling to 210s |
| **RC-008** | No `/api/pronounce` endpoint exists | Pronunciation Scoring (NEW) | **Critical** | Must build from scratch |
| **RC-009** | No `useMicrophone` composable exists | Pronunciation Scoring (NEW) | **Critical** | Must build from scratch |
| **RC-010** | No scoring logic exists for any activity | Activity Submission | **Critical** | 5 algorithms must be built |
| **RC-011** | No SQLite code exists | Lesson Browsing, Activity Submission | **Critical** | Must build from scratch |
| **RC-012** | Only 1 of 30 lesson JSON files exists | Lesson Browsing, Lesson Content Serving | **Critical** | Data gap, not code gap |
| **RC-003** | Default voice name mismatch (`"female"` vs `"KSA Hamed - Male"`) | Speech Synthesis | **Critical** | Fix default voice resolution |
| **RC-005** | `/api/history` always returns `text: ""` | Speech Synthesis (cleanup inventory) | **High** | Store original text with generated audio |

---

## Missing Workflows (Not Yet Specced)

These exist in code or are required by ADR-003/ADR-008 but have no spec:

| Missing Workflow | Trigger | Priority |
|---|---|---|
| Pronunciation scoring (POST /api/pronounce) | Audio blob + expected text | P0 — required by ADR-003 |
| Microphone recording (frontend) | User clicks "Record" | P0 — required by ADR-008 |
| Browser microphone permission | First getUserMedia call | P0 — required by ADR-008 |
| Audio preprocessing (format conversion) | Browser sends WebM → Whisper needs WAV | P1 — Whisper format handling |
| STT model loading (extends Model Loading) | Container start — 2nd model | P0 — extends existing spec |
| Pronunciation score persistence | Score written to SQLite | P1 — extends Activity Submission |
| Audio recording UX (state machine) | User interacts with recording UI | P1 — extends Playground |
| STT health reporting (extends Model Loading) | /health must report STT status | P0 — extends existing spec |

---

## Quick Reference: "I want to understand X"

| If you want to know... | Read this spec first |
|---|---|
| "What happens when the app starts?" | Model Loading & Readiness |
| "How does the roadmap work?" | Lesson Browsing & Access |
| "How does a user generate speech?" | Speech Synthesis |
| "How does a user submit an activity?" | Activity Submission & Scoring |
| "How does voice recording work?" | (NEW — not specced yet) |
| "How does pronunciation scoring work?" | (NEW — not specced yet) |
| "What APIs exist?" | API Endpoint Map above |
| "What's broken right now?" | Critical Known Issues table above |
| "What needs to be built?" | Missing Workflows table above |

---

## Spec Cross-Reference

| Spec File | Lines | Key API | Key Frontend | Key Backend |
|---|---|---|---|---|
| WORKFLOW-speech-synthesis.md | 290 | POST /api/generate | useTtsApi, GenerateButton | tts_to_file() + FFmpeg |
| WORKFLOW-model-loading-readiness.md | 315 | GET /health | useHealthPoll, ModelStatusIndicator | TTS model load thread |
| WORKFLOW-lesson-browsing-and-access.md | 392 | GET /api/lessons | index.vue (Dashboard) | Content + Progress modules |
| WORKFLOW-activity-submission-and-scoring.md | 376 | POST /api/lessons/:id/activities/:id/submit | ActivityRenderer | 5 scoring algorithms |
| WORKFLOW-lesson-content-serving.md | 171 | GET /api/lessons, /api/lessons/:id | (used by Lesson Browsing) | JSON file parser |
| WORKFLOW-dashboard-navigation-and-roadmap.md | 214 | (none — UI only) | NavigationBar, LessonSidebar | (none) |
| WORKFLOW-playground-access.md | 146 | POST /api/generate | TTS Studio (reused) | (same as Speech Synthesis) |
| (NEW) WORKFLOW-pronunciation-scoring.md | — | POST /api/pronounce | useMicrophone, MicrophoneButton | Whisper + fuzzy match |
| (NEW) WORKFLOW-microphone-recording.md | — | (none — frontend only) | MediaRecorder API | (none) |
