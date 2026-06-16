# Issue 5: Audio Player Desktop Width Constraint

## What to build

AudioPlayerPanel constrained to match Canvas width on desktop, matching the reference prototype's exact styling. On mobile (<768px): remains full width (existing behavior).

Reference prototype HTML for the audio player:
```html
<div id="audio-player-panel" class="fixed bottom-0 right-0 w-full md:w-[65%] lg:w-[70%] xl:w-[75%] bg-studio-800 border-t md:border-l border-studio-700 p-4 md:p-6 flex flex-col gap-3 md:gap-4 hidden-slide transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
```

Current code: `absolute bottom-0 left-0 w-full md:right-0 bg-studio-800 border-t border-studio-700 p-6 flex flex-col gap-4 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]` — no width constraint, no easing, wrong shadow.

## Acceptance criteria

- [ ] AudioPlayerPanel gets `md:w-[65%] lg:w-[70%] xl:w-[75%]` on desktop (matching Canvas proportions from Issue 1)
- [ ] On mobile (<768px): player remains `w-full` (existing behavior unchanged)
- [ ] Desktop: player does not cover Control Deck (constrained width, not `w-full`)
- [ ] Border: `border-t md:border-l` (horizontal divider on mobile, vertical on desktop — matches reference prototype)
- [ ] Padding: `p-4 md:p-6` (responsive padding — matches reference prototype)
- [ ] Gap: `gap-3 md:gap-4` (responsive gap — matches reference prototype)
- [ ] Transition: `transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]` (matches reference prototype's easing — critical for smooth panel sliding)
- [ ] Shadow: `shadow-[0_-15px_40px_rgba(0,0,0,0.6)]` (matches reference prototype — stronger shadow than current `shadow-[0_-10px_40px_rgba(0,0,0,0.5)]`)
- [ ] Position: `fixed bottom-0 right-0` (matches reference — current uses `absolute bottom-0 left-0`)
- [ ] Existing 300 AudioPlayerPanel tests pass (responsive layout tests)

## Blocked by

- Issue 1 (layout foundation: Canvas panel width constraints must be established first)
