# Issue 35: Audio Player Panel — Responsive Layout

## What to build

Adapt the AudioPlayerPanel to stack vertically on mobile/tablet screens (<768px) while preserving the existing horizontal layout on desktop (≥768px). On mobile, the play button sits above the waveform so the waveform has enough width to be visible. All touch targets are enlarged to meet WCAG minimums.

After this is complete, the audio player is usable on both narrow phone screens and wide desktop monitors without layout conflicts.

## Acceptance criteria

- [x] On mobile (<768px): `AudioPlayerPanel.vue` uses `flex-col` layout:
  - Player header (voice name, action buttons) stacks above waveform container
  - Play/pause button appears above the waveform canvas
  - Waveform has full width (not squeezed by a sidebar button)
  - Duration display is inline with the waveform
- [x] On desktop (≥768px): existing horizontal layout preserved:
  - Play button | waveform | duration (all in one row)
  - No layout changes
- [x] All interactive buttons enlarged to minimum 44×44px on mobile:
  - Download button → `w-11 h-11 md:w-10 md:h-10` (44px mobile, 40px desktop)
  - Close button → `w-11 h-11 md:w-10 md:h-10` (44px mobile, 40px desktop)
  - Play/pause button → `w-12 h-12` (48px, already meets WCAG)
- [x] Slide-up transition adjusted so player doesn't cover the entire textarea on mobile:
  - Mobile panel uses `w-[92%] mx-auto` (narrower bottom sheet)
  - Desktop panel uses `md:w-auto md:right-0` (full-width, right-aligned)
- [x] Existing `visible` prop and `close`/`toggle`/`download` emits unchanged
- [x] Existing `slide-up-player` CSS transition preserved (no animation changes)

## Blocked by

- Issue 31: Viewport, Breakpoints & Scroll Fix (✅ Complete)

## Status

✅ **Complete** — All 6 acceptance criteria met. 300 tests pass, lint clean, typecheck clean. Added 6 responsive layout tests.

### Changes
- **`frontend/app/components/AudioPlayerPanel.vue`**: Split waveform container into mobile (`md:hidden`) and desktop (`hidden md:`) variants. Mobile uses stacked `flex-col` layout with play button above full-width waveform. Desktop preserves existing horizontal `flex` row. Action buttons use responsive sizing (`w-11 h-11 md:w-10 md:h-10`). Mobile panel uses `w-[92%] mx-auto` for a narrower bottom sheet.
- **`frontend/tests/AudioPlayerPanel.test.ts`**: Added 6 responsive layout tests covering mobile stacked layout, desktop horizontal layout, 44px touch targets, 92% width mobile panel, preserved props/emits, and preserved CSS transitions.
