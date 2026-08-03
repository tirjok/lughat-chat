# Open Questions — Navigation & Dashboard

> **Generated:** 2026-08-02
> **Context:** Grilling session — adding Navigation (Dashboard + Lesson pages) to the existing single-page TTS app.
> **Status:** Open — questions unresolved at end of grilling.

---

## Confirmed Against Code

| # | Assumption | Verified In |
|---|---|---|
| C1 | App is a single-page SPA — `index.vue` at `/` | `frontend/app/pages/index.vue` (751 lines) |
| C2 | `app.vue` is bare `<NuxtPage />` — no layout, no nav | `frontend/app/app.vue` |
| C3 | No database, no ORM, no auth, no user concept | `backend/app.py`, `docker-compose.yml` |
| C4 | Theme: green primary, slate neutral | `CONTEXT.md` line 22, `app.config.ts` |
| C5 | TTS Studio uses `100vh` full viewport, no chrome | `index.vue` two-panel layout |
| C6 | 11 customer journeys all start from `GET /` | `REGISTRY.md` View 3 |
| C7 | `useHealthPoll` stops + `useAudioModule` disposes on `onUnmounted` | `REGISTRY.md` RF-11 |
| C8 | `useSeoMeta` runs once in `app.vue` — shared across all pages | `app.vue` lines 14-17 |

---

## Decisions Recorded

| # | Decision | Rationale |
|---|---|---|
| D1 | App identity shifts from "Arabic TTS web app" to "Language Learning Platform" | User direction — TTS becomes a tool inside a larger platform |
| D2 | TTS Studio stays at `/` (Option B) | Dashboard is secondary; existing user journeys preserved |
| D3 | Dashboard at `/dashboard` | New Nuxt page file |
| D4 | Lesson pages at `/level/{level}/{lesson_id}` (e.g., `/level/a1/1`) | Third page, dynamic route |
| D5 | Shared layout — navbar in `app.vue` | Consistent navigation across all pages |
| D6 | Full theme rebrand | All color tokens change across the app |
| D7 | Page title pattern: `LughatChat - [page-name]` | e.g., "LughatChat - Playground", "LughatChat - Dashboard" |
| D8 | Backend SQLite for lesson data + progress | Single anonymous user, no auth |
| D9 | Lesson content stored as JSON files | Structured content: sections, activities, competencies |
| D10 | Single anonymous user — no authentication | Local Docker-based application |

---

## Open Questions

### OQ-1: Active Synthesis on Navigation
**Question:** What happens to an in-flight synthesis request when the user navigates away from the TTS Studio (`/`) to the Dashboard or a lesson page?

**Context:** `useAudioModule` disposes on `onUnmounted` (RF-11). The backend `/api/generate` streams audio. If the frontend unmounts mid-stream, the connection drops. Does the backend clean up the orphan file? (Orphan cleanup exists but only triggers on client disconnect — does Nuxt SPA navigation count as "disconnect"?)

**Risk:** Orphaned MP3 + JSON files accumulate if navigation doesn't trigger cleanup.

---

### OQ-2: TTS Studio Layout Adaptation
**Question:** How does the TTS Studio's `100vh` two-panel layout adapt to the new navbar?

**Context:** User confirmed "layout need to be redefine" but did not specify mechanism. Options:
- Panels shrink to `calc(100vh - navbar_height)`
- Navbar overlays panels (transparent/floating)
- TTS Studio is an exception — navbar hidden on `/`

**Risk:** Waveform canvas loses vertical space. Mobile layout (stacked panels) is more impacted than desktop (side-by-side).

---

### OQ-3: New Theme Color
**Question:** What is the new primary theme color?

**Context:** User confirmed "full rebrand" but no specific color was stated. Current: green primary, slate neutral. Changing this affects `app.config.ts`, `uno.config.ts`, `main.css`, and every component using theme tokens.

**Risk:** Cannot proceed with rebrand without a color value.

---

### OQ-4: Per-Page Title Mechanism
**Question:** How does each page set its own title from a shared layout?

**Context:** `app.vue` currently hardcodes title via `useSeoMeta`. Nuxt supports page-level `useHead()` / `useSeoMeta()` that merges with the root. Does the pattern become `LughatChat` (root) + `- [page-name]` (page-level append), or is the full string set per-page?

**Risk:** If not resolved, all pages share the same title.

---

### OQ-5: Lesson JSON File Location
**Question:** Where do lesson JSON files live — in the frontend (bundled) or backend (served via API)?

**Context:** User said "lesson content will be a JSON file" and "Backend SQLite" for progress. If JSON is in the frontend, it's static at build time. If in the backend, it needs a new API endpoint (`GET /api/lessons/{id}`).

**Risk:** Frontend-bundled lessons can't be updated without redeploying. Backend-served requires new API surface.

---

### OQ-6: Lesson Page Rendering
**Question:** How does the lesson page render different section types (`dialogue`, `vocabulary`, `pronouns`, `expressions`, `grammar`) and activity types (`listen-translate`, `translate-to-english`, `translate-to-arabic`, `introduce-characters`, `role-play`)?

**Context:** User said "Lesson page will have a big role. That we will explain later." This is deferred.

**Risk:** Cannot estimate implementation scope until the lesson page's interaction model is defined.

---

### OQ-7: REGISTRY.md Customer Journey Updates
**Question:** Which of the 11 existing customer journeys need to be updated now that the app is multi-page?

**Context:** All journeys currently start from `GET /` (SPA load). With a shared layout and new pages, the entry point behavior changes. Do journeys like "Opens the app" still land on TTS Studio, or does the navbar change the mental model?

**Risk:** REGISTRY.md becomes stale immediately after navigation is implemented.

---

### OQ-8: SQLite Schema Design
**Question:** What is the SQLite schema for lessons and progress?

**Context:** User confirmed "Backend SQLite" but no schema was defined. Minimum tables: `levels` (A1, A2, B1, B2...), `lessons` (id, level, sequence, title, duration), `progress` (lesson_id, completed, completed_at). Does the schema mirror the JSON structure, or is JSON the source of truth and SQLite only tracks progress?

**Risk:** Schema decisions affect API design, migration strategy, and whether JSON and SQLite can drift.

---

### OQ-9: Existing API Surface Expansion
**Question:** What new backend endpoints are required?

**Context:** Current API: `POST /api/generate`, `GET /health`, `GET /api/voices`, `GET /api/history`, `POST /api/cleanup`. New endpoints likely needed: `GET /api/levels`, `GET /api/lessons`, `GET /api/lessons/{id}`, `POST /api/progress`. Are these confirmed?

**Risk:** Backend goes from zero DB to full lesson management — significant architectural change.

---

### OQ-10: Mobile Navigation
**Question:** How does the shared navbar behave on mobile (< 768px)?

**Context:** The app already has mobile-specific behavior (stacked panels, `MobileStatusIndicator`, touch drag divider). A navbar adds horizontal space consumption on small screens. Is it a hamburger menu, bottom tab bar, or always-visible?

**Risk:** Mobile UX is already complex with the two-panel layout. Adding nav chrome compounds the problem.

---

## ADRs That May Be Needed (If Decisions Meet the Bar)

| Potential ADR | Trigger |
|---|---|
| ADR-001: Multi-Page Navigation | Shared layout decision (D5) — structural change to `app.vue` |
| ADR-002: SQLite for Lesson Data | Backend database introduction (D8) — new dependency, new schema |
| ADR-003: Full Theme Rebrand | Color change (D6) — affects every component |
| ADR-004: Lesson Page Interaction Model | When OQ-6 is resolved and involves TTS integration |
