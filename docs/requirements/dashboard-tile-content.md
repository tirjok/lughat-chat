# Requirements Document: Dashboard Tile Content — Curriculum-Driven Presentation

> **Generated:** 2026-08-16
> **Source:** Screenshot of target UI + `frontend/app/data/curriculum.ts` (786 lines) + `frontend/app/pages/dashboard.vue` (current)
> **Status:** Ready for implementation planning

---

## 1. Vision

The dashboard level tiles currently render **placeholder content** — hardcoded lesson counts, zero progress, and no status indicators. The screenshot shows a **rich, curriculum-driven tile** where every tile displays:

1. **Level code badge** (e.g., `A1`, `A2`)
2. **Level title** (e.g., "A1 - Beginner")
3. **Goal text** — what the learner achieves at this level
4. **Lesson count** (from `curriculum.ts`)
5. **Status** — `Completed` / `Current Level` / (future: `In Progress`)
6. **Progress bar** — percentage of lessons completed within the level

The key constraint: **the backend database is not yet ready.** No `/api/progress` endpoint exists. No SQLite progress table exists. We cannot measure completion or progress.

**Decision:** Every tile shows all available curriculum data. Status and progress fields show **placeholder values** that are correct for the current state (no data = no progress, no completion). When the backend is ready, these fields connect to the API — the UI structure does not change.

---

## 2. Current State Analysis

### 2.1 What `curriculum.ts` provides per level (already implemented, 786 lines)

| Field | Available | Used in Dashboard? |
|-------|-----------|-------------------|
| `code` (e.g., "A1") | Yes | Partially (shown in badge) |
| `title` (e.g., "Foundation") | Yes | No |
| `arabicTitle` (e.g., "المستوى المبتدئ") | Yes | No |
| `description` (goal text) | Yes | No |
| `goal` (same as description) | Yes | No |
| `lessonRange` (e.g., "Lessons 1–10") | Yes | No |
| `vocabularyCount` (e.g., "~500") | Yes | No |
| `speakingWPM` (e.g., "20–40") | Yes | No |
| `readingWPM` (e.g., "<30") | Yes | No |
| `keySkills` (array of skill descriptions) | Yes | No |
| `lessons[]` (array of `LessonDefinition`) | Yes | Partially (`lessons.length` for count) |
| `gradient` (CSS gradient string) | Yes | No |

### 2.2 What the current dashboard renders per tile

- Level code badge (from `curriculum.ts`)
- Level title (static text, not from `curriculum.ts`)
- "X Lessons" (from `curriculum.ts` via `lessons.length`)
- Status: hardcoded "Level Mastered!" text (always shown, no conditional)
- Progress: hardcoded `0%` and `completedLessons = 0` (no API, no data)
- No Arabic title, no goal text, no description, no keySkills, no gradient, no vocabulary count

### 2.3 What the screenshot shows per tile

- **Badge**: Color-coded code circle (A-, A1, A2)
- **Title**: "A- Reading Module" / "A1 - Beginner" / "A2 - Elementary"
- **Status pill**: "Completed" (green) / "Current Level" (blue)
- **Goal text**: Full paragraph describing what the learner achieves
- **Lesson count**: "4 Lessons" / "10 Lessons" / "18 Lessons"
- **Status indicator**: "Level Mastered!" with checkmark (for completed levels)
- **Progress**: Blue progress bar with percentage (e.g., "39%")

---

## 3. Requirements

### R-1: Tile Content — Curriculum-Driven

Each dashboard level tile renders **all available curriculum data** from `curriculum.ts`:

#### 3.1.1 Badge (Level Code)

- Source: `level.code` (e.g., "A1", "A2", "B1")
- Display: Circular badge, color varies by gradient
- A- is not in `curriculum.ts` — this is a **composite/derived level** (see R-1.5)

#### 3.1.2 Level Title

- Source: `level.title` (e.g., "Foundation", "Building", "Conversational")
- Display: `{level.code} – {level.title}` (e.g., "A1 – Foundation")
- Arabic subtitle: `level.arabicTitle` displayed below the title (RTL, `font-arabic`)

#### 3.1.3 Goal Text

- Source: `level.goal` (or `level.description` — they are identical in `curriculum.ts`)
- Display: Full goal paragraph, truncated to ~2–3 lines with ellipsis
- This is the **primary value-add** of the new tile: the user sees what each level achieves before clicking in

#### 3.1.4 Lesson Count

- Source: `level.lessons.length` (computed from `curriculum.ts`)
- Display: "{N} Lessons" with book icon
- Already partially implemented — keep, but ensure it matches the actual count

#### 3.1.5 Composite Level: "A- Reading Module"

The screenshot shows an "A- Reading Module" level that does **not** exist in `curriculum.ts`. This is a **derived/aggregate level** that combines reading-related content across A1 and A2.

**Decision:** This tile is **deferred** to a future phase. The current implementation should:
- **Not** render an "A-" level tile
- Optionally show a comment in the code explaining that aggregate/derived levels are deferred
- If the screenshot is a design target, this means adding a new entry to `curriculum.ts` is required before implementation

**For now, the dashboard renders only the levels that exist in `curriculum.ts`:** A1, A2, B1, B2, C1, C2 (6 levels).

#### 3.1.6 Gradient / Color Coding

- Source: `level.gradient` (e.g., "from-teal-700 via-teal-800 to-teal-900")
- Application: Used for the badge background, card header gradient, and accent colors
- Each level has a distinct color palette (teal → emerald → cyan → sky → indigo → violet)

### R-2: Status Display — Placeholder-Aware

Since the backend is not ready, status must reflect the **current truth** without lying:

| Scenario | Status Pill | Progress | "Level Mastered!" |
|----------|------------|----------|-------------------|
| No backend (current) | "Current Level" (first uncompleted level) / "Locked" (subsequent) | 0% bar (empty) | Hidden |
| Backend ready, 0% progress | "Current Level" (blue) | 0% bar (empty) | Hidden |
| Backend ready, 1–99% | "In Progress" (amber) | {N}% bar (partial fill) | Hidden |
| Backend ready, 100% | "Completed" (green) | 100% bar (full) | "Level Mastered!" shown |

**Implementation rule:** The status logic must work identically with or without the backend. When progress data is unavailable, show "Current Level" for the first level, "Locked" for all others. Progress bar renders at 0%. "Level Mastered!" is hidden.

**When the backend connects** (GET `/api/progress` returns per-level completion), the same UI updates automatically — no structural changes needed.

### R-3: Progress Bar — Placeholder-Aware

- **Without backend:** Always shows 0% (empty bar). Visually identical to the current implementation but integrated into each tile (not just the overall header).
- **With backend:** Fills proportionally to `completedLessons / totalLessons` for that level.
- **Visual:** Blue bar (`bg-primary-500`), rounded, full-width within tile, with percentage label on the right.

### R-4: Overall Header — Simplified

The current overall progress ring in the hero section (`completedLessons / totalLessons`) should be **simplified** when per-level progress is shown:

| State | Overall Header |
|-------|---------------|
| No backend | Hidden (redundant — all tiles show 0%) |
| Backend ready | Show as-is (aggregate across all levels) |

### R-5: Navigation

- Each tile is a `<NuxtLink>` to `/dashboard/level/{levelCode}` (e.g., `/dashboard/level/a1`)
- "Current Level" tiles are always clickable
- "Locked" tiles are clickable (they navigate to the level page which may show placeholder content)
- "Completed" tiles are clickable (navigate to review lessons)

### R-6: Responsive Behavior

- **Desktop (`≥ 1024px`):** 3-column grid
- **Tablet (`768–1023px`):** 2-column grid
- **Mobile (`< 768px`):** 1-column, full-width cards
- Goal text truncation: 2 lines on mobile, 3 lines on desktop

---

## 4. Data Mapping

### 4.1 Current `curriculum.ts` → Dashboard Tile

```typescript
interface CurriculumLevel {
  code: string              // → Badge (A1, A2, B1...)
  title: string             // → Title ("Foundation", "Building"...)
  arabicTitle: string       // → Arabic subtitle
  description: string       // → Goal text (same as goal)
  goal: string              // → Goal text (same as description)
  lessonRange: string       // → NOT used (redundant with lessons.length)
  vocabularyCount: string   // → NOT used (deferred — future feature)
  speakingWPM: string       // → NOT used (deferred — future feature)
  readingWPM: string        // → NOT used (deferred — future feature)
  keySkills: string[]       // → NOT used (deferred — future feature)
  lessons: LessonDefinition[] // → Lesson count = lessons.length
  gradient: string          // → Color coding (badge, header gradient)
}
```

### 4.2 Fields Not Used (Deferred)

These fields exist in `curriculum.ts` but are **not rendered** on the dashboard:

| Field | Reason Deferred |
|-------|----------------|
| `vocabularyCount` | No vocabulary tracking UI exists yet |
| `speakingWPM` | No speaking assessment UI exists yet |
| `readingWPM` | No reading assessment UI exists yet |
| `keySkills` | Could be shown as a collapsible/tooltip — deferred |
| `lessonRange` | Redundant with `lessons.length` + lesson IDs |

**These fields are not errors.** They are curriculum metadata that may be used in future phases (lesson pages, skill assessment, vocabulary review). The dashboard intentionally focuses on **title, goal, lesson count, status, and progress**.

### 4.3 Backend Progress Schema (Future)

When the backend is ready, the dashboard expects:

```typescript
interface LevelProgress {
  code: string        // "A1", "A2", etc.
  totalLessons: number
  completedLessons: number
  percentage: number  // 0–100
}
```

This maps directly onto the current tile structure — no UI changes needed when connecting.

---

## 5. Out of Scope (This Phase)

- **Backend API implementation** (`GET /api/progress`) — handled separately (OQ-9)
- **SQLite schema design** for progress tracking — handled separately (OQ-8)
- **"A- Reading Module" composite level** — not in `curriculum.ts`, deferred
- **Vocabulary/speaking/reading metrics display** — fields exist in data but not rendered
- **KeySkills collapsible** — not rendered, deferred
- **Animated progress transitions** — static bar is acceptable for MVP

---

## 6. Implementation Notes

### 6.1 File Changes

- **`frontend/app/pages/dashboard.vue`** — refactor level card rendering
- **`frontend/app/data/curriculum.ts`** — no changes needed (data is complete)
- No new components required — the existing card structure can be refactored

### 6.2 Current Code → Target

**Current dashboard renders per tile:**
- Code badge ✓ (from `curriculum.ts`)
- Static title ✗ (hardcoded, not from `curriculum.ts`)
- "X Lessons" ✓ (from `curriculum.ts`)
- "Level Mastered!" ✗ (always shown, no conditional)
- Progress: 0% ✗ (hardcoded)

**Target dashboard renders per tile:**
- Code badge ✓ (from `curriculum.ts`)
- `{code} – {title}` ✓ (from `curriculum.ts`)
- Arabic subtitle ✓ (from `curriculum.ts`)
- Goal text ✓ (from `curriculum.ts`)
- Lesson count ✓ (from `curriculum.ts`)
- Status pill ✓ (conditional: "Current Level" / "Locked" without backend)
- Progress bar ✓ (0% without backend)
- "Level Mastered!" ✓ (hidden without backend)

### 6.3 No-Backend Strategy

The dashboard must function correctly with `completedLessons = 0` and no API:

1. **All levels show 0% progress** — progress bar is empty
2. **First level shows "Current Level"** (blue pill)
3. **Subsequent levels show "Locked"** (grey pill, or no pill — clickable)
4. **"Level Mastered!" is hidden** — no checkmark, no green text
5. **All tiles are clickable** — they navigate to the level page (which shows placeholder content until backend is ready)

This is **not a broken state** — it's the correct representation of "no progress data available."

---

## 7. Acceptance Criteria

- [ ] Each dashboard tile displays: badge, title, Arabic subtitle, goal text, lesson count
- [ ] Goal text comes from `curriculum.ts` (`level.goal` or `level.description`)
- [ ] Status pill shows "Current Level" (first) / "Locked" (others) when no backend
- [ ] Progress bar shows 0% (empty) when no backend
- [ ] "Level Mastered!" is hidden when no backend
- [ ] Overall progress ring is hidden when no backend (redundant)
- [ ] No backend calls are made (no API errors, no 404s)
- [ ] Tiles are clickable and navigate to `/dashboard/level/{code}`
- [ ] Responsive: 3-col desktop, 2-col tablet, 1-col mobile
- [ ] Goal text truncates at 2–3 lines
