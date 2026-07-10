# PRD: Lughat Chat — Arabic Language Education Platform

## Problem Statement

Learners need a structured, self-paced Arabic language learning platform that combines **structured lessons** with **high-quality text-to-speech (TTS)** for pronunciation practice. Existing solutions either lack structured curriculum, rely on expensive cloud APIs, or don't integrate pronunciation feedback natively. Users want a single command to run a complete Arabic learning platform locally with no external dependencies after initial startup.

The platform follows the **CEFR framework** (A1 → A2 → B1) with competency-based learning goals, sequential lesson progression, and variable lesson structures (dialogue, vocabulary, grammar, practice).

## Solution

A Dockerized web application consisting of:
- **Backend**: Python FastAPI with XTTS-v2 neural TTS model + SQLite lesson content serving, running locally on CPU
- **Frontend**: Nuxt.js SPA with RTL Arabic UI, served via Nginx
- **Deployment**: Single `docker compose up` command starts both services, with Nginx reverse proxy routing all traffic through port 80

The model downloads once (~2GB) on first start, then persists in a Docker volume for instant subsequent startups.

---

## CEFR Learning Framework

### Levels

| Level | Description | Lessons | Goal |
|---|---|---|---|
| **A1** | Beginner — survival Arabic | 10 lessons | ~500 root words, basic everyday interactions, reduced language-switching, speak ~20–40 WPM, read <30 WPM |
| **A2** | Elementary — routine tasks | 10 lessons | Expand vocabulary, handle simple social exchanges, short conversations on familiar topics |
| **B1** | Intermediate — independent use | 10 lessons | Handle most travel situations, describe experiences, give reasons and explanations |

### A1 Level — Lesson Structure

Each A1 lesson contains:
- **Variable sections** (freeform JSON): dialogue, vocabulary, grammar, expressions — not fixed per lesson
- **Mandatory practice activities** (3–5 per lesson): scored, with up to 3 attempts each
- **Competency checklist** (5 competencies per lesson): observable, assessable outcomes

### Learning Goals per Lesson (Example: Lesson 1)

Each lesson has a final learning goals checklist. Example — Lesson 1 "The Salutations":

1. Can read fluently short paragraphs with harakat
2. Good understanding of basic salutations
3. Ability to use pronouns correctly
4. Differentiates between the pronouns used when talking to different genders
5. Grasps the method of forming nominative sentences with pronouns + nouns

---

## User Stories

### Core Learning

1. As a learner, I want to see a **roadmap** of my learning journey (A1 → A2 → B1) so that I know where I am
2. As a learner, I want to complete **lessons sequentially** — I cannot skip ahead until the previous lesson is complete
3. As a learner, I want each lesson to have **variable sections** (dialogue, vocabulary, grammar) so that content adapts to the topic
4. As a learner, I want each lesson to have **mandatory practice activities** so that I can demonstrate mastery
5. As a learner, I want to see a **competency checklist** at the start of each lesson so that I know what I'll be able to do
6. As a learner, I want to retry failed activities (up to 3 attempts) so that I can improve without restarting the whole lesson
7. As a learner, I want to track my **score per activity** so that I can see my progress
8. As a learner, I want a **hybrid UI** — one activity fills the screen (focused), with a collapsible sidebar showing the roadmap

### TTS & Pronunciation

9. As a learner, I want to **click any Arabic text** to hear it spoken aloud (on-demand TTS) so that I can practice pronunciation
10. As a learner, I want to adjust **speech speed** (0.5×–2.0×) so that I can slow down difficult passages
11. As a learner, I want to select a **consistent teacher voice** so that my learning experience is coherent
12. As a learner, I want the TTS model to load once (~120s) and then be ready for instant playback

### Playground (Free Practice)

13. As a learner, I want a **Playground** page where I can freely type Arabic text and hear it spoken — no lessons, no structure — just experimentation
14. As a learner, I want to access the Playground from within any lesson (via the navigation bar) so that I can practice freely at any time

### Navigation & UX

15. As a learner, I want a **top navigation bar** with: hamburger (roadmap sidebar), Home, Playground link, and TTS status indicator
16. As a learner, I want the roadmap sidebar to be **collapsible** (collapsed by default, showing only a thin indicator) so that I stay focused on one activity
17. As a learner, I want the roadmap to show **progress** (completed ✓, current →, locked 🔒) for every lesson

### Content Creation (Operator)

18. As a content creator, I want to write lesson content as **JSON files** (LLM-assisted) and commit them to the repository so that content is version-controlled
19. As a content creator, I want lesson content stored in `backend/content/{level}/lesson-{NN}.json` so that the backend can serve it via API

---

## Architecture

### Container Architecture

```
┌──────────┐     ┌─────────────┐     ┌──────────────────────────┐
│  Browser  │◄──►│   Nginx     │◄──►│ Backend (FastAPI + TTS)  │
└──────────┘     │ (port 80)   │     │  - XTTS-v2 (TTS model)   │
                  └─────────────┘     │  - SQLite (lessons,      │
                                       │    activities, progress) │
                                       │  - Content serving API  │
                                       └──────────────────────────┘
```

### Pages (Frontend Routing)

| Page | Route | Description |
|---|---|---|
| **Dashboard / Roadmap** | `/` | Hybrid layout: single-page activity view + collapsible roadmap sidebar. Shows level → lesson → activity progress. |
| **Lesson View** | `/lesson/:id` | Renders a lesson with variable sections (dialogue, vocabulary, grammar) followed by practice activities. One activity at a time. |
| **Playground** | `/playground` | The existing TTS Studio — free-form text input + audio output. Unchanged from current app. Moved from `/` to `/playground`. |

### Navigation Bar (All Pages)

```
┌─────────────────────────────────────────────────┐
│  ☰  LughatChat    Roadmap  |  Playground    🎧  │
└─────────────────────────────────────────────────┘
```

- **☰** — Hamburger to expand/collapse roadmap sidebar
- **LughatChat** — Home (goes to Dashboard)
- **Roadmap** — Link (goes to Dashboard)
- **Playground** — Link (goes to `/playground`)
- **🎧** — Mini TTS status indicator

### Backend API

Existing endpoints (unchanged):
- `GET /health` — Health check + model loading status
- `GET /api/voices` — List available teacher voices
- `POST /api/generate` — Synthesize text to speech (returns MP3 blob)
- `GET /api/history` — List previously generated audio files

New endpoints:
| Endpoint | Method | Purpose |
|---|---|---|
| `GET /api/lessons` | GET | List all lessons with progress status (locked / available / in_progress / completed) |
| `GET /api/lessons/:id` | GET | Get full lesson (sections + activities) |
| `POST /api/lessons/:id/activities/:activityId/submit` | POST | Submit answer, get score + feedback |
| `GET /api/progress` | GET | Get overall progress (current lesson, completed count) |
| `PUT /api/progress/lesson/:lessonId` | PUT | Update lesson progress (mark completed) |

### API Response — Submit Answer

```typescript
// Request
interface SubmitAnswerRequest {
  answer: string;                    // User's answer (varies by activity type)
  metadata?: Record<string, unknown>; // Activity-type-specific data
}

// Response
interface SubmitAnswerResponse {
  score: number;                     // 0.0 – 1.0
  feedback: string;                  // Immediate feedback (shown on first attempt)
  attempts_remaining: number;        // Max attempts - current attempts
  activity_complete: boolean;        // True if all max attempts used
  competency_impact?: Record<string, number>;  // How much this activity contributes to each competency
  correct_answer?: string;           // Shown only after max attempts exhausted
}
```

### Data Model (SQLite)

```sql
-- Lessons (static content — written once)
CREATE TABLE lessons (
    id INTEGER PRIMARY KEY,
    level TEXT NOT NULL CHECK(level IN ('A1', 'A2', 'B1')),
    sequence INTEGER NOT NULL,         -- 1–10 within level
    title TEXT NOT NULL,
    competencies TEXT NOT NULL,        -- JSON array of competency strings
    sections TEXT NOT NULL,            -- JSON array of sections (freeform)
    UNIQUE(level, sequence)
);

-- Activities (static content — paired with lessons)
CREATE TABLE activities (
    id INTEGER PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id),
    type TEXT NOT NULL,                -- 'listen-translate', 'translate-to-english',
                                       -- 'translate-to-arabic', 'introduce-characters',
                                       -- 'role-play', etc.
    content TEXT NOT NULL,             -- JSON (freeform activity data)
    order INTEGER NOT NULL,
    max_attempts INTEGER DEFAULT 3
);

-- User Progress (single user — no User table needed)
CREATE TABLE user_progress (
    lesson_id INTEGER PRIMARY KEY REFERENCES lessons(id),
    status TEXT NOT NULL DEFAULT 'locked'
        CHECK(status IN ('locked', 'available', 'in_progress', 'completed')),
    activities TEXT NOT NULL,          -- JSON: { activityId: { score, attempts, status } }
    completed_at TEXT,
    UNIQUE(lesson_id)
);
```

**Key constraints:**
- Sequential unlocking: `locked → available → in_progress → completed`
- No `User` table — single user, single `user_progress` table
- Content (lessons, activities) is static — written as JSON, served by API
- Progress (user_progress) is mutable — updated on activity submission

---

## Frontend Component Architecture

### Components to Keep (No or Minimal Changes)

| Component | Purpose |
|---|---|
| `useHealthPoll.ts` | TTS model loading status polling |
| `useVoices.ts` | Teacher voice selection |
| `SpeedSlider.vue` | Speech speed control (0.5×–2.0×) |
| `ModelStatusIndicator.vue` | Desktop TTS status indicator |
| `MobileStatusIndicator.vue` | Mobile TTS status indicator |
| `ToastNotification.vue` | Error/success/info messages |
| `useToast.ts` | Toast notification management |

### Components to Remove

| Component | Reason |
|---|---|
| `FocusHaloCanvas.vue` — Free-form textarea glow effect | No more free-form textarea in lessons |
| `GenerateButton.vue` — "Generate Speech" button | Replaced by activity-specific submit buttons |
| `WaveformCanvas.vue` — Waveform visualization | Replaced by simple audio progress (less noise for learning) |
| `AudioPlayerPanel.vue` — Slide-up audio panel | Preserved in Playground; simplified inline player for lessons |

### Components to Build (New)

| Component | Purpose |
|---|---|
| `app/pages/index.vue` | Dashboard / Roadmap (hybrid layout) |
| `app/pages/lesson/[id].vue` | Lesson page with sections + activities |
| `app/components/LessonSidebar.vue` | Collapsible roadmap sidebar |
| `app/components/SectionRenderer.vue` | Renders variable sections (dialogue, vocabulary, grammar, etc.) |
| `app/components/ActivityRenderer.vue` | Renders variable activities (listen-translate, translate, role-play, etc.) |
| `app/components/ProgressBar.vue` | Top progress indicator (lesson + activity progress) |
| `app/components/InlineAudioPlayer.vue` | Simple play/pause/progress for lesson audio |

### Existing Page — Moved, Not Changed

| Page | Route | Note |
|---|---|---|
| TTS Studio (current `index.vue`) | `/playground` | Moved from `/` to `/playground`. All existing components preserved. |

---

## Lesson Content Model

### Lesson JSON Structure

Each lesson is a JSON file at `backend/content/{level}/lesson-{NN}.json`:

```json
{
  "id": 1,
  "level": "A1",
  "sequence": 1,
  "title": "The Salutations — التحيّة الأولى",
  "competencies": [
    "Can read fluently short paragraphs with harakat",
    "Good understanding of basic salutations",
    "Ability to use pronouns correctly",
    "Differentiates between the pronouns used when talking to different genders",
    "Grasps the method of forming nominative sentences with pronouns + nouns"
  ],
  "sections": [
    { "type": "dialogue", "title": "...", "content": { ... } },
    { "type": "vocabulary", "title": "...", "content": { ... } },
    { "type": "grammar", "title": "...", "content": { ... } },
    { "type": "expressions", "title": "...", "content": { ... } }
  ],
  "activities": [
    {
      "id": 1,
      "type": "listen-translate",
      "title": "Read the Dialogue & Translate",
      "description": "...",
      "order": 1,
      "competency_map": { "read_fluently_with_harakat": 0.4, "understand_basic_salutations": 0.3 },
      "max_attempts": 3,
      "content": { ... }
    }
  ]
}
```

### Section Types (Flexible, Not Fixed)

| Type | Description | Example |
|---|---|---|
| `dialogue` | Conversation text with speaker labels | Clickable lines, scrollable |
| `vocabulary` | Word lists (singular/plural) | Flashcard grid or table |
| `grammar` | Grammar rules + examples | Reference table with examples |
| `expressions` | Key phrases with translations | Tap-to-hear list |

Sections are **freeform JSON** — validated at render time, not at content-creation time.

### Activity Types (Mandatory per Lesson)

| Type | Description | Scoring |
|---|---|---|
| `listen-translate` | Read Arabic text → translate to English | Fuzzy string match |
| `translate-to-english` | Translate Arabic sentences to English | Fuzzy string match |
| `translate-to-arabic` | Translate English sentences to Arabic | Fuzzy match with harakat |
| `introduce-characters` | Introduce characters with proper sentences | Content validation |
| `role-play` | Role-play dialogue with teacher | Dialogue completion |

### Lesson Completion Model

- Each activity has `max_attempts` (default: 3)
- Best score across attempts is stored
- A lesson is "completed" when all activities' scores meet the threshold
- Failed activities can be retried (partial retry) — only failed activities reset
- Competency aggregation: each activity maps to competencies with a weight

---

## Deployment

- **Docker Compose**: Three services — `backend` (FastAPI + TTS + SQLite), `frontend` (Nuxt → Nginx), and SQLite persisted in a named volume
- **Health checks**: Backend health check retries 20 times with 120s start period (accommodates model download)
- **Frontend dependency**: Waits for backend to be healthy before starting
- **Image sizes**: Backend ~500MB (CPU-only PyTorch + SQLite), Frontend ~20MB (Nginx Alpine)

---

## Existing API Contract (Unchanged)

```typescript
// Request
interface SynthesisRequest {
  text: string          // Arabic text, 1-3000 characters
  language: 'ar' | 'en' // Default: 'ar'
  voice: string | null  // Any string; resolved via speaker ?? voice ?? 'female'
  speed: number         // 0.5 - 2.0, default: 1.0
}

// Response (MP3 blob)
interface SynthesisResponse {
  audio_url: string     // /downloads/{filename}
  filename: string      // {lang}_{voice}_{timestamp}.mp3
  duration_seconds: number
}

// Health check
interface HealthResponse {
  status: 'loading' | 'ready' | 'error'
  model_loaded: boolean
}
```

---

## Testing Decisions

### What makes a good test
- Test external behavior only (inputs → outputs), not implementation details
- Backend: Test API endpoints with mocked TTS model, verify request/response schemas
- Frontend: Test composable logic (audio player state management) in isolation
- Integration: Verify Docker Compose stack starts and services communicate

### Modules to test
1. **TTS Engine Module** — Unit tests for audio conversion (WAV → MP3), error handling
2. **API Gateway Module** — Integration tests for all endpoints (generate, health, voices, lessons, progress)
3. **Audio Player Module** — Unit tests for playback state transitions (play → pause → end)
4. **UI Module** — Component tests for RTL input validation, loading states, activity rendering
5. **Content Serving Module** — Tests for lesson/progress API endpoints

### Prior art
- Existing `app.py` has FastAPI structure with Pydantic models — easy to add lesson/progress endpoints
- Existing composables (`useAudioModule.ts`, `useTtsApi.ts`) are pure functions — easy to unit test
- New composables needed: `useLessons`, `useProgress`, `useActivitySubmission`

---

## Out of Scope (MVP)

- A2 and B1 content (data structure only, no content)
- Content Editor (manual JSON files via LLM assistance)
- User accounts / authentication (single user, forever)
- Speech recognition / pronunciation scoring (future)
- Pre-generated audio (on-demand TTS only)
- Analytics / learning metrics beyond progress tracking
- Multi-tenant / multi-user support
- Cloud deployment (local Docker Compose only)
- GPU acceleration (CPU-only)
- Batch processing / queue system
- Arabic text normalization beyond XTTS-v2 native handling

---

## Known Issues (From Previous Audit — Still Relevant)

| # | Issue | Severity | Status |
|---|---|---|---|
| RC-1 | Frontend health polling window (20s) is 6× shorter than model load time (120s) | Critical | To be fixed |
| RC-3 | Default voice name mismatch: frontend defaults to "female" but deployed WAV files are "KSA Hamed - Male" and "KSA Zariyah - Female" | Critical | To be fixed |
| RC-5 | Named volume `tts-model-cache` mounted at `/root/.local/share/tts` but app writes to `/app/.cache/tts` — volume is unused | High | To be fixed |
| RC-1 (Synthesis) | `/api/history` always returns `text: ""` — original synthesized text is lost | High | To be fixed |
| RC-4 (Synthesis) | FFmpeg fallback copies WAV to `.mp3` extension — browser may not decode | Medium | To be fixed |
| RC-5 (Synthesis) | No rate limiting on `/api/generate` — disk fills indefinitely | Medium | To be addressed |

---

## Content: Lesson 1 (A1) — Already Structured

Lesson 1 JSON has been created at `backend/content/a1/lesson-01.json`:

- **Title**: "The Salutations — التحيّة الأولى"
- **Sections**: Dialogue (2 scenes), Vocabulary (3 categories), Pronouns (12 entries), Expressions (16 phrases), Grammar (3 topics)
- **Activities**: 5 mandatory activities (listen-translate, translate-to-english, translate-to-arabic, introduce-characters, role-play)
- **Competencies**: 5 observable outcomes

---

## First Startup Experience (Updated)

1. User runs `docker compose up --build`
2. Backend container starts, downloads ~2GB XTTS-v2 model to volume (5–10 minutes)
3. Frontend shows "جاري تحميل النموذج..." with spinning loader in the top-right status indicator
4. Once model loads, indicator changes to checkmark "النموذج جاهز"
5. User lands on the **Dashboard** — sees the roadmap (A1 Lesson 1 available, A2/B1 locked)
6. User clicks Lesson 1 → enters the lesson view — sees variable sections + practice activities
7. User can access **Playground** at any time via the top navigation bar

## Subsequent Startups

1. `docker compose up` (no --build needed)
2. Model loads from volume in seconds
3. Application ready immediately
4. User's progress is restored from SQLite (`user_progress` table)
