# WORKFLOW: Toast Notification Lifecycle

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Show → Auto-dismiss → Clear lifecycle

---

## Overview

Toast notifications are used to display success, error, and info messages to the customer. The `useToast` composable provides a module-level shared state (`toastState` ref) that all components can access. When a toast is shown, it is added to the array with a unique ID and an auto-dismiss timer (5 seconds). The `ToastNotification` component renders all active toasts with slide-in/slide-out animations. This workflow covers the complete toast lifecycle from creation to dismissal.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| `showToast()` | Creates toast entry; adds to `toastState`; schedules auto-dismiss |
| `useToast()` | Returns `toastState` ref (shared across all components) |
| `ToastNotification` component | Renders active toasts with animations |
| Browser `setTimeout` | Auto-dismiss timer (5s) |
| Customer | Can manually close a toast (close button) |

---

## Prerequisites

- `toastState` ref exists (module-level, shared across all components)
- `nextId` counter exists (module-level, starts at 0)
- `dismissTimers` Map exists (module-level, tracks active timers)

---

## Trigger

`showToast(message, type)` is called from any component (typically after API call success/error).

---

## Workflow Tree

### STEP 1: Toast Created
**Actor**: `showToast()` (module-level function)
**Action**: Creates toast entry with unique ID (`++nextId`), message, and type (success|error|info); adds to `toastState.value` array; schedules auto-dismiss timer (5s)
**Timeout**: 5s auto-dismiss timer
**Input**: `{ message: string, type: 'success' | 'error' | 'info' }`
**Output on SUCCESS**: Toast entry added to `toastState.value`; timer scheduled → GO TO STEP 2
**Output on FAILURE**: N/A (toast creation should not fail)

**Observable states during this step**:
- Customer sees: Toast slides in from right (animation: 700ms spring); icon shows (green for success, red for error, blue for info)
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 2: Toast Displayed (Active)
**Actor**: `ToastNotification` component
**Action**: Renders toast entry with icon, message, and close button; toast is visible for up to 5 seconds (or until manually closed)
**Timeout**: 5s (auto-dismiss)
**Input**: `{ id: number, message: string, type: ToastType }`
**Output on SUCCESS**: Toast visible; auto-dismiss timer running → GO TO STEP 3
**Output on FAILURE**: N/A (rendering should not fail)

**Observable states during this step**:
- Customer sees: Toast visible for up to 5 seconds; close button available; auto-dismiss timer running
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 3: Toast Dismissed
**Actor**: Either (a) auto-dismiss timer fires, or (b) customer clicks close button
**Action**: Removes toast from `toastState.value` array; clears dismiss timer; removes from `dismissTimers` Map
**Timeout**: N/A (synchronous)
**Input**: `{ id: number }` (toast ID)
**Output on SUCCESS**: Toast removed; slide-out animation plays (700ms) → WORKFLOW COMPLETE
**Output on FAILURE**: N/A (dismissal should not fail)

**Observable states during this step**:
- Customer sees: Toast slides out to right (animation: 700ms); disappears from UI
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 4: Component Unmount (Cleanup)
**Actor**: `useToast()` (`onMounted` cleanup)
**Action**: Clears all active dismiss timers; clears `dismissTimers` Map
**Timeout**: N/A (synchronous)
**Input**: (none)
**Output on SUCCESS**: All timers cleared → WORKFLOW COMPLETE
**Output on FAILURE**: N/A (cleanup should not fail)

**Observable states during this step**:
- Customer sees: N/A (cleanup is invisible)
- Operator sees: N/A
- Database: N/A
- Logs: (none)

**Resources destroyed**: All active dismiss timers (via `clearTimeout`)

---

## State Transitions

```
[No toast] -> (showToast) -> [Active] (toast visible, timer running)
[Active] -> (5s timer fires) -> [Dismissed] (auto-dismiss)
[Active] -> (close button clicked) -> [Dismissed] (manual dismiss)
[Active] -> (component unmount) -> [Cleared] (all timers cleared)
```

---

## Handoff Contracts

### Internal: Toast Creation
**From**: `showToast()` (module-level function)
**To**: `toastState` ref (module-level shared state)
**Payload**: `{ id: number, message: string, type: 'success' | 'error' | 'info' }`
**Auto-dismiss**: 5000ms (DISPATCH_DELAY)
**On Dismiss**: Toast removed from array; timer cleared; toast slides out (700ms animation)
**On Component Unmount**: All timers cleared; all active toasts are effectively "orphaned" (remain in array but timers are cleared)

**NOTE**: If a toast is created and the component unmounts before the 5s timer fires, the toast remains in `toastState.value` but the timer is cleared. This means the toast stays visible indefinitely (no auto-dismiss). This is a potential bug — toasts created during a component's lifetime but not dismissed before unmount will persist.

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Toast entry (in array) | STEP 1 (created) | STEP 3 (dismissed) | `toastState.value.splice(idx, 1)` |
| Auto-dismiss timer | STEP 1 (scheduled) | STEP 3 (dismissed) | `clearTimeout(timer)` |
| Toast entry (orphaned) | STEP 1 (created) | STEP 4 (component unmount) | **NOT CLEANED UP** — remains in array if unmount fires before dismiss |

**NOTE**: The orphaned toast case (STEP 4) is a bug — toasts created during a component's lifetime but not dismissed before unmount will persist in `toastState.value` indefinitely. This is unlikely in practice (toasts are created and dismissed within the same component lifecycle), but worth documenting.

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: Show success toast | `showToast("Success", "success")` | Toast slides in (green icon); 5s auto-dismiss timer starts |
| TC-02: Show error toast | `showToast("Error", "error")` | Toast slides in (red icon); 5s auto-dismiss timer starts |
| TC-03: Show info toast | `showToast("Info", "info")` | Toast slides in (blue icon); 5s auto-dismiss timer starts |
| TC-04: Auto-dismiss | Toast visible for 5s | Toast slides out (700ms animation); removed from array |
| TC-05: Manual dismiss | Customer clicks close button | Toast slides out (700ms animation); removed from array; timer cleared |
| TC-06: Multiple toasts | Three toasts shown rapidly | Three toasts stack (gap: 2px); each has independent 5s timer |
| TC-07: Toast ID uniqueness | Multiple toasts created | Each toast has unique ID (`++nextId`) |
| TC-08: Component unmount with active toasts | Component unmounts while toasts are active | All timers cleared; toasts remain in array (orphaned — potential bug) |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | Toast type determines icon color (success=green, error=red, info=blue) | `ToastNotification.vue:9-12, 16-20` | Color coding is consistent with UX expectations |
| A2 | Auto-dismiss delay is 5 seconds | `useToast.ts:17` (`DISPATCH_DELAY = 5000`) | 5s is long enough to read most messages; short messages may be dismissed before read |
| A3 | Toast position is fixed (top 20px on desktop, top 66px on mobile) | `ToastNotification.vue:26` | Toasts may overlap other UI elements (e.g., mobile header) |
| A4 | Toast animations use GPU-safe properties (opacity, transform) | `ToastNotification.vue:68-77` | Animations should be smooth on all devices |

---

## Open Questions

1. Should there be a maximum number of stacked toasts? (Currently: no limit — many toasts stack vertically.)

2. Should toasts be deduplicated (same message + type)? (Currently: each toast is unique.)

3. Should the auto-dismiss delay be configurable? (Currently: hardcoded 5s.)

4. Should toasts created during a component's lifetime but not dismissed before unmount be cleaned up? (Currently: orphaned toasts persist — potential bug.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `useToast.ts`, `ToastNotification.vue` | Documented orphaned toast bug (STEP 4 — toasts persist if component unmounts before dismiss) |
