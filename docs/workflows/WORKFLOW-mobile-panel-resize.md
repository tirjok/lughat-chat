# WORKFLOW: Mobile Split-Screen Drag Resize

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Touch/mouse drag on mobile panel divider; canvas ratio adjustment

---

## Overview

On mobile viewports (< 768px), the TTS studio uses a split-screen layout: the Canvas (text editor) is on top, and the Control Deck (voice settings + generate button) is on the bottom. A 16px drag divider separates the two panels. The user can drag the divider to adjust the ratio of canvas height (0.25–0.85 of total viewport height). This workflow covers the complete drag interaction lifecycle.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Customer (touch/mouse) | Drags the panel divider to adjust canvas ratio |
| `index.vue` (mobile layout) | Handles drag events; updates `canvasRatio` ref |
| `usePanelToggle()` | Detects mobile/desktop; manages `activePanel` |
| CSS (`:style` binding) | Applies `height: ${canvasRatio * 100}%` to canvas panel |
| CSS (media queries) | Applies `transition: height 700ms` when not dragging |

---

## Prerequisites

- Viewport width < 768px (mobile layout active)
- Touch or mouse input available
- Browser supports touch/mouse events

---

## Trigger

Customer touches/mouse-downs on the 16px drag divider between the two panels.

---

## Workflow Tree

### STEP 1: Drag Start
**Actor**: `index.vue` (`onDragStart`)
**Action**: Records initial Y position (`startY`) and current canvas ratio (`startRatio`); sets `isDragging = true`; adds `dragging` class to `<body>` (prevents text selection during drag)
**Timeout**: N/A (synchronous)
**Input**: `{ TouchEvent | MouseEvent }` (touchstart or mousedown)
**Output on SUCCESS**: Drag state activated; `canvasRatio` locked to `startRatio`; text selection disabled → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(touch_not_supported)`: Touch events not supported → fall back to mouse events (handled by both `@touchstart` and `@mousedown` listeners)
  - `FAILURE(multiple_drags)`: Multiple simultaneous drag starts → last one wins (no prevention mechanism)

**Observable states during this step**:
- Customer sees: Divider is "grabbed"; text selection disabled (body class `.dragging`)
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 2: Drag Move
**Actor**: `index.vue` (`onDragMove`)
**Action**: Calculates delta between current Y and start Y; adjusts `canvasRatio` = `startRatio + delta / windowHeight`; clamps to 0.25–0.85
**Timeout**: N/A (synchronous; fires on every touchmove/mousemove)
**Input**: `{ TouchEvent | MouseEvent }` (touchmove or mousemove)
**Output on SUCCESS**: `canvasRatio` updated; CSS `:style` binding re-renders panel heights → GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(not_dragging)`: `isDragging = false` → no-op (ignores move events)

**Observable states during this step**:
- Customer sees: Canvas panel resizes in real-time as they drag; Control Deck shrinks/grows accordingly
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 3: Drag End
**Actor**: `index.vue` (`onDragEnd`)
**Action**: Sets `isDragging = false`; removes `dragging` class from `<body>` (re-enables text selection); `canvasRatio` is now locked to the final value
**Timeout**: N/A (synchronous)
**Input**: (none) (fires on touchend or mouseup)
**Output on SUCCESS**: Drag state deactivated; CSS transition re-enabled (700ms spring animation) → WORKFLOW COMPLETE
**Output on FAILURE**:
  - `FAILURE(lost_drag)`: Touch/mouse event not received (e.g., finger lifted outside divider area) → drag state may not be deactivated; `isDragging` stays true

**Observable states during this step**:
- Customer sees: Panel snaps to final position; smooth 700ms spring animation if dragged quickly
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 4: Panel Focus (After Drag)
**Actor**: `usePanelToggle` (watch on `activePanel`)
**Action**: When `activePanel` changes, focuses the first interactive element in the new panel (accessibility)
**Timeout**: N/A (synchronous, except `nextTick()`)
**Input**: `{ PanelName }` (control-deck or canvas)
**Output on SUCCESS**: First interactive element focused → WORKFLOW COMPLETE
**Output on FAILURE**: N/A (focus is best-effort; no error handling)

**Observable states during this step**:
- Customer sees: Focus moves to the first interactive element (textarea or button)
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

## State Transitions

```
[Idle (mobile)] -> (drag start) -> [Dragging] (canvas ratio locked)
[Dragging] -> (drag move) -> [Dragging] (canvas ratio updated)
[Dragging] -> (drag end) -> [Idle (mobile, new ratio)] (canvas ratio locked to final)
[Idle (mobile)] -> (viewport resize to desktop) -> [Idle (desktop)] (layout changes)
[Idle (desktop)] -> (viewport resize to mobile) -> [Idle (mobile, default ratio 0.55)] (layout changes, ratio resets)
```

---

## Handoff Contracts

### Frontend Internal: Canvas Ratio
**From**: `index.vue` (`canvasRatio` ref)
**To**: CSS `:style` binding (`height: ${canvasRatio * 100}%`)
**Payload**: `{ canvasRatio: number (0.25-0.85) }`
**Default**: 0.55 (55% canvas, 45% controls)
**Clamp**: 0.25 (minimum canvas) – 0.85 (maximum canvas)
**On Change**: CSS `:style` re-renders; if not dragging, 700ms spring animation applies

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| `dragging` class on `<body>` | STEP 1 (drag start) | STEP 3 (drag end) | `document.body.classList.remove('dragging')` |

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: Drag start (touch) | Touch starts on divider | `isDragging = true`; `startY` and `startRatio` recorded; text selection disabled |
| TC-02: Drag start (mouse) | Mouse-down on divider | Same as touch start (fallback) |
| TC-03: Drag move (up) | Finger/mouse moves up (toward canvas) | Canvas ratio increases (up to 0.85 max) |
| TC-04: Drag move (down) | Finger/mouse moves down (toward controls) | Canvas ratio decreases (down to 0.25 max) |
| TC-05: Drag end (normal) | Finger/mouse lifted on divider | `isDragging = false`; text selection re-enabled; panel snaps to final position |
| TC-06: Drag end (off-divider) | Finger/mouse lifted outside divider | `isDragging` may stay true (lost drag event) — edge case |
| TC-07: Viewport resize (mobile → desktop) | Window resized to >= 768px | Layout switches to desktop (side-by-side panels); mobile split-screen hidden |
| TC-08: Viewport resize (desktop → mobile) | Window resized to < 768px | Layout switches to mobile (stacked); canvas ratio resets to 0.55 (default) |
| TC-09: Panel focus after drag | Drag ends; panel focus triggered | First interactive element in new panel is focused |
| TC-10: Rapid resize during drag | Viewport resized while dragging | Behavior undefined (resize handler may fire mid-drag) |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | Mobile layout is active when `window.innerWidth < 768` | `usePanelToggle.ts:14` (`BREAKPOINT_MOBILE = 768`) | If breakpoint changes, mobile/desktop split may not match visual design |
| A2 | Default canvas ratio is 0.55 (55% canvas, 45% controls) | `index.vue:26` (`canvasRatio = 0.55`) | If 55% is not the desired default, this is a UX issue |
| A3 | Canvas ratio is clamped to 0.25–0.85 | `index.vue:47` (`Math.max(0.25, Math.min(0.85, ...))`) | Control Deck (bottom panel) is never less than 15% or more than 75% of viewport |
| A4 | Both touch and mouse events are handled | `index.vue:276-282` (`@touchstart` + `@mousedown`) | If touch events fire but mouse events don't (or vice versa), drag may not work on all devices |

---

## Open Questions

1. Should there be a visual indicator of the current canvas ratio (e.g., a percentage label)? (Currently: no.)

2. Should the canvas ratio persist across page reloads? (Currently: no — resets to 0.55 on reload.)

3. What happens if the user resizes the viewport while dragging? (Currently: behavior undefined — resize handler may fire mid-drag.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `index.vue:26-53` and `usePanelToggle.ts` | Documented drag lifecycle; noted that lost drag events (finger lifted off-divider) may leave `isDragging = true` |
