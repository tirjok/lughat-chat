# ISSUE-009: Create StickyAudioBar Component

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Step 3, Step 2; ADR-004)
**Dependencies:** None (standalone component — can be built in parallel with ISSUE-001)
**Scope:** Frontend only (`frontend/app/components/StickyAudioBar.vue`)

---

## Problem

LughatChat's current audio playback is handled by `AudioPlayerPanel.vue`, a full-panel component embedded within the TTS Studio's two-panel layout (~40% of canvas on desktop). The multi-page platform needs a consistent, space-efficient audio player that works across all pages (TTS Studio, Dashboard, Lessons).

## Acceptance Criteria

### AC-1: Component exists and renders correctly
- `frontend/app/components/StickyAudioBar.vue` is created
- Fixed position: `fixed bottom-0 left-0 right-0 z-50`
- Hidden by default (`translate-y-full`), slides up (`translate-y-0`) when active audio is available
- Height auto-sized content (~60–72px)
- z-index is `z-50` (above all page content)

### AC-2: Controls (left side)
- Previous line button (disabled when no previous context)
- Play/pause button (primary-600 rounded-full, 44px touch target — WCAG compliant)
- Next line button (disabled when no next context)

### AC-3: Controls (center)
- Current line Arabic text (RTL, `font-arabic text-lg`)
- Wave animation during playback (CSS animation)
- Progress bar (draggable seek)
- Time display (current / total)

### AC-4: Controls (right side)
- Speed toggle pill (0.75x / 1x / 1.25x cycling)
- Repeat button (toggle on/off)
- Close button (hides bar, returns to hidden state)

### AC-5: Dark mode support
- Light mode: `bg-white`, `text-stone-800`, `border-stone-200`
- Dark mode: `bg-stone-800`, `text-stone-200`, `border-stone-700`
- All UnoCSS utilities have `.dark:` variants

### AC-6: Does NOT replace AudioPlayerPanel yet
- This issue creates the component but does NOT migrate `index.vue` to use it yet (that's ISSUE-010)
- `AudioPlayerPanel.vue` continues to work as before
- The StickyAudioBar can be tested in isolation

### AC-7: Keyboard shortcuts
- Space: toggle play/pause
- Arrow keys: seek forward/backward
- Does NOT conflict with Ctrl/Cmd+Enter (synthesis shortcut)

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| (Standalone component test) | Bar slides up when active audio is available, slides down when closed |
| (Standalone component test) | All controls render and respond to interaction |
| (Standalone component test) | Dark mode variants render correctly |

## ADR References

- **ADR-004** (Sticky Bottom Audio Player Bar): Defines the component specification — fixed-bottom slide-up bar, controls layout, dark mode, z-index hierarchy

## Files

- `frontend/app/components/StickyAudioBar.vue` (new)
- Component test: `frontend/tests/StickyAudioBar.test.ts` (new)
