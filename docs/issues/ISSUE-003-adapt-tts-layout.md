# ISSUE-003: Adapt TTS Studio Layout for Navbar Height

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Prerequisites; ADR-001)
**Dependencies:** ISSUE-001 (GlobalNavbar exists), ISSUE-002 (app.vue wraps with navbar)
**Scope:** Frontend only (`frontend/app/pages/index.vue`)

---

## Problem

The TTS Studio (`index.vue`) currently fills `100vh` with `overflow: hidden` on the body. After adding the 60px navbar (56px top bar + 4px progress bar), the panels will be partially hidden behind it. The layout must adapt.

## Acceptance Criteria

### AC-1: Panel height adjustment
- TTS Studio panels use `calc(100vh - 60px)` for total height (56px top bar + 4px progress bar)
- On desktop, the two-panel layout (control-deck + canvas) fills `calc(100vh - 60px)`
- Panels are no longer `overflow: hidden` on the body — body uses `overflow: visible` with a flex column wrapper

### AC-2: Mobile layout adaptation
- On mobile (`< 768px`), the navbar may grow to `h-16` (64px)
- Mobile panel heights adjust to `calc(100vh - 64px - safe-area-insets)` or equivalent
- Draggable divider between panels continues to work correctly

### AC-3: No visual regression
- Waveform canvas renders correctly (no clipping behind navbar)
- Audio player panel renders correctly (no clipping behind navbar)
- All interactive elements remain accessible (no overlap with navbar)
- Touch targets on mobile remain ≥ 44px (WCAG)

### AC-4: Existing functionality preserved
- All 11 existing customer journeys on `/` remain functional
- Panel sliding animation works correctly
- Mobile/desktop breakpoint switching works correctly
- No layout shift or flash on page load

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-13: Multiple rapid navigations | Layout is stable after rapid navigation (no overflow/scroll issues) |
| (Implicit in all `/` TCs) | All existing TTS Studio functionality works with new layout |

## ADR References

- **ADR-001** (Shared Layout with Global Navbar): Defines the 60px vertical space tax — `calc(100vh - 60px)` adjustment for desktop, `h-16` for mobile

## Files

- `frontend/app/pages/index.vue` (modified — layout CSS)
- Possibly: `frontend/app/components/AudioPlayerPanel.vue` (if it references viewport dimensions)
- Possibly: `frontend/app/components/WaveformCanvas.vue` (if it references viewport dimensions)
