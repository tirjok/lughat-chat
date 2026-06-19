# PRD: Lughat Chat — Studio Redesign (Prototype Integration)

## Problem Statement

The existing Lughat Chat application has functional TTS capabilities but lacks a professional, visually compelling interface. A high-fidelity prototype (`frontend/docs/new-design/lughat_chat_studio.html`) has been created that defines a "Premium Audio Studio" experience with a "Sunrise Surge" dark theme, two-panel layout, AI-assisted editing tools, and a high-fidelity waveform player. The prototype has been **~80% implemented** in the codebase — most UI components exist, the layout is in place, and the theme is configured — but critical integration gaps remain: the AI tools are unconnected, the speed slider is not wired to synthesis, the audio panel lacks a seek bar, and dead code from the previous iteration still exists.

## Solution

Complete the integration of the prototype into the existing Nuxt 4 application by:
1. Implementing the **AI Smart Tools** (Translate, Tashkeel, Continue Script) with a new `useAiTools` composable
2. Wire up the existing **SpeedSlider** to the synthesis call
3. Add a **seek bar** to the `AudioPlayerPanel`
4. Remove **dead code** (old components not used in the new layout)
5. Fix the **panel toggle** system for mobile responsiveness
6. Clean up the **GenerateButton** loading state

This is **not** a from-scratch build. It is a completion and cleanup of work that has already been done.

## User Stories

1. As a voiceover artist, I want a dark, professional studio interface so that I can focus on my work without visual distractions
2. As a user, I want to type or paste Arabic text into a large editor canvas so that I can compose scripts comfortably
3. As a user, I want a "Focus Halo" glow effect around the textarea when I'm actively typing so that I know where my cursor is
4. As a user, I want to see a character counter (0/3000) that turns amber at 80% and red when exceeded so that I stay within limits
5. As a user, I want AI-powered "Translate" so that I can paste English text and get natural Arabic back
6. As a user, I want AI-powered "Add Diacritics (Tashkeel)" so that the TTS engine pronounces words correctly
7. As a user, I want AI-powered "Continue Script" so that I can extend partial drafts with AI-generated continuations
8. As a user, I want to select from multiple voice presets (Aisha, Tariq, Laila) with dialect labels so that I can match the output to my needs
9. As a user, I want to preview a 1-second audio snippet of each voice before selecting it so that I can compare quality
10. As a user, I want a speed slider with a gradient track (orange-to-magenta fill) so that I can fine-tune speech pace (0.5x–2.0x)
11. As a user, I want the speed value to be sent to the TTS backend when generating speech so that the output matches my selected speed
12. As a user, I want a "Generate Speech" button with a spinning conic-gradient border glow so that the action feels premium
13. As a user, I want the generate button to show a loading spinner and "Processing Model..." text while generation is in progress so that I know the app is working
14. As a user, I want the audio player panel to slide up from the bottom with a smooth cubic-bezier easing so that the transition feels polished
15. As a user, I want to see a heatmap-style waveform (orange for loud, magenta for quiet) on a canvas element so that I can visualize the audio
16. As a user, I want the waveform bars to animate in real-time during playback so that I get live visual feedback
17. As a user, I want to play/pause the generated audio from the player panel so that I can control playback
18. As a user, I want a seek bar to scrub through the generated audio so that I can jump to specific points
19. As a user, I want to download the generated audio as an MP3 file so that I can use it offline
20. As a user, I want the application to work on mobile devices with a bottom-sheet layout so that I can use it on the go
21. As a user, I want to toggle between the text editor and voice settings panels on mobile via a floating action button so that I can access both without resizing
22. As a user, I want keyboard shortcut (Ctrl+Enter) to trigger generation so that I can work quickly on desktop
23. As a user, I want to clear the canvas with a trash icon button so that I can start fresh quickly
24. As a user, I want toast notifications for success, error, and info messages so that I get feedback on every action
25. As a user, I want the application to follow UnoCSS BEM patterns so that styles are maintainable and scoped

## Implementation Decisions

### Architecture
- **Existing composables are the seams**: `useTtsApi` (generation), `useAudioModule` (playback), `useVoices` (voice data), `useHealthPoll` (model status), `useToast` (notifications), `usePanelToggle` (mobile panel switching)
- **New composable needed**: `useAiTools` — handles all AI-powered text transformations (translate, tashkeel, continue)
- **No new backend API endpoints needed** — the AI tools will call the existing Gemini API directly from the frontend (same pattern as the prototype)
- **Dead code removal**: `PlayPauseButton.vue`, `SeekableProgressBar.vue`, `TimeDisplay.vue`, and `ArabicTextarea.vue` are not referenced in `pages/index.vue` and must be removed

### Modules to Build / Modify

**New:**
- `app/composables/useAiTools.ts` — AI text transformation composable (translate, tashkeel, continue)
- `app/components/AiToolbar.vue` — AI tools toolbar component (extracted from `pages/index.vue`)

**Modify:**
- `pages/index.vue` — wire up AI toolbar buttons with `@click` handlers, connect `speedValue` to synthesis call, integrate `AiToolbar` component
- `app/components/SpeedSlider.vue` — ensure `v-model` value is passed to `synthesize()` call
- `app/components/AudioPlayerPanel.vue` — add seek bar functionality (reuse `SeekableProgressBar.vue` logic or implement inline)
- `app/components/GenerateButton.vue` — fix loading state text to match prototype ("Processing Model...")
- `app/components/PanelToggle.vue` — wire up to `usePanelToggle` composable for mobile panel switching

**Remove (dead code):**
- `app/components/ArabicTextarea.vue` — not used (textarea is inline in `pages/index.vue`)
- `app/components/PlayPauseButton.vue` — replaced by inline button in `AudioPlayerPanel`
- `app/components/SeekableProgressBar.vue` — not used (audio panel has no seek bar yet)
- `app/components/TimeDisplay.vue` — not used (time format is inline in `AudioPlayerPanel`)

### Technical Clarifications

**AI Tools Integration Pattern:**
```typescript
// useAiTools.ts — proposed interface
interface UseAiToolsResult {
  translate(text: string): Promise<string>
  addTashkeel(text: string): Promise<string>
  continueScript(text: string): Promise<string>
}
```

The composable will call the Gemini API (`/api/generate` or direct Gemini endpoint) with appropriate system prompts for each action. The prototype uses a direct Gemini API call pattern — this is acceptable for a frontend-only feature since it doesn't touch the TTS backend.

**Speed Slider Integration:**
The `SpeedSlider` component already emits `update:modelValue` with the selected speed. The `pages/index.vue` already has `speedValue` as a `shallowRef(1.0)` but it is **not passed** to the `synthesize()` call. Fix: pass `speed: speedValue.value` in the `synthesize()` request object.

**Audio Player Seek Bar:**
The `AudioPlayerPanel` currently has no seek bar. The old `SeekableProgressBar.vue` component provides the exact logic needed (click-to-seek, ratio calculation). Options:
- Option A: Re-import and use `SeekableProgressBar.vue` (simplest)
- Option B: Implement inline in `AudioPlayerPanel` (avoids dead code concern)

Recommend **Option B** — implement the seek bar inline in `AudioPlayerPanel` using `useAudioModule.seek()`, then delete `SeekableProgressBar.vue`.

**Panel Toggle System:**
The `PanelToggle` FAB already exists and uses `usePanelToggle` composable. The `pages/index.vue` already renders it. The mobile CSS sliding (using `data-active-panel` and `data-panel` attributes) is already implemented in `pages/index.vue`'s `<style>` block. This is **already working** — no changes needed.

**GenerateButton Loading State:**
The prototype shows "Processing Model..." during generation. The existing `GenerateButton.vue` already has a loading state with a spinner, but the text is hardcoded. Fix: ensure the loading state text matches the prototype exactly.

### API Contract

**AI Tools API (new, frontend-only):**
```typescript
// useAiTools.ts
interface AiToolsOptions {
  apiKey?: string  // for Gemini API
}

interface UseAiToolsResult {
  translate(text: string): Promise<string>
  addTashkeel(text: string): Promise<string>
  continueScript(text: string): Promise<string>
}
```

The AI tools will call Gemini directly from the browser (no backend proxy needed). This is a frontend-only feature that doesn't modify the TTS backend.

### Schema Changes

No database or backend schema changes. The AI tools are frontend-only and call an external API (Gemini).

### Specific Interactions

**AI Toolbar → Gemini API flow:**
1. User clicks "Translate" / "Tashkeel" / "Continue Script" in the AI toolbar
2. The button shows a loading state (spinner + action name)
3. `useAiTools` sends the text to Gemini API with an appropriate system prompt
4. On success, the textarea content is replaced with the AI's response
5. A toast notification confirms the action
6. On error, an error toast is shown

**Speed Slider → Synthesis flow:**
1. User adjusts the speed slider (0.5x–2.0x)
2. `SpeedSlider` emits `update:modelValue` with the new value
3. `pages/index.vue` stores the value in `speedValue` ref
4. On generate, `speedValue.value` is passed to `synthesize()` request
5. Backend uses the speed parameter for TTS generation

## Testing Decisions

### What makes a good test
- Test external behavior only (inputs → outputs), not implementation details
- Follow the existing test patterns: Vitest + Vue Test Utils + jsdom
- Use the existing `setup.ts` and `setup.component.ts` mock infrastructure
- Test composables at their highest seam (function signatures + reactive state)
- Test components by their rendered output and emitted events

### Modules to test

1. **`useAiTools` composable** (new)
   - `translate()` returns Arabic text from English input
   - `addTashkeel()` returns diacritized Arabic text
   - `continueScript()` returns extended Arabic text
   - Error handling when API fails (returns error message)
   - Prior art: `useTtsApi.test.ts` (fetch wrapper with error handling)

2. **`SpeedSlider` component** (modify existing test)
   - Current test exists in `SpeedSlider.test.ts` — verify it still passes
   - Add test: value is correctly emitted on slider change
   - Add test: gradient fill updates correctly

3. **`AudioPlayerPanel` component** (modify existing test)
   - Current test exists in `AudioPlayerPanel.test.ts` — verify it still passes
   - Add test: seek bar allows scrubbing to a specific point
   - Add test: play/pause toggles the audio state

4. **`GenerateButton` component** (modify existing test)
   - Current test exists in `GenerateButton.test.ts` — verify it still passes
   - Add test: loading state shows correct text

5. **`AiToolbar` component** (new)
   - Translate button calls `useAiTools.translate()`
   - Tashkeel button calls `useAiTools.addTashkeel()`
   - Continue button calls `useAiTools.continueScript()`
   - Loading state is shown during API call
   - Prior art: `VoiceSelector.test.ts` (click interactions + state changes)

6. **Integration: Full synthesis flow** (new)
   - Text input → speed selection → generate → audio plays → waveform animates
   - Prior art: `index.test.ts` (full page integration test)

### Prior art
- `WaveformCanvas.test.ts` — tests canvas rendering, `requestAnimationFrame` lifecycle
- `VoiceSelector.test.ts` — tests dropdown interactions, voice selection, responsive breakpoints
- `SpeedSlider.test.ts` — tests slider value emission, clamping
- `AudioPlayerPanel.test.ts` — tests panel visibility, play/pause
- `useAudioModule.test.ts` — tests audio playback state transitions
- `useTtsApi.test.ts` — tests fetch wrapper with error handling
- `PanelSliding.test.ts` — tests mobile panel sliding transitions

## Out of Scope

- **Backend AI integration** — AI tools call Gemini directly from the browser; no backend changes needed
- **Voice cloning / speaker embedding** — not part of this redesign
- **Real-time streaming audio** — generation still produces full files
- **Multi-user support / authentication** — single-user application
- **Cloud deployment specifics** — designed for local Docker Compose (existing deployment model)
- **GPU acceleration** — CPU-only inference (existing constraint)
- **Batch processing / queue system** — single request at a time
- **New TTS models** — XTTS-v2 remains the model
- **Redesigning the backend API** — existing `/api/generate`, `/health`, `/voices` endpoints remain unchanged
- **New font families** — Cairo (Arabic) and Inter (UI) are already configured

## Further Notes

### Current State Assessment (80% Implemented)

**Already Implemented (from prototype → codebase):**
- ✅ Two-panel layout (CSS-only sliding for mobile)
- ✅ UnoCSS "Sunrise Surge" theme (colors, fonts, breakpoints)
- ✅ `VoiceSelector` component (dropdown, voice preview, color coding)
- ✅ `SpeedSlider` component (gradient track, stepper buttons on mobile)
- ✅ `GenerateButton` component (conic-gradient border glow, loading state)
- ✅ `WaveformCanvas` component (60 bars, heatmap colors, animation loop)
- ✅ `AudioPlayerPanel` component (slide-up animation, play/pause, download)
- ✅ `FocusHaloCanvas` component (radial gradient glow on textarea focus)
- ✅ `PanelToggle` FAB (mobile panel switching)
- ✅ `MobileStatusIndicator` and `ModelStatusIndicator` (model status pills)
- ✅ `ToastNotification` component (toast messages with auto-dismiss)
- ✅ `useAudioModule` composable (playback state management)
- ✅ `useTtsApi` composable (synthesis API wrapper)
- ✅ `useVoices` composable (voice data loading)
- ✅ `useHealthPoll` composable (model status polling)
- ✅ `usePanelToggle` composable (mobile panel state)
- ✅ `useInputValidation` composable (text length + model status)
- ✅ `useToast` composable (notification system)

**Missing / Needs Work (~20%):**
- ❌ **AI Smart Tools** — buttons exist in template but have NO `@click` handlers; no `useAiTools` composable exists
- ❌ **Speed Slider → Synthesis wiring** — `speedValue` is a ref but NOT passed to `synthesize()` call
- ❌ **Audio Player Seek Bar** — `AudioPlayerPanel` has no seek bar; old `SeekableProgressBar.vue` exists but is unused
- ❌ **Dead Code** — `ArabicTextarea.vue`, `PlayPauseButton.vue`, `SeekableProgressBar.vue`, `TimeDisplay.vue` are not referenced
- ⚠️ **GenerateButton Loading Text** — prototype says "Processing Model..." which the component already has (verify)
- ⚠️ **Panel Toggle FAB** — exists and is rendered but needs verification that it works with the CSS sliding

### Divergence from Original PRD
This PRD supersedes the original `docs/PRD.md` for the UI layer. The backend (FastAPI + XTTS-v2) and deployment (Docker Compose) remain unchanged. The original PRD described a basic TTS tool; this redesign elevates it to a "Premium Audio Studio" with AI-assisted editing, a professional dark theme, and a high-fidelity waveform player.

### Migration Strategy
Since ~80% of the work is already done, the migration is a **completion and cleanup**, not a rebuild:
1. Implement `useAiTools` composable (new)
2. Wire up AI toolbar buttons in `pages/index.vue` (3 `@click` handlers)
3. Connect `speedValue` to `synthesize()` call (1 line change)
4. Add seek bar to `AudioPlayerPanel` (reuse `SeekableProgressBar` logic inline)
5. Remove 4 dead code components
6. Update existing tests for new behavior
7. Verify all existing tests still pass
