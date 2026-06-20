# 11 — Remove Dead Code + Update Tests

## Type

Done

## What to build

Remove the 4 dead code components that are not referenced in `pages/index.vue` and are not used anywhere in the application. Also remove their test files and update any remaining tests that reference them.

### Scope

**Dead Code Components (DELETE)**
| File | Lines | Reason |
|------|-------|--------|
| `app/components/ArabicTextarea.vue` | 46 | Textarea is inline in `pages/index.vue`, not a separate component |
| `app/components/PlayPauseButton.vue` | 31 | Replaced by inline button in `AudioPlayerPanel` |
| `app/components/SeekableProgressBar.vue` | 39 | Not used — audio panel has no seek bar yet (deferred) |
| `app/components/TimeDisplay.vue` | 15 | Time format is inline in `AudioPlayerPanel` |

**Test Files (DELETE or UPDATE)**
| File | Action | Reason |
|------|--------|--------|
| `tests/ArabicTextarea.test.ts` | DELETE | Component removed |
| `tests/SeekableProgressBar.test.ts` | DELETE | Component removed (if exists) |
| `tests/PlayPauseButton.test.ts` | DELETE | Component removed (if exists) |
| `tests/TimeDisplay.test.ts` | DELETE | Component removed (if exists) |

**Tests to UPDATE**
| File | Changes |
|------|---------|
| `tests/AudioPlayerPanel.test.ts` | Remove any imports of `SeekableProgressBar` or `TimeDisplay` |
| `tests/index.test.ts` | Remove any imports of dead components |
| `tests/app.test.ts` | Remove any imports of dead components |

**Files NOT affected**
- `app/components/FocusHaloCanvas.vue` — used in `pages/index.vue`
- `app/components/ModelStatusIndicator.vue` — used in `pages/index.vue`
- `app/components/PanelToggle.vue` — used in `pages/index.vue`
- `app/components/SpeedSlider.vue` — used in `pages/index.vue`
- `app/components/VoiceSelector.vue` — used in `pages/index.vue`
- `app/components/WaveformCanvas.vue` — used in `pages/index.vue`
- `app/components/GenerateButton.vue` — used in `pages/index.vue`
- `app/components/ToastNotification.vue` — used in `pages/index.vue`
- All composables — used in `pages/index.vue`

### Verification
- After deletion, run `pnpm lint` and `pnpm test` to verify no broken imports
- Verify `pages/index.vue` template does not reference any removed component by name

## Acceptance criteria

- [ ] `ArabicTextarea.vue` deleted from `app/components/`
- [ ] `PlayPauseButton.vue` deleted from `app/components/`
- [ ] `SeekableProgressBar.vue` deleted from `app/components/`
- [ ] `TimeDisplay.vue` deleted from `app/components/`
- [ ] Corresponding test files deleted from `tests/`
- [ ] No broken imports remain in any source or test file
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm test` passes with no errors

## Blocked by

None — completed.
