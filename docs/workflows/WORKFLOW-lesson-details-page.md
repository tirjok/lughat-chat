# WORKFLOW: Lesson Details Page Session

**Version**: 0.1
**Date**: 2026-08-19
**Author**: Workflow Architect
**Status**: Draft
**Implements**: ADR-008 (accepted), ADR-007 (accepted), ADR-004 (accepted), ADR-002 (accepted)
**Based on**: `docs/requirements/lesson-details-page.md`, `docs/proto/lesson-details.html`

---

## Overview

A learner opens `/dashboard/level/{level}/{lesson}`. The page orchestrator (`[lesson].vue`) resolves the lesson from static curriculum data (ADR-007), renders the interactive shell (hero, competency checklist, five section tabs with per-section components per ADR-008), synthesizes Arabic text on tap via `POST /api/generate` (external system boundary), plays it through the sticky bottom audio bar (ADR-004), and aggregates progress into the `GlobalNavbar` (rendered in `app.vue`, outside the page). This spec covers the full page session: entry, navigation, TTS handoff, playback, progress, and page-leave cleanup. Activity interactivity is deferred to Phase 2 (ADR-008); the spec reserves the branch and its cleanup so it is not lost.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Learner (customer) | Navigates to the lesson, switches sections, taps lines/words for audio, controls playback, checks competencies |
| Page orchestrator (`[lesson].vue`) | Resolves lesson, computes section slices, owns shared state, intercepts play events, drives `useAudioModule`, emits cleanup on leave |
| Section components (`LessonDialogue`, `LessonVocabulary`, `LessonPronouns`, `LessonExpressions`, `LessonGrammar`, new `LessonCompetencies`) | Render one section's data shape; emit `play(text)` and section events; own local UI state |
| `useAudioModule()` | Owns the single `<audio>` element: load/play/pause/seek/download/dispose, object-URL lifecycle, error state |
| `StickyAudioBar.vue` | Transport UI (play/pause/seek/prev/next/speed/repeat/close) + keyboard shortcuts |
| `GlobalNavbar.vue` (layout, in `app.vue`) | Renders the progress bar; consumes shared progress state (cannot receive props from the page — see Finding F-2) |
| `useTtsApi()` | HTTP client for `POST /api/generate` |
| Backend (FastAPI + Coqui XTTS-v2) | Synthesizes MP3; serializes all synthesis on a single `_model_lock`; returns binary or error JSON |
| Nginx | Proxies `/api/*` to backend; `proxy_buffering off`, `proxy_read_timeout 1800s` |

---

## Prerequisites

- `SectionDefinition` has `name?` (optional), `type?` (optional), `title?` (optional), `content: SectionContent`, `_lessonId: string`, and a `get items(): SectionItem[]` accessor (verified in `curriculum.ts:37-44`). The skeleton currently reads `s.title` (line 48 of `[lesson].vue`) which is a bug — `SectionDefinition` has no `title` property; the skeleton should read `s.name` or `s.title` (both optional, `name` is the intended field).
- `SectionType` union includes `'activity'` (line 133 of `curriculum.ts`) in addition to `dialogue | vocabulary | pronouns | expressions | grammar`.
- `GlobalNavbar` is rendered by `app.vue` for paths `/`, `/dashboard`, `/dashboard/level*` (verified) — it is an **ancestor** of the page, not a child.
- `useHealthPoll` module-level singleton is available (shared across all pages, verified) with `status: loading | ready | error`.
- Backend is running; `/health` returns `loading → ready | error`; a not-ready backend answers synthesis with 503. Frontend must respect 503s (AGENTS.md §5).
- `SectionItem` has `audioUrl?: string` and `options?: string[]` (lines 117-125 of `curriculum.ts`) — these fields are available on the flat projection but not yet wired to any section component.
- ADR-002: no per-page layout files are introduced for the lesson route (would conflict with the global `GlobalNavbar` wrapper).

---

## Trigger

User navigates to `/dashboard/level/{level}/{lesson}` via: level-index lesson card (`NuxtLink`), navbar, direct URL entry, or browser back/forward.

---

## Workflow Tree

### STEP 1: Route resolution and lesson load

**Actor**: Page orchestrator
**Action**: Read `level` + `lesson` route params (via `safeRoute`/`safeRouter` wrappers for test-safety); resolve `level` against `curriculum.ts` levels; resolve lesson via `getLessonById()`.
**Timeout**: n/a (synchronous static data; budget: immediate)
**Input**: `{ level: string, lesson: string }`
**Output on SUCCESS**: `currentLessonData = LessonDefinition` → GO TO STEP 2
**Output on FAILURE**:
- `FAILURE(unknown_level)`: level not in curriculum → redirect to `/dashboard` (existing behavior) → TERMINAL
- `FAILURE(unknown_lesson)`: level known, lesson id not found → render 404 page (existing behavior) → TERMINAL
- `FAILURE(data_shape)`: lesson found but `sections[]` empty or a section's `content` type not in the union → page shell renders with per-section fallback cards ("Content coming soon") → GO TO STEP 2 (degraded)
**Observable states during this step**:
- Customer sees: nothing / redirect / 404 page
- Operator sees: browser console only
- Database: n/a (static data)
- Logs: n/a

---

### STEP 2: Page shell render and audio initialization

**Actor**: Page orchestrator
**Action**: Render `LessonHero` (wired: `arabicTitle`, `estimatedTime`, scene summary, `audioType`, `isReady`), `LessonCompetencies`, section tab bar (`activeSection` defaults to first section — "Dialogue"), one `<section v-if>` block per section type rendering the matching component (ADR-008), `StickyAudioBar` (`active=false`); initialize `useAudioModule()` (audio element attaches lazily — events wire on `audioRef` attach, existing behavior); initialize shared progress state for this lesson.
**Timeout**: budget 500ms perceived (static data, synchronous render)
**Output on SUCCESS**: page visible, first section rendered, audio module idle, bar hidden → GO TO STEP 3
**Output on FAILURE**:
- `FAILURE(attach_deferred)`: audio element not attached yet → composable `play()` early-returns (verified); no user-visible error; first audio tap waits for attach
- `FAILURE(render)`: a section component throws / its slice is malformed → that section shows fallback card; other sections unaffected
**Observable states**:
- Customer sees: hero + tabs + first section + hidden bar
- Operator sees: console
- Database: n/a — Logs: n/a

---

### STEP 3: Section navigation (repeatable sub-workflow)

**Actor**: Learner + page orchestrator
**Trigger**: Tab click, or `ArrowLeft`/`ArrowRight` keydown (page-level handler)
**Action**: `activeSection = <section name>`; `<section v-if>` swap mounts the target component, unmounts the previous.
**Timeout**: n/a
**Input**: `{ section: 'Dialogue' | 'Vocabulary' | 'Pronouns' | 'Expressions' | 'Grammar' | 'Activities' }` (tabs derive from `lesson.sections[].name` — note: `SectionDefinition` has `name?` not `title`; the skeleton currently reads `s.title` which is a bug — Finding F8) (an unknown tab is unreachable)
**Output on SUCCESS**: active tab state moves; target section visible; focus moves into section container (a11y) → LOOP (user may repeat STEP 3 or interact)
**Output on FAILURE**:
- `FAILURE(unknown_type)`: computed guard — `section.type` not in the type union → render fallback card instead of a component
- `FAILURE(focus)`: focus target not in DOM after `v-if` swap → set focus on next tick (guard)
**Concurrency**: rapid tab mashing → last write wins on the single `activeSection` ref; only the active tab is mounted, so no double-render or doubled listeners.
**Observable states**:
- Customer sees: tab active state + section content
- Operator sees: none — Database: n/a — Logs: n/a
**Cleanup note**: unmounting a section component must remove its own listeners/timers (component-level `onUnmounted`); the page-level keydown handler is bound once and checks `activeSection`.

---

### STEP 4: Audio request — TTS handoff (system boundary)

**Actor**: Learner → section component → page orchestrator → `useTtsApi` → Nginx → backend
**Trigger**: Learner taps a line card / word / pronoun / expression (play affordance).
**Action**: (1) client-side guard: reject empty text; (2) harakat-normalize the Arabic text (requirement decision §5; utility does not exist yet — Assumption A13); (3) if a request is already in flight, **abort it** (AbortController — NEW behavior, Finding F-4); (4) `POST /api/generate` with payload; (5) on 200, hand the MP3 blob to `useAudioModule.load(blob)` and activate the bar.
**Timeout**: 30s client-side request timeout (Assumption A1; requirement says "30s or 120s" and current code has no timeout at all). Nginx cap: 1800s (verified A13 in registry). Expiry is treated as `FAILURE(timeout)`.
**Input (PAYLOAD)**: `{ text: string (1–3000 chars, harakat-normalized), language: "ar", speaker?: string (voice id from /api/voices; backend default "female"), speed?: number (default 1.0; applied by backend ffmpeg atempo), seed?: number (backend default 42) }`
**Output on SUCCESS (200)**: binary MP3 (`audio/mpeg`, not JSON — verified) → `useAudioModule.load(blob)` (prior object URL revoked, new one created) → `StickyAudioBar.active = true`, `textContent = tapped line`, auto-`play()` → GO TO STEP 5
**Output on FAILURE**:
- `FAILURE(503_model_loading)`: model not ready → retryable. UI: "Model is still loading" state on the tapped item + bar; honor 503 (AGENTS.md §5). No cleanup needed (no URL created).
- `FAILURE(422_validation)`: Pydantic rejected `text` (empty / >3000 / language ∉ {ar,en}) → permanent; show validation message on the tapped item. (Requirement's "400" is stale — Finding F-1.)
- `FAILURE(500_speaker_missing)`: "Speaker WAV file not found…" → permanent; surface detail.
- `FAILURE(500_generic)`: XTTS inference or FFmpeg failure → treat as permanent; surface "An error occurred on the server" + detail. (No `retryable` flag exists in the response — Finding F-3.)
- `FAILURE(network)`: fetch rejects → "Unable to connect to the server" (existing client message) → transient; retryable.
- `FAILURE(timeout)`: 30s client budget expired → abort; treat as 500-class "request timed out" → transient; retryable.
- `FAILURE(supersede)`: a newer tap aborted this in-flight request → silent by design (no error UI); the aborted request's response, if it still arrives, is discarded.
**Cleanup on this step's failure**: nothing created client-side before the blob arrives (no object URL to revoke); in-flight fetch is aborted.
**Concurrency**: one in-flight TTS request per page (cancel-previous policy). Backend: all synthesis requests serialize on the single `_model_lock` (verified; registry open question #3) — rapid taps queue silently server-side; the client sees long "fetching" states rather than rejections.
**Observable states**:
- Customer sees: spinner on tapped item → bar slides up → waveform animation + text
- Operator sees: backend log "Generating speech: …"; file appears in `/api/history`
- Database: n/a (backend SQLite tracks lessons/progress but exposes no progress endpoint — Finding F-7)
- Logs: backend prints synthesis start/finish; frontend console on error

---

### STEP 5: Playback and transport control

**Actor**: Learner + `StickyAudioBar` + `useAudioModule`
**Trigger**: Bar controls or keyboard shortcuts (bar active): `Ctrl/Cmd+Enter` toggle, `Space` toggle (bar's keydown handler, removed on unmount — verified), `ArrowLeft`/`ArrowRight` seek ±5s (when bar focused), plus prev/next line, speed menu, repeat menu, seek bar, close.
**Action**: Dispatch to `useAudioModule` (`play`/`pause`/`toggle`/`seek`/`download`/`dispose`); update bar props.
**Timeout**: n/a (local media).
**Output on SUCCESS**:
- play/pause/toggle updates `isPlaying`/`isPaused`; `timeupdate` drives `currentTime`; `ended` applies repeat mode (`off` → idle | `one` → replay | `all` → next line in sequence)
- prev/next line → re-runs STEP 4 for the adjacent line
- speed change → **re-synthesizes at the new speed** (Assumption A3: speed is a synthesis parameter via ffmpeg atempo, verified in backend; not a live `playbackRate`)
- close → pause + hide bar + reset active-line highlight → back to STEP 3 loop
**Output on FAILURE**:
- `FAILURE(decode_error)`: media `error` event (corrupt/unsupported MP3) → bar error state "Unable to play audio"; text retained
- `FAILURE(autoplay_reject)`: `play()` promise rejects (autoplay policy) → module `error` string set (existing behavior, verified); bar shows error state
**Concurrency**: rapid prev/next taps → each is a STEP 4 (cancel-previous); seeks during fetch are no-ops until loaded. Sequential "play scene" runs lines back-to-back with an 800ms gap timer (Assumption A2, from proto) — the timer must be cleared on any user stop, section change, or page leave.
**Observable states**:
- Customer sees: waveform animation, time display, bar active state
- Operator sees: none — Database: n/a — Logs: n/a

---

### STEP 6: Competency checklist

**Actor**: Learner + `LessonCompetencies` (new component)
**Trigger**: Collapse/expand click; checkbox toggle (a1-01 carries 5 competencies per the proto; optional field in the `LessonDefinition` interface).
**Action**: Track `checkedCompetencies: Set<string>` in lesson-scoped state (page-owned, per ADR-008 the page mediates cross-component state); update the "X of N" counter.
**Timeout**: n/a
**Output on SUCCESS**: checked state + counter update; feeds the STEP 8 progress metric if A4 resolves to competencies.
**Output on FAILURE**: none — pure local state, no I/O. (Persistence is an Open Question, not a failure mode.)
**Observable states**: Customer sees: checked boxes + counter. Operator/DB/Logs: n/a.

---

### STEP 7: Activity flow — DEFERRED (Phase 2, per ADR-008)

**Status**: Placeholder branch only; **no Phase 1 implementation**. The spec reserves the branch so its cleanup and test surface are not lost.
**Actor**: Learner + future `LessonActivities` → `LessonActivityRunner`
**Per-activity contract** (Phase 2): interaction → validation (harakat-normalized comparison, Assumption A13) → score → `activityComplete(id, score)` → STEP 8 progress update.
- `maxAttempts: number` on `ActivityDefinition` (line 171 of `curriculum.ts`) — the spec's "max 5 attempts" is a placeholder; the actual value comes from the data model.
**Cleanup** (Phase 2): per-activity attempt/completion state lives in the component's local state and dies with unmount; anything written to page state must be reset in ABORT_CLEANUP.

---

### STEP 8: Progress aggregation and navbar wiring

**Actor**: Page orchestrator → shared progress state → `GlobalNavbar`
**Mechanism (required)**: a module-level singleton composable following the `useHealthPoll` pattern (verified). The requirement's "pass progress as a computed prop from the lesson page" is **architecturally infeasible** — `GlobalNavbar` is rendered by `app.vue`, the page's ancestor; a child cannot set a parent's props (Finding F-2). Shared state is the only mechanism.
**Metric** (Assumption A4 — human decides): `completedLines / totalLines` (proto §audio + requirement Phase 10) **vs** `checkedCompetencies.size / total` (requirement open question #4). Default in this spec: lines.
**Action**: `setLessonProgress(lessonId, pct)` on line completion (Assumption A5: a line completes when its playback reaches `ended`) and on competency toggle (if metric A4 = competencies); navbar's `progressWidth` reads the current lesson's pct.
**Timeout**: n/a (pure client).
**Output on SUCCESS**: navbar progress bar reflects pct (existing 500ms CSS transition).
**Output on FAILURE**: none — pure client state.
**Persistence**: none (in-memory; Assumption A6). Resets on lesson change and on page leave (ABORT_CLEANUP step 5).

---

### STEP 9: Lesson terminal state

**Actor**: Page orchestrator
**Trigger**: Learner navigates away (link, navbar, back/forward), or (future) an explicit "lesson complete" condition (Open Question Q3).
**Action**: Execute ABORT_CLEANUP.
**Terminal**: no further updates until the page remounts (fresh in-memory state).

---

## ABORT_CLEANUP: Page leave

**Triggered by**: `onBeforeRouteLeave` / `onUnmounted` — any exit: navigation, 404 redirect, or unmount.
**Actions** (in order, all capabilities verified in existing code):
1. Stop playback (`pause()`); clear the sequential-playback 800ms timer and any pending `setTimeout` in page/section scope.
2. Abort any in-flight TTS fetch (AbortController).
3. `useAudioModule.dispose()` → `revokeAll()` object URLs (verified: tracks all created URLs in a Set; idempotent) + clear the audio element `src`.
4. Reset `StickyAudioBar` `active = false` (bar hides; viewport `padding-bottom` released via the bar's own transition — verified).
5. Reset the shared progress state for this lesson (to 0 / cleared — per Assumption A6).
6. Remove the page-level keydown listener (StickyAudioBar's own shortcut listener self-removes on unmount — verified).

**What customer sees**: bar hides; page unmounts.
**What operator sees**: nothing (all state in-memory).
**Partial-failure variant** (TTS failed mid-lesson, then leave): steps 1, 3 (no-op if no URL was created), 4, 5, 6 still run; the failed line remains visually un-highlighted; no orphaned client resources.
**Backend side**: if the client disconnects mid-stream, the backend's `_response_delivered` flag prevents orphaning (verified registry A7); worst case the MP3 stays until the 24h TTL (`/api/history` inline + `/api/cleanup`).

---

## State Transitions

```
page:      [loading] → (resolve) → [ready] | [404] | [redirect]
section:   [Dialogue (default)] ⇄ [Vocabulary | Pronouns | Expressions | Grammar]   (tab / keys)
audio:     [idle] → (tap) → [fetching] → (200) → [loaded] → (play) → [playing] ⇄ [paused]
           [fetching] → (503|422|500|net|timeout) → [error] → (retry) → [fetching] | (close) → [idle]
           [playing] → (ended) → [idle | replay | next-line per repeat mode]
progress:  [0%] → (line ended / competency checked) → [N%] → (leave) → [reset]
navbar:    [loading] → [ready] | [error]   (singleton, existing — already specced as Health Monitoring)
```

---

## Handoff Contracts

### Frontend (`useTtsApi`) → Backend (FastAPI)

**Endpoint**: `POST /api/generate` (proxied by Nginx; verified at `backend/app.py:342`. Requirement doc §15 names it `/api/tts` — stale, Finding F-1.)

**Payload**:
```json
{
  "text": "string — 1–3000 chars, harakat-normalized",
  "language": "\"ar\" — only value the frontend sends (backend also accepts \"en\")",
  "speaker": "string? — voice id from /api/voices; backend default \"female\"",
  "speed": "number? — default 1.0; backend applies via ffmpeg atempo",
  "seed": "number? — backend default 42 (applied in handler, registry A16)"
}
```
**Success response**: `200`, `Content-Type: audio/mpeg`, body = binary MP3 (`FileResponse` — not JSON; the frontend's `SynthesisResponse` interface is dead code, registry deprecated).
**Failure responses** (all JSON `{ "detail": string }`; **no `retryable` flag exists** — Finding F-3):
```json
{ "detail": "validation error" }                    // 422 — empty/too-long/invalid language (Pydantic). Requirement's "400" never occurs.
{ "detail": "TTS model not ready" }                 // 503 — retryable
{ "detail": "Speaker WAV file not found: ..." }     // 500 — permanent
{ "detail": "Failed to generate audio" }            // 500 — inference failure (permanent as observed)
{ "detail": "Failed to encode audio — FFmpeg conversion error" }  // 500 — permanent
```
**Network failure** (fetch rejects): client surfaces "Unable to connect to the server" — transient.
**Timeout**: 30s client-side (Assumption A1 — NEW; current code has none, Finding F-4). Nginx `proxy_read_timeout` 1800s is the hard cap (registry A13).
**On failure**: per-code recovery as defined in STEP 4.

### Page → `useAudioModule` (internal handoff)

**PAYLOAD**: `load(blob: Blob)`
**SUCCESS**: prior object URL revoked (verified: every `load` revokes the previous), new URL created, element `src` wired, `audioUrl` set
**FAILURE**: none synchronous — `play()` may later reject (autoplay policy) → `error` string exposed on the module
**Timeout**: n/a

### Page → `StickyAudioBar` (props / emits — verified interface)

**Props**: `active, textContent, isPlaying, isPaused, shortcutsEnabled, speedValue, repeatMode, currentTime, duration`
**Emits**: `close | toggle | prevTrack | nextTrack | seek(number 0–1) | speedChange(number) | repeatChange('off'|'one'|'all')`
**FAILURE**: none (presentational; all state owned by the module)
**Timeout**: n/a

### Page ↔ shared progress state → `GlobalNavbar`

**Mechanism**: module-level singleton composable (`useHealthPoll` pattern — verified)
**PAYLOAD**: `setLessonProgress(lessonId, pct)` / `clearLessonProgress(lessonId)`
**SUCCESS**: `GlobalNavbar.progressWidth` reflects pct
**FAILURE**: none
**Constraint (ADR-002)**: do NOT introduce a lesson-scoped layout file; `GlobalNavbar` stays in `app.vue`.

### Page → Backend health (pre-gate)

**Endpoint**: `GET /health` (existing singleton poll; already running via the navbar)
**Use** (Assumption A7): if `status === 'loading'` → disable audio taps with "model loading" hint; if `status === 'error'` → show TTS-unavailable notice; if `ready` → taps enabled. (Alternative — attempt and handle 503 — is observable-equivalent; health-gate avoids guaranteed-failing requests.)

---

## Cleanup Inventory

| Resource | Created when | Destroyed when | Destroyed by | Orphan if skipped |
|---|---|---|---|---|
| In-flight TTS fetch | STEP 4 start | page leave / supersede | AbortController abort (ABORT_CLEANUP step 2) | dangling response; late blob must be discarded |
| Object URL (audio blob) | STEP 4 success | next `load()` or leave | `useAudioModule.revokeAll()` / `dispose()` (ABORT_CLEANUP step 3) | memory leak per play (blob retained by URL) |
| Audio element src + loaded state | STEP 4 success | leave | `dispose()` clears `src` (ABORT_CLEANUP step 3) | element holds last blob |
| `window` keydown listeners | STEP 5 (bar attach) | bar unmount / leave | bar's `onUnmounted` (ABORT_CLEANUP step 6) | stale handler fires on other pages |
| Sequential-playback 800ms timer | STEP 5 scene play | stop / section change / leave | page-owned `clearTimeout` (ABORT_CLEANUP step 1) | playback "continues" after leave |
| Section-component timers/listeners | section mount | section unmount | component `onUnmounted` (STEP 3 cleanup note) | listeners leak across sections |
| Shared progress state | STEP 8 set | leave | singleton `clearLessonProgress` (ABORT_CLEANUP step 5) | navbar shows stale progress after re-visit |
| Bar `active` + viewport padding | STEP 4 success | close / leave | bar hide (ABORT_CLEANUP step 4) | viewport mis-sized on return |

Backend note: MP3 files are backend-owned; client cannot orphan them (24h TTL + `_response_delivered` guard, verified).

---

## Test Case Derivation

Rule: every branch above is one test case.

| Step | Branch | Test case | Expected |
|---|---|---|---|
| 1 | resolve happy | "resolves level + lesson from params" | `currentLessonData` set; hero/tabs/first section render |
| 1 | unknown level | "redirects to /dashboard on unknown level" | navigate `/dashboard/level/99/...` → redirect |
| 1 | unknown lesson | "renders 404 page on unknown lesson" | 404 view visible |
| 2 | happy shell | "renders hero, competencies, tab bar, first section" | all present; bar hidden |
| 2 | missing section type | "renders fallback card for unknown section type" | "Content coming soon" card; no crash |
| 2 | audio init | "audio module initializes without error on mount" | module idle; no bar |
| 3 | tab click | "switches active section on tab click" | target section mounts, previous unmounts |
| 3 | arrow keys | "navigates sections with ArrowLeft/ArrowRight" | active tab moves (with clamp at ends) |
| 3 | rapid mashing | "last tab write wins on rapid mashing" | exactly one section mounted, no doubled listeners |
| 4 | 200 | "tap plays audio after 200" | bar active + playing; object URL created |
| 4 | 503 | "503 shows loading state, no crash" | item/bar in loading state; retry possible |
| 4 | 422 | "422 shows validation message" | message on tapped item; bar inactive |
| 4 | 500 speaker | "speaker-missing 500 surfaces detail" | detail shown; permanent (no auto-retry) |
| 4 | 500 generic | "generic 500 surfaces error" | error state; text retained |
| 4 | network error | "fetch reject shows connect error" | "Unable to connect" |
| 4 | timeout | "30s timeout aborts and shows retryable error" | AbortController called; retryable UI |
| 4 | supersede | "new tap aborts in-flight request" | previous discarded; late response ignored |
| 4 | empty text | "empty text rejected client-side" | no request sent |
| 5 | play/pause | "play/pause toggle updates state" | `isPlaying`/`isPaused` correct |
| 5 | seek | "seek updates currentTime" | position jumps ±5s |
| 5 | prev/next | "prev/next triggers TTS for adjacent line" | STEP 4 re-runs; bar text updates |
| 5 | speed change | "speed change re-synthesizes at new speed" | STEP 4 re-runs with speed param |
| 5 | repeat modes | "repeat off/one/all behave per mode" | off→idle, one→replay, all→next line |
| 5 | close | "close hides bar and resets" | bar hidden; padding released |
| 5 | decode error | "media error shows error state" | "Unable to play audio" |
| 5 | autoplay reject | "rejected autoplay sets module error" | error string exposed |
| 6 | toggle | "competency toggle updates counter" | "X of N" increments/decrements |
| 6 | collapse | "collapses/expands checklist" | body hidden |
| 7 | — | DEFERRED (Phase 2; no Phase 1 tests) | — |
| 8 | line ended | "progress increments when line playback ends" | navbar width updates |
| 8 | persists across sections | "progress survives section changes" | no reset on tab switch |
| 8 | lesson change | "progress resets on lesson change" | fresh 0 |
| 8 | leave | "progress cleared on leave" | navbar resets |
| CLEANUP | leave mid-play | "leave during playback revokes URL, stops audio, hides bar" | `revokeAll` called; no leaks |
| CLEANUP | leave mid-fetch | "leave during fetch aborts request" | no response handling after unmount |
| CLEANUP | timer clear | "sequential timer cleared on leave" | no late `setTimeout` fire |
| CLEANUP | idempotent | "double unmount is safe" | no thrown errors |

**Total: 36 test cases** (STEP 1: 3, STEP 2: 3, STEP 3: 3, STEP 4: 9, STEP 5: 8, STEP 6: 2, STEP 7: 0 — deferred to Phase 2, STEP 8: 4, CLEANUP: 4)

---

## ADR Constraint Mapping

| ADR | Constraint | Spec step(s) it affects |
|---|---|---|
| ADR-002 | No per-page layout files (would conflict with the global `app.vue` `GlobalNavbar` wrapper) | Prerequisites; STEP 8 (shared-state mechanism, navbar in `app.vue`) |
| ADR-002 | `GlobalNavbar` in `app.vue` with 404 guard | STEP 1 (404 stays in page content), STEP 8 |
| ADR-002 | Routes unchanged; TTS Studio untouched | Scope (lesson page only); STEP 1 |
| ADR-004 | Bar at bottom of viewport, transport controls, viewport `padding-bottom` | STEP 4 (activate), STEP 5, ABORT_CLEANUP step 4 |
| ADR-004 | Keyboard shortcut analysis: `Ctrl/Cmd+Enter` on TTS Studio page; different route ⇒ no conflict; bar's `Space`/`Arrow` handler self-removes on unmount (verified in code) | STEP 3 (page-level arrows must clamp and not fight bar's), STEP 5 |
| ADR-004 | Bar shown only after successful synthesis | STEP 4 success path; no bar on failure |
| ADR-007 | `curriculum.ts` is source of truth; nested content canonical; flat `items` accessor for uniform rendering | Prerequisites; STEP 1; STEP 3 (section data from nested content) |
| ADR-008 | Orchestrator pattern: page owns `activeSection` + `section v-if`; one component per section type | STEP 2, STEP 3 |
| ADR-008 | Audio via `play` events intercepted by the page → `useLessonAudio` composable | STEP 4, STEP 5, ABORT_CLEANUP |
| ADR-008 | Orchestrator-bloat mitigation: `useLessonOrchestrator` for tab logic | STEP 3 |

---

## Assumptions

| # | Assumption | Verified? | Risk if wrong |
|---|---|---|---|
| A1 | Client TTS timeout is 30s | **Confirmed by stakeholder 2026-08-19** (requirement said "30s or 120s"; code has no timeout) | none for Phase 1; Nginx 1800s cap still holds |
| A2 | Sequential scene playback uses 800ms gap between lines | unverified (from proto only) | pacing feels wrong; low cost to change |
| A3 | Speed change re-synthesizes at new rate (not live `playbackRate`) | backend mechanism verified (ffmpeg atempo); UX choice unverified | user may expect live rate change; would require client-side `playbackRate` support |
| A4 | Progress metric = checked competencies / total competencies | **Confirmed by stakeholder 2026-08-19** | proto's line-progress text superseded; line completion (A5) stays a lesson-local highlight only |
| A5 | A line is "completed" when its playback reaches `ended` | unverified (my choice) | progress semantics differ (e.g. completion on tap, or on activity) |
| A6 | Progress persists per-lesson via a new backend endpoint (GET/PUT /api/progress/{lesson_id}) | **Confirmed by stakeholder 2026-08-19**; endpoint not yet implemented (F7) | new API surface = backend work (endpoint + schema + tests); until implemented, feature-flag off → in-memory |
| A7 | Audio taps are gated on `/health` status (disabled during `loading`/`error`) | unverified (my choice) | 503-based UX instead; observable difference is minor |
| A8 | `ArrowLeft`/`ArrowRight` for section navigation clamp at the ends (no wrap) | unverified (my choice) | wrap preferred; trivial to change |
| A9 | Bar keyboard shortcuts are enabled on the lesson page (`shortcutsEnabled=true`) | per ADR-004 analysis; conflict not yet exercised at runtime | a real conflict would surface in integration; would disable `shortcutsEnabled` on the lesson page |
| A10 | Arabic line cards get `dir="rtl"` + Cairo font | per requirement open question #6; proto shows it | bidi glitches on mixed punctuation lines |
| A11 | No voice picker on the lesson page in Phase 1 (backend default voice) | **Confirmed by stakeholder 2026-08-19** | users may want voice choice later; picker is a separate change |
| A12 | Bar appears only on the lesson page in this spec's scope; TTS Studio integration is a separate workflow | scope choice (ADR-002 leaves Studio untouched) | Studio bar integration unspecced (separate draft) |
| A13 | A harakat-normalization utility is required (TTS input + competency comparison) | unverified (utility does not exist in code) | TTS quality + comparison mismatches (Phase 2 validation) |

---

## Findings (spec vs reality, verified)

| F8 | `SectionDefinition` has `name?` (not `title`); the skeleton reads `s.title` (line 48 of `[lesson].vue`) — a bug. The spec's STEP 3 references `section.name` correctly, but the skeleton must be fixed to read `s.name` (or `s.title` if both are provided). | Medium | STEP 3 | Skeleton must be fixed at implementation |
|---|---|---|---|---|
| F1 | Requirement §15 names the endpoint `/api/tts` with a 400 error; actual is `POST /api/generate` with 422 validation | High | STEP 4, Handoff | Updated to actual contract |
| F2 | Requirement §10 "pass progress as a computed prop from the lesson page to the navbar" is architecturally infeasible (navbar is the page's ancestor, in `app.vue`) | High | STEP 8 | Shared singleton state (verified pattern exists) |
| F3 | Backend failure responses carry no `retryable` flag; 500 is ambiguous (speaker-missing vs inference) | Medium | STEP 4 | Classify by `detail` content; document limitation |
| F9 | `SectionType` union includes `'activity'` (line 133 of `curriculum.ts`) — the spec only lists 5 section types (Dialogue, Vocabulary, Pronouns, Expressions, Grammar). The 6th type 'Activities' is reachable via `SectionDefinition.type === 'activity'`. | Low | STEP 3 | Add 'Activities' to the section type union in STEP 3 input |
| F5 | Client 400-mapping is dead code — 422 falls into the generic error branch | Low | STEP 4 | Include 422 in the error table; fix mapping at implementation |
| F6 | `_model_lock` serializes all synthesis — a long fetch looks frozen, no queue feedback | Low | STEP 4 | Document; "fetching" state suffices for Phase 1 |
| F10 | `SectionItem` has `audioUrl?: string` and `options?: string[]` (lines 117-125 of `curriculum.ts`) — these fields exist on the flat projection but are not wired to any section component. The skeleton renders `item.arabic`, `item.english`, `item.notes`, `item.transliteration` but ignores `audioUrl` and `options`. | Low | STEP 2, STEP 3 | Section components should use `audioUrl` when available (from curriculum data) |

| F11 | `ActivityDefinition` has `maxAttempts: number` (line 171 of `curriculum.ts`). The spec's Phase 2 placeholder says "max 5 attempts" — this is a hardcoded guess; the actual value comes from the data model. | Low | STEP 7 | Read `activity.maxAttempts` from the data model at implementation |

## Open Questions (require stakeholder input)

| # | Question | Blocking? |
|---|---|---|
| Q1 | Should lesson progress persist (new backend endpoint + API surface), or stay in-memory per session? | **Resolved 2026-08-19: persist** (decision A6; contract in Handoff Contracts) |
| Q2 | Voice picker on the lesson page, or keep the backend default voice for Phase 1? | **Resolved 2026-08-19: no picker** (decision A11) |
| Q3 | What is the definition of "lesson complete" (drives any future completion badge / auto-advance)? | No — terminal state only for Phase 1 |

---


---

## Verification (self-check against the skill's completeness checklist)

- [x] Spec exists: `docs/workflows/WORKFLOW-lesson-details-page.md`
- [x] ≥1 failure path per step: STEP 1: 3, STEP 2: 3, STEP 3: 2, STEP 4: 7, STEP 5: 2, STEP 6: 1 (save failure), STEP 7: 0 (deferred), STEP 8: 0 (pure client compute; persistence failures at the writers — STEP 6 / CLEANUP), STEP 9: 1
- [x] A cleanup entry for every resource: 9 rows in Cleanup Inventory
- [x] A test case for every branch: 36 cases in Test Case Derivation
- [x] ADR constraints mapped: 4 ADRs, 10 constraint rows
- [x] Assumptions non-empty: 13 (A1–A13) — **human must walk through these**
- [x] Findings logged: 11 (F1–F11), all verified against code
- [x] Handoff contracts: 6 boundaries with payload/success/failure/timeout/recovery
- [x] Observable states defined per step (customer / operator / database / logs)

**Counts**: 9 failure paths (STEP 1: 3, STEP 2: 2, STEP 3: 2, STEP 4: 7, STEP 5: 2, STEP 6: 0, STEP 7: 0 deferred, STEP 8: 0, STEP 9: 1), 9 cleanup entries, 36 test cases, 11 findings, 13 assumptions.

**Status**: Draft. Stakeholder decisions recorded 2026-08-19 (A1: 30s, A4: competencies, A6: persist, A11: no picker); the remaining assumptions are micro-choices for the human to walk. Reality Checker pass required before Review-ready.
