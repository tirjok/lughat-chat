# Lughat Chat

Arabic language learning platform with text-to-speech synthesis. Learners progress through CEFR-aligned lessons with dialogue, vocabulary, grammar, and interactive exercises, supported by XTTS-v2 voice synthesis.

---

## Curriculum

### Lesson
A unit of curriculum content identified by a string ID (e.g., `a1-01`, `b2-01`). A lesson contains sections and optionally activities. It is the primary data unit in the curriculum model.

_Avoid_: Lesson Page, Lesson Content, Lesson Data

### Section
A categorized subset of a lesson with a `type` (e.g., `dialogue`, `vocabulary`, `pronouns`, `expressions`, `grammar`). Sections are rendered as tabs on the lesson page.

_Avoid_: Tab, Section Tab

### Activity
An interactive exercise defined by `ActivityDefinition` with a `type` (e.g., `translate-to-english`, `role-play`, `listen-translate`). Activities are defined in the curriculum data model but are **not yet rendered** in the UI.

_Avoid_: Exercise, Quiz, Task

### Activity Section
A placeholder section with `type: 'grammar'` and empty content, labeled "Activities" in the lesson page tab bar. **Not connected to `ActivityDefinition`** — it is a stub that renders "Content coming soon."

_Avoid_: Activities Tab, Exercise Section

### CEFR Level
A curriculum tier using Common European Framework of Reference codes: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper-Intermediate), C1 (Advanced), C2 (Proficiency). Maps to `CurriculumLevel.code`.

_Avoid_: Level, Level Code, Tier

### Curriculum Level
A container for a set of lessons at a specific CEFR tier. Contains metadata (title, arabicTitle, description, gradient) and an array of `LessonDefinition` objects.

_Avoid_: Level Group, Level Container

### Lesson Definition
The data model for a single lesson. Contains `id`, `title`, `arabicTitle`, `description`, `sections` (array of `SectionDefinition`), `competencies` (array of strings), and `activities` (array of `ActivityDefinition`).

_Avoid_: Lesson Model, Lesson Schema

### Section Definition
The data model for a lesson section. Contains `name`, `type`, and type-specific `content`. Has a `get items()` accessor that flattens nested content into a `SectionItem[]` array for UI rendering.

_Avoid_: Section Model, Section Schema

### Flattened Items
A projection of nested section content into a flat `SectionItem[]` array, created via `SectionDefinition.get items()`. Used by existing UI components that expect a flat list of items rather than nested structures.

_Avoid_: Flat Items, Projection, Items Array

### Dialogue Scene
A named grouping of dialogue lines (e.g., "Scene 1: Muhammad ↔ Ali"). Contains a `label` and an array of `DialogueLine` objects.

_Avoid_: Scene, Dialogue Block

### Dialogue Line
A single spoken utterance within a dialogue scene. Contains `speaker`, `arabic`, `english`, and optional `notes`. Used by `LessonDialogue` to render speaker cards with audio playback.

_Avoid_: Line, Utterance, Speech Line

### Vocabulary Category
A named grouping of vocabulary words (e.g., "Salutations", "Nouns"). Contains a `label` and an array of `VocabWord` objects.

_Avoid_: Word Group, Vocab Category

### Vocab Word
A single vocabulary entry with `arabic`, `english`, and optional `singular`/`plural` forms. Used by `LessonVocabulary` to render vocabulary tables.

_Avoid_: Word, Vocabulary Item

### Pronoun Entry
A single Arabic pronoun with `arabic`, `english`, and `example` text. Pronouns encode gender (male/female) and number (singular/dual/plural). Used by `LessonPronouns`.

_Avoid_: Pronoun, Pronoun Word

### Grammar Topic
A grammar concept with `name`, `description`, and an array of `examples` (each with `arabic` and `english`). Used by `LessonGrammar`.

_Avoid_: Grammar Rule, Grammar Item

### Expression Entry
A single Arabic expression with `arabic` and `english` translation. Used by `LessonExpressions`.

_Avoid_: Expression, Phrase

### Competency
A learning outcome string attached to a lesson (e.g., "Can read fluently short paragraphs with harakat"). Optionally mapped to activities via `competencyMap`.

_Avoid_: Learning Objective, Skill, Goal

### Section Type
The category discriminator for a section: `dialogue`, `vocabulary`, `pronouns`, `expressions`, `grammar`, or `activity`. Determines the shape of `SectionContent`.

_Avoid_: Section Category, Section Kind

### Section Content
A discriminated union type keyed by `type`, containing type-specific nested data (scenes, categories, topics, expressions). The source of truth for section rendering.

_Avoid_: Section Data, Section Body

### Activity Type
The discriminator for an activity: `listen-translate`, `translate-to-english`, `translate-to-arabic`, `introduce-characters`, `role-play`, `fill-blank`, or `matching`. Determines the shape of `ActivityContent`.

_Avoid_: Exercise Type, Activity Kind

### Activity Content
A discriminated union type keyed by `type`, containing type-specific exercise data (dialogue, sentences, characters, scenarios).

_Avoid_: Exercise Content, Activity Data

### Lesson ID
A string identifier for a lesson (e.g., `a1-01`, `b2-01`). Format: `{cefr_code}-{sequence_number}`. Used in routes, progress storage, and curriculum lookups.

_Avoid_: Lesson Code, Lesson Key

### Route Parameter `level`
The URL segment representing a CEFR level (e.g., `/dashboard/level/A1`). Mapped to `CurriculumLevel.code` via `getLevelByCode()`.

_Avoid_: Level Param, URL Level

### Route Parameter `lesson`
The URL segment representing a lesson ID (e.g., `/dashboard/level/A1/a1-01`). Mapped to `LessonDefinition.id` via `getLessonById()`.

_Avoid_: Lesson Param, URL Lesson

### Sidecar Metadata
A JSON file stored alongside each generated audio file, recording the original synthesis parameters (`text`, `language`, `voice`, `created_at`). Used by `AudioStore` to reconstruct history entries.

_Avoid_: Audio Metadata, Synthesis Record

---

## Audio / TTS

### Speaker WAV
A reference audio file (`.wav`) used by XTTS-v2 for voice cloning. Stored in `backend/speaker_wavs/`. Discovered by scanning the directory — filenames become voice IDs.

_Avoid_: Voice Sample, Reference Audio, Speaker File

### Voice
A named speaker preset (e.g., "KSA Zariyah - Female", "KSA Hamed - Male"). Mapped from speaker WAV filenames. The frontend `Voice` interface includes `id`, `name`, `dialect`, `tag`, `icon`, and `speaker_wav`.

_Avoid_: Speaker, Voice ID, Voice Preset

### Speaker
An alias for "voice" in the API contract. Synonym for `voice` in `SynthesisRequest`. Preferred over `voice` parameter when both are provided.

_Avoid_: Voice Alias, Speaker Name

### Sticky Audio Bar
A fixed-bottom audio player component (`StickyAudioBar.vue`). Provides play/pause, seek, speed control, repeat mode, and download. Only used on lesson pages (`[lesson].vue`), **not** on the TTS Studio page.

_Avoid_: Audio Bar, Player Bar, Bottom Player

### TTS Studio
The primary landing page (`/`) for text-to-speech synthesis. Features a two-panel layout (text editor + voice settings) with an inline audio player embedded in `DesktopPanels` and `MobileSplitScreen`. Has its own audio player, separate from `StickyAudioBar`.

_Avoid_: Studio, Synthesis Studio, Home Page

### Lesson Page
The lesson details page at `/dashboard/level/{level}/{lesson}`. Orchestrates section-specific components (dialogue, vocabulary, pronouns, expressions, grammar, activities) and uses `StickyAudioBar` for audio playback.

_Avoid_: Lesson Details, Lesson View

### Synthesis
The process of converting text to speech via XTTS-v2. Involves: text input → speaker resolution → TTS inference → WAV generation → FFmpeg conversion to MP3 → caching → response.

_Avoid_: Text-to-Speech, TTS, Speech Generation, Audio Generation

### Cache Key
A SHA-256 hash of the composite string `{text}|{language}|{voice}`. Used to deduplicate synthesis requests — if the same text/language/voice combination is requested, the cached MP3 is returned instead of re-synthesizing.

_Avoid_: Synthesis Key, Audio Hash, Cache Hash

### Orphan File
A synthesized audio file (MP3 or WAV) older than 24 hours that has no active user session. Removed by the cleanup endpoint (`POST /api/cleanup`) or the scheduled cleanup job.

_Avoid_: Old Audio, Stale File, Orphan Audio

### Model Status
The lifecycle state of the TTS model: `loading` (initializing), `ready` (loaded and serving requests), or `error` (failed to load). Polled by `useBackendHealth`.

_Avoid_: Model State, Model Phase, Model Readiness

### Health Check
A periodic frontend poll of `GET /health` to determine if the TTS model is loaded and ready. Returns `{ status, model_loaded }`.

_Avoid_: Health Poll, Backend Check, Status Poll

### Synthesis Request
The frontend API contract for requesting speech synthesis. Contains `text`, optional `speaker`, optional `speed`, optional `seed`, and optional `signal` (AbortSignal).

_Avoid_: TTS Request, Speech Request, Generate Request

### Synthesis Response
The backend response to a synthesis request. Contains `audio_url` and `duration_seconds`.

_Avoid_: TTS Response, Audio Response

### Health Response
The backend response to a health check. Contains `status` (`loading` | `ready` | `error`) and `model_loaded` (boolean).

_Avoid_: Status Response, Health Result

### Speed Value
A playback speed multiplier for audio: `0.75`, `1.0`, or `1.25`. Cycled via the StickyAudioBar speed toggle.

_Avoid_: Playback Speed, Speed Multiplier, Rate

### Repeat Mode
A playback loop setting on the StickyAudioBar: `off`, `one` (repeat current line), or `all` (repeat entire scene).

_Avoid_: Loop Mode, Repeat Setting

### Character-to-Voice Mapping
A hardcoded function (`resolveSpeaker()`) in the lesson page that maps character names (e.g., "Muhammad", "Khadija") to voice IDs (e.g., "KSA Hamed - Male", "KSA Zariyah - Female").

_Avoid_: Speaker Resolution, Voice Resolution, Character Mapping

### Speaker Resolution
The backend process in `Synthesis.generate()` that resolves the requested voice from `speaker` or `voice` parameters, defaults to "KSA Zariyah - Female", and validates the corresponding speaker WAV file exists.

_Avoid_: Voice Resolution, Voice Lookup

### XTTS Minimum Reference Duration
The minimum duration (0.33 seconds) required for a speaker WAV file to be valid for XTTS-v2 voice cloning. Shorter files are rejected with a 500 error.

_Avoid_: Min Duration, Reference Length

---

## State / Data

### Progress Store
In-memory dictionary (`dict[str, float]`) storing lesson completion percentages. Keyed by lesson ID, values are floats (0.0–100.0). **Lost on backend restart** — no persistence layer exists.

_Avoid_: Progress Data, Progress Backend, Progress Map

### Flattened Progress
A `Record<string, StoredProgress>` object in the frontend's `useLessonProgress` composable. Maps lesson IDs to `{ completedLines, totalLines, pct }` objects. Shared as a module-level singleton across all Vue instances.

_Avoid_: Progress State, Progress Frontend, Progress Object

### Stored Progress
A single lesson's progress record containing `completedLines`, `totalLines`, and `pct` (percentage). Used by the frontend progress composable.

_Avoid_: Progress Entry, Progress Record

### Section Tabs
The tab bar rendered on the lesson page, showing one tab per section in the lesson data. Tab labels are derived from `SectionDefinition.name`. Tab order follows the order of sections in the data array.

_Avoid_: Tabs, Tab Bar, Section Navigation

### Orphan File Cleanup
A backend process that removes synthesized audio files older than N hours (default 24) from the audio directory. Triggered via `POST /api/cleanup` or automatically during history listing.

_Avoid_: Cleanup Job, Cleanup Endpoint, File Cleanup

### Backend Health Poll
A frontend composable (`useBackendHealth`) that periodically polls `GET /health` to determine if the TTS model is loaded and ready. Returns status: `loading`, `ready`, or `error`.

_Avoid_: Health Polling, Health Monitor, Model Poll

---

## Architecture

### Deep Module
A backend module that encapsulates complex domain logic behind a single interface. Examples: `ModelManager` (TTS lifecycle), `Synthesis` (full synthesis pipeline), `AudioStore` (audio file management).

_Avoid_: Domain Module, Deep Layer, Core Module

### Composable
A Vue 3 composition API function that encapsulates reusable state and logic. Examples: `useAudioModule`, `useTtsApi`, `useLessonProgress`, `useVoices`.

_Avoid_: Hook, Plugin, Utility

### Section Item
A flat representation of content from any section type. Contains `arabic`, `english`, `notes`, `transliteration`, and type-specific fields (e.g., `speaker`, `speaker_wav`, `singular`, `dual`, `plural`). Created by `SectionDefinition.get items()`.

_Avoid_: Flat Item, Item, Content Item

### Dialogue Line
A `SectionItem` with `type: 'dialogue'`. Contains `speaker`, `arabic`, `english`, `notes`, and `speaker_wav`. Used by `LessonDialogue` component to render speaker cards with audio playback.

_Avoid_: Line Item, Dialogue Item

### Vocabulary Item
A `SectionItem` with `type: 'vocabulary'`. Contains `arabic`, `english`, `notes`, and `examples` (array of `{ arabic, english }`). Used by `LessonVocabulary` component to render vocabulary cards.

_Avoid_: Vocab Item, Word Item

### Pronoun Item
A `SectionItem` with `type: 'pronouns'`. Contains `arabic`, `english`, `examples`, and gender-specific forms (`singular`, `dual`, `plural`). Used by `LessonPronouns` component.

_Avoid_: Pronoun Entry, Pronoun Item

### Grammar Topic
A `SectionItem` with `type: 'grammar'`. Contains `name`, `description`, and `examples` (array of `{ arabic, english }`). Used by `LessonGrammar` component.

_Avoid_: Grammar Item, Grammar Entry

### Expression Item
A `SectionItem` with `type: 'expressions'`. Contains `arabic`, `english`. Used by `LessonExpressions` component.

_Avoid_: Expression Entry, Expression Item

---

## Studio UI

### Control Deck
The left panel of the TTS Studio's two-panel layout. Contains text input, voice selector, speed slider, and generate button.

_Avoid_: Controls Panel, Settings Panel, Input Panel

### Canvas
The right panel of the TTS Studio's two-panel layout. Contains the waveform visualization, audio playback controls, and focus halo.

_Avoid_: Waveform Panel, Display Panel, Output Panel

### Panel Toggle
The mechanism for switching between Control Deck and Canvas on mobile (stacked) vs. desktop (side-by-side). Uses a breakpoint at 768px.

_Avoid_: Panel Switch, Panel Switcher, Responsive Panel

### Waveform Canvas
A canvas-based visualization of audio playback progress. Renders animated bars that respond to playback state (playing/paused/stopped).

_Avoid_: Waveform, Audio Visualizer, Bars

### Focus Halo
A radial gradient glow that appears at the bottom of the canvas when the text input gains focus (RTL mode). Provides visual feedback for active editing.

_Avoid_: Halo, Glow, Focus Glow

### Cleanup Dialog
A confirmation dialog that appears when navigating away from the TTS Studio with unsaved synthesis. Offers "Cleanup & Leave" (dispose audio, call cleanup API) or "Stay" (keep synthesis active).

_Avoid_: Leave Dialog, Navigation Dialog, Cleanup Confirmation

### Generate Button
The primary CTA in the TTS Studio. Displays "Generate Speech" (ready), "Processing Model..." (loading), or "Error" (error state).

_Avoid_: Synthesize Button, Generate Speech Button, CTA

### Toast Notification
A transient message component (`ToastNotification.vue`) for success, error, and info messages. Used throughout the application for feedback (cleanup results, navigation cancellations, etc.).

_Avoid_: Notification, Alert, Message Toast

### Global Navbar
A shared top navigation component rendered in `app.vue`. Contains logo, navigation links (Home, Dashboard), per-lesson progress bar, and mobile-responsive menu.

_Avoid_: Navbar, Navigation Bar, Top Bar

### Nav Item
A navigation entry in the GlobalNavbar with `to` (route), `label`, `icon`, and `activeIcon`. Currently: Home (`/`) and Dashboard (`/dashboard`).

_Avoid_: Nav Link, Menu Item, Navigation Entry

### Progress Width
The fill width of the progress bar in the GlobalNavbar, computed from `getLessonProgress()` for the current lesson. Shows `0%` on non-lesson routes.

_Avoid_: Progress Bar, Progress Fill, Progress Indicator

### Active Panel
The currently visible panel in the TTS Studio: `'control-deck'` or `'canvas'`. Toggled by the user or auto-switched on mobile.

_Avoid_: Visible Panel, Current Panel, Active View

### Input Validation Result
The result of `useInputValidation`: `{ isValid, error }`. `isValid` is `true` only when text is non-empty AND model status is `ready`. Error messages: "Please enter text to convert to speech" or "Model is loading, please wait...".

_Avoid_: Validation State, Input State

### Drag Resize
The mechanism for resizing the TTS Studio's two panels via drag. Tracks velocity and applies spring-based projection for flick gestures.

_Avoid_: Resize Handle, Panel Resize, Drag Handle

### Flick Projection
A gesture where fast dragging beyond a velocity threshold (30 px/s) triggers a spring-animated panel resize without further user input.

_Avoid_: Flick Gesture, Momentum Resize

### Scroll Reveal
An IntersectionObserver-based animation system that triggers fade-up animations when elements with class "fade-up" enter the viewport. Respects `prefers-reduced-motion`.

_Avoid_: Fade Animation, Scroll Animation, Reveal

### Breakpoint Mobile
The CSS breakpoint (768px) used to distinguish mobile from desktop layouts. Below this, panels stack vertically; above, they sit side-by-side.

_Avoid_: Mobile Breakpoint, Responsive Breakpoint, Tablet Breakpoint

### Velocity Buffer
A sliding window of the last 4 pointermove events used to calculate drag velocity for flick projection.

_Avoid_: Velocity History, Motion Buffer

### Canvas Ratio
The vertical ratio of the canvas panel relative to the total panel height (default 0.55, range 0.25–0.85).

_Avoid_: Panel Ratio, Canvas Size, Split Ratio

### Audio Module
A composable (`useAudioModule`) that manages audio playback state: `isPlaying`, `isPaused`, `currentTime`, `duration`, `audioUrl`, `blobRef`, and `audioRef`. Provides `load()`, `play()`, `pause()`, `toggle()`, `seek()`, `download()`, and `dispose()`.

_Avoid_: Audio Player, Audio Controller, Audio State

### TTS API
A composable (`useTtsApi`) that wraps the backend TTS endpoints (`/api/generate`, `/health`). Provides `synthesize()` (returns Blob) and `healthCheck()` (returns HealthResponse).

_Avoid_: TTS Client, Speech API, Audio API

### Voice Selector
A dropdown component for selecting among available voices. Displays the selected voice name with color coding. Animates open/close with spring easing.

_Avoid_: Voice Dropdown, Voice Picker, Voice Menu

### Speed Slider
A pill-style toggle for cycling through playback speeds (0.75x, 1x, 1.25x). Used in both the TTS Studio and StickyAudioBar.

_Avoid_: Speed Control, Speed Toggle, Rate Slider

### Lesson Orchestrator
A composable (`useLessonOrchestrator`) managing lesson page navigation: `activeSection`, `currentIndex`, `navigateToSection()`, `navigateNext()`, `navigatePrevious()`, and `handleArrowKey()`.

_Avoid_: Lesson Controller, Section Navigator, Page Router

### Lesson Progress
A composable (`useLessonProgress`) managing per-lesson completion state. Exposes `getLessonProgress()`, `setLessonProgress()`, and `clearLessonProgress()`. Shares state as a module-level singleton.

_Avoid_: Progress Tracker, Progress Manager

### Cleanup Navigation
A composable (`useCleanupNavigation`) managing the "unsaved synthesis" dialog when navigating away from the TTS Studio. Offers cleanup-and-leave or stay options.

_Avoid_: Navigation Guard, Leave Handler

### Lesson Hero
The top banner component of the lesson page. Displays level badge, lesson number, Arabic title, estimated time, scene count, and status (ready/in-progress).

_Avoid_: Lesson Banner, Lesson Header, Hero Banner

### Lesson Dialogue
A section-specific component rendering dialogue scenes with scene tabs, line cards (Arabic, transliteration, English, speaker badges), and audio binding.

_Avoid_: Dialogue Component, Scene Player

### Lesson Vocabulary
A section-specific component rendering vocabulary grouped by category, with Arabic, English, and singular/plural forms in a table layout.

_Avoid_: Vocabulary Component, Word Table

### Lesson Pronouns
A section-specific component rendering Arabic pronouns with gender-specific color coding and example sentences.

_Avoid_: Pronouns Component, Pronoun Grid

### Lesson Grammar
A section-specific component rendering grammar topics with descriptions and bilingual examples.

_Avoid_: Grammar Component, Grammar Cards

### Lesson Expressions
A section-specific component rendering Arabic expressions with English translations in a grid layout.

_Avoid_: Expressions Component, Expression Grid

### Lesson Competencies
A section-specific component displaying the lesson's learning outcomes (competencies).

_Avoid_: Competencies Component, Learning Outcomes

### Lesson Activities
A section-specific component for interactive exercises. Currently renders "Content coming soon" — a stub.

_Avoid_: Activities Component, Exercise Runner

### Lesson Activity Runner
A sub-dispatcher component that routes to specific activity type renderers (translate, role-play, fill-blank, matching).

_Avoid_: Activity Dispatcher, Exercise Runner

### Page Orchestrator
The lesson page (`[lesson].vue`) that computes section-specific data slices and routes `activeSection` to the appropriate component. Manages shared state (audio module, progress) across all components.

_Avoid_: Lesson Page, Lesson Router, Page Controller

### Content Coming Soon
Placeholder text rendered when a section has no data or when a section type is not yet implemented. Currently rendered for Activities (all lessons), Expressions (lessons a2-01 through c2-01), and Grammar (lessons c1-01, c2-01).

_Avoid_: Coming Soon, Placeholder, Stub Content
