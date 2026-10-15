# GLOSSARY.md — Lughat Chat

> Domain-specific terms unique to Lughat Chat. Generic web development terms (component, route, API, composable) are not included.

---

## Curriculum Domain

### Lesson
A unit of curriculum content, identified by a string ID (e.g., `a1-01`, `b2-01`). A lesson contains sections and optionally activities. It is the primary data unit in the curriculum model.

### Section
A categorized subset of a lesson. Each section has a `type` (e.g., `dialogue`, `vocabulary`, `pronouns`, `expressions`, `grammar`) and type-specific content. Sections are rendered as tabs on the lesson page.

### Activity
An interactive exercise type defined in `ActivityDefinition`. Types include `translate-to-english`, `translate-to-arabic`, `introduce-characters`, `role-play`, and `listen-translate`. Activities are defined in the curriculum data model but are **not yet rendered** in the UI.

### Activity Section
A placeholder section with `type: 'grammar'` and empty content, labeled "Activities" in the lesson page tab bar. **Not connected to `ActivityDefinition`** — it is a stub that renders "Content coming soon." Source of significant user expectation gap.

### CEFR Level
A curriculum tier using Common European Framework of Reference codes: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper-Intermediate), C1 (Advanced), C2 (Proficiency). Maps to `CurriculumLevel.code`.

### Curriculum Level
A container for a set of lessons at a specific CEFR tier. Contains metadata (title, arabicTitle, description, gradient) and an array of `LessonDefinition` objects.

### Lesson Definition
The data model for a single lesson. Contains `id`, `title`, `arabicTitle`, `description`, `sections` (array of `SectionDefinition`), `competencies` (array of strings), and `activities` (array of `ActivityDefinition`).

### Section Definition
The data model for a lesson section. Contains `name`, `type`, and type-specific `content`. Has a `get items()` accessor that flattens nested content into a `SectionItem[]` array for UI rendering.

### Flattened Items
A projection of nested section content into a flat `SectionItem[]` array, created via `SectionDefinition.get items()`. Used by existing UI components (dialogue, vocabulary, pronouns) that expect a flat list of items rather than nested structures.

---

## Audio / TTS Domain

### Speaker WAV
A reference audio file (`.wav`) used by XTTS-v2 for voice cloning. Stored in `backend/speaker_wavs/`. Discovered by scanning the directory — filenames become voice IDs.

### Voice
A named speaker preset (e.g., "KSA Zariyah - Female", "KSA Hamed - Male"). Mapped from speaker WAV filenames. The frontend `Voice` interface includes `id`, `name`, `dialect`, `tag`, `icon`, and `speaker_wav`.

### Speaker
An alias for "voice" in the API contract. Synonym for `voice` in `SynthesisRequest`. Preferred over `voice` parameter when both are provided.

### Sticky Audio Bar
A fixed-bottom audio player component (`StickyAudioBar.vue`). Provides play/pause, seek, speed control, repeat mode, and download. Only used on lesson pages (`[lesson].vue`), **not** on the TTS Studio page.

### TTS Studio
The primary landing page (`/`) for text-to-speech synthesis. Features a two-panel layout (text editor + voice settings) with an inline audio player embedded in `DesktopPanels` and `MobileSplitScreen`. Has its own audio player, separate from `StickyAudioBar`.

### Lesson Page
The lesson details page at `/dashboard/level/{level}/{lesson}`. Orchestrates section-specific components (dialogue, vocabulary, pronouns, expressions, grammar, activities) and uses `StickyAudioBar` for audio playback.

### Synthesis
The process of converting text to speech via XTTS-v2. Involves: text input → speaker resolution → TTS inference → WAV generation → FFmpeg conversion to MP3 → caching → response.

### Cache Key
A SHA-256 hash of the composite string `{text}|{language}|{voice}`. Used to deduplicate synthesis requests — if the same text/language/voice combination is requested, the cached MP3 is returned instead of re-synthesizing.

---

## State / Data Domain

### Progress Store
In-memory dictionary (`dict[str, float]`) storing lesson completion percentages. Keyed by lesson ID, values are floats (0.0–100.0). **Lost on backend restart** — no persistence layer exists.

### Flattened Progress
A `Record<string, StoredProgress>` object in the frontend's `useLessonProgress` composable. Maps lesson IDs to `{ completedLines, totalLines, pct }` objects. Shared as a module-level singleton across all Vue instances.

### Section Tabs
The tab bar rendered on the lesson page, showing one tab per section in the lesson data. Tab labels are derived from `SectionDefinition.name`. Tab order follows the order of sections in the data array.

### Lesson ID
A string identifier for a lesson (e.g., `a1-01`, `b2-01`, `c1-01`). Used in routes, progress storage, and curriculum lookups. Format: `{cefr_code}-{sequence_number}`.

### Route Parameter `level`
The URL segment representing a CEFR level (e.g., `/dashboard/level/A1`). Mapped to `CurriculumLevel.code` via `getLevelByCode()`.

### Route Parameter `lesson`
The URL segment representing a lesson ID (e.g., `/dashboard/level/A1/a1-01`). Mapped to `LessonDefinition.id` via `getLessonById()`.

---

## Architecture Domain

### Deep Module
A backend module that encapsulates complex domain logic behind a single interface. Examples: `ModelManager` (TTS lifecycle), `Synthesis` (full synthesis pipeline), `AudioStore` (audio file management).

### Composable
A Vue 3 composition API function that encapsulates reusable state and logic. Examples: `useAudioModule`, `useTtsApi`, `useLessonProgress`, `useVoices`.

### Section Item
A flat representation of content from any section type. Contains `arabic`, `english`, `notes`, `transliteration`, and type-specific fields (e.g., `speaker`, `speaker_wav`, `singular`, `dual`, `plural`). Created by `SectionDefinition.get items()`.

### Dialogue Line
A `SectionItem` with `type: 'dialogue'`. Contains `speaker`, `arabic`, `english`, `notes`, and `speaker_wav`. Used by `LessonDialogue` component to render speaker cards with audio playback.

### Vocabulary Item
A `SectionItem` with `type: 'vocabulary'`. Contains `arabic`, `english`, `notes`, and `examples` (array of `{ arabic, english }`). Used by `LessonVocabulary` component to render vocabulary cards.

### Pronoun Item
A `SectionItem` with `type: 'pronouns'`. Contains `arabic`, `english`, `examples`, and gender-specific forms (`singular`, `dual`, `plural`). Used by `LessonPronouns` component.

### Grammar Topic
A `SectionItem` with `type: 'grammar'`. Contains `name`, `description`, and `examples` (array of `{ arabic, english }`). Used by `LessonGrammar` component.

### Expression Item
A `SectionItem` with `type: 'expressions'`. Contains `arabic`, `english`. Used by `LessonExpressions` component.

---

## UI Domain

### Hero Section
The top section of the lesson page, displaying lesson metadata: title, Arabic title, level badge, scene count, estimated time, and status pills (completed/in-progress).

### Section Tabs
The tab bar below the hero, allowing users to switch between lesson sections (Dialogue, Vocabulary, Pronouns, Expressions, Grammar, Activities).

### Content Coming Soon
Placeholder text rendered when a section has no data or when a section type is not yet implemented. Currently rendered for Activities (all lessons), Expressions (lessons a2-01 through c2-01), and Grammar (lessons c1-01, c2-01).

### Character-to-Voice Mapping
A hardcoded function (`resolveSpeaker()`) in the lesson page that maps character names (e.g., "Muhammad", "Khadija") to voice IDs (e.g., "KSA Hamed - Male", "KSA Zariyah - Female").

### Orphan File Cleanup
A scheduled backend job that removes synthesized audio files older than N hours from the audio directory. Triggered via `POST /api/cleanup`.

### Backend Health Poll
A frontend composable (`useBackendHealth`) that periodically polls `GET /api/health` to determine if the TTS model is loaded and ready. Returns status: `loading`, `ready`, or `error`.
