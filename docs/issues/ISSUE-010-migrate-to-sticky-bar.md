# ISSUE-010: Migrate TTS Studio to StickyAudioBar (Retire AudioPlayerPanel)

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Step 3, cleanup inventory; ADR-004)
**Dependencies:** ISSUE-009 (StickyAudioBar exists), ISSUE-003 (TTS Studio layout adapted)
**Scope:** Frontend (`frontend/app/pages/index.vue`, `frontend/app/components/`)

---

## Problem

`AudioPlayerPanel.vue` is a full-panel component (~40% of canvas on desktop) embedded within the TTS Studio's two-panel layout. ADR-004 specifies that `StickyAudioBar` **replaces** `AudioPlayerPanel` on all pages. The TTS Studio must be migrated to use the sticky bar instead of the panel.

## Acceptance Criteria

### AC-1: index.vue uses StickyAudioBar
- `index.vue` no longer renders `<AudioPlayerPanel>`
- `index.vue` renders `<StickyAudioBar>` instead
- When synthesis completes, `StickyAudioBar` slides up (visible)
- When synthesis is not active, `StickyAudioBar` is hidden (`translate-y-full`)

### AC-2: Audio module integration
- `useAudioModule` feeds data to `StickyAudioBar` (play, pause, seek, speed, volume)
- `audioModule.dispose()` on navigation triggers bar to hide
- `audioModule.load(audioBlob)` on synthesis completion triggers bar to slide up

### AC-3: AudioPlayerPanel is retired
- `AudioPlayerPanel.vue` is removed from the codebase (or marked as deprecated with a clear migration path)
- All references to `AudioPlayerPanel` are removed from `index.vue`
- All component tests for `AudioPlayerPanel` are updated to test `StickyAudioBar` (or removed if the panel is fully deleted)
- If the file is deleted, re-export stubs or aliases are NOT created (clean cutover per AGENTS.md rule)

### AC-4: TTS Studio functionality preserved
- Synthesis workflow: text input → select voice → generate → audio plays in sticky bar
- Download button visible on sticky bar (TTS Studio context — per ADR-004: "Shows synthesized audio file path, download button visible")
- Speed control, seek, volume all functional
- No regression in audio playback quality or behavior

### AC-5: Layout space freed
- TTS Studio panels now have ~300+ pixels more vertical space (the area previously occupied by AudioPlayerPanel)
- The 60px navbar tax from ADR-001 is partially offset by the sticky bar's space efficiency

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-04: In-flight synthesis — user clicks "Clean & Leave" | Sticky bar is hidden after cleanup (audioModule.dispose) |
| TC-15: Active synthesis — no navigation | Sticky bar is visible during active synthesis, hidden when synthesis completes |
| (Regression) | All TTS Studio synthesis workflows work with sticky bar |

## ADR References

- **ADR-004** (Sticky Bottom Audio Player Bar): Specifies that `AudioPlayerPanel` is **retired** and its functionality (play, pause, seek, speed, download) is absorbed into `StickyAudioBar`
- **ADR-001** (Shared Layout with Global Navbar): The 60px navbar tax is partially offset by freeing ~300px from the retired panel

## Files

- `frontend/app/pages/index.vue` (modified — replace AudioPlayerPanel with StickyAudioBar)
- `frontend/app/components/StickyAudioBar.vue` (modified — from ISSUE-009)
- `frontend/app/components/AudioPlayerPanel.vue` (deleted or deprecated)
- `frontend/tests/AudioPlayerPanel.test.ts` (updated or deleted)
- `frontend/tests/StickyAudioBar.test.ts` (updated — from ISSUE-009, add migration tests)
