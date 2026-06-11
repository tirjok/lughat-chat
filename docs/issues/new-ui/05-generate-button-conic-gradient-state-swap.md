## Type

AFK

## What to build

Build a `GenerateButton` component — the primary action button with an animated spinning conic-gradient border. The button features:

- **Spinning conic-gradient border** (magenta #DD2476 → orange #FF512F) with dark (#121212) inner fill
- **State-based icon and text swap**:
  - **Ready**: play icon (Lucide `play`) + text "Generate Speech"
  - **Loading** (model still loading): spinner icon (Lucide `loader`) + text "Processing Model…"
  - **Generating** (synthesis in progress): spinner icon (Lucide `loader`) + text "Generating…"
- **Disabled state**: button is disabled when text is invalid/too long or when the TTS model is still loading (model status is "loading")
- Prominent and inviting visual presence — large button with gradient border animation

## Acceptance criteria

- [ ] Spinning conic-gradient border animates continuously (magenta → orange)
- [ ] Dark inner fill (#121212) behind the conic border
- [ ] Icon and text swap correctly based on state:
  - Ready: play icon + "Generate Speech"
  - Loading (model): spinner + "Processing Model…"
  - Generating (synthesizing): spinner + "Generating…"
- [ ] Button is disabled when text is invalid or exceeds character limit
- [ ] Button is disabled when model status is "loading"
- [ ] Tests: icon/text swap per state (ready/loading/generating), disabled when invalid/too long, disabled when model loading, click triggers synthesis

## Blocked by

- #01-two-panel-layout-header-keyboard-shortcut (Slice 1)
- #02-arabic-textarea-full-size-canvas-focus-halo (Slice 2)
