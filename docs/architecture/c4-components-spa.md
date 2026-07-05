# C4 Component Diagram — Lughat Chat Frontend

> **System:** Lughat Chat — Arabic Text-to-Speech Studio
> **Generated:** 2026-07-05
> **Level:** 3 — Component (Internal structure of the Nuxt SPA)
> **Container:** Nuxt SPA (Nuxt 4.4.5 + Vue 3 + TypeScript)

---

## Component Overview

The Nuxt SPA is a single-page application with a two-panel layout (Control Deck + Waveform Canvas). It is organized into **pages**, **components**, and **composables** — all auto-imported by Nuxt's file-based conventions.

## Diagram

```mermaid
C4Component
  title Component Diagram - Lughat Chat SPA

  Container(spa, "Nuxt SPA", "Nuxt 4.4.5 + Vue 3 + TypeScript", "Full-page TTS Studio")

  Component_Boundary(pages, "Pages") {
    Component(indexPage, "index.vue", "Page", "Full-page TTS Studio. Orchestrates all components and composables. Manages two-panel layout (desktop) and split-screen (mobile).")
  }

  Component_Boundary(components, "Components") {
    Component(audioPlayer, "AudioPlayerPanel.vue", "Vue Component", "Audio playback panel: play/pause, seek, waveform, download, close controls")
    Component(waveform, "WaveformCanvas.vue", "Vue Component", "Animated waveform visualization: draws audio buffer data, plays progress overlay")
    Component(focusHalo, "FocusHaloCanvas.vue", "Vue Component", "Focus halo effect: radial gradient glow behind textarea on focus")
    Component(generateBtn, "GenerateButton.vue", "Vue Component", "Generate speech button with loading spinner, disabled states, model-status awareness")
    Component(mobileStatus, "MobileStatusIndicator.vue", "Vue Component", "Compact model status indicator (mobile FAB)")
    Component(desktopStatus, "ModelStatusIndicator.vue", "Vue Component", "Desktop model status pill (loading/ready/error)")
    Component(panelToggle, "PanelToggle.vue", "Vue Component", "Mobile panel toggle FAB: switches between control-deck and canvas panels")
    Component(speedSlider, "SpeedSlider.vue", "Vue Component", "Speed adjustment slider (0.5×–2.0×) with numeric display")
    Component(toast, "ToastNotification.vue", "Vue Component", "Toast notification display: auto-dismiss, top-center positioning")
    Component(voiceSelect, "VoiceSelector.vue", "Vue Component", "Voice/dialect selector dropdown with animated transitions")
  }

  Component_Boundary(composables, "Composables") {
    Component(audioModule, "useAudioModule.ts", "Composable", "Audio playback state management: load, play, pause, toggle, seek, download, dispose")
    Component(healthPoll, "useHealthPoll.ts", "Composable", "Backend health check polling: 2s interval, max 10 retries, terminal state detection")
    Component(inputValidation, "useInputValidation.ts", "Composable", "Text input validation: length check (max 3000), model status check")
    Component(panelToggle, "usePanelToggle.ts", "Composable", "Panel toggle state: active panel (control-deck ↔ canvas)")
    Component(toast, "useToast.ts", "Composable", "Toast notification management: show, dismiss, keyboard shortcut (Esc)")
    Component(ttsApi, "useTtsApi.ts", "Composable", "TTS API calls: synthesize (POST /api/generate), healthCheck (GET /health)")
    Component(voices, "useVoices.ts", "Composable", "Voice list fetching and management: GET /api/voices, auto-select first voice")
  }

  Rel(indexPage, audioPlayer, "Passes props", "visible, isPlaying, currentTime, duration, audioUrl, etc.")
  Rel(indexPage, waveform, "Passes props", "visible, isPlaying, currentTime, duration")
  Rel(indexPage, focusHalo, "Passes prop", "focused")
  Rel(indexPage, generateBtn, "Passes props", "isGenerating, modelStatus, disabled")
  Rel(indexPage, mobileStatus, "Embeds", "Compact status display")
  Rel(indexPage, desktopStatus, "Embeds", "Status pill display")
  Rel(indexPage, panelToggle, "Embeds", "Panel toggle FAB")
  Rel(indexPage, speedSlider, "v-model", "speedValue")
  Rel(indexPage, toast, "Embeds", "Toast display")
  Rel(indexPage, voiceSelect, "v-model", "selectedSpeaker")

  Rel(indexPage, audioModule, "Uses", "load, play, pause, toggle, seek, download, dispose")
  Rel(indexPage, healthPoll, "Uses", "status, modelLoaded")
  Rel(indexPage, ttsApi, "Uses", "synthesize, healthCheck")
  Rel(indexPage, voices, "Uses", "voices, loadVoices")
  Rel(indexPage, inputValidation, "Uses", "isValid, error")
  Rel(indexPage, panelToggle, "Uses", "activePanel")
  Rel(indexPage, toast, "Uses", "showToast")

  Rel(audioPlayer, audioModule, "Calls", "toggle, seek, download")
  Rel(waveform, audioModule, "Calls", "seek")
  Rel(generateBtn, ttsApi, "Triggers", "synthesize call")
  Rel(healthPoll, ttsApi, "Delegates", "fetch /health")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")
```

## Component Inventory

### Pages (1)

| Component | File | Description |
|-----------|------|-------------|
| `index.vue` | `app/pages/index.vue` | Root page. Orchestrates all components and composables. Manages desktop (side-by-side) and mobile (split-screen) layouts. |

### Components (10)

| Component | Role | Key Props / Events |
|-----------|------|-------------------|
| `AudioPlayerPanel.vue` | Audio playback UI | Props: `visible`, `isPlaying`, `isPaused`, `currentTime`, `duration`, `audioUrl`, `selectedVoiceName`, `speedValue`. Events: `close`, `toggle`, `download`, `seek` |
| `WaveformCanvas.vue` | Waveform visualization | Props: `visible`, `isPlaying`, `currentTime`, `duration`. Events: `seek` |
| `FocusHaloCanvas.vue` | Focus glow effect | Props: `focused` (boolean) |
| `GenerateButton.vue` | Synthesis trigger | Props: `isGenerating`, `modelStatus`, `disabled`. Events: `click` |
| `MobileStatusIndicator.vue` | Mobile model status | None (reads health poll state) |
| `ModelStatusIndicator.vue` | Desktop model status | None (reads health poll state) |
| `PanelToggle.vue` | Mobile panel switcher | None (reads panel toggle state) |
| `SpeedSlider.vue` | Speed control | v-model: `speedValue` (0.5–2.0) |
| `ToastNotification.vue` | Toast display | None (reads toast state) |
| `VoiceSelector.vue` | Voice selection | v-model: `selectedSpeaker`, `voices` array |

### Composables (7)

| Composable | Purpose | Exposed API |
|------------|---------|-------------|
| `useAudioModule()` | Audio playback state | `load()`, `play()`, `pause()`, `toggle()`, `seek()`, `download()`, `dispose()`, `audioRef`, state refs |
| `useHealthPoll()` | Backend health polling | `status` (ref: loading/ready/error), `modelLoaded` (computed) |
| `useInputValidation()` | Text validation | `isValid` (computed), `error` (computed) |
| `usePanelToggle()` | Panel toggle state | `activePanel` (ref: "control-deck" \| "canvas") |
| `useToast()` | Toast notifications | `showToast(message, type)`, toast list (ref) |
| `useTtsApi()` | TTS API client | `synthesize(request)`, `healthCheck()` |
| `useVoices()` | Voice management | `voices` (ref), `loading` (ref), `error` (ref), `loadVoices()` |

## Data Flow

```
User Input (textarea)
    │
    ▼
useInputValidation → isValid / error
    │
    ▼ (if valid)
GenerateButton.click
    │
    ▼
useTtsApi.synthesize({ text, speaker, speed })
    │
    ▼ (POST /api/generate → returns Blob)
useAudioModule.load(blob)
    │
    ▼
<audio> element → play() → waveform renders → user hears speech
```

## Key Design Patterns

1. **Composable-based state management** — No global store; each composable manages its own reactive state with Vue's `ref`/`computed`.
2. **Auto-imported by Nuxt** — All components and composables are auto-imported by Nuxt's file-based conventions (no explicit imports needed, though the page uses explicit imports for clarity).
3. **v-model pattern** — `VoiceSelector` and `SpeedSlider` use Vue 3's `v-model` for two-way binding.
4. **Event-driven audio** — `useAudioModule` wires event listeners (`loadedmetadata`, `timeupdate`, `ended`, `error`, `play`, `pause`) to the `<audio>` element.
5. **Health polling with auto-stop** — `useHealthPoll` polls `/health` every 2s and stops on terminal state (ready/error).
