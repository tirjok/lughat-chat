## Type

AFK

## What to build

Replace the native `<select>` element with a custom dropdown `VoiceSelector` component. The dropdown must display 3 voice presets with rich metadata:

- **Aisha** — Conversational / Egyptian Arabic [AR-EG] (orange icon)
- **Tariq** — News Anchor / Modern Standard Arabic [MSA] (magenta icon)
- **Laila** — Storyteller / Levantine Arabic [AR-LB] (orange icon)

Each voice option shows:
- Color-coded voice icon (orange or magenta)
- Voice name
- Regional dialect tag (e.g., "[AR-EG]", "[MSA]", "[AR-LB]")
- A hover-revealed play icon for "Preview Voice" — clicking shows a toast: "Playing 1-second preview..."

The selected voice is displayed in the dropdown trigger with a color-coded waveform icon and an animated chevron indicator (rotates when open/closed).

Populated from the existing `useVoices()` composable (backend change required in Slice 7).

## Acceptance criteria

- [ ] Custom dropdown replaces native `<select>` element
- [ ] 3 voice presets rendered: Aisha (AR-EG), Tariq (MSA), Laila (AR-LB)
- [ ] Color-coded voice icons (orange for Aisha/Laila, magenta for Tariq)
- [ ] Regional dialect tags displayed next to each voice name
- [ ] Play icon appears on hover for each voice option
- [ ] Clicking play icon triggers toast: "Playing 1-second preview..."
- [ ] Selected voice shown in trigger with matching color-coded icon
- [ ] Animated chevron indicator (rotates on open/close)
- [ ] Tests: renders 3 presets with correct metadata, selection updates model, preview toast fires on click

## Blocked by

None - can start immediately
