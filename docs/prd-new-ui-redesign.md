# PRD: New UI Redesign — Lughat Chat Studio

## Problem Statement

The current Lughat Chat interface is a single-page, light-theme card layout that feels like a utility tool rather than a professional studio application. Users lack visual feedback during audio playback, have no intuitive voice selection experience, and the overall aesthetic doesn't convey the power of the underlying TTS engine. The interface needs a complete visual and UX overhaul to transform it from a basic text-to-speech form into an engaging, professional Arabic TTS studio.

## Solution

A complete UI rewrite that transforms the application into a dark-themed, two-panel studio interface. The new design features:

- **Left sidebar panel**: Arabic text input area with real-time character counting, voice selector dropdown, and speed control slider
- **Right content panel**: Large generate button with glow animation, slide-up audio player panel with waveform visualization
- **Fixed dark theme**: Charcoal background with sunrise gradient accents (coral, orange, gold)
- **Professional typography**: Inter for UI labels, Noto Sans Arabic for text content
- **Animated interactions**: Glow-border button, slide-up player panel, focus halo behind textarea

The rewrite preserves all existing composable logic (useAudioPlayer, useTtsApi, useHealthPoll, etc.) — only the presentation layer changes.

## User Stories

1. As a TTS user, I want a dark-themed studio interface that feels professional and modern, so that the app conveys the power of the underlying speech synthesis engine.

2. As a TTS user, I want a large, full-size text input area in the left sidebar with real-time character counting and clear visual feedback when I approach the limit, so that I can compose Arabic text comfortably without worrying about length constraints.

3. As a TTS user, I want a clear visual indicator (focus halo) when the text input is active, so that I always know where my typing will go.

4. As a TTS user, I want to see the character count in real-time as I type (e.g., "123/3000"), so that I can gauge how much text I'm entering without guessing.

5. As a TTS user, I want the character count to turn red when I exceed the limit, so that I immediately understand why generation is blocked.

6. As a TTS user, I want a clear text input area with a "Clear" button (X icon) to quickly reset my text, so that I can start fresh without manually selecting and deleting.

7. As a TTS user, I want to select a voice from a custom dropdown (not the native browser select), so that the interface feels cohesive and polished.

8. As a TTS user, I want to see all available voices listed in the dropdown with their full names, so that I can easily identify and select my preferred voice.

9. As a TTS user, I want the voice selector to show "No voices available" when no voices are loaded, so that I understand why I can't generate speech.

10. As a TTS user, I want to adjust the speech speed using a visual slider with gradient fill, so that I can fine-tune the playback rate intuitively.

11. As a TTS user, I want to see the current speed value displayed as a percentage (e.g., "100%") next to the slider, so that I know exactly what speed setting I've chosen.

12. As a TTS user, I want the speed slider to have a gradient track that fills proportionally as I adjust it, so that the control feels responsive and visually satisfying.

13. As a TTS user, I want a large generate button with an animated glow border and gradient fill, so that the primary action feels prominent and inviting.

14. As a TTS user, I want the generate button to swap its icon and text when loading (spinner + "Loading…"), generating ("Generating…" with spinner), or ready, so that I always understand the current state.

15. As a TTS user, I want the generate button to be disabled when my text is invalid or too long, so that I understand why generation isn't starting.

16. As a TTS user, I want the generate button to be disabled while the model is loading, so that I don't attempt generation before the system is ready.

17. As a TTS user, I want an audio player panel that slides up from the bottom of the right panel when audio is generated, so that playback controls appear smoothly without disrupting my workflow.

18. As a TTS user, I want to see a visual waveform bar in the audio player that shows playback progress with a gradient fill, so that I can visually track where I am in the audio.

19. As a TTS user, I want to see time displayed as "current / total" (e.g., "0:12 / 0:45"), so that I know how much audio remains.

20. As a TTS user, I want play/pause and rewind (10 seconds) buttons in the audio player, so that I can control playback precisely.

21. As a TTS user, I want a download button in the audio player to save the generated MP3, so that I can reuse the audio outside the app.

22. As a TTS user, I want the audio player panel to stay visible after playback ends (until I manually collapse it), so that I can replay or download without regenerating.

23. As a TTS user, I want to manually collapse the audio player panel using a chevron button, so that I can reclaim screen space when I'm done with playback.

24. As a TTS user, I want the header to show the app logo, title, and model loading status indicator, so that I always know if the TTS engine is ready.

25. As a TTS user, I want the model status to show "Loading…" with an animated spinner while the model initializes, so that I understand why generation might be delayed.

26. As a TTS user, I want the model status to show "Ready" with a green dot when the engine is available, so that I know generation will work.

27. As a TTS user, I want the model status to show "Error" with a red dot when the backend is unreachable, so that I understand why generation fails.

28. As a TTS user, I want global error messages to appear as toast notifications at the top of the screen, so that API failures and network errors are clearly communicated.

29. As a TTS user, I want inline error states in the textarea (red border + message) when validation fails, so that I get immediate visual feedback without dismissing a toast.

30. As a TTS user, I want the overall layout to be clean and uncluttered with proper spacing between elements, so that I can focus on composing text without visual distraction.

31. As a TTS user, I want the app to use Inter font for UI labels and Noto Sans Arabic for text content, so that both English controls and Arabic text are optimally readable.

32. As a TTS user, I want the interface to be fully functional without JavaScript-dependent styling (progressive enhancement), so that basic content is visible even if styles fail to load.

33. As a TTS user, I want keyboard shortcut (Ctrl+Enter) to trigger generation from anywhere in the app, so that I can quickly generate speech without reaching for the mouse.

34. As a TTS user, I want the page to have proper RTL direction for Arabic text while maintaining an LTR overall layout, so that Arabic content reads naturally.

35. As a developer maintaining the app, I want all composable logic (useAudioPlayer, useTtsApi, etc.) to remain untouched during the UI rewrite, so that business logic bugs don't creep in alongside visual changes.

36. As a developer, I want the new UI components to follow the existing `@apply` pattern with BEM-style class names, so that styling is consistent with the rest of the codebase.

37. As a developer, I want to use Lucide icons (via @iconify/json) instead of Phosphor icons, so that we don't add a new icon library dependency.

38. As a developer, I want the simplified CSS-based waveform (no canvas/audio decoding), so that we avoid complex audio processing code in a TTS application.

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
- Build VoiceSelector component (custom dropdown with voice data from existing composable)
- Build SpeedSlider component (gradient track, live percentage display)
- Build GenerateButton component (glow animation, loading state swap)
- Build AudioPlayerPanel component (slide-up panel, CSS waveform bar, playback controls)

### Module: Header
- Displays app logo (volume icon), title "Lughat Chat", and subtitle
- Contains the ModelStatusIndicator component (reused from existing codebase)
- Two-column layout: logo + title on left, status indicator on right

### Module: ArabicTextarea
- Full-size text input area in the left sidebar
- RTL direction for Arabic text content
- Real-time character count display (e.g., "123/3000")
- Character count turns red when approaching/exceeding limit
- Clear button (X icon) to reset text
- Disabled state with visual feedback when text is too long

### Module: FocusHalo
- Subtle glow effect rendered behind the textarea when it has focus
- Uses CSS box-shadow with blur and gradient colors (coral/orange tones)
- Automatically appears/disappears based on textarea focus state

### Module: VoiceSelector
- Custom dropdown replacing native `<select>` element
- Populated from existing `useVoices()` composable
- Shows voice names as dropdown items
- Empty state: "No voices available" when no voices loaded
- Animated chevron indicator for open/closed state

### Module: SpeedSlider
- Visual range slider with gradient track fill
- Current speed displayed as percentage (e.g., "100%") next to slider
- Range: 50% (0.5x) to 200% (2.0x), default 100%
- Track fills proportionally based on current value

### Module: GenerateButton
- Large, prominent button with animated glow border
- Gradient fill (coral → orange → gold)
- Icon and text swap based on state:
  - Ready: mic icon + "Generate Speech"
  - Loading (model): spinner icon + "Loading…"
  - Generating: spinner icon + "Generating…"
- Disabled when text is invalid or too long

### Module: AudioPlayerPanel
- Slide-up panel at the bottom of the right content area
- Hidden by default, appears when audio is generated
- Contains: waveform bar (CSS gradient), time display, playback controls, download button
- Manual collapse via chevron button
- Stays visible after playback ends (no auto-collapse)

### Module: Main Page (index.vue)
- Two-panel layout: aside (left, ~350px) + main content (right, flex-1)
- Fixed dark theme with charcoal background and sunrise gradient accents
- Uses existing composables: useAudioPlayer, useTtsApi, useHealthPoll, useVoices
- Keyboard shortcut (Ctrl+Enter) for generation

### Icon Strategy: Lucide Mapping
All Phosphor icons from the design are mapped to equivalent Lucide icons via `@iconify/json`:
- Speaker hifi → volume-2 (logo)
- Microphone → mic (generate button)
- Headphones → headphones (result label)
- User → user (voice selector)
- Gauge → gauge (speed slider)
- Play → play, Pause → pause (audio controls)
- Download simple → download (download button)
- Skip back → rotate-ccw (rewind 10s)
- Spinner → loader (loading states)
- X → x (close/clear buttons)

### Theme: Fixed Dark
- No light mode support
- All `dark:` variant classes removed from CSS
- Single gradient background: charcoal → deep purple
- Simplified CSS (~60% reduction in style rules)

### Typography: Dual Font Strategy
- **Inter**: UI labels, headers, buttons, status text (English)
- **Noto Sans Arabic**: Textarea content and all Arabic text

### Styling: @apply Pattern Retained
- BEM-style class names in templates (e.g., `header-title`, `sidebar-content`)
- UnoCSS `@apply` directives map class names to utility classes
- Minimal `<style>` blocks only for animations/transitions that can't be expressed as utilities

### Waveform: Simplified CSS Approach
- No canvas-based audio decoding
- CSS gradient progress bar with animated fill
- Synced to playback position via existing `useAudioPlayer` composable

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
2. **VoiceSelector**: Dropdown renders voices from composable, empty state when no voices, selection updates model
3. **SpeedSlider**: Value reflects slider position, percentage display updates, range constraints enforced (50%-200%)
4. **GenerateButton**: Icon/text swap per state, disabled when invalid, click triggers synthesis
5. **AudioPlayerPanel**: Slide-up animation on audio ready, play/pause toggles, download triggers, collapse button hides panel
6. **Header**: Status indicator reflects model status from useHealthPoll composable

### Prior Art
- Existing test patterns in `useTtsApi.test.ts`, `useHealthPoll.test.ts`, `useInputValidation.test.ts` (unit tests for composables)
- Existing component test setup in `tests/setup.component.ts` (mocks URL APIs, fetch)
- Vitest component tests for ModelStatusIndicator and other UI components

### Testing Strategy
- **Unit tests**: Composable integration — verify components correctly consume useAudioPlayer, useTtsApi, useHealthPoll
- **Component tests**: Render and interaction testing for each new component using jsdom environment
- **Integration test**: Full page flow — enter text → select voice → generate → verify player appears → play → download

## Out of Scope

- **Light mode support**: The fixed dark theme is a deliberate decision; light mode will not be implemented
- **Canvas-based waveform**: The simplified CSS progress bar replaces the complex audio decoding approach
- **Backend changes**: No modifications to FastAPI, Coqui XTTS-v2, or Docker configuration
- **Voice discovery**: Dynamic voice preset system (from separate PRD) is out of scope for this rewrite
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

- **Background**: Charcoal (#1a1b26) with sunrise gradient accents
- **Primary colors**: Coral (#ff6b6b), Orange (#ffa07a), Gold (#ffd93d)
- **Text**: White (#ffffff) for primary, gray (#a0aec0) for secondary
- **Border radius**: 12px (cards), 8px (inputs/buttons)
- **Spacing**: 16px base unit, consistent padding/margin scale

### Risk Areas
- **Icon mapping**: Some Phosphor icons don't have perfect Lucide equivalents (e.g., skip-back → rotate-ccw is a reasonable but not exact match)
- **RTL vs LTR**: The page layout is LTR (matching design file), but Arabic text in the textarea remains RTL — this hybrid approach needs careful testing
- **Component state management**: The slide-up player panel introduces new state (visible/collapsed) that doesn't exist in the current single-page flow
- **Animation performance**: Glow effects and slide-up transitions need testing on lower-end devices
