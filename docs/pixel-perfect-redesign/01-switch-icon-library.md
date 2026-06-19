# 01 — Switch Icon Library: Lucide → Phosphor Icons

## Type

HITL (requires project decision)

## What to build

Replace every `i-lucide-*` reference across the entire codebase with the exact Phosphor Icon equivalents used in the prototype (`lughat_chat_studio.html`). This is the single largest visual change — every component is affected.

The prototype uses Phosphor Icons via CDN (`@phosphor-icons/web`). The existing codebase uses Lucide via UnoCSS preset. The icon names, shapes, and visual weight differ — switching is not a simple rename.

### Icon Mapping (prototype → existing)

| Prototype (Phosphor) | Existing (Lucide) | Component |
|---|---|---|
| `ph-fill ph-waves` | `i-lucide-audio-waveform` | Header, VoiceSelector |
| `ph ph-user-sound` | `i-lucide-headphones` | VoiceSelector label |
| `ph ph-gauge` | `i-lucide-gauge` | SpeedSlider label |
| `ph ph-keyboard` | `i-lucide-terminal` | Page header |
| `ph ph-trash` | (none — text label) | Clear button |
| `ph ph-waveform` | `i-lucide-audio-waveform` | VoiceSelector, PanelToggle |
| `ph-fill ph-music-notes` | (none) | AudioPlayerPanel icon |
| `ph-fill ph-play` / `ph-fill ph-pause` | `i-lucide-play` / `i-lucide-pause` | AudioPlayerPanel |
| `ph ph-download-simple` | (none) | AudioPlayerPanel |
| `ph ph-x` | (none) | AudioPlayerPanel |
| `ph ph-caret-down` | `i-lucide-chevron-down` | VoiceSelector |
| `ph ph-sliders-horizontal` | `i-lucide-sliders-horizontal` | PanelToggle |
| `ph-fill ph-play-circle` | `i-lucide-play-circle` | GenerateButton |

### Scope

- `uno.config.ts`: Remove Lucide preset (`@iconify-json/lucide`), add Phosphor Icons CDN
- `frontend/docs/new-design/lughat_chat_studio.html` references `@phosphor-icons/web` — match this
- All 15 Vue components: replace every `i-lucide-*` class with the correct Phosphor class
- 15+ test files: update icon assertions and class matches
- `app/pages/index.vue`: update all inline icon references

### Files affected (approx.)

- `uno.config.ts`
- `app/components/VoiceSelector.vue`
- `app/components/SpeedSlider.vue`
- `app/components/GenerateButton.vue`
- `app/components/AudioPlayerPanel.vue`
- `app/components/WaveformCanvas.vue`
- `app/components/FocusHaloCanvas.vue`
- `app/components/PanelToggle.vue`
- `app/components/MobileStatusIndicator.vue`
- `app/pages/index.vue`
- All test files in `frontend/tests/`

## Acceptance criteria

- [ ] All `i-lucide-*` references removed from source files
- [ ] Phosphor Icons loaded via CDN matching prototype (`@phosphor-icons/web`)
- [ ] Every icon in the UI matches the prototype's Phosphor class exactly
- [ ] All test files updated for new icon class names
- [ ] No lucide imports remain in `uno.config.ts` or source files

## Status

✅ **COMPLETE** — All Lucide references removed from source and test files. Phosphor Icons loaded via CDN. 29 icon references across 7 source files updated.

## Blocked by

None — can start immediately
