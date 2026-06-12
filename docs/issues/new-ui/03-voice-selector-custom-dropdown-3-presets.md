## Type

AFK

## What to build

Replace the native `<select>` element with a custom dropdown `VoiceSelector` component. The dropdown will fetch voice from backend api. 

Each voice option shows:
- Color-coded voice icon (orange or magenta)
- Voice name

The selected voice is displayed in the dropdown trigger with a color-coded waveform icon and an animated chevron indicator (rotates when open/closed).

Read API data  from the existing `useVoices()` composable (backend change required in Slice 7).

## Acceptance criteria

- [ ] Custom dropdown replaces native `<select>` element
- [ ] Voice renders from api response
- [ ] Color-coded voice icons (orange for Aisha/Laila, magenta for Tariq)
- [ ] Regional dialect tags displayed next to each voice name
- [ ] Play icon appears on hover for each voice option
- [ ] Clicking play icon triggers toast: "Playing 1-second preview..."
- [ ] Selected voice shown in trigger with matching color-coded icon
- [ ] Animated chevron indicator (rotates on open/close)
- [ ] Tests: renders 3 presets with correct metadata, selection updates model, preview toast fires on click

## Blocked by

None - can start immediately
