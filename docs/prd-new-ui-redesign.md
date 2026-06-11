# PRD: New UI Redesign — Lughat Chat Studio

## Problem Statement

The current Lughat Chat interface is a single-page, light-theme card layout that feels like a utility tool rather than a professional studio application. Users lack visual feedback during audio playback, have no intuitive voice selection experience, and the overall aesthetic doesn't convey the power of the underlying TTS engine. The interface needs a complete visual and UX overhaul to transform it from a basic text-to-speech form into an engaging, professional Arabic TTS studio.

## Solution

A complete UI rewrite that transforms the application into a dark-themed, two-panel studio interface. The new design features:

- **Left sidebar panel** (~30% width on desktop, ~25% on lg+): Arabic text input area with real-time character counting, voice selector dropdown, speed control slider, and High Quality Audio toggle
- **Right content panel** (~70% width on desktop, ~75% on lg+): Animated glowing-border generate button, slide-up audio player panel with canvas-based heatmap waveform visualization
- **Fixed dark theme**: Charcoal background (#121212) with sunrise gradient accents (magenta #DD2476, orange #FF512F)
- **Professional typography**: Inter for UI labels, Cairo for Arabic text content
- **Animated interactions**: Spinning conic-gradient border on generate button, slide-up player panel, focus halo (radial gradient) behind textarea, canvas-based animated waveform

The rewrite preserves all existing composable logic (useAudioPlayer, useTtsApi, useHealthPoll, etc.) — only the presentation layer changes.

## User Stories

1. As a TTS user, I want a dark-themed studio interface that feels professional and modern, so that the app conveys the power of the underlying speech synthesis engine.

2. As a TTS user, I want a large, full-size text input area in the left sidebar with real-time character counting and clear visual feedback when I approach the limit, so that I can compose Arabic text comfortably without worrying about length constraints.

3. As a TTS user, I want a clear visual indicator (focus halo) when the text input is active, so that I always know where my typing will go.

4. As a TTS user, I want to see the character count in real-time as I type (e.g., "123/3000"), so that I can gauge how much text I'm entering without guessing.

5. As a TTS user, I want the character count to turn red when I exceed the limit, so that I immediately understand why generation is blocked.

6. As a TTS user, I want a clear text input area with a trash icon button to quickly reset my text, so that I can start fresh without manually selecting and deleting.

7. As a TTS user, I want a floating shortcut hint at the bottom-right of the canvas ("Press Ctrl + Enter to generate") styled with dark panel background and keyboard key badges, so that I'm reminded of the keyboard shortcut without it being intrusive.

8. As a TTS user, I want to select a voice from a custom dropdown (not the native browser select) that shows voice name, regional dialect tag, and a play icon for preview, so that the interface feels cohesive and polished.

9. As a TTS user, I want to see 3 voice presets in the dropdown (Aisha - Conversational / Egyptian Arabic [AR-EG], Tariq - News Anchor / Modern Standard Arabic [MSA], Laila - Storyteller / Levantine Arabic [AR-LB]) with color-coded voice icons (orange/magenta), so that I can easily identify and select my preferred voice.

10. As a TTS user, I want to adjust the speech speed using a visual slider with a gradient track fill (magenta → orange), so that I can fine-tune the playback rate intuitively.

11. As a TTS user, I want to see the current speed value displayed as "1.0x" next to the slider in a monospace badge, so that I know exactly what speed setting I've chosen.

12. As a TTS user, I want the speed slider to have a gradient track (magenta #DD2476 to orange #FF512F) that fills proportionally as I adjust it, so that the control feels responsive and visually satisfying.

13. As a TTS user, I want a large generate button with an animated spinning conic-gradient border (magenta → orange) and dark inner fill, so that the primary action feels prominent and inviting.

14. As a TTS user, I want the generate button to swap its icon and text when loading (spinner + "Loading…"), generating ("Generating…" with spinner), or ready, so that I always understand the current state.

15. As a TTS user, I want the generate button to be disabled when my text is invalid or too long, so that I understand why generation isn't starting.

16. As a TTS user, I want the generate button to be disabled while the model is loading, so that I don't attempt generation before the system is ready.

17. As a TTS user, I want an audio player panel that slides up from the bottom of the right panel when audio is generated (using cubic-bezier(0.16, 1, 0.3, 1) easing), so that playback controls appear smoothly without disrupting my workflow.

18. As a TTS user, I want to see a canvas-based heatmap waveform in the audio player — 60 animated bars with colors interpolated between magenta (#DD2476) and orange (#FF512F) based on bar height, animating via requestAnimationFrame during playback — so that I can visually track where I am in the audio.

19. As a TTS user, I want to see time displayed as "current / total" (e.g., "0:12 / 0:45"), so that I know how much audio remains.

20. As a TTS user, I want a large magenta play/pause button and a download button in the audio player, so that I can control playback precisely.

21. As a TTS user, I want a download button in the audio player to save the generated MP3, so that I can reuse the audio outside the app.

22. As a TTS user, I want the audio player panel to stay visible after playback ends (until I manually collapse it), so that I can replay or download without regenerating.

23. As a TTS user, I want to manually collapse the audio player panel using a close (X) button, so that I can reclaim screen space when I'm done with playback.

24. As a TTS user, I want the header to show the app logo (waves icon), title "LughatChat" (with "Chat" in magenta), subtitle "Premium Audio Studio", and model loading status indicator, so that I always know if the TTS engine is ready.

25. As a TTS user, I want the model status to show "Loading…" with an animated spinner while the model initializes, so that I understand why generation might be delayed.

26. As a TTS user, I want the model status to show "Ready" with a green dot when the engine is available, so that I know generation will work.

27. As a TTS user, I want the model status to show "Error" with a red dot when the backend is unreachable, so that I understand why generation fails.

28. As a TTS user, I want global error messages to appear as toast notifications at the top of the screen, so that API failures and network errors are clearly communicated.

29. As a TTS user, I want inline error states in the textarea (red border + message) when validation fails, so that I get immediate visual feedback without dismissing a toast.

30. As a TTS user, I want the overall layout to be clean and uncluttered with proper spacing between elements, so that I can focus on composing text without visual distraction.

31. As a TTS user, I want the app to use Inter font for UI labels and Cairo font for Arabic text content, so that both English controls and Arabic text are optimally readable.

32. As a TTS user, I want the interface to be fully functional without JavaScript-dependent styling (progressive enhancement), so that basic content is visible even if styles fail to load.

33. As a TTS user, I want keyboard shortcut (Ctrl+Enter) to trigger generation from anywhere in the app, so that I can quickly generate speech without reaching for the mouse.

34. As a TTS user, I want the page to have proper RTL direction for Arabic text while maintaining an LTR overall layout, so that Arabic content reads naturally.

35. As a developer maintaining the app, I want all composable logic (useAudioPlayer, useTtsApi, etc.) to remain untouched during the UI rewrite, so that business logic bugs don't creep in alongside visual changes.

36. As a developer, I want the new UI components to follow the existing `@apply` pattern with BEM-style class names, so that styling is consistent with the rest of the codebase.

37. As a developer, I want to keep the existing Lucide icon setup (via @iconify/json) for consistency with the current codebase.

38. As a developer, I want a canvas-based heatmap waveform (60 animated bars, color-interpolated between magenta and orange based on height, animated via requestAnimationFrame), matching the design file's visual specification.

39. As a developer, I want the fixed dark theme (no light mode), so that we eliminate ~40% of CSS complexity and remove all `dark:` variant classes.

## Implementation Decisions

### Architecture: Two-Phase Rewrite
The rewrite is split into two phases to enable incremental testing and visible progress.

**Phase 1 — Layout + Core Components (the "shell"):**
- Rewrite `index.vue` with the new two-panel layout structure (aside + main)
- Build Header component (logo, title, status indicator)
- Build ArabicTextarea in its new full-size canvas form (big RTL text, char count, clear button)
- Build FocusHalo component (glow effect behind textarea on focus)

**Phase 2 — Interactive Components (the "brains"):**
- Build VoiceSelector component (custom dropdown with 3 voice presets, regional tags, preview from existing composable)
- Build SpeedSlider component (gradient track, live "1.0x" display)
- Build GenerateButton component (conic-gradient animation, loading state swap)
- Build AudioPlayerPanel component (slide-up panel, canvas heatmap waveform, playback controls)

### Module: Header
- Displays app logo (waves icon), title "LughatChat" (with "Chat" in magenta), subtitle "Premium Audio Studio"
- Contains the ModelStatusIndicator component (reused from existing codebase)
- Two-column layout: logo + title on left, status indicator on right

### Module: ArabicTextarea
- Full-size text input area in the left sidebar
- RTL direction for Arabic text content
- Real-time character count display (e.g., "123/3000")
- Character count turns red when exceeding limit
- Trash icon button to reset text
- Floating shortcut hint at bottom-right of canvas ("Press Ctrl + Enter")
- Disabled state with visual feedback when text is too long

### Module: FocusHalo
- Radial gradient glow effect rendered behind/below the textarea when it has focus
- Uses CSS radial-gradient (magenta/orange tones) with blur, positioned below textarea
- Automatically appears/disappears based on textarea focus state

### Module: VoiceSelector
- Custom dropdown replacing native `<select>` element
- Populated from existing `useVoices()` composable
- Shows 3 voice presets with color-coded icons: Aisha (orange, Egyptian Arabic [AR-EG]), Tariq (magenta, Modern Standard Arabic [MSA]), Laila (orange, Levantine Arabic [AR-LB])
- Each voice option shows name, regional dialect tag, and a hover-revealed play icon for "Preview Voice" (shows toast: "Playing 1-second preview...")
- Selected voice shown in trigger with color-coded waveform icon
- Animated chevron indicator for open/closed state
- Backend change: extend `/api/voices` to support 3 voice presets (Aisha, Tariq, Laila) with regional dialect metadata

### Module: SpeedSlider
- Visual range slider with gradient track fill (magenta #DD2476 to orange #FF512F)
- Current speed displayed as "1.0x" format next to slider in monospace badge
- Range: 0.5x to 2.0x, default 1.0x
- Track fills proportionally based on current value (JS sets CSS gradient variable)

### Module: GenerateButton
- Large button with animated spinning conic-gradient border (magenta → orange) and dark inner fill
- Icon and text swap based on state:
  - Ready: play icon (ph-fill ph-play-circle equivalent) + "Generate Speech"
  - Loading (model): spinner + "Processing Model..."
  - Generating: spinner + "Processing Model..."
- Disabled when text is invalid or too long
- Backend icon mapping (Lucide): volume-2 (logo), mic/gauge (labels), play/pause (audio controls), download (download), loader (spinner), x (close), trash (clear), waves (header logo)

### Module: AudioPlayerPanel
- Slide-up panel at the bottom of the right content area (cubic-bezier(0.16, 1, 0.3, 1) easing)
- Hidden by default, appears when audio is generated
- Contains: canvas-based heatmap waveform (60 animated bars, magenta→orange color interpolation), time display, play/pause button (magenta), download button
- Manual collapse via X button
- Stays visible after playback ends (no auto-collapse)
- Backend icon mapping (Lucide): music-notes (audio icon), download (download), x (close), play/pause (controls)

### Module: Main Page (index.vue)
- Two-panel layout: aside (left, ~30% width) + main content (right, ~70% width; ~25%/~75% on lg+)
- Fixed dark theme with charcoal background and sunrise gradient accents
- Uses existing composables: useAudioPlayer, useTtsApi, useHealthPoll, useVoices
- Keyboard shortcut (Ctrl+Enter) for generation (also shown as floating hint at bottom-right)

### Icon Strategy: Keep Lucide
We keep the existing Lucide icon setup (via `@iconify/json`) for consistency. The design file uses Phosphor icons, but the mapping to Lucide equivalents is:
- waves (header logo) → volume-2
- user-sound (voice selector label) → user
- gauge (speed label) → gauge
- sliders-horizontal (output settings label) → sliders-horizontal
- play-circle (generate button) → play (or custom SVG)
- waveform (voice icon) → waveform (or music-notes)
- play/pause (audio controls) → play / pause
- download-simple (download) → download
- x (close/clear) → x
- trash (clear text) → trash
- spinner (loading) → loader
- music-notes (audio icon) → music-notes
- keyboard (canvas label) → keyboard

### Theme: Fixed Dark ("Sunrise Surge" Palette)
- No light mode support
- All `dark:` variant classes removed from CSS
- Color palette:
  - **Background**: Charcoal #121212
  - **Panels**: #1A1A1A
  - **Borders**: #2A2A2A
  - **Text**: #E0E0E0 (primary), gray #a0aec0 (secondary)
  - **Sunrise orange**: #FF512F
  - **Sunrise magenta**: #DD2476
  - **Green (status)**: #22c55e
  - **Red (errors)**: red-500
- Border radius: 12px (cards), 8px (inputs/buttons), rounded-full (status dots, buttons)
- Spacing: 16px base unit, consistent padding/margin scale
- Custom scrollbar: 8px width, #2A2A2A thumb, #121212 track
- Custom animation: `pulse-glow` (2s cubic-bezier infinite), `spin-slow` (4s linear infinite)

### Typography: Dual Font Strategy
- **Inter**: UI labels, headers, buttons, status text (English)
- **Cairo**: Textarea content and all Arabic text (matches design file and current codebase)

### Styling: @apply Pattern Retained
- BEM-style class names in templates (e.g., `header-title`, `sidebar-content`)
- UnoCSS `@apply` directives map class names to utility classes
- Minimal `<style>` blocks only for animations/transitions that can't be expressed as utilities

### Waveform: Canvas-Based Heatmap
- Canvas-based heatmap waveform with 60 animated bars
- Colors interpolated between magenta (#DD2476) and orange (#FF512F) based on bar height
- Bars animate via `requestAnimationFrame` during playback (sine wave + random noise modulation)
- Static state: bars settle to random target heights
- Synced to playback state via existing `useAudioPlayer` composable (isPlaying flag)

### Error Handling: Toast + Inline
- Global errors (API failures, network issues): toast notifications via existing `useToast` composable
- Inline errors (textarea validation, player errors): red border + message in the component

## Testing Decisions

### What Makes a Good Test
- Tests should verify **external behavior** (user-visible outcomes), not internal implementation details
- Test component rendering: does the component display correctly with given props?
- Test user interactions: do events fire, states change, and visual feedback appear as expected?
- Test composable integration: do components correctly consume existing composables (useAudioPlayer, useTtsApi)?

### Modules to Test
1. **ArabicTextarea**: Character count updates, validation state changes (valid/invalid/too long), clear button resets text, disabled state when invalid
2. **VoiceSelector**: Dropdown renders 3 voice presets with regional tags, color-coded icons, preview play button (toast), selection updates model
3. **SpeedSlider**: Value reflects slider position, "1.0x" display updates, range constraints enforced (0.5x-2.0x)
4. **GenerateButton**: Icon/text swap per state, disabled when invalid, click triggers synthesis
5. **AudioPlayerPanel**: Slide-up animation on audio ready, canvas waveform animation, play/pause toggles, download triggers, collapse button hides panel
6. **Header**: Status indicator reflects model status from useHealthPoll composable

### Prior Art
- Existing test patterns in `useTtsApi.test.ts`, `useHealthPoll.test.ts`, `useInputValidation.test.ts` (unit tests for composables)
- Existing component test setup in `tests/setup.component.ts` (mocks URL APIs, fetch)
- Vitest component tests for ModelStatusIndicator and other UI components

### Testing Strategy
- **Unit tests**: Composable integration — verify components correctly consume useAudioPlayer, useTtsApi, useHealthPoll
- **Component tests**: Render and interaction testing for each new component using jsdom environment
- **Integration test**: Full page flow — enter text → select voice (with preview) → generate → verify player appears with canvas waveform → play → download → collapse

## Out of Scope

- **Light mode support**: The fixed dark theme is a deliberate decision; light mode will not be implemented
- **Backend voice changes**: Supporting 3 voice presets (Aisha, Tariq, Laila) with regional dialect metadata requires extending `/api/voices` endpoint
- **Recording pipeline**: No audio recording capability — the app only generates and plays back speech
- **Multi-language support**: The app remains Arabic-only; no language switching UI
- **Mobile responsive design**: The new layout is desktop-first; mobile adaptations are out of scope for this PRD
- **Accessibility audit**: While the new design improves visual hierarchy, a full WCAG accessibility audit is deferred

## Further Notes

### Migration Path
The rewrite replaces the presentation layer entirely while preserving all business logic. The composable layer (useAudioPlayer, useTtsApi, useHealthPoll, useInputValidation, useTimeDisplay, useToast, useVoices) remains untouched. This separation of concerns means:

- Business logic bugs cannot creep in alongside visual changes
- The old components can be kept as reference during development
- Rollback is trivial: revert the presentation layer, keep composables intact

### Design File Reference
The new design is specified in `frontend/docs/new-design/lughat_chat_studio.html`. This file serves as the visual reference for all components. Key design tokens:

- **Background**: Deep charcoal #121212
- **Panels**: #1A1A1A
- **Borders**: #2A2A2A
- **Sunrise orange**: #FF512F
- **Sunrise magenta**: #DD2476
- **Text**: #E0E0E0 (primary), gray #a0aec0 (secondary)
- **Border radius**: 12px (cards), 8px (inputs/buttons), rounded-full (status dots, buttons)
- **Spacing**: 16px base unit, consistent padding/margin scale
- **Layout**: Sidebar ~30% width (desktop), ~25% (lg+); Canvas ~70% (desktop), ~75% (lg+)
- **Custom scrollbar**: 8px width, #2A2A2A thumb
- **Animations**: `pulse-glow` (2s), `spin-slow` (4s), slide-up with cubic-bezier(0.16, 1, 0.3, 1)

### Risk Areas
- **RTL vs LTR**: The page layout is LTR (matching design file), but Arabic text in the textarea remains RTL — this hybrid approach needs careful testing
- **Component state management**: The slide-up player panel introduces new state (visible/collapsed) that doesn't exist in the current single-page flow
- **Animation performance**: Conic-gradient spinning border, canvas waveform, and slide-up transitions need testing on lower-end devices
- **Canvas waveform**: 60 bars animated at 60fps needs performance budgeting
- **Backend voice presets**: Extending `/api/voices` to support 3 presets with regional dialect metadata is a new backend requirement
