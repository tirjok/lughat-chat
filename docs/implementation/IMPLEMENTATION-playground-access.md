# Implementation Plan: Playground (TTS Studio) Access

**Source**: `docs/workflows/WORKFLOW-playground-access.md` (v0.1)
**Date**: 2026-07-11
**Status**: Draft — Awaiting review

---

## Overview

This document breaks the **Playground (TTS Studio) Access** workflow into **3 implementation issues** (vertical slices). Each slice is a thin, end-to-end path through all layers (routing, components, tests). They are ordered by dependency — blockers first.

The Playground is the **existing TTS Studio**, moved from `/` to `/playground`. No changes to the TTS Studio functionality are needed — only routing and page structure change. All existing components (AudioPlayerPanel, WaveformCanvas, GenerateButton, SpeedSlider, VoiceSelector, ToastNotification, ModelStatusIndicator, MobileStatusIndicator, FocusHaloCanvas) and composables (useAudioModule, useHealthPoll, useVoices, useTtsApi, useInputValidation, useToast, usePanelToggle) are preserved.

This workflow is a **prerequisite** for the Dashboard Navigation workflow (which creates the navigation bar and Dashboard page). It does NOT depend on any backend changes — the existing `/api/generate` endpoint is already implemented.

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity | Reference |
|---|---------|----------|-------------|
| RC-021 | **Playground page does not exist** — The current `app/pages/index.vue` IS the TTS Studio (700+ lines). There is no `/playground` route. | Critical | STEP 1 |
| RC-022 | **No navigation bar exists** — Users cannot access the Playground from a navigation bar (there is no navigation bar). | High | STEP 1 (Dashboard Navigation workflow) |
| RC-037 | **The existing TTS Studio code IS the Playground** — No changes to the TTS Studio code are needed; only the routing and page structure change. | Low | STEP 1 |

---

## Proposed Slices

### Slice 1: Create Playground Route (Move TTS Studio to `/playground`)

**Type**: AFK
**Blocked by**: None
**User stories**: "As a learner, I want to access the TTS Playground from the navigation bar"

**What to build**:

1. Create `app/pages/playground.vue` — copy the current `app/pages/index.vue` content (the full TTS Studio: two-panel layout, all 9 components, all 7 composables, drag divider, mobile stacking, RTL textarea, audio playback, waveform animation).
2. Create `app/pages/index.vue` — a minimal placeholder (e.g., "Dashboard coming soon" with a link to `/playground`).
3. Ensure Nuxt file-based routing routes `/playground` to the new page.
4. Verify the existing TTS Studio functionality is preserved:
   - Text input (RTL, Arabic font, 3000 char limit)
   - Voice selector (dynamic discovery from `/api/voices`)
   - Speed slider (0.5×–2.0×)
   - Generate Speech button (with loading state, model-ready gating)
   - Audio playback (play/pause, seek, waveform visualization)
   - Toast notifications (success/error/info)
   - Mobile split-screen (drag divider between panels)
   - Keyboard shortcut (Ctrl+Enter to generate)

**Acceptance criteria**:
- [ ] `app/pages/playground.vue` exists and renders the full TTS Studio (all 9 components, all 7 composables)
- [ ] Navigating to `/playground` shows the TTS Studio (text input, voice selector, speed slider, Generate Speech button, audio player, waveform, toast notifications)
- [ ] Navigating to `/` does NOT show the TTS Studio (shows the Dashboard placeholder from Slice 2)
- [ ] All existing TTS Studio features preserved: voice selection, speed slider, generate speech, audio playback, waveform animation, toast notifications, mobile split-screen drag divider, keyboard shortcut (Ctrl+Enter)
- [ ] Frontend builds without errors (`pnpm build`)

**Integration verification**:
- [ ] Frontend dev server starts without errors (`pnpm dev`)
- [ ] Navigating to `/playground` in browser shows the TTS Studio
- [ ] All existing TTS Studio interactions work: type text, select voice, adjust speed, generate speech, play audio, download, waveform animation, mobile split-screen drag

---

### Slice 2: Wire Playground to Navigation Bar (Dashboard Navigation prerequisite)

**Type**: AFK
**Blocked by**: Slice 1 (needs `/playground` route to exist)
**User stories**: "As a learner, I want to access the Playground from the navigation bar"

**What to build**:

This slice connects the Playground page to the navigation infrastructure (created by the Dashboard Navigation workflow).

1. The `NavigationBar` component (from Dashboard Navigation workflow) has a "Playground" link that navigates to `/playground`.
2. The Playground page receives the `NavigationBar` as a shared top-level component.
3. The Playground page preserves its existing two-panel layout (desktop: side-by-side; mobile: stacked with drag divider).
4. No changes to the TTS Studio functionality — the Playground page is the existing TTS Studio, now wrapped by the navigation infrastructure.

Behavior:
- User clicks "Playground" in the navigation bar → navigates to `/playground` → TTS Studio renders.
- User navigates directly to `/playground` (bookmarks, shared links) → TTS Studio renders.
- User navigates away from Playground (clicks "Roadmap" or "Home" in navigation bar) → navigates to `/` (Dashboard).

**Acceptance criteria**:
- [ ] The Playground page renders with the `NavigationBar` at the top (on all pages)
- [ ] Clicking "Playground" link in the navigation bar navigates to `/playground`
- [ ] Navigating directly to `/playground` (URL) shows the TTS Studio
- [ ] The TTS Studio functionality is unchanged (all 9 components, all 7 composables work)
- [ ] Navigating away from Playground (to Dashboard or Lesson View) works correctly
- [ ] The `NavigationBar` highlights "Playground" as the active page when on `/playground`

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Clicking "Playground" in the navigation bar navigates to `/playground` and shows the TTS Studio
- [ ] All TTS Studio interactions work from the Playground page (generate speech, play audio, etc.)

---

### Slice 3: Playground Mobile Layout and Error States

**Type**: HITL (needs design review for mobile Playground layout)
**Blocked by**: Slices 1, 2 (needs Playground page and navigation wired up)
**User stories**: "As a learner, I want the Playground to work well on mobile devices"

**What to build**:

Responsive adjustments specific to the Playground page (the existing TTS Studio already has mobile support, but this slice ensures it works correctly within the navigation infrastructure):

Mobile layout (< 768px):
- The existing TTS Studio mobile layout is preserved: stacked panels with drag divider.
- The navigation bar compacts on mobile (smaller text, icon-only navigation).
- The mobile `MobileStatusIndicator` is visible in the navigation bar (shows TTS model status).
- Touch targets are large enough (≥ 44px) for all interactive elements.

Error states:
- When TTS model is still loading (`/health` returns `status: "loading"`): Generate Speech button is disabled, status indicator shows "Loading..." in the navigation bar.
- When TTS model is in error (`/health` returns `status: "error"`): Generate Speech button is disabled, status indicator shows "Error" in the navigation bar, and a toast appears on page load: "TTS model is not ready. Please try again later."
- When the backend is unreachable: Toast "Cannot connect to server" appears, Generate Speech button is disabled.

**Acceptance criteria**:
- [ ] The existing mobile TTS Studio layout is preserved (stacked panels with drag divider)
- [ ] The navigation bar compacts on mobile (< 768px)
- [ ] The `MobileStatusIndicator` is visible in the navigation bar
- [ ] Touch targets are ≥ 44px for all interactive elements
- [ ] When TTS model is loading: Generate Speech button is disabled, status indicator shows "Loading..."
- [ ] When TTS model is in error: Generate Speech button is disabled, status indicator shows "Error", toast appears on page load
- [ ] When backend is unreachable: Toast "Cannot connect to server" appears, Generate Speech button is disabled

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Browser DevTools responsive mode (< 768px) shows correct mobile layout
- [ ] TTS model loading state is reflected in the navigation bar status indicator
- [ ] TTS model error state shows appropriate toast and disables Generate Speech button

---

## Dependency Graph

```
Slice 1 (Playground route) ──► Slice 2 (Navigation wiring) ──► Slice 3 (Mobile + error states)
```

- **Slice 1** can start immediately (no dependencies).
- **Slice 2** depends on Slice 1 (needs `/playground` route) and the NavigationBar component (from Dashboard Navigation workflow).
- **Slice 3** depends on Slices 1 and 2 (needs Playground page and navigation wired up).

---

## External Dependencies

| Dependency | Source | Status | Notes |
|-----------|--------|--------|-------|
| `NavigationBar` component | Dashboard Navigation workflow (Slice 2) | **Not yet implemented** | Provides "Playground" link. This workflow wires the Playground page to it. |
| `/health` endpoint | Existing backend (`app.py`) | **Available** | Returns model loading status. Used for error state handling. |
| `/api/generate` endpoint | Existing backend (`app.py`) | **Available** | TTS synthesis endpoint. No changes needed. |
| `/api/voices` endpoint | Existing backend (`app.py`) | **Available** | Voice discovery endpoint. No changes needed. |
| All TTS components | Existing `app/components/` | **Available** | 9 components (AudioPlayerPanel, WaveformCanvas, GenerateButton, SpeedSlider, VoiceSelector, ToastNotification, ModelStatusIndicator, MobileStatusIndicator, FocusHaloCanvas). |
| All TTS composables | Existing `app/composables/` | **Available** | 7 composables (useAudioModule, useHealthPoll, useVoices, useTtsApi, useInputValidation, useToast, usePanelToggle). |

---

## Test Coverage Plan

Tests should be created in `frontend/tests/` (following project convention):

| Slice | Test File | What to Test |
|-------|-----------|-------------|
| 1 | `playgroundRoute.test.ts` | Playground page exists, renders TTS Studio, `/` does not show TTS Studio, all TTS features preserved |
| 2 | `playgroundNavigation.test.ts` | Navigation bar "Playground" link navigates correctly, direct URL navigation works, active page highlighting |
| 3 | `playgroundMobile.test.ts` | Responsive layout on mobile, touch targets, error states (loading, error, unreachable), MobileStatusIndicator |

---

## Open Questions

- Should the Playground preserve the two-panel layout (Control Deck + Canvas) or use a simpler single-panel layout? (Workflow open question — the existing TTS Studio uses two-panel, which is preserved.)
- Should the Playground show any learning-related UI elements (e.g., "Save this text to a lesson" button)? (Workflow open question — out of scope for this implementation.)
- Should the Playground integrate with the lesson system (e.g., "Use this text in an activity" button)? (Workflow open question — out of scope for this implementation.)
