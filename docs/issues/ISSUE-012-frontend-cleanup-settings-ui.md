# ISSUE-012: Frontend — Cleanup Settings UI

## Parent

- ISSUE-011 (Backend — Verify Cache Cleanup Removes .mp3 and .json Files Older Than 24 Hours) — UI should reference the verified cleanup endpoint

## What to build

Add a "Cleanup Settings" section to the TTS Studio page that exposes the existing 24h TTL cleanup behavior to the user with a manual "Run Cleanup Now" button.

The backend `POST /api/cleanup` endpoint already exists and works correctly. This issue adds the frontend surface: a user-facing control that calls the existing endpoint, shows feedback, and integrates with the existing `useCleanupNavigation` composable's toast pattern.

**Design notes (HITL):**
- Placement: The cleanup section should live below the TTS Studio's control deck, above the waveform canvas — or as a compact row within the control deck footer area (similar to how the sticky audio bar appears).
- The section should be compact by default (showing status: "Last cleanup: N files removed") and expandable to reveal a "Run Cleanup Now" button.
- Icon: `ph ph-broom` (Phosphor) for the cleanup action, per project icon conventions.
- Dark theme: all states must have `dark:` variants (existing `main.css` pattern).

**Scope**: Frontend component + composable + integration test. No backend changes — the `POST /api/cleanup` endpoint is already implemented.

## Acceptance criteria

- [ ] New `CleanupSettings.vue` component renders in TTS Studio page (below control deck, above waveform canvas)
- [ ] Component shows current status: "Last cleanup: N files removed" (from last successful call)
- [ ] "Run Cleanup Now" button calls `POST /api/cleanup` and shows toast feedback (success/error)
- [ ] Component handles 503 (model loading) — shows info toast: "Backend unavailable — cleanup will run next scheduled cycle."
- [ ] Component handles network errors — shows error toast: "Cleanup failed — files will be cleaned by 24h TTL."
- [ ] Component follows project conventions: `<script setup lang="ts">`, UnoCSS classes with `dark:` variants, Phosphor icons
- [ ] Component is RTL-aware (Arabic text direction)
- [ ] Integration test verifies the full call chain: mount → click → toast → API response
- [ ] `./run-tests.sh` passes (all tests, lint, typecheck)

## Blocked by

- ISSUE-011 (Backend — Verify Cache Cleanup) — must confirm the cleanup endpoint is verified before building the UI on top of it

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] POST /api/cleanup returns valid response with correct `removed_count`
- [ ] Frontend component successfully calls the endpoint and displays feedback

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 12 (Update Generation History and Cleanup)
- Existing: `frontend/app/composables/useCleanupNavigation.ts` (toast pattern already established)
- Existing: `frontend/components/CleanupDialog.vue` (dialog pattern to match)
- Existing: `frontend/tests/components/cleanup-dialog.test.ts` (test pattern to follow)
- Icon convention: Phosphor (`ph ph-broom`)
