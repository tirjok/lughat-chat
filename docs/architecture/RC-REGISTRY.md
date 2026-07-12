# Global RC Registry — Lughat Chat

> **Purpose:** Single source of truth for all RC (Review Finding) numbers across the entire documentation set.
> **Created:** 2026-07-11
> **Last updated:** 2026-07-11
> **Governance:** New RC numbers must be assigned from this document. Per-workflow RC numbers are **deprecated** — use RC-NNN references instead.

---

## How to Use This Registry

1. **Find an issue** by searching RC-NNN or by keyword.
2. **Reference it** from any document using the format `RC-NNN` (e.g., "Fix RC-001").
3. **Never re-use an RC number** for a different issue. If you need a new number, assign the next available from the "Next available" list below.
4. **Cross-reference** — each entry lists every document that currently references it, so you can update all locations when an issue is resolved.

---

## RC Number Assignments

### TTS / Deployment Issues (Original PRD Known Issues)

| RC# | Issue | Severity | Status | ADR | Workflows Referencing | Implementation Plans Referencing |
|-----|-------|----------|--------|-----|----------------------|----------------------------------|
| **RC-001** | Frontend health polling window (20s) is 6× shorter than model load time (120s) — frontend shows "Error" long before model loads. Docker health check correctly accounts for 120s (`start_period: 120s`, `retries: 200`), but frontend polling (20s) does NOT match — frontend errors out ~100s before the model is ready. | Critical | To be fixed | — | Model Loading Readiness, Interconnected Map (RC-1) | Model Loading Polling Fix, Model Loading UX During Wait, Model Loading Progress, Speech Synthesis (RC-1), Speech Synthesis Slice S-06, Activity Submission (RC-1), Lesson Browsing (RC-1), Lesson Content Serving (RC-1), Dashboard Navigation (RC-1), Playground Access (RC-1) |
| **RC-002** | Frontend container blocks entirely while backend downloads model (~5–10 min on first start) — user sees blank page / connection refused | Critical | To be fixed | ADR-010 | Model Loading Readiness (RC-6), Interconnected Map (RC-1) | Model Loading Polling Fix, Model Loading UX During Wait, Model Loading Progress, Model Loading Recovery |
| **RC-003** | Default voice name mismatch: frontend defaults to `"female"` but deployed WAV files are `"KSA Hamed - Male"` and `"KSA Zariyah - Female"` | Critical | Resolved (ADR-011) | ADR-011 | Speech Synthesis (RC-3), Model Loading Readiness (RC-4), Interconnected Map (RC-7) | Default Voice Resolution, Speech Synthesis (RC-3), Speech Synthesis Slice S-01, Playground Access (RC-3), Dashboard Navigation (RC-3) |
| **RC-004** | Named volume `tts-model-cache` mounted at `/root/.local/share/tts` but app writes to `/app/.cache/tts` — volume is unused, ~2GB re-downloaded every restart | High | Proposed (ADR-012) | ADR-012 | Model Loading Readiness (RC-5), Model Cache Volume Fix, Interconnected Map (RC-5) | Model Cache Volume Fix, Model Cache and Audio Persistence |
| **RC-005** | `/api/history` always returns `text: ""` — original synthesized text is lost | High | Proposed (ADR-012) | ADR-012 | Speech Synthesis (RC-1), Interconnected Map (RC-8) | Speech Synthesis (RC-1), Speech Synthesis Slice S-02, Lesson Browsing (RC-1) |
| **RC-006** | FFmpeg fallback copies WAV to `.mp3` extension — browser may not decode WAV content served as `audio/mpeg` | Medium | Proposed (ADR-012) | ADR-012 | Speech Synthesis (RC-4), Interconnected Map (RC-6) | Speech Synthesis (RC-4), Speech Synthesis Slice S-02, Speech Synthesis Slice S-06, Lesson Browsing (RC-1) |
| **RC-007** | No rate limiting on `/api/generate` — disk fills indefinitely | Medium | Proposed (ADR-012) | ADR-012 | Speech Synthesis (RC-5), Interconnected Map (RC-5) | Speech Synthesis (RC-5), Speech Synthesis Slice S-05, Lesson Browsing (RC-5), Lesson Content Serving (RC-5) |

### Learning Platform Issues (New — Not in Original PRD)

| RC# | Issue | Severity | Status | ADR | Workflows Referencing | Implementation Plans Referencing |
|-----|-------|----------|--------|-----|----------------------|----------------------------------|
| **RC-008** | No `/api/pronounce` endpoint exists — pronunciation scoring cannot be implemented | Critical | To be fixed | — | Interconnected Map (RC-2) | Activity Submission (RC-2) |
| **RC-009** | No `useMicrophone` composable exists — no microphone capture for pronunciation scoring | Critical | To be fixed | — | Interconnected Map (RC-3) | Activity Submission (RC-4) |
| **RC-010** | No scoring logic exists for any activity type (5 algorithms must be built) | Critical | To be fixed | ADR-003 | Activity Submission (RC-1), Interconnected Map (RC-4) | Activity Submission (RC-1), Activity Submission Slice S-03 |
| **RC-011** | No SQLite code exists in `app.py` — no database initialization, no `lessons` or `user_progress` tables | Critical | To be fixed | ADR-002 | Lesson Browsing (RC-2), Activity Submission (RC-2), Interconnected Map (RC-5) | Lesson Browsing (RC-2), Activity Submission (RC-2), Lesson Content Serving (RC-2) |
| **RC-012** | Only 1 of 30 lesson JSON files exists (`backend/content/a1/lesson-01.json`) — `a2/` and `b1/` directories are empty | Critical | To be fixed (data gap, not code gap) | — | Lesson Browsing (RC-1), Lesson Content Serving (RC-1), Dashboard Navigation (RC-1), Interconnected Map (RC-6) | Lesson Browsing (RC-1), Lesson Content Serving (RC-1), Dashboard Navigation (RC-1) |
| **RC-013** | No `/api/lessons` or `/api/lessons/:id` endpoints exist | Critical | To be fixed | — | Lesson Browsing (RC-3), Lesson Content Serving (RC-3) | Lesson Browsing (RC-3), Lesson Content Serving (RC-3) |
| **RC-014** | No activity submission endpoint exists (`/api/lessons/:id/activities/:activityId/submit`) | Critical | To be fixed | — | Activity Submission (RC-3) | Activity Submission (RC-3) |
| **RC-015** | No `useActivitySubmission` composable exists | High | To be fixed | — | Activity Submission (RC-4) | Activity Submission (RC-4) |
| **RC-016** | No `ActivityRenderer` component exists — no activity-specific renderer (5 renderers needed) | High | To be fixed | — | Activity Submission (RC-5) | Activity Submission (RC-5) |
| **RC-017** | No fuzzy matching library in requirements — translation scoring needs fuzzy match | High | To be fixed | — | Activity Submission (RC-6) | Activity Submission (RC-6) |
| **RC-018** | No harakat normalization/comparison exists — Arabic diacritics not handled in scoring | High | To be fixed | ADR-003 | Activity Submission (RC-7) | Activity Submission (RC-7) |
| **RC-019** | No competency score computation exists — `competency_impact` defined in API but no implementation | High | To be fixed | ADR-007 | Activity Submission (RC-8) | Activity Submission (RC-8) |
| **RC-020** | No sequential unlocking logic implemented — lesson N-1 must be completed before lesson N | High | To be fixed | ADR-007 | Lesson Browsing (RC-5) | Lesson Browsing (RC-5) |
| **RC-021** | No Dashboard page exists — current `index.vue` is TTS Studio, not Dashboard | Critical | To be fixed | — | Dashboard Navigation (RC-1), Playground Access (RC-1) | Dashboard Navigation (RC-1), Playground Access (RC-1) |
| **RC-022** | No navigation bar exists — users cannot access Playground or Lessons from navigation | Critical | To be fixed | — | Dashboard Navigation (RC-2), Playground Access (RC-2) | Dashboard Navigation (RC-2), Playground Access (RC-2) |
| **RC-023** | No roadmap sidebar exists — no collapsible sidebar for lessons | Critical | To be fixed | — | Dashboard Navigation (RC-3) | Dashboard Navigation (RC-3) |
| **RC-024** | No `/playground` route exists — current app is single page at `/` | High | To be fixed | ADR-009 | Dashboard Navigation (RC-4), Playground Access (RC-1) | Dashboard Navigation (RC-4), Playground Access (RC-1) |
| **RC-025** | No `/lesson/:id` route exists — no file-based routing for lessons | High | To be fixed | ADR-009 | Dashboard Navigation (RC-5) | Lesson Browsing (RC-3), Dashboard Navigation (RC-5) |
| **RC-026** | No `/api/pronounce` endpoint exists (duplicate of RC-008) | Critical | To be fixed | — | Interconnected Map (RC-2) | — |
| **RC-027** | No `useMicrophone` composable exists (duplicate of RC-009) | Critical | To be fixed | — | Interconnected Map (RC-3) | — |
| **RC-028** | `SynthesisResponse` Pydantic model is defined but never used — endpoint returns `FileResponse` directly | Medium | To be fixed | — | Speech Synthesis (RC-2) | Speech Synthesis (RC-2) |
| **RC-029** | `seed` parameter defaults to 42 per-request but is optional in the API — frontend does NOT send `seed` | Low | To be fixed | — | Speech Synthesis (RC-6) | Speech Synthesis (RC-6), Speech Synthesis Slice S-04 |
| **RC-030** | Frontend hardcodes `language: 'ar'` in `useTtsApi.synthesize()` — user cannot select language | Low | To be fixed | — | Speech Synthesis (RC-7) | Speech Synthesis (RC-7), Speech Synthesis Slice S-03 |
| **RC-031** | No `/api/pronounce` endpoint exists (duplicate of RC-008) | Critical | To be fixed | — | Interconnected Map (RC-2) | — |
| **RC-032** | No `user_progress` table exists — progress status cannot be resolved for lesson summaries or locked-lesson checks | Critical | To be fixed | — | Lesson Content Serving (RC-5) | Lesson Content Serving (RC-5) |
| **RC-033** | No schema validation code exists for lesson JSON files | Medium | To be fixed | — | Lesson Content Serving (RC-4) | Lesson Content Serving (RC-4) |
| **RC-034** | `useVoices` composable type mismatch with API (returns `Voice` objects with `dialect`, `tag`, `icon`, `speaker_wav` but API returns `{id, name}`) | Medium | To be fixed | ADR-009 | Lesson Browsing (RC-4) | Lesson Browsing (RC-4) |
| **RC-035** | No Pinia installed — project uses pure composables, ADR-009 recommends Option C (Hybrid) but Pinia not installed | Low | Not blocking | ADR-009 | Dashboard Navigation (RC-6) | Dashboard Navigation (RC-6) |
| **RC-036** | Existing TTS components must be preserved when moving to `/playground` — 6 components (AudioPlayerPanel, WaveformCanvas, GenerateButton, SpeedSlider, VoiceSelector, ToastNotification) | High | Not blocking | ADR-009 | Dashboard Navigation (RC-7) | Dashboard Navigation (RC-7) |
| **RC-037** | Existing TTS Studio code IS the Playground — no changes to TTS Studio code needed, only routing/page structure change | Low | Not blocking | ADR-009 | Playground Access (RC-3) | Playground Access (RC-3) |
| **RC-038** | Frontend is a static SPA served by Nginx — loads regardless of backend health | Medium | Not blocking | ADR-010 | Model Loading Readiness (RC-3) | Model Loading UX During Wait (RC-3) |
| **RC-039** | The `generate_speaker_wavs.py` script generates `female.wav`/`male.wav` but deployed files are `KSA Hamed - Male.wav`/`KSA Zariyah - Female.wav` | High | Not blocking (RC-003 covers this) | — | Model Loading Readiness (RC-4) | — |
| **RC-040** | `/health` returns only `"loading"` / `"ready"` / `"error"` — no granularity during 120s wait | High | To be fixed | ADR-010 | Model Loading Progress (RC-1) | Model Loading Progress (RC-1) |
| **RC-041** | Frontend polling enters error state permanently — no automatic recovery | Critical | To be fixed | — | Model Loading Recovery (RC-1) | Model Loading Recovery (RC-1) |
| **RC-043** | No scoring logic exists — 5 algorithms must be built (duplicate of RC-010) | Critical | To be fixed | ADR-003 | Activity Submission (RC-1) | Activity Submission (RC-1) |

### Duplicate RC Entries (Consolidation Notes)

The following RC numbers in the Interconnected Map and per-workflow docs duplicate entries already assigned above. They are **kept for traceability** but should be updated to reference the canonical RC-NNN:

| Duplicate RC | Maps To Canonical | Reason |
|-------------|-------------------|--------|
| Interconnected Map RC-2 | RC-008 | No `/api/pronounce` endpoint |
| Interconnected Map RC-3 | RC-009 | No `useMicrophone` composable |
| Interconnected Map RC-4 | RC-010 | No scoring logic |
| Interconnected Map RC-5 | RC-004 or RC-011 | "No SQLite code" — ambiguous (see note below) |
| Interconnected Map RC-6 | RC-012 | Only 1 of 30 lesson JSON files |
| Interconnected Map RC-7 | RC-003 | Default voice name mismatch |
| Interconnected Map RC-8 | RC-005 | `/api/history` returns empty text |

**Note on Interconnected Map RC-5:** This is ambiguous — it could refer to RC-004 (model cache path) or RC-011 (no SQLite code). Context shows it means "no SQLite code," so it maps to **RC-011**.

### Next Available RC Number

**RC-042** — now reclaimed (consolidated into RC-001). Reserve for new issues discovered during future audits.

---

## Mapping: Per-Workflow RC Numbers → Global RC Registry

This table shows how every per-workflow RC number maps to the global registry. When updating a document, replace the local RC number with the global RC-NNN.

### Model Loading Readiness Workflow

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-1 | RC-001 | Frontend polling 20s vs 120s model load |
| RC-2 | RC-001 | Docker health check vs frontend polling discrepancy (consolidated into RC-001) |
| RC-3 | RC-038 | Frontend SPA loads regardless of backend health |
| RC-4 | RC-039 | `generate_speaker_wavs.py` script vs deployed files naming |
| RC-5 | RC-004 | Model cache path mismatch |

### Speech Synthesis Workflow

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-1 | RC-005 | Backend doesn't store original text |
| RC-2 | RC-028 | Dead code: `SynthesisResponse` Pydantic model never used |
| RC-3 | RC-003 | Default voice name mismatch |
| RC-4 | RC-006 | FFmpeg fallback serves WAV as .mp3 |
| RC-5 | RC-007 | No rate limiting on `/api/generate` |
| RC-6 | RC-029 | `seed` parameter defaults to 42, frontend doesn't send it |
| RC-7 | RC-030 | Frontend hardcodes `language: 'ar'` |
| RC-8 | RC-007 | No cleanup mechanism (duplicate of RC-5) |

### Lesson Browsing and Access Workflow

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-1 | RC-012 | Only 1 of 30 lesson JSON files exists |
| RC-2 | RC-011 | No SQLite code exists |
| RC-3 | RC-013 | No `/api/lessons` or `/api/lessons/:id` endpoints |
| RC-4 | RC-034 | `useVoices` composable type mismatch with API |
| RC-5 | RC-020 | No sequential unlocking logic |

### Activity Submission and Scoring Workflow

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-1 | RC-010 | No scoring logic exists (5 algorithms) |
| RC-2 | RC-011 | No SQLite code exists |
| RC-3 | RC-014 | No activity submission endpoint |
| RC-4 | RC-015 | No `useActivitySubmission` composable |
| RC-5 | RC-016 | No `ActivityRenderer` component |
| RC-6 | RC-017 | No fuzzy matching library |
| RC-7 | RC-018 | No harakat normalization/comparison |
| RC-8 | RC-019 | No competency score computation |

### Lesson Content Serving Workflow

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-1 | RC-012 | Only 1 of 30 lesson JSON files exists |
| RC-2 | RC-011 | No SQLite code exists |
| RC-3 | RC-013 | No `/api/lessons` or `/api/lessons/:id` endpoints |
| RC-4 | RC-033 | No schema validation code for lesson JSON |
| RC-5 | RC-032 | No `user_progress` table |

### Dashboard Navigation and Roadmap Workflow

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-1 | RC-021 | No Dashboard page exists |
| RC-2 | RC-022 | No navigation bar exists |
| RC-3 | RC-023 | No roadmap sidebar exists |
| RC-4 | RC-024 | No `/playground` route exists |
| RC-5 | RC-025 | No `/lesson/:id` route exists |
| RC-6 | RC-035 | No Pinia installed (not blocking) |
| RC-7 | RC-036 | Existing TTS components must be preserved |

### Playground Access Workflow

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-1 | RC-021 | Playground page doesn't exist (duplicate of RC-021) |
| RC-2 | RC-022 | No navigation bar exists (duplicate of RC-022) |
| RC-3 | RC-037 | Existing TTS Studio code IS the Playground |

### Model Loading Polling Fix Implementation

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-1 | RC-001 | Frontend polling 20s vs 120s model load |
| RC-2 | RC-001 | Docker health check vs frontend polling discrepancy (consolidated into RC-001) |

### Model Loading UX During Wait Implementation

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-1 | RC-001 | Frontend polling 20s vs 120s (critical bug) |
| RC-3 | RC-038 | Frontend SPA loads regardless of backend health |

### Model Loading Progress Implementation

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-1 | RC-040 | `/health` returns only loading/ready/error — no granularity |

### Model Loading Recovery Implementation

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-1 | RC-041 | Frontend polling enters error state permanently |

### Model Cache Volume Fix Implementation

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-5 | RC-004 | Model cache path mismatch |
| RC-3 | RC-001 | Frontend polling vs Docker health check discrepancy (consolidated into RC-001) |

### Model Cache and Audio Persistence Implementation

| Local RC# | Maps To | Issue |
|-----------|---------|-------|
| RC-5 | RC-004 | Model cache path mismatch |
| RC-1 (Synthesis) | RC-005 | `/api/history` returns empty text |
| RC-4 (Synthesis) | RC-006 | FFmpeg fallback copies WAV to .mp3 |
| RC-5 (Synthesis) | RC-007 | No rate limiting on `/api/generate` |

### Speech Synthesis Implementation (Slices)

| Slice | Local RC# | Maps To | Issue |
|-------|-----------|---------|-------|
| S-01 | RC-3 | RC-003 | Default voice resolution |
| S-02 | RC-1 | RC-005 | Store original text with audio |
| S-02 | RC-4 | RC-006 | FFmpeg fallback error handling |
| S-03 | RC-7 | RC-030 | Add `language` field to frontend API |
| S-04 | RC-6 | RC-029 | Add seed support to frontend |
| S-05 | RC-5 | RC-007 | Clean up old audio files |
| S-05 | RC-8 | RC-007 | No cleanup (duplicate) |
| S-06 | RC-2 | RC-028 | Dead code: SynthesisResponse model |
| S-06 | RC-4 | RC-006 | FFmpeg fallback error handling |

### Default Voice Resolution Implementation

No local RC numbers referenced.

---

## Interconnected Map RC Numbers → Global RC Registry

The Interconnected Map uses a separate numbering scheme. Here is the canonical mapping:

| Interconnected Map RC# | Maps To | Issue |
|------------------------|---------|-------|
| RC-1 | RC-001 | Frontend polls /health for 20s, but model loads in ~180-210s |
| RC-2 | RC-008 | No `/api/pronounce` endpoint exists |
| RC-3 | RC-009 | No `useMicrophone` composable exists |
| RC-4 | RC-010 | No scoring logic exists for any activity |
| RC-5 | RC-011 | No SQLite code exists |
| RC-6 | RC-012 | Only 1 of 30 lesson JSON files exists |
| RC-7 | RC-003 | Default voice name mismatch |
| RC-8 | RC-005 | `/api/history` always returns `text: ""` |

---

## Status Legend

| Status | Meaning |
|--------|---------|
| **To be fixed** | Issue identified, fix not yet implemented |
| **Proposed (ADR-012)** | Fix documented in ADR-012, not yet implemented |
| **Resolved (ADR-011)** | Fix implemented via ADR-011, verified in production |
| **Not blocking** | Issue exists but does not block implementation |
| **Data gap, not code gap** | Issue requires content creation, not code changes |

---

## Governance Rules

1. **One number, one issue.** Once an RC-NNN is assigned, it never changes meaning.
2. **Global first.** Always reference the global RC-NNN from any document. Per-workflow RC numbers are deprecated.
3. **Cross-reference update.** When an issue is resolved, update this registry and update every document that references the RC-NNN.
4. **Audit before assigning.** Before assigning a new RC number, check this registry to ensure the issue isn't already covered.
5. **Next available number.** Always use the next available RC number from the "Next available" section. Never skip numbers.
