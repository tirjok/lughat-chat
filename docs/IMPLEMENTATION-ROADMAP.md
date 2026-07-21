# Implementation Roadmap — Lughat Chat

> **Generated:** 2026-07-12
> **Purpose:** Single reference for the order in which all implementation files should be built, chunk by chunk.
> **Source:** Derived from `docs/PRD.md`, `docs/workflows/`, `docs/implementation/`, and `docs/architecture/RC-REGISTRY.md`.

---

## Directory Relationships

```
docs/PRD.md                         → WHAT the system should do
docs/workflows/WORKFLOW-*.md        → HOW users interact (user journeys)
docs/implementation/IMPLEMENTATION-*.md  → BUILD (executable slices)
docs/architecture/RC-REGISTRY.md    → WHAT'S BROKEN (43 known issues)
```

## Chunk 1 — Foundation (No blockers, every other file depends on this)

| # | File | Slice | What |
|---|------|-------|------|
| 1 | `IMPLEMENTATION-model-loading-polling-fix.md` | M-01 | Increase frontend polling 20s → 120s (60 retries). **Critical path — do first.** ✅ DONE |
| 2 | `IMPLEMENTATION-model-cache-volume-fix.md` | M-04, M-05 | Fix volume mount path (unused ~2GB re-download) ✅ DONE |
| 3 | `IMPLEMENTATION-model-loading-progress.md` | M-06 | Add `model_name` + `sub_status` to `/health` ✅ DONE |
| 4 | `IMPLEMENTATION-default-voice-resolution.md` | S-1 | Fix default voice resolution (RC-003) — P0, no blockers ✅ DONE |

## Chunk 2 — TTS Runtime UX (Built on Chunk 1)

| # | File | Slice | What |
|---|------|-------|------|
| 5 | `IMPLEMENTATION-model-loading-recovery.md` | M-08 | Retry-after-error state machine ✅ DONE |
| 6 | `IMPLEMENTATION-model-loading-ux-during-wait.md` | M-11 | Persistent loading banner ✅ DONE |
| 7 | `IMPLEMENTATION-model-loading-recovery.md` | M-09–10 | "Retrying..." UI + manual retry button ✅ DONE |
| 8 | `IMPLEMENTATION-model-loading-ux-during-wait.md` | M-12–13 | Disable controls during loading + ready toast ✅ DONE |

## Chunk 3 — Speech Synthesis (TTS Studio)

| # | File | Slice | What |
|---|------|-------|------|
| 9 | `IMPLEMENTATION-speech-synthesis.md` | S-01 | Fix default voice resolution (P0) ✅ DONE |
| 10 | `IMPLEMENTATION-speech-synthesis.md` | S-02, S-05 | Store original text + audio cleanup ✅ DONE |
| 11 | `IMPLEMENTATION-speech-synthesis.md` | S-03, S-04, S-06–08 | Language, seed, error handling, autoplay, shortcuts ✅ DONE |
| 12 | `IMPLEMENTATION-model-cache-and-audio-persistence.md` | S-5 | Integration verification (end-to-end) ✅ DONE |

## Chunk 4 — Learning Platform Foundation (Parallel with Chunk 3)

| # | File | Slice | What |
|---|------|-------|------|
| 13 | `IMPLEMENTATION-lesson-content-serving.md` | S-1 | JSON content scanner  ✅ DONE |
| 14 | `IMPLEMENTATION-lesson-content-serving.md` | S-2 | SQLite `lessons` table  ✅ DONE |
| 15 | `IMPLEMENTATION-lesson-content-serving.md` | S-3 | `user_progress` table ✅ DONE |
| 16 | `IMPLEMENTATION-lesson-content-serving.md` | S-4, S-5 | `/api/lessons` + `/api/lessons/:id` ✅ DONE |
| 17 | `IMPLEMENTATION-lesson-content-serving.md` | S-6–9 | Schema validation, `useLessons`, lesson pages ✅ DONE |
| 18 | `IMPLEMENTATION-lesson-browsing-and-access.md` | S-1 | SQLite initialization (same as #14) ✅ DONE |
| 19 | `IMPLEMENTATION-lesson-browsing-and-access.md` | S-2–7 | Content, progress, dashboard, lesson view, navigation ✅ DONE |

## Chunk 5 — Navigation & Dashboard

| # | File | Slice | What |
|---|------|-------|------|
| 20 | `IMPLEMENTATION-dashboard-navigation-and-roadmap.md` | S-1 | Create `/playground` route (move TTS Studio) ✅ DONE |
| 21 | `IMPLEMENTATION-dashboard-navigation-and-roadmap.md` | S-2 | Navigation bar component ✅ DONE |
| 22 | `IMPLEMENTATION-dashboard-navigation-and-roadmap.md` | S-3–5 | Dashboard page + roadmap sidebar + lesson click nav ✅ DONE |
| 23 | `IMPLEMENTATION-playground-access.md` | S-1–3 | Wire playground to nav, mobile layout, error states ✅ DONE |

## Chunk 6 — Activity Submission (Final)

| # | File | Slice | What |
|---|------|-------|------|
| 24 | `IMPLEMENTATION-activity-submission-and-scoring.md` | S-1 | Scoring library (5 algorithms) ✅ DONE |
| 25 | `IMPLEMENTATION-activity-submission-and-scoring.md` | S-2 | Submission endpoint ✅ DONE |
| 26 | `IMPLEMENTATION-activity-submission-and-scoring.md` | S-3 | Progress persistence ✅ DONE |
| 27 | `IMPLEMENTATION-activity-submission-and-scoring.md` | S-4 | Frontend submission composable ✅ DONE |
| 28 | `IMPLEMENTATION-activity-submission-and-scoring.md` | S-5 | Activity renderer component ✅ DONE |
| 29 | `IMPLEMENTATION-activity-submission-and-scoring.md` | S-6 | Score display + lesson completion ✅ DONE |

---

## Where to Start

Slices M-01 (polling fix) and M-04 (volume path fix) are **done**. Next available:

- `IMPLEMENTATION-model-loading-polling-fix.md` — Slice M-02: Update tests for 60-retry default ✅ DONE
- `IMPLEMENTATION-model-loading-polling-fix.md` — Slice M-03: Update GenerateButton loading text ✅ DONE
- `IMPLEMENTATION-model-loading-progress.md` — Slice M-06: Add `model_name` + `sub_status` to `/health` ✅ DONE

All remaining slices (M-02 through M-13, S-01 through S-08) depend on these Phase 1 slices completing first.

## Key

- **P0** = Critical, do immediately
- **P1** = High priority, do after P0
- **P2** = Medium priority, do after P1
- **No blockers** = Can start immediately, may run in parallel with other chunks
