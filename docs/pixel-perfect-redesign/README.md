# Pixel-Perfect Studio Redesign — Issue Breakdown

This folder contains the complete issue breakdown for the pixel-perfect integration of the Lughat Chat Studio prototype into the Nuxt 4 application.

**Source prototype**: `frontend/docs/new-design/lughat_chat_studio.html` (906 lines)
**Current implementation**: ~80% functional, ~0% pixel-perfect

## Execution Order

```
#01 Icon Library (HITL — decision)
  ↓
#02 Global Styles (foundation)
  ↓
#03 #04 #05 #06 #07 #08 #09 #10 (all parallel — 8 components)
  ↓
#11 Dead Code Removal
  ↓
#12 Pixel Verification (HITL — sign-off)
```

## Issue Index

| # | File | Title | Type | Blocked By |
|---|------|-------|------|------------|
| 01 | `01-switch-icon-library.md` | Switch Icon Library: Lucide → Phosphor | HITL | None |
| 02 | `02-global-styles.md` | Global Styles: Fonts, Scrollbars, Caret Color, Animations | AFK | #01 |
| 03 | `03-voice-selector.md` | VoiceSelector: Pixel-Perfect Dropdown | AFK | #01, #02 |
| 04 | `04-speed-slider.md` | SpeedSlider: Custom Thumb Styling | AFK | #01, #02 |
| 05 | `05-generate-button.md` | GenerateButton: Conic Border Animation | AFK | #02 |
| 06 | `06-audio-player-panel.md` | AudioPlayerPanel: Icon & Button Styling | AFK | #01 |
| 07 | `07-waveform-canvas.md` | WaveformCanvas: DPR + roundRect | AFK | #02 |
| 08 | `08-focus-halo.md` | FocusHaloCanvas: Fix Visibility Logic | AFK | #01, #02 |
| 09 | `09-panel-toggle-status.md` | PanelToggle & MobileStatusIndicator: Correct Icons | AFK | #01 |
| 10 | `10-page-ui-elements.md` | pages/index.vue: Missing UI Elements | AFK | #01, #02 |
| 11 | `11-dead-code-removal.md` | Remove Dead Code + Update Tests | AFK | #01 |
| 12 | `12-final-verification.md` | Final Verification: Prototype Pixel Comparison | HITL | #01–#11 |

## Deferred (Later Phase)

These features are functional but not visual — deferred to a separate PRD:

- **AI Smart Tools**: Translate, Tashkeel, Continue Script (Gemini API integration)
- **Audio Player Seek Bar**: Clickable progress scrubber
- **AI Toolbar Component**: `AiToolbar.vue` with loading states

## Key Findings from Codebase Audit

### Icon Library Mismatch (affects 15+ files)
The prototype uses **Phosphor Icons** (`@phosphor-icons/web`). The existing codebase uses **Lucide** via UnoCSS preset. Every icon across every component must be replaced.

### Missing Visual Details (component-by-component)

| Missing | Affected Components |
|---------|-------------------|
| Custom scrollbar styling | Global (all scrollable areas) |
| `caret-color: #FF512F` on textarea | `pages/index.vue` |
| `Inter` font for UI text | `uno.config.ts` (currently only Cairo) |
| `@keyframes pulse-glow` animation | AI toolbar (deferred) |
| Missing icons (music-notes, download, close, trash, play/pause) | AudioPlayerPanel, GenerateButton, pages/index.vue |
| Inverted FocusHalo logic | FocusHaloCanvas (shows when empty, hides when focused) |
| Missing keyboard shortcut hint | pages/index.vue |
| Missing clear canvas button | pages/index.vue |

### Already Correct (no changes needed)
- `MobileStatusIndicator` — pixel-perfect ✅
- `SpeedSlider` gradient fill logic (JS) ✅
- `GenerateButton` conic gradient border (`::before`) ✅
- `GenerateButton` loading spinner (24px, 3px border) ✅
- `GenerateButton` "Processing Model..." text ✅
- `SpeedSlider` wrapper (`pt-2 pb-4`) + markers ✅
- `WaveformCanvas` bar configuration (60 bars, 10%–90%) ✅
- `WaveformCanvas` heatmap color interpolation ✅
- `WaveformCanvas` `roundRect` with 4px radius ✅
- `WaveformCanvas` animation loop (playing vs paused) ✅

## Color Palette (Sunrise Surge)

| Token | Hex | Usage |
|-------|-----|-------|
| `studio-900` | `#121212` | Page background |
| `studio-800` | `#1A1A1A` | Panel backgrounds |
| `studio-700` | `#2A2A2A` | Borders, inactive elements |
| `sunrise-orange` | `#FF512F` | Primary accent, active states |
| `sunrise-magenta` | `#DD2476` | Secondary accent, play button |
| `studio-text` | `#E0E0E0` | Body text |

## Breakpoint System

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 375px | iPhone SE |
| `sm` | 414px | iPhone Plus |
| `md` | 768px | Tablet, desktop split |
| `lg` | 1024px | Desktop wide |
| `xl` | 1280px | Desktop extra wide |
| `2xl` | 1536px | Large screens |
