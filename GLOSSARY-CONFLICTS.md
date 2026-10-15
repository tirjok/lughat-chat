# GLOSSARY — Conflict Analysis

This document records terminology conflicts and inconsistencies between the new root `GLOSSARY.md` and the existing `docs/adr/GLOSSARY.md`, as well as cross-ADR terminology issues.

---

## 1. Conflicts Between Root GLOSSARY.md and docs/adr/GLOSSARY.md

### 1.1 No Conflicts — Direct Merges

The following terms exist in **both** glossaries with **identical or compatible definitions**. The root glossary subsumes these without change:

| Term | Status |
|------|--------|
| Lesson | ✅ Identical |
| Section | ✅ Identical |
| Activity | ✅ Identical |
| Activity Section | ✅ Identical |
| CEFR Level | ✅ Identical |
| Curriculum Level | ✅ Identical |
| Lesson Definition | ✅ Identical |
| Section Definition | ✅ Identical |
| Flattened Items | ✅ Identical |
| Speaker WAV | ✅ Identical |
| Voice | ✅ Identical |
| Speaker | ✅ Identical |
| Sticky Audio Bar | ✅ Identical |
| TTS Studio | ✅ Identical |
| Lesson Page | ✅ Identical |
| Synthesis | ✅ Identical |
| Cache Key | ✅ Identical |
| Progress Store | ✅ Identical |
| Flattened Progress | ✅ Identical |
| Section Tabs | ✅ Identical (appears in both State/Data and UI Domain — acceptable cross-reference) |
| Lesson ID | ✅ Identical |
| Route Parameter `level` | ✅ Identical |
| Route Parameter `lesson` | ✅ Identical |
| Deep Module | ✅ Identical |
| Composable | ✅ Identical |
| Section Item | ✅ Identical |
| Dialogue Line | ✅ Identical |
| Vocabulary Item | ✅ Identical |
| Pronoun Item | ✅ Identical |
| Grammar Topic | ✅ Identical |
| Expression Item | ✅ Identical |
| Hero Section | ✅ Identical (root glossary calls it "Hero Section", ADR glossary calls it "Hero Section") |
| Content Coming Soon | ✅ Identical |
| Character-to-Voice Mapping | ✅ Identical |
| Orphan File Cleanup | ✅ Identical |
| Backend Health Poll | ✅ Identical |

### 1.2 New Terms in Root Glossary (Not in ADR Glossary)

The root glossary adds **47 new terms** discovered through deeper codebase exploration:

**Curriculum Domain (17 new):**
- Dialogue Scene, Dialogue Line, Vocabulary Category, Vocab Word, Pronoun Entry, Grammar Topic (as data model), Expression Entry, Competency, Section Type, Section Content, Activity Type, Activity Content, Sidecar Metadata, Dialogue Scene, Dialogue Line, Vocabulary Category, Vocab Word

**Audio / TTS (13 new):**
- Orphan File, Model Status, Health Check, Synthesis Request, Synthesis Response, Health Response, Speed Value, Repeat Mode, Character-to-Voice Mapping, Speaker Resolution, XTTS Minimum Reference Duration

**State / Data (3 new):**
- Stored Progress, Orphan File Cleanup (as process), Backend Health Poll (as composable)

**Studio UI (31 new):**
- Control Deck, Canvas, Panel Toggle, Waveform Canvas, Focus Halo, Cleanup Dialog, Generate Button, Toast Notification, Global Navbar, Nav Item, Progress Width, Active Panel, Input Validation Result, Drag Resize, Flick Projection, Scroll Reveal, Breakpoint Mobile, Velocity Buffer, Canvas Ratio, Audio Module, TTS API, Voice Selector, Speed Slider, Lesson Orchestrator, Lesson Progress, Cleanup Navigation, Lesson Hero, Lesson Dialogue, Lesson Vocabulary, Lesson Pronouns, Lesson Grammar, Lesson Expressions, Lesson Competencies, Lesson Activities, Lesson Activity Runner, Page Orchestrator

---

## 2. Cross-ADR Terminology Conflicts

### 2.1 "Speaker" vs. "Voice" — API Contract Ambiguity

**ADR-004** states: "The sticky bar is aware of its routing context" and references "voice" and "speaker" interchangeably.

**Codebase reality:**
- `SynthesisRequest` (frontend) has both `speaker?: string` and `voice?: string` fields — they are aliases.
- `Synthesis.generate()` (backend) resolves `speaker` first, then `voice`, then defaults to "KSA Zariyah - Female".
- Frontend `Voice` interface has `id`, `name`, `dialect`, `tag`, `icon`, `speaker_wav`.
- `resolveSpeaker()` (lesson page) maps character names to voice IDs.

**Recommendation:** Standardize on **"Voice"** as the canonical term. "Speaker" is an API alias that should be documented as such. The `Voice` interface is the frontend's authoritative model.

### 2.2 "Section" vs. "Tab" — Data vs. UI Coupling

**ADR-007** defines `SectionDefinition` with a `name` property used as a tab label.

**ADR-008** refers to "section tabs" and "tab bar" interchangeably.

**Codebase reality:** `section.name` IS the tab label. There is no separation between the data model's section identity and the UI's tab identity.

**Recommendation:** The glossary already uses **"Section"** for the data concept and **"Section Tabs"** for the UI rendering. This is correct. However, the codebase should be audited for any places where "tab" is used when "section" is meant (or vice versa).

### 2.3 "Activity" vs. "Activity Section" — Terminology Collision

**ADR-007** defines `ActivityDefinition` (interactive exercises) and `ActivitySection` (a placeholder grammar section labeled "Activities").

**ADR-010 §3.3** explicitly flags this collision: "The term 'activity' means two different things."

**Recommendation:** The glossary correctly distinguishes:
- **Activity** = `ActivityDefinition` (interactive exercises, not rendered)
- **Activity Section** = placeholder section with `type: 'grammar'` (rendered, empty)

This distinction should be emphasized in any documentation. Consider renaming "Activity Section" to **"Activities Stub"** to reduce confusion.

### 2.4 "Level" vs. "CEFR Level" vs. "Route Parameter `level`"

**ADR-002** uses "level" as a route parameter. **ADR-007** uses "CEFR Level" as a curriculum concept.

**Codebase reality:** `route.params.level` is a string that gets passed to `getLevelByCode()` which matches against `CurriculumLevel.code` (e.g., "A1").

**Recommendation:** The glossary correctly distinguishes:
- **CEFR Level** = the curriculum tier concept
- **Route Parameter `level`** = the URL segment

However, the codebase should avoid using the variable name `level` for anything other than the route parameter. Curriculum tiers should use `cefrLevel` or `levelCode`.

### 2.5 "Orphan File Cleanup" — Three Different Definitions

The term appears in three contexts:
1. **State / Data** (glossary): "A backend process that removes synthesized audio files older than N hours"
2. **UI Domain** (ADR glossary): "A scheduled backend job that removes synthesized audio files older than N hours"
3. **Codebase**: `cleanup_old_files()` method on `AudioStore`, triggered by `POST /api/cleanup` endpoint, and optionally during `list_history()`.

**Recommendation:** Consolidate to a single definition: **"Orphan File Cleanup"** = the backend process (exposed via `POST /api/cleanup` and triggered during history listing) that removes synthesized audio files older than N hours (default 24).

### 2.6 "Backend Health Poll" — Two Definitions

1. **State / Data** (glossary): "A frontend composable (`useBackendHealth`) that periodically polls `GET /health`"
2. **UI Domain** (ADR glossary): Same definition

**Recommendation:** These are identical. Keep in **State / Data** only (the root glossary already does this correctly).

---

## 3. Terms That Should Be Standardized Across the Codebase

| Term | Current Usage | Recommended Standard | Files to Audit |
|------|--------------|---------------------|----------------|
| **Voice** (vs. Speaker) | `SynthesisRequest` has both `voice` and `speaker`; `resolveSpeaker()` maps character names to voice IDs | Use "Voice" as canonical; "Speaker" as API alias | `useTtsApi.ts`, `app.py`, `[lesson].vue` (resolveSpeaker) |
| **Section** (vs. Tab) | `SectionDefinition.name` is used as tab label; UI refers to "tabs" and "sections" interchangeably | Use "Section" for data, "Section Tab" for UI | `[lesson].vue`, all `Lesson*` components |
| **Activity** (vs. Activity Section) | `ActivityDefinition` (exercises) vs. "Activities" tab (stub) | Keep distinction; consider renaming "Activity Section" to "Activities Stub" | `curriculum.ts`, `LessonActivities.vue` |
| **Level** (vs. CEFR Level) | Route param `level` vs. `CurriculumLevel.code` | Route param = `level`; curriculum concept = `cefrLevel` or `levelCode` | `curriculum.ts`, `[lesson].vue`, `dashboard/level/[level]/index.vue` |
| **Model Status** | Used in `useInputValidation`, `GenerateButton`, `useBackendHealth`, `useTtsApi` | Standardize to `ModelStatus` type: `'loading' \| 'ready' \| 'error'` | All files referencing model state |
| **Synthesis** (vs. Generate) | `Synthesis` class (backend), `synthesize()` method (frontend), "Generate Speech" button label | Backend = "Synthesis"; frontend API = "synthesize"; UI label = "Generate Speech" (user-facing) | `synthesis.py`, `useTtsApi.ts`, `GenerateButton.vue` |

---

## 4. Recommendations

1. **Replace `docs/adr/GLOSSARY.md` with a reference to the root `GLOSSARY.md`** — the root glossary is a superset containing all terms from the ADR glossary plus 47 new terms discovered through codebase exploration.

2. **Standardize "Voice" over "Speaker"** — The `Voice` interface is the frontend's authoritative model. "Speaker" should be documented as an API alias in `SynthesisRequest`.

3. **Rename "Activity Section" to "Activities Stub"** — This reduces the terminology collision between "Activity" (interactive exercises) and "Activity Section" (placeholder).

4. **Audit `resolveSpeaker()`** — This hardcoded character-to-voice mapping is the exact anti-pattern that ADR-009 warns against. It should be moved into the curriculum data model (e.g., `DialogueLine.voiceId?: string`).

5. **Add "Sidecar Metadata" to ADR glossary** — This term was discovered in `audio_store.py` and `tts_cache.py` but was missing from the ADR glossary.

6. **Add "Orphan File" as a distinct term** — The glossary correctly distinguishes "Orphan File" (the file itself) from "Orphan File Cleanup" (the process). This distinction was missing from the ADR glossary.
