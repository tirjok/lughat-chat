# ISSUE-007: Frontend — Redesign Voice Selector and Remove Speed Slider

## What to build

Update frontend UI components to reflect the new Chatterbox voice model and removed speed control.

**Changes to `frontend/app/components/VoiceSelector.vue`:**
- Display Chatterbox built-in voices (no WAV file references)
- Remove `speaker_wav` field from `Voice` interface usage
- Remove voice preview functionality (PRD: "Voice Preview (Dead Code)" — RF-14)
- Update `displayVoice` to show Chatterbox voice names (e.g., "Arabic Female", "Arabic Male")

**Changes to `frontend/app/components/DesktopPanels.vue`:**
- Remove `SpeedSlider` import and rendering
- Remove `speedValue` prop from interface
- Remove `update:speedValue` from emits

**Changes to `frontend/app/components/MobileSplitScreen.vue`:**
- Remove `SpeedSlider` import and rendering
- Remove `speedValue` prop from interface
- Remove `update:speedValue` from emits

**Changes to `frontend/app/pages/index.vue`:**
- Remove `speedValue` state (`shallowRef(1.0)`)
- Remove `@update:speed-value` bindings from `MobileSplitScreen` and `DesktopPanels`
- Pass `selectedVoice` (not `selectedSpeaker`) to layout components

**Changes to `frontend/app/composables/useVoices.ts`:**
- `Voice` interface: remove `speaker_wav` field (keep `id`, `name`, `dialect`, `tag`, `icon`)

## Acceptance criteria

- [ ] `VoiceSelector.vue` displays Chatterbox built-in voices (no WAV file references)
- [ ] `Voice` interface in `useVoices.ts`: `{ id, name, dialect, tag, icon }` (no `speaker_wav`)
- [ ] `SpeedSlider` removed from `DesktopPanels.vue` template and imports
- [ ] `SpeedSlider` removed from `MobileSplitScreen.vue` template and imports
- [ ] `speedValue` prop removed from both layout component interfaces
- [ ] `speedValue` state removed from `index.vue`
- [ ] `selectedSpeaker` renamed to `selectedVoice` across all components
- [ ] `update:speedValue` emit removed from both layout components
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (existing tests mock components — SpeedSlider tests may need removal or the component file itself may be deleted)

## Blocked by

- ISSUE-005 (Backend Voice Discovery) — needs new voice format
- ISSUE-006 (Frontend API Composable) — needs `selectedVoice` variable

## Integration Verification

- [ ] Frontend dev server starts without errors
- [ ] Voice dropdown shows Chatterbox voices (not WAV file names)
- [ ] Speed slider no longer visible in UI

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 7 (Frontend) + STEP 8 (Remove Speed/Pitch Control)
- ADR: `docs/adr/ADR-007-replace-xtts-with-chatterbox.md` — C2, RC-1
