---
name: Refactor Plan
about: Audio playback broken due to disconnected audioRef
title: "[REFACTOR] Wire audioRef to <audio> element in MobileSplitScreen and DesktopPanels"
labels: bug, refactor, audio
assignees: ""
---

## Problem Statement

After generating text-to-speech audio, the generated audio player UI appears (mobile card or desktop sticky bar), but clicking the play button produces no sound. The audio generation itself works — the backend returns valid MP3 data, and the frontend creates a valid `blob:` URL. The audio simply never plays.

This regression was introduced during the component refactoring that extracted `MobileSplitScreen` and `DesktopPanels` from the original monolithic `index.vue` page (commit `8464ede`). The original page had a single `<audio ref="audioRef" class="hidden" />` element at the page level, directly bound to `useAudioModule.audioRef`. After the refactor, that element was removed from the page template and moved into `DesktopPanels.vue` with the ref renamed to `ref="audio"` — a local name that is never used or exposed to the parent. `MobileSplitScreen` has no `<audio>` element at all.

As a result, `useAudioModule.audioRef` is always `null` in both layouts. The `load()` function skips setting the `src` attribute on the audio element, and `play()` returns silently without calling `.play()` on any element.

## Solution

Wire `audioRef` from `useAudioModule` to an `<audio>` element in both layout components:

- In `DesktopPanels.vue`: rename the existing `ref="audio"` to `ref="audioRef"` on the `<audio class="hidden">` element (one word change).
- In `MobileSplitScreen.vue`: add `<audio ref="audioRef" class="hidden" />` at the end of the template (one line).

No changes to `index.vue` or `useAudioModule.ts` are needed — the page already correctly extracts and uses `audioRef`.

## Commits

**Commit 1: fix: wire audioRef to <audio> element in MobileSplitScreen and DesktopPanels**

- In `DesktopPanels.vue`, change `ref="audio"` to `ref="audioRef"` on the existing `<audio class="hidden">` element (line 302). This connects the hidden audio element to the parent's `useAudioModule.audioRef`, enabling `load()` to set `src` and `play()` to call `.play()`.
- In `MobileSplitScreen.vue`, add `<audio ref="audioRef" class="hidden" />` at the end of the template (before the closing `</div>`). The mobile layout had no audio element at all, so the play button emits `toggle` which bubbles up to `audioModule.toggle()` → `play()` → `if (!audioRef.value) return` — a silent no-op. Adding the element fixes this.
- Verify the existing test suite passes: `pnpm test`, `pnpm typecheck`, `./run-tests.sh`.

Expected diff: ~2 lines changed across 2 files. No new files, no new dependencies, no changes to existing tests.

## Decision Document

### Modules modified
- `frontend/app/components/DesktopPanels.vue` — rename one ref attribute
- `frontend/app/components/MobileSplitScreen.vue` — add one `<audio>` element

### Modules NOT modified
- `frontend/app/pages/index.vue` — already correctly extracts and uses `audioRef`
- `frontend/app/composables/useAudioModule.ts` — works correctly; just needs `audioRef` wired
- `frontend/app/composables/useTtsApi.ts` — returns correct audio blob
- `backend/app.py` — returns valid `audio/mpeg` via `FileResponse`
- All existing tests — no changes needed

### Technical clarification
- The two layout components (`MobileSplitScreen` and `DesktopPanels`) are mutually exclusive (controlled by CSS `md:hidden` / `hidden md:flex`). Only one audio element will be in the DOM at any time. This is fine — `useAudioModule.audioRef` will point to whichever component is rendered.
- The `audio` element is hidden (`class="hidden"`) — it exists solely to provide the browser's audio playback engine. The visible UI (mobile card, desktop sticky bar) is purely cosmetic and emits events.
- The existing dangling `ref="audio"` in `DesktopPanels.vue` is dead code (never declared in script, never used). Renaming it to `audioRef` is safe.

### Architectural decision
- Option A chosen: wire `audioRef` in both child components rather than lifting the element back to the page level. This keeps the audio element co-located with its layout component while maintaining the binding to the shared composable.

## Testing Decisions

### What is already covered
- `frontend/tests/composables/useAudioModule.test.ts` tests the composable in isolation:
  - `load()` sets `audioUrl` when given a blob (no audioRef needed)
  - `play()` calls `.play()` on the audio element when `audioRef` is set
  - `play()` does nothing when `audioRef` is null (expected behavior)
  - `pause()`, `seek()`, `download()`, `dispose()` all tested
- `frontend/tests/components/StickyAudioBar.test.ts` tests the UI bar in isolation (visibility, controls, keyboard shortcuts)

### What is NOT covered (and why it's acceptable)
- No new component-level integration tests for `DesktopPanels` or `MobileSplitScreen` are needed. The fix is a single ref rename and a single line addition. The composable's behavior is fully tested when `audioRef` is set — which is exactly what this fix provides. Adding tests would be testing Vue's ref binding mechanism, not application logic.

### Verification steps
1. Run `./run-tests.sh` — all existing tests must pass
2. Manually verify: generate text → audio player appears → click play → audio plays
3. Verify both mobile (narrow viewport) and desktop (wide viewport) layouts work

## Out of Scope

- No changes to the backend (FastAPI `/api/generate` endpoint)
- No changes to `useTtsApi` (API client)
- No changes to `useAudioModule` (composable logic)
- No changes to `StickyAudioBar` (UI component)
- No new dependencies
- No changes to existing tests
- No changes to the cleanup dialog or navigation guard logic

## Further Notes

- The git history confirms the regression: before commit `8464ede`, `index.vue` contained `<audio ref="audioRef" class="hidden" />` directly. After the refactor, this element was removed from the page and moved into `DesktopPanels.vue` with the ref renamed to `ref="audio"`.
- The fix restores the pre-refactor behavior: `audioRef` points to a valid `<audio>` DOM element, enabling the full playback chain (load → set src → play → events fire).
- This is a one-line fix in each of two files. The total diff is approximately 2 lines changed.
