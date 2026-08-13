# ISSUE-008: Frontend — Update Generate Button and Health Poll Timing

## What to build

Two frontend changes:

**1. GenerateButton label update (`frontend/app/components/GenerateButton.vue`):**
- Change "Processing Model..." to "Generating Speech..." (model is loaded, synthesis is in progress — "Processing Model..." is misleading)
- This is a text-only change in the template

**2. Health poll timing adjustment (`frontend/app/composables/useHealthPoll.ts`):**
- Increase polling interval from 2s to 5s (Chatterbox loads in ~30-60s vs XTTS-v2's ~120s)
- Reduce `maxRetries` from 150 to ~30-60 (at 5s interval = 150-300s total)
- Ensure frontend polling covers Chatterbox load time: 30 retries × 5s = 150s (covers ~30-60s load)

## Acceptance criteria

- [ ] `GenerateButton.vue` shows "Generating Speech..." (not "Processing Model...") when `isGenerating=true` and `modelStatus='ready'`
- [ ] `GenerateButton.vue` still shows "Error" when `modelStatus='error'`
- [ ] `GenerateButton.vue` still shows "Generate Speech" when ready and not generating
- [ ] `useHealthPoll.ts` polling interval changed from 2s to 5s
- [ ] `useHealthPoll.ts` default `maxRetries` changed from 150 to 30 (or 60)
- [ ] Frontend total polling time (retries × interval) covers Chatterbox load time (~30-60s)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (existing tests mock the composable — update test expectations for new retry count and interval)

## Blocked by

- ISSUE-007 (Frontend UI Redesign) — layout components must be updated first

## Integration Verification

- [ ] Frontend dev server starts without errors
- [ ] Generate button shows "Generating Speech..." during synthesis
- [ ] Health poll updates every 5s (not 2s)

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 9 (Health Check Timing) + STEP 11 (Frontend Components)
- ADR: `docs/adr/ADR-007-replace-xtts-with-chatterbox.md` — C5
