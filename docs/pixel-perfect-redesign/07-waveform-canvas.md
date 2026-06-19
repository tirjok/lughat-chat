# 07 — WaveformCanvas: DPR + roundRect

## Type

AFK

## What to build

Verify the WaveformCanvas matches the prototype's canvas rendering exactly. The existing component is functionally correct but may have subtle rendering differences.

### Prototype reference

`frontend/docs/new-design/lughat_chat_studio.html` — Heatmap Waveform Canvas (lines ~422–470).

### Scope

**Canvas Setup**
- `canvas.width = canvas.parentElement.clientWidth` (prototype does NOT use DPR scaling)
- `canvas.height = canvas.parentElement.clientHeight`
- **TODO**: Check if prototype uses DPR scaling — it does NOT (prototype sets raw pixel dimensions, no `devicePixelRatio` multiplication)
- **Current**: Uses `devicePixelRatio` scaling — may need to remove or verify

**Bar Configuration**
- `numBars = 60` (prototype: 60 bars)
- `targetHeight: Math.random() * 0.8 + 0.1` (prototype: 10%–90%)
- `currentHeight: 0.1` (prototype: starts at 0.1)
- `phase: Math.random() * Math.PI * 2` (prototype: random phase)
- **Current**: matches prototype — no changes needed

**Drawing Logic**
- `barWidth = (canvas.width / numBars) - 2` (prototype: 2px gap between bars)
- `centerY = canvas.height / 2`
- `height = bar.currentHeight * canvas.height * 0.8` (prototype: 80% of canvas height)
- `x = index * (barWidth + 2)` (prototype: 2px gap)
- **Current**: matches prototype — no changes needed

**Heatmap Color Interpolation**
- Prototype: taller bars = orange, shorter bars = magenta
- `ratio = bar.currentHeight` (0.1 to 1.0)
- `r = Math.round(221 + (255 - 221) * ratio)`
- `g = Math.round(36 + (81 - 36) * ratio)`
- `b = Math.round(118 + (47 - 118) * ratio)`
  - At ratio 0.1: `rgb(223, 37, 112)` (magenta-dominant)
  - At ratio 1.0: `rgb(255, 81, 47)` (orange)
- **Current**: matches prototype — no changes needed

**Rounded Rect**
- `ctx.roundRect(x, y, barWidth, height, 4)` (prototype: 4px border radius)
- **Current**: matches prototype — no changes needed

**Animation**
- Playing: `bar.phase += 0.1; noise = Math.sin(bar.phase) * 0.3`
- `bar.currentHeight = bar.targetHeight + noise`
- Clamped: `max(0.1, min(1.0, bar.currentHeight))`
- Not playing: `bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.1`
- **Current**: matches prototype — no changes needed

**DPR Scaling Question**
- Prototype sets `canvas.width = canvas.parentElement.clientWidth` (no DPR multiplication)
- Current code uses `canvas.width = parent.clientWidth * dpr` and `ctx.scale(dpr, dpr)`
- **Decision needed**: Prototype does NOT use DPR scaling. Should we match the prototype exactly (no DPR) or use DPR for crisp rendering on Retina displays?

### Current issues vs prototype
- DPR scaling may make bars appear thinner on high-DPR screens (prototype does not use DPR)
- Verify canvas container: `h-8 md:h-12 relative w-full overflow-hidden min-w-[100px]`

## Acceptance criteria

- [ ] 60 bars with 2px gap between each
- [ ] Bar heights: 10%–90% of canvas (target), animated with `sin(phase) * 0.3` noise
- [ ] Heatmap color: `rgb(221 + 34*ratio, 36 + 45*ratio, 118 - 71*ratio)` — orange for loud, magenta for quiet
- [ ] `roundRect` with 4px border radius
- [ ] Animation: `requestAnimationFrame` loop when playing, settles when paused
- [ ] DPR scaling decision documented (match prototype = no DPR, or use DPR for Retina)
- [ ] Canvas container: `h-8 md:h-12 min-w-[100px]`

## Blocked by

- #02 (global styles — canvas container sizing)
