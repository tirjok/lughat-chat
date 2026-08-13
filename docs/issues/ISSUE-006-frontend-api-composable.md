# ISSUE-006: Frontend — Update API Composable and Page

## What to build

Update the frontend API layer to match the new backend `SynthesisRequest` contract (3 fields: `text`, `language`, `voice`).

**Changes to `frontend/app/composables/useTtsApi.ts`:**
- `SynthesisRequest` interface: `{ text: string, language?: string, voice?: string }` (remove `speaker`, `speed`, `seed`)
- `synthesize()` sends `{ text, language: 'ar', voice: selectedVoice }` (not `speaker`, `speed`, `seed`)

**Changes to `frontend/app/pages/index.vue`:**
- `handleSynthesize()` call: `{ text: textInput.value, language: 'ar', voice: selectedVoice.value }` (remove `seed: 42`)
- Rename `selectedSpeaker` → `selectedVoice` (state variable)
- Update `selectedVoiceName` computed to use `selectedVoice`

## Acceptance criteria

- [ ] `SynthesisRequest` interface in `useTtsApi.ts`: `{ text: string, language?: string, voice?: string }`
- [ ] `synthesize()` sends `language` and `voice` (not `speaker`, `speed`, `seed`)
- [ ] `handleSynthesize()` in `index.vue` sends `{ text, language: 'ar', voice: selectedVoice }`
- [ ] `seed: 42` removed from `handleSynthesize()` call
- [ ] `selectedSpeaker` renamed to `selectedVoice` in `index.vue` state
- [ ] `selectedVoiceName` computed uses `selectedVoice` (not `selectedSpeaker`)
- [ ] TypeScript compiles without errors
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (existing tests mock the composable — update mocks to use new interface)

## Blocked by

- ISSUE-004 (Backend Simplify API Contract) — frontend can't update without the backend contract

## Integration Verification

- [ ] Frontend dev server starts without errors
- [ ] Synthesis request body matches new API contract (check network tab)

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 6 (Simplify API Contract — Frontend)
- ADR: `docs/adr/ADR-007-replace-xtts-with-chatterbox.md` — C6, RC-7, RC-8
