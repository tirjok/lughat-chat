# ADR-010: Design Grilling Report — Lughat Chat

**Status:** Informational
**Date:** 2026-10-14
**Context:** Full codebase audit — 9 ADRs, 5 pages, 17 components, 12 composables, 8 backend modules, 1,264-line curriculum

---

## 1. Contradictions Found

### 1.1 ADR-003 vs. ADR-005: Font Replacement Contradiction

**ADR-003** (Full Theme Rebrand) explicitly includes "Font Replacement" as one of three interlocking changes, migrating from Plus Jakarta Sans + Noto Sans Arabic + Cairo to Inter + Amiri.

**ADR-005** (Font Family Choice) then *rejects* this exact change, keeping the production fonts. ADR-006 acknowledges this by stating ADR-005 "supersedes ADR-003 (Theme Rebrand) section on fonts."

**Problem:** ADR-003's "Decision" section is partially invalid. The color palette migration was completed, but the font replacement was explicitly rejected. A reader of ADR-003 in isolation would be misled into thinking fonts were replaced.

**Evidence:** `frontend/uno.config.ts` lines 13–15 still reference `Plus Jakarta Sans` and `Noto Sans Arabic`. `frontend/app/assets/css/main.css` lines 10–98 still contain `@font-face` declarations for 12 `.woff2` files.

**Recommendation:** ADR-003 should be updated to mark the font replacement as "rejected per ADR-005" rather than listing it as an executed decision.

---

### 1.2 ADR-004 vs. Current Code: AudioPlayerPanel Retirement Is Incomplete

**ADR-004** states: "`AudioPlayerPanel.vue` is **retired** — its functionality is absorbed into `StickyAudioBar`."

**Contradiction:** `AudioPlayerPanel.vue` does not exist in the codebase, but neither does a component named `AudioPlayerPanel` — however, the TTS Studio page (`index.vue`) renders `MobileSplitScreen` and `DesktopPanels`, both of which contain inline audio player controls (play/pause, seek, progress bar, volume). These are **not** `StickyAudioBar`. The `StickyAudioBar` is rendered in `[lesson].vue` (lesson page) but **not** in `index.vue` (TTS Studio).

**Evidence:** `frontend/app/pages/index.vue` lines 188–217 render `MobileSplitScreen` and `DesktopPanels`, neither of which imports or renders `StickyAudioBar`. The `StickyAudioBar` is only rendered in `[lesson].vue` (line 476).

**Problem:** The TTS Studio page (`/`) has its own audio player embedded in `DesktopPanels` and `MobileSplitScreen`. The StickyAudioBar is only used on lesson pages. This means there are **two separate audio player implementations**: one in the studio (inline in panels) and one sticky bar (lesson pages). ADR-004's claim of "replacing AudioPlayerPanel across all pages" is false — the studio page was never migrated to use StickyAudioBar.

**Recommendation:** Either document this as a partial migration (StickyAudioBar only on lesson pages) or migrate the studio pages to use StickyAudioBar.

---

### 1.3 ADR-007 vs. Current Code: Activities Section Is a Stub

**ADR-007** states: "All 8 existing lessons in `curriculum.ts` must be migrated to the new structure." It shows a table where only lesson a1-01 has activities (5 types), and all other 7 lessons have 0 activities.

**Contradiction:** The "Activities" tab exists in every lesson (visible in the UI), but `LessonActivities.vue` renders only "Content for 'Activities' section coming soon." The Activities tab is a **dead UI element** — it exists in the tab bar but never renders actual activity content.

**Evidence:** `frontend/app/components/lesson/LessonActivities.vue` (17 lines) — the entire component is a single `<p>` saying "Content coming soon." The lesson page (`[lesson].vue`) lines 424–473 render the Activities tab inline with a flat-item fallback, bypassing `LessonActivities.vue` entirely.

**Problem:** The tab bar shows "Activities" for all 8 lessons, but clicking it shows "Content coming soon." This creates a **user expectation gap** — users see an "Activities" tab and expect interactive exercises, but none exist. Only lesson a1-01 has activity data defined in `curriculum.ts` (5 activities), but none are rendered.

**Recommendation:** Either hide the Activities tab when no activities exist, or implement at least the a1-01 activities.

---

### 1.4 `app.vue` Routing Logic vs. ADR-001: Navbar Visibility Is Fragile

**ADR-001** establishes a global navbar wrapper in `app.vue`. However, `app.vue` (lines 7–13) uses a **string-matching heuristic** to decide whether to show the navbar:

```typescript
const KNOWN_PATHS = ['/', '/dashboard', '/dashboard/level']
return KNOWN_PATHS.some(pattern =>
  p === pattern || p.startsWith(pattern + '/')
)
```

**Problem:** This is a fragile whitelist. Any new route (e.g., `/settings`, `/about`, `/profile`) will **silently hide the navbar** without any error or warning. The navbar visibility is determined by string prefix matching, not by a declarative route metadata flag.

**Evidence:** If a future developer adds `app/pages/settings.vue`, the navbar will not render because `/settings` doesn't match any `KNOWN_PATHS` pattern.

**Recommendation:** Use Nuxt's `definePageMeta({ layout: 'default' })` or a route-level flag instead of string prefix matching.

---

### 1.5 `resolveSpeaker` Hardcodes Character-to-Voice Mapping

**Lesson page** (`[lesson].vue` lines 126–131):

```typescript
function resolveSpeaker(speakerName: string): string {
  if (!speakerName) return ''
  const lower = speakerName.toLowerCase()
  if (lower === 'khadija' || lower === 'aisha') return 'KSA Zariyah - Female'
  return 'KSA Hamed - Male'
}
```

**Problem:** This is a **hardcoded character-to-voice mapping** inside the lesson page — the exact anti-pattern that ADR-009 warns against. ADR-009 removed hardcoded *pedagogical* content from `LessonDialogue.vue`, but this hardcoded *data mapping* exists in the page orchestrator.

**Evidence:** If a future lesson introduces a character named "Fatima," she will be mapped to "KSA Hamed - Male" (incorrect). The mapping is lesson-agnostic but character-name-specific.

**Recommendation:** Move this mapping into the curriculum data model (e.g., `DialogueLine.voiceId?: string`) or make it configurable per-lesson.

---

## 2. Undocumented Hard-to-Reverse Decisions

### 2.1 In-Memory Progress Store (Backend)

**File:** `backend/app.py` lines 227–259

```python
_progress_store: dict[str, float] = {}
```

**Problem:** Lesson progress is stored in a **module-level in-memory dictionary**. When the backend container restarts, **all progress data is lost**. There is no persistence layer (no SQLite, no file-based store, no database). This is a hard-to-reverse decision because:

1. The frontend already calls `PUT /api/progress/{lesson_id}` (see `useLessonProgress.ts` line 40–44).
2. The frontend expects progress to persist across page navigations.
3. Switching to a persistent store (SQLite, file-based JSON) would require changing the API contract and migrating existing data.

**Impact:** Users lose all progress every time the backend container restarts. This is acceptable for a prototype but unacceptable for production.

**ADR Criteria Met:** ✅ Hard to reverse (frontend already wired), ✅ Surprising (no persistence documented), ✅ Real trade-off (development simplicity vs. data loss).

---

### 2.2 Shared Global Progress State (Frontend)

**File:** `frontend/app/composables/lesson/useLessonProgress.ts` line 9

```typescript
const sharedProgress = shallowRef<Record<string, StoredProgress>>({})
```

**Problem:** Progress state is a **module-level singleton** shared across all Vue instances. This means:

1. Progress for lesson `a1-01` viewed in one browser tab is visible in another tab viewing `a2-03`.
2. If two lesson pages are mounted simultaneously (e.g., via Nuxt's route transition), they share the same progress store.
3. The `resetLessonProgress()` function (lines 57–66) is exported but has no caller — it's dead code.

**Evidence:** The `sharedProgress` variable is declared outside the composable function, making it a module-level singleton. No isolation mechanism exists.

**ADR Criteria Met:** ✅ Hard to reverse (all consumers reference `useLessonProgress()`), ✅ Surprising (singleton state not documented), ✅ Real trade-off (cross-page progress sharing vs. isolation).

---

### 2.3 Hardcoded Speaker WAV Directory Structure

**File:** `backend/generate_speaker_wavs.py` lines 31–40

```python
voice_samples = {
    "female": ("مرحبا، هذا نص لتوليد صوت أنثي..."),
    "male": ("Hello, this is a text to generate a male voice..."),
}
```

**Problem:** The speaker WAV files are generated from hardcoded text samples. The voice names (`"female"`, `"male"`) are then mapped to `"KSA Zariyah - Female"` and `"KSA Hamed - Male"` through multiple layers of indirection:

1. `generate_speaker_wavs.py` creates `speaker_wavs/female.wav` and `speaker_wavs/male.wav`
2. `app.py` lists voices by scanning `speaker_wavs/` directory
3. `useVoices.ts` caches voice names from `/api/voices`
4. `resolveSpeaker()` in `[lesson].vue` maps character names to voice names

**Problem:** If the speaker WAV files are regenerated (e.g., new text samples), the voice names in the directory change, breaking the entire chain. The voice discovery is **file-system-dependent** — it scans directory contents, not a configuration file.

**ADR Criteria Met:** ✅ Hard to reverse (multi-layer dependency), ✅ Surprising (voice names derived from filenames), ✅ Real trade-off (flexibility vs. fragility).

---

### 2.4 TTS Synthesis Timeout Is 30 Seconds (Frontend) vs. 1800 Seconds (Nginx)

**Frontend:** `frontend/app/pages/dashboard/level/[lesson].vue` line 136

```typescript
fetchTimeoutId.value = setTimeout(() => fetchController.value!.abort(), 30_000)
```

**Nginx:** `frontend/nginx.conf` line 16

```nginx
proxy_read_timeout 1800s;
```

**Problem:** The frontend aborts synthesis requests after **30 seconds**, but Nginx allows up to **1800 seconds** (30 minutes). XTTS-v2 on CPU can take 5–10 minutes for long texts. The frontend timeout will fire **before** the backend finishes, causing a silent `AbortError` that the frontend catches and ignores (line 151).

**Evidence:** `frontend/app/pages/dashboard/level/[lesson].vue` lines 148–152:
```typescript
} catch (err: unknown) {
  clearTimeout(fetchTimeoutId.value ?? undefined)
  fetchTimeoutId.value = null
  if (err instanceof DOMException && err.name === 'AbortError') return
  console.error('TTS synthesis failed:', err)
}
```

The `AbortError` is silently swallowed — the user sees nothing, no error message, no indication that synthesis failed.

**ADR Criteria Met:** ✅ Hard to reverse (frontend timeout is wired into every synthesis call), ✅ Surprising (30s vs. 1800s mismatch undocumented), ✅ Real trade-off (aggressive timeout prevents hanging vs. silent failures).

---

## 3. Vague / Overloaded Domain Terms

### 3.1 "Lesson" vs. "Lesson Page" vs. "Lesson Content"

The term "lesson" is used to refer to:
- A data structure (`LessonDefinition` in `curriculum.ts`)
- A route (`/dashboard/level/{level}/{lesson}`)
- A page component (`[lesson].vue`)
- A tab section ("Activities" tab within a lesson)
- A user's completed work ("lesson progress")

**Problem:** These are distinct concepts with different lifecycles. A `LessonDefinition` is static data. A route is a URL pattern. A page component is a UI rendering. "Lesson progress" is user state. Conflating these leads to confusion about ownership and mutability.

### 3.2 "Section" vs. "Tab"

`SectionDefinition` (data model) has a `name` property that is used as a tab label. The tab bar (`[lesson].vue` lines 358–375) renders tabs from `section.name`. But the tab order is determined by the order of sections in the data, not by any explicit ordering property.

**Problem:** If a section is removed from the data, the tab disappears. If a section's `name` changes, the tab label changes. There is no separation between the data model's section identity and the UI's tab identity.

### 3.3 "Activity" vs. "Activity Section"

`ActivityDefinition` (data model) defines interactive exercises (translate, role-play, etc.). But the "Activities" tab in the UI is a `SectionDefinition` with `type: 'grammar'` and empty content — it's **not** connected to `ActivityDefinition` at all.

**Evidence:** `curriculum.ts` line 364: `{ name: 'Activities', type: 'grammar', content: { type: 'grammar', topics: [] } }`. The Activities tab is a grammar section with no topics, not an activity section.

**Problem:** The term "activity" means two different things:
1. `ActivityDefinition` — interactive exercises (defined in data, never rendered)
2. "Activities" tab — a placeholder section (rendered in UI, contains no data)

### 3.4 "Level" vs. "CEFR Level"

`CurriculumLevel.code` uses CEFR codes (A1, A2, B1, B2, C1, C2). But the route parameter is `level` (from `route.params.level`), and the dashboard uses `getLevelByCode()`. The term "level" is overloaded between:
- A curriculum tier (A1 = Beginner)
- A route parameter
- A dashboard filter

### 3.5 "Speaker" vs. "Voice" vs. "Speaker WAV"

- `SynthesisRequest.speaker` (frontend API) — the voice ID string
- `SynthesisRequest.voice` (backend API) — an alias for speaker
- `Voice` interface (frontend composable) — `{ id, name, dialect, tag, icon, speaker_wav }`
- `speaker_wavs/` directory — physical WAV files on disk
- `resolveSpeaker()` — maps character names to voice names

**Problem:** Five different terms for what is essentially "which voice to use." The mapping chain is: character name → `resolveSpeaker()` → voice ID → `speaker_wavs/{id}.wav` → TTS model. Each step is a potential failure point.

---

## 4. Edge Case Gaps

### 4.1 Missing Lessons Cause Silent 404s

**File:** `frontend/app/data/curriculum.ts` lines 1239–1245

```typescript
export function getLessonById(id: string): LessonDefinition | undefined {
  for (const level of curriculum) {
    const lesson = level.lessons.find(l => l.id === id)
    if (lesson) return lesson
  }
  return undefined
}
```

**Problem:** If a user navigates to `/dashboard/level/A1/999`, `getLessonById('999')` returns `undefined`. The lesson page renders with no lesson data — the hero shows "Lesson 999" with no title, no Arabic title, no metadata. The tabs render from a hardcoded fallback (`['Dialogue', 'Vocabulary', 'Pronouns', 'Expressions', 'Grammar', 'Activities']`).

**Evidence:** `[lesson].vue` line 51: `const currentLessonData = computed(() => { const lesson = getLessonById(lessonParam.value); return lesson })`. When `currentLessonData` is `undefined`, all computed values (`scenes`, `estimatedTime`, `sectionTabs`) produce empty or default values.

**Impact:** No error page, no "lesson not found" message, no redirect. The user sees a broken lesson page with placeholder content.

---

### 4.2 Empty Dialogue Scenes Render Without Speaker Information

**File:** `curriculum.ts` lines 517–523 (lesson a1-02)

```typescript
scenes: [{
  label: '',
  lines: [
    { speaker: '', arabic: 'كَمْ عُمْرُكَ؟', english: 'How old are you?', notes: '...' },
    { speaker: '', arabic: 'عُمْرِي خَمْسَ عَشْرَةَ سَنَةً', english: 'I am fifteen years old.', notes: '...' }
  ]
}]
```

**Problem:** Lessons a1-02 through c2-01 all have **empty speaker names** and **empty scene labels**. The `LessonDialogue` component will render line cards without speaker badges, making it impossible to distinguish who is speaking. The `resolveSpeaker()` function returns `''` for empty speaker names, which then maps to `''` in `useTtsApi.synthesize()` — no voice is selected.

**Evidence:** `LessonDialogue.vue` lines 66–71: `getSpeakerGradient()` falls back to `from-stone-500 to-stone-700` (gray) when no male pattern matches. The speaker badge will be gray (unspecified gender).

**Impact:** 7 of 8 lessons have dialogues with no speaker information. The dialogue rendering is visually correct but semantically empty.

---

### 4.3 No Handling of Non-Existent Levels in Route

**File:** `frontend/app/pages/dashboard/level/[level]/index.vue` lines 5–11

```typescript
const currentLevel = computed(() => {
  try {
    return (useRoute().params?.level as string) || 'A1'
  } catch {
    return 'A1'
  }
})
```

**Problem:** If a user navigates to `/dashboard/level/Z99`, `getLevelByCode('Z99')` returns `undefined`. The page renders with `info.title = 'Z99'` and `info.arabic = 'Z99'` — no error, no redirect, no "level not found" message.

**Evidence:** `dashboard/level/[level]/index.vue` lines 14–16:
```typescript
const info = computed(() => level.value
  ? { title: level.value.title, arabic: level.value.arabicTitle }
  : { title: currentLevel.value, arabic: currentLevel.value })
```

When `level` is `undefined`, `info` falls back to the raw route parameter.

---

### 4.4 Audio Synthesis Fails Silently When Backend Is Unavailable

**File:** `frontend/app/composables/common/useTtsApi.ts` lines 47–49

```typescript
} catch {
  throw new Error('Unable to connect to the server')
}
```

**Problem:** When the backend is unavailable, the frontend throws a generic "Unable to connect to the server" error. The lesson page catches this in `_playText()` (line 152) and logs `console.error('TTS synthesis failed:', err)` — **no user-visible error is shown**. The user clicks a line to hear it, nothing happens, and there's no feedback.

**Evidence:** `frontend/app/pages/dashboard/level/[lesson].vue` lines 148–153:
```typescript
} catch (err: unknown) {
  clearTimeout(fetchTimeoutId.value ?? undefined)
  fetchTimeoutId.value = null
  if (err instanceof DOMException && err.name === 'AbortError') return
  console.error('TTS synthesis failed:', err)
}
```

The `console.error` is the only feedback. No toast, no inline error, no user notification.

---

### 4.5 No Handling of Very Long Arabic Text (> 3000 characters)

**File:** `backend/app.py` line 147

```python
text: str = Field(..., min_length=1, max_length=3000)
```

**Problem:** The backend enforces a 3000-character limit on synthesis requests. The frontend checks for character count (lines 65–73 of `index.vue`) and shows warnings at 60% and 80%, but there is **no hard disable** at 3000 characters. A user could type 4000 characters and attempt synthesis, receiving a 422 validation error from the backend.

**Evidence:** `frontend/app/components/studio/DesktopPanels.vue` lines 65–73:
```typescript
const isWarnLimit = computed(() => { const ratio = charCount.value / 3000; return ratio >= 0.6 && charCount.value <= 3000 })
const isNearLimit = computed(() => { const ratio = charCount.value / 3000; return ratio >= 0.8 && charCount.value <= 3000 })
const isOverLimit = computed(() => charCount.value > 3000)
```

The `isOverLimit` computed exists but is not wired to disable the Generate button.

---

### 4.6 No Handling of RTL Input in TTS Backend

**Problem:** The TTS backend (XTTS-v2) handles Arabic text, but there is no validation or normalization of Arabic text before synthesis. Special characters, mixed RTL/LTR text, or improperly formatted harakat could produce unexpected or incorrect audio.

**Evidence:** No text normalization, no Arabic-specific preprocessing, no validation of Unicode normalization form (NFC vs. NFD).

---

## 5. Integration Point Fragilities

### 5.1 Frontend ↔ Backend API Contract Drift

The PRD (lines 75–96) documents an API contract that differs from the actual implementation:

| PRD Contract | Actual Implementation |
|---|---|
| `language: 'ar' \| 'en'` | `language: string` (no enum) |
| `voice: 'female' \| 'male'` | `speaker?: string` (freeform) |
| `SynthesisResponse.audio_url: string` | Returns `Blob` directly |
| `SynthesisResponse.filename: string` | Not returned |

**Problem:** The frontend `useTtsApi.ts` expects a `Blob` response, but the PRD documents `audio_url` and `filename` fields. This suggests the API evolved after the PRD was written, and the documentation is stale.

---

### 5.2 Curriculum Data Is Frontend-Only

**Problem:** The curriculum data (`curriculum.ts`, 1,264 lines) is entirely frontend-side. There is no backend API for lessons. The route `/dashboard/level/{level}/{lesson}` fetches no data from the backend — it reads from the imported `curriculum.ts` module.

**Evidence:** `[lesson].vue` line 5: `import { getLessonById, type SectionDefinition } from '~/data/curriculum'`. No API call is made to fetch lesson data.

**Problem:** This means:
1. Curriculum updates require a frontend rebuild and redeployment.
2. There is no way to add lessons without modifying source code.
3. The backend's `/api/progress` endpoint has no corresponding lesson data endpoint.

**ADR Criteria Met:** ✅ Hard to reverse (all pages import from `~/data/curriculum`), ✅ Surprising (no backend lesson API despite backend having progress API), ✅ Real trade-off (static data simplicity vs. dynamic content).

---

### 5.3 `useState` Shared State Is Nuxt-Specific

**Files:** `useToast.ts`, `useVoices.ts`

```typescript
const toastState = useState<ToastEntry[]>('toasts', () => [])
const cachedVoices = useState<Voice[]>('voices', () => [])
```

**Problem:** `useState` is a Nuxt-specific composable that provides cross-component, cross-page shared state. If the application is ever migrated to a non-Nuxt framework (or if SSR is enabled), this state management pattern breaks.

**Evidence:** `useState` is imported from `#app` (Nuxt internal). It is not a standard Vue composable.

---

## 6. Recommended GLOSSARY.md Entries

| Term | Definition | Notes |
|------|-----------|-------|
| **Lesson** | A unit of curriculum content, identified by an ID (e.g., `a1-01`), containing sections and activities. | Distinct from "lesson page" (UI) and "lesson progress" (user state). |
| **Section** | A categorized subset of a lesson (dialogue, vocabulary, pronouns, expressions, grammar, activities). | Each section has a `type` and type-specific content structure. |
| **Activity** | An interactive exercise type (translate-to-english, role-play, etc.) defined in `ActivityDefinition`. | Currently defined in data but not rendered in UI. |
| **Activity Section** | A placeholder section with `type: 'grammar'` and empty content, labeled "Activities" in the UI. | Not connected to `ActivityDefinition`. Source of confusion. |
| **CEFR Level** | A curriculum tier (A1–C2) representing language proficiency. | Maps to `CurriculumLevel.code`. |
| **Speaker WAV** | A reference audio file used by XTTS-v2 for voice cloning. | Discovered by scanning `speaker_wavs/` directory. |
| **Voice** | A named speaker preset (e.g., "KSA Zariyah - Female"). | Mapped from speaker WAV filename. |
| **Flattened Items** | A projection of nested section content into a flat `SectionItem[]` array. | Used by existing UI; created via `get items` accessor. |
| **Sticky Audio Bar** | A fixed-bottom audio player component (`StickyAudioBar.vue`). | Only used on lesson pages, not TTS Studio. |
| **TTS Studio** | The primary landing page (`/`) for text-to-speech synthesis. | Has its own inline audio player, not StickyAudioBar. |
| **Lesson Page** | The lesson details page at `/dashboard/level/{level}/{lesson}`. | Orchestrates section-specific components. |
| **Progress Store** | In-memory dictionary storing lesson completion percentages. | Lost on backend restart. |
| **Flatten Accessor** | `SectionDefinition.get items` — computed property flattening nested content. | Bridges nested data model and flat UI rendering. |

---

## 7. Recommended New ADRs

### ADR-011: Persist Lesson Progress to File/Database

**Criteria:**
- ✅ **Hard to reverse:** Frontend already calls `PUT /api/progress/{lesson_id}`; changing the backend requires updating the API contract and migrating any existing data.
- ✅ **Surprising:** In-memory storage is not documented; users expect progress to persist across container restarts.
- ✅ **Real trade-off:** Development simplicity (in-memory dict) vs. data loss (no persistence).

**Scope:** Replace `_progress_store: dict[str, float]` in `backend/app.py` with a file-based store (JSON file) or SQLite database.

---

### ADR-012: Unify Audio Player Architecture

**Criteria:**
- ✅ **Hard to reverse:** Two audio player implementations exist (studio inline + StickyAudioBar on lesson pages). Unifying them requires refactoring both `DesktopPanels`/`MobileSplitScreen` and all lesson page components.
- ✅ **Surprising:** ADR-004 claimed "AudioPlayerPanel is retired" but the studio pages were never migrated to use StickyAudioBar.
- ✅ **Real trade-off:** Two specialized players (studio vs. lesson) vs. one unified player (higher complexity, lower duplication).

**Scope:** Either migrate TTS Studio pages to use `StickyAudioBar`, or document that two audio player implementations coexist with different feature sets.

---

### ADR-013: Frontend-Only Curriculum Data Strategy

**Criteria:**
- ✅ **Hard to reverse:** All 8 lessons (1,264 lines) are hardcoded in `curriculum.ts`. Moving to a backend API requires creating endpoints, migrating data, and updating all consumers.
- ✅ **Surprising:** The backend has a `/api/progress` endpoint but no `/api/lessons` endpoint, creating an asymmetry.
- ✅ **Real trade-off:** Static data (simple, fast, offline-capable) vs. dynamic data (flexible, requires backend, no offline).

**Scope:** Decide whether curriculum data should remain frontend-only or be moved to a backend API. If backend, design the API contract and migration plan.

---

### ADR-014: Frontend Synthesis Timeout Configuration

**Criteria:**
- ✅ **Hard to reverse:** The 30-second frontend timeout is wired into every synthesis call across multiple pages. Changing it requires updating all callers.
- ✅ **Surprising:** The 30-second frontend timeout conflicts with the 1800-second Nginx timeout. The mismatch causes silent `AbortError` failures.
- ✅ **Real trade-off:** Aggressive timeout (prevents hanging UI) vs. permissive timeout (allows long syntheses but risks silent failures).

**Scope:** Align frontend timeout with realistic XTTS-v2 CPU synthesis times (5–10 minutes), or implement a progress indicator during synthesis.

---

### ADR-015: Error Handling for Missing Lessons and Levels

**Criteria:**
- ✅ **Hard to reverse:** All pages use `getLessonById()` and `getLevelByCode()` which return `undefined` for missing data. Adding error pages requires updating every consumer.
- ✅ **Surprising:** No user-visible error is shown when a lesson or level doesn't exist. The UI renders placeholder content.
- ✅ **Real trade-off:** Graceful degradation (placeholder content) vs. explicit error (404 page, redirect).

**Scope:** Add error handling for missing lessons/levels: redirect to dashboard, show "lesson not found" page, or display a meaningful error message.

---

### ADR-016: Character-to-Voice Mapping Strategy

**Criteria:**
- ✅ **Hard to reverse:** `resolveSpeaker()` is called from the lesson page for every audio synthesis. Changing the mapping requires updating all callers.
- ✅ **Surprising:** The mapping is hardcoded in the page orchestrator, not in the data model — the same anti-pattern ADR-009 explicitly rejects.
- ✅ **Real trade-off:** Hardcoded mapping (simple, works for current 4 characters) vs. data-driven mapping (flexible, requires schema change).

**Scope:** Move character-to-voice mapping into the curriculum data model (e.g., `DialogueLine.voiceId?: string`) or make it configurable per-lesson.

---

## 8. Summary of Critical Findings

| Category | Count | Severity |
|----------|-------|----------|
| Contradictions between ADRs and code | 4 | High |
| Undocumented hard-to-reverse decisions | 4 | High |
| Vague/overloaded domain terms | 5 | Medium |
| Edge case gaps | 6 | Medium-High |
| Integration point fragilities | 3 | Medium |
| Recommended new ADRs | 6 | High |
| Recommended GLOSSARY entries | 13 | Medium |

### Top 5 Immediate Risks

1. **Silent synthesis failures** — 30-second frontend timeout fires before XTTS-v2 completes, producing no user feedback.
2. **Progress data loss** — In-memory progress store is lost on every backend restart.
3. **Dead Activities tab** — "Activities" tab exists in UI but renders "Content coming soon" for all 8 lessons.
4. **Missing lesson/level handling** — No error page or redirect for non-existent routes.
5. **Two audio player implementations** — Studio pages have inline players; lesson pages use StickyAudioBar. ADR-004's "retirement" claim is incomplete.
