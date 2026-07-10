# ADR-001: Language Learning Platform Architecture

## Status

**Accepted** — 2026-07-10

This ADR documents the architectural approach for evolving Lughat Chat from a simple TTS playground into a structured **Arabic Language Learning Platform** (as defined in the PRD). It evaluates three architectural options and recommends a path forward.

---

## Context

Lughat Chat currently is a **text-to-speech studio** — a single-page app that takes Arabic text and produces speech via the Coqui XTTS-v2 model. The PRD extends this into a full **language learning platform** with:

- **Structured curriculum** — CEFR-based levels (A1 → A2 → B1), 10 lessons per level
- **Variable lesson sections** — Dialogue, vocabulary, grammar, expressions (freeform JSON per lesson)
- **Mandatory practice activities** — 3–5 scored activities per lesson (listen-translate, translate-to-English, translate-to-Arabic, role-play, etc.)
- **Sequential progression** — Lessons unlock only when the previous one is completed
- **Progress tracking** — SQLite-backed user progress (locked → available → in_progress → completed)
- **Playground** — The existing TTS studio, now a separate page (`/playground`)
- **Dashboard / Roadmap** — A new landing page showing the full learning journey

### Constraints

| Constraint | Implication |
|-----------|-------------|
| **Single user, no auth** | No user table; `user_progress` is the only mutable data |
| **CPU-only inference** | TTS takes several seconds; cannot scale to high concurrency |
| **Local Docker Compose only** | No cloud hosting, no managed databases, no CDN |
| **Small team (solo developer)** | Operational complexity must be justified by real need |
| **~2GB TTS model** | Already resource-heavy; cannot add more heavy services |
| **Content as JSON files** | Lessons are static content files, not user-generated |
| **No speech recognition** | Pronunciation scoring is out of scope for MVP |
| **No multi-tenancy** | Single learner, forever |

### What We're Building

A **structured learning platform** with:
- 30 lessons (10 per level × 3 levels)
- Variable content types (dialogue, vocabulary, grammar, expressions)
- 5+ activity types (listen-translate, translate-to-English, translate-to-Arabic, introduce-characters, role-play)
- Progress tracking with competency-weighted scoring
- Sequential lesson unlocking
- A playground for free practice

---

## Decision

We evaluate three architectural options for the platform.

---

### Option A: Modular Monolith (Recommended)

A single FastAPI backend + single Nuxt frontend, with **strict internal module boundaries** separating content serving, progress management, and TTS synthesis.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Nuxt SPA)                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │ Dashboard │  │  Lesson   │  │Playground │               │
│  │ /         │  │ /lesson/  │  │ /playground│               │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘               │
└────────┼──────────────┼──────────────┼──────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│  Nginx (port 80) — reverse proxy                            │
│  Frontend files → SPA routing → /api/* → Backend            │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI) — Modular Monolith                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ Content    │ │ Progress   │ │  TTS       │              │
│  │ Module     │ │ Module     │ │ Module     │              │
│  │            │ │            │ │            │              │
│  │ GET /api/  │ │ GET /api/  │ │ POST /api/ │              │
│  │  lessons   │ │  progress  │ │  generate  │              │
│  │ GET /api/  │ │ PUT /api/  │ │            │              │
│  │  lessons/  │ │  progress/ │ │            │              │
│  │  :id       │ │  lesson/:id│ │            │              │
│  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘              │
│         │               │               │                    │
│         ▼               ▼               ▼                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ SQLite     │ │ SQLite     │ │ XTTS-v2    │              │
│  │ (lessons)  │ │ (progress) │ │ Model)     │              │
│  └────────────┘ └────────────┘ └────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

**Module boundaries:**

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| **Content** | Serve lessons, sections, activities from JSON files + SQLite | None (domain-only) |
| **Progress** | Track user progress, activity scores, lesson status | Content (to validate lesson existence) |
| **TTS** | Synthesize speech from text | None (infrastructure) |
| **API** | Expose HTTP endpoints, request validation, error handling | Content, Progress, TTS |

---

### Option B: Split Services (Microservices)

Separate the platform into independent services: one for content/lessons, one for progress tracking, one for TTS. Each with its own database and API.

```
┌──────────┐     ┌─────────────┐     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Browser  │◄──►│   Nginx     │◄──►│ Content Svc │ │Progress Svc│ │  TTS Svc    │
└──────────┘     │ (port 80)   │     │ :9100       │ │:9200       │ │:9000        │
                  └─────────────┘     │ SQLite      │ │ SQLite      │ │ XTTS-v2    │
                                      └─────────────┘ └─────────────┘ └─────────────┘
```

---

### Option C: Keep Current (TTS Studio Only)

Maintain the current single-endpoint TTS studio. No learning features.

---

## Trade-off Analysis

| Concern | A: Modular Monolith | B: Split Services | C: Current |
|---------|-------------------|-------------------|------------|
| **Development speed** | ✅ Fast — single codebase, single deploy | ❌ Slow — 3 services, 3 configs, 3 test suites | ✅ Instant — no changes |
| **Operational complexity** | ✅ Low — 2 containers (backend + frontend) | ❌ High — 4 containers, 3 databases, service discovery | ✅ Minimal |
| **Team size required** | ✅ 1 developer | ❌ 3+ engineers to maintain boundaries properly | ✅ 1 |
| **Resource usage** | ✅ ~500MB backend (TTS + SQLite) | ❌ 3× SQLite + 3× FastAPI overhead (~1.5GB) | ✅ ~500MB |
| **Data consistency** | ✅ Single SQLite DB, transactions | ❌ Distributed — eventual consistency at best | N/A |
| **Independent scaling** | ❌ All endpoints share the same resources | ✅ TTS can scale independently of content | N/A |
| **Failure isolation** | ❌ TTS crash affects all endpoints | ✅ Content API survives TTS failure | N/A |
| **Testing** | ✅ One pytest suite | ❌ 3 test suites + integration tests between services | ✅ One test suite |
| **Model cache** | ✅ One ~2GB download | ❌ 3× model downloads (or shared volume complexity) | ✅ One download |
| **Learning curve** | ✅ One codebase to understand | ❌ New devs must understand 3 services + inter-service contracts | ✅ Trivial |
| **Evolution path** | ✅ Modules can be extracted later if needed | ❌ Already distributed — harder to consolidate | ❌ Dead end — no learning features |

---

### When Option B (Split Services) Would Be Warranted

Splitting into microservices makes sense when **all** of the following are true:

1. **Multiple teams** — Different teams own different services with independent release cycles
2. **Independent scaling needs** — TTS inference needs GPU clusters while content serving is lightweight
3. **High throughput** — Thousands of concurrent users generating speech simultaneously
4. **Service-level SLAs** — Content availability must be guaranteed even when TTS is down

**None of these apply to Lughat Chat.** The platform targets a single learner, runs locally, uses CPU-only inference, and is developed by one person.

---

### When Option C (Current) Would Be Warranted

Keeping the current TTS-only design makes sense when:

1. The goal is purely a **pronunciation tool**, not a learning platform
2. There is **no curriculum** — no lessons, no activities, no progress
3. The user is a **free-form experimenter**, not a structured learner

**This contradicts the PRD**, which explicitly defines a CEFR-based curriculum with 30 lessons, 5 mandatory activities per lesson, sequential progression, and progress tracking.

---

## Consequences

### Choosing Option A (Modular Monolith)

#### What becomes easier

- **Adding new lesson types** — Create a new activity renderer in the frontend; add a new endpoint in the content module
- **Adding new levels** — Drop JSON files into `backend/content/a2/` and `backend/content/b1/`
- **Adding new activity types** — Define the activity schema, build the renderer, add scoring logic
- **Testing** — Single test suite, single Docker stack, single `docker compose up`
- **Debugging** — All logs in one container, single SQLite DB to inspect
- **Deployment** — One `docker compose up --build`, same as today
- **Content authoring** — JSON files are version-controlled, editable with any text editor, no database migrations needed
- **Rollback** — Git history on JSON files; revert a bad lesson without touching the database

#### What becomes harder

- **Boundary enforcement** — Python has no compile-time module boundary checks. We must enforce inward dependencies via linting (flake8-import-order, isort) or pre-commit hooks.
- **Coupling risk** — Without discipline, the Progress module could start importing TTS internals, or the Content module could leak SQLite queries into the API layer.
- **File count growth** — `app.py` will grow from ~300 lines to potentially ~800–1200 lines across 4–6 files. This is the reason we need strict module boundaries.
- **SQLite as the single source of truth** — If the SQLite file corrupts, all progress is lost. No replication, no backup strategy in the MVP.
- **Frontend complexity** — Building 5+ new Vue components, 3 new composables, 2 new pages, and a navigation system adds significant frontend work on top of the existing TTS Studio.
- **Activity type diversity** — Each activity type (listen-translate, translate-to-English, translate-to-Arabic, introduce-characters, role-play) requires its own renderer, scoring logic, and validation rules. Five distinct implementations, not one.

#### New code to write

| Area | Files (Backend) | Files (Frontend) |
|------|-----------------|------------------|
| **Content module** | `content/lessons.py`, `content/routes.py` | — |
| **Progress module** | `progress/routes.py`, `progress/models.py` | `useProgress.ts`, `useActivitySubmission.ts` |
| **New pages** | — | `app/pages/index.vue` (Dashboard), `app/pages/lesson/[id].vue` |
| **New components** | — | `LessonSidebar.vue`, `SectionRenderer.vue`, `ActivityRenderer.vue`, `ProgressBar.vue`, `InlineAudioPlayer.vue` |
| **New composables** | — | `useLessons`, `useProgress`, `useActivitySubmission` |
| **Database** | — | `backend/lessons.db` (SQLite, created on first run) |

#### New API endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/lessons` | GET | List all lessons with progress status |
| `/api/lessons/:id` | GET | Get full lesson (sections + activities) |
| `/api/lessons/:id/activities/:activityId/submit` | POST | Submit answer, get score + feedback |
| `/api/progress` | GET | Get overall progress |
| `/api/progress/lesson/:lessonId` | PUT | Mark lesson completed |

#### Migration path (incremental, no breaking changes)

1. **Phase 1** — Add content serving (read JSON files, serve via API). Playground stays at `/playground`. No breaking changes.
2. **Phase 2** — Add progress tracking (SQLite `user_progress` table). Sequential unlocking logic.
3. **Phase 3** — Build frontend pages (Dashboard, Lesson View). Move current TTS Studio to `/playground`.
4. **Phase 4** — Add activity submission, scoring, competency aggregation.

Each phase is independently testable and deployable.

---

### Choosing Option B (Split Services)

#### What becomes easier

- **TTS service can be replaced** (e.g., swap XTTS for a cloud API) without affecting content or progress
- **Content and progress can scale independently** of TTS load (if high concurrency ever arises)
- **Different teams could own different services** with independent release cycles (if the team grows)
- **Fault isolation** — Content API stays up even when TTS is down

#### What becomes harder

- **Three times the Docker complexity** — 4 containers instead of 2, 3 databases instead of 1, 3 Dockerfiles, 3 health checks, 3 restart policies
- **Three times the model cache** — Either share a volume (complex mount paths, race conditions on startup) or download 3× 2GB models (~6GB total disk usage)
- **Inter-service communication** — Content service must call Progress service to resolve lesson status; Progress must call Content to validate lesson existence. This creates a circular dependency graph that can easily become a distributed monolith (services tightly coupled via HTTP calls, but deployed independently).
- **Testing overhead** — Integration tests must spin up 3 services + 3 databases. CI pipelines slow down 3×. Debugging a failed integration test requires understanding which service failed, which database was stale, and which HTTP call broke.
- **Deployment complexity** — `docker compose up` must start 4 containers in the correct order with health checks. Rolling updates require coordinating 4 containers.
- **Data consistency** — If Progress service writes a lesson as "completed" but Content service hasn't reloaded the updated JSON file, the user sees stale data. Eventual consistency at best.
- **No benefit for a single-user, local system** — The operational cost far exceeds any theoretical benefit. This is the architecture astronautics trap: designing for scale that will never exist.
- **Migration from Option A is harder than the reverse** — Extracting modules into services requires designing HTTP contracts, handling partial failures, implementing retry logic, and adding observability (tracing, metrics). Building these into a modular monolith "just in case" adds complexity that pays no dividends today.

---

### Choosing Option C (Current)

#### What becomes easier

- **Zero change** — the current TTS playground works as-is for its narrow purpose (free-form Arabic text → speech)
- **No new code to write** — no lessons, no activities, no progress tracking, no new pages
- **No migration risk** — nothing breaks, nothing needs to be ported
- **Fastest possible delivery** — the system works today, exactly as it does now

#### What becomes harder

- **Cannot deliver the PRD** — No lessons, no activities, no progress, no curriculum. The entire product vision is abandoned.
- **Dead-end architecture** — Adding learning features later to a single-endpoint `app.py` would create a monolithic file with mixed concerns (TTS + content + progress + routing + validation), which is *worse* than a modular monolith because there are no boundaries to enforce. You cannot extract clean modules from a spaghetti file — you have to rewrite it.
- **No competitive differentiation** — A TTS playground is a tool, not a platform. Many free TTS tools exist. The learning features (structured curriculum, sequential progression, competency tracking) are what make Lughat Chat unique and valuable.
- **No learner retention** — Without lessons, activities, or progress, there is no reason for a learner to return. A playground is a utility; a curriculum is a commitment.
- **Wasted TTS investment** — The ~2GB model download, voice cloning, and speed controls exist to serve a learning experience, not a text box. Without structure, the TTS engine is overkill for a simple text-to-speech tool.
- **No path to scale** — Even if the goal is just a TTS playground today, there is no architectural path to add learning features later without a complete rewrite. Every new feature would be bolted onto `app.py`, making it larger and more tangled.
- **Abandoned product-market fit** — The PRD defines a CEFR-based structured curriculum with 30 lessons, competency-weighted scoring, and sequential unlocking. Delivering "just a TTS playground" abandons the entire value proposition and competes on a feature (TTS) where it has no advantage over dozens of free online tools.

---

## Recommendation

**Adopt Option A: Modular Monolith.**

### Rationale

1. **The team is one person.** The operational cost of microservices (3× containers, 3× databases, inter-service contracts, distributed testing) is unjustified.
2. **The system is local and single-user.** There is no scaling need, no fault-isolation requirement, no multi-team coordination.
3. **The PRD defines clear bounded contexts** — Content (static lesson data), Progress (mutable user state), TTS (external model) — which map naturally to Python modules within a single process.
4. **Modules can be extracted later.** If the platform grows to support multiple users, cloud deployment, or high concurrency, the Content and Progress modules can be extracted into separate services. The module boundaries we establish today make extraction trivial. The reverse (un-monolithifying from a single `app.py`) is painful.
5. **SQLite is sufficient.** For a single user, SQLite provides ACID transactions, zero configuration, and a single file that can be backed up. No need for PostgreSQL, MongoDB, or any other database.

### What We're Explicitly NOT Doing

- ❌ No separate databases per module — one SQLite file
- ❌ No inter-service HTTP calls — modules call each other directly
- ❌ No message queues or event buses — synchronous calls within one process
- ❌ No service discovery, load balancing, or circuit breakers
- ❌ No user accounts, authentication, or multi-tenancy
- ❌ No speech recognition or pronunciation scoring (in scope for a future ADR)

### Module Boundary Rules (Enforced by Linting)

| Rule | Enforcement |
|------|-------------|
| `content` module must not import `tts` or `progress` | flake8-import-order / isort |
| `progress` module may import `content` (to validate lesson existence) | flake8-import-order / isort |
| `tts` module must not import `content` or `progress` | flake8-import-order / isort |
| `api` (routes) may import all modules | No restriction |
| No module may import from `app` (circular dependency) | Pre-commit hook |

### Data Flow

```
User → Browser → Nginx → FastAPI (single process)
                              │
                              ├── Content Module ──→ JSON files (lessons)
                              │                      SQLite (lessons table)
                              │
                              ├── Progress Module ──→ SQLite (user_progress)
                              │                      (reads from Content for validation)
                              │
                              └── TTS Module ──────→ XTTS-v2 (in-memory model)
                                                       Speaker WAVs (reference audio)
```

### Open Questions for Future ADRs

1. **Speech recognition** — If we add pronunciation scoring, does the TTS module need to split into "synthesis" and "recognition" sub-modules? (ADR-003)
3. **Cloud deployment** — If we move from local Docker Compose to cloud hosting, does the modular monolith still hold, or do we extract the TTS service? (ADR-004)
4. **Content editor** — If we build a UI for creating/editing lesson JSON, does it need its own service to isolate content creation from learning? (ADR-005)
5. **Activity type taxonomy** — How do we define, validate, and extend new activity types without breaking existing lessons? (ADR-006)
6. **Progress scoring** — How do we score activities, aggregate competency scores, and determine lesson completion? (ADR-007)
7. **Audio recording UX** — How do we handle browser microphone permissions, recording UI, and audio preprocessing? (ADR-008)
8. **Frontend SPA architecture** — How do we structure the Nuxt SPA with multiple pages, a navigation bar, and a collapsible roadmap sidebar? (ADR-009)

---

## References

- [PRD: Lughat Chat — Arabic Language Education Platform](../PRD.md)
- [C4 Context Diagram](./c4-context.md)
- [C4 Containers Diagram](./c4-containers.md)
- [Project Architecture Blueprint](./Project_Architecture_Blueprint.md)
- [Monolith vs Microservices: Team Topology, Conway's Law, and the Distributed System Tax](https://hld.handbook.academy/curriculum/architecture-patterns/monolith-vs-microservices/)
