# ISSUE-011: Backend — Verify Cache Cleanup Removes .mp3 and .json Files Older Than 24 Hours

## What to build

Add a test case (TC-35) that verifies the existing cleanup mechanism correctly removes **both** `.mp3` (audio) and `.json` (sidecar metadata) files older than 24 hours.

The current `POST /api/cleanup` endpoint already implements 24h TTL cleanup and removes `.json` sidecars alongside `.mp3`/`.wav` files (see `app.py` lines 614-616). However, the existing test `test_history_cleanup_endpoint_removes_old_files` only verifies `.mp3` removal — it never checks that the corresponding `.json` sidecar file is also deleted.

This test ensures the cleanup endpoint's sidecar removal logic is verified end-to-end: when an old `.mp3` is removed, its `{hash}.json` sidecar must also be removed, leaving no orphaned metadata files.

**Scope**: Backend test only. No code changes to `app.py` are required — the cleanup endpoint already handles `.json` sidecars. This is a test gap, not an implementation gap.

## Acceptance criteria

- [ ] New test `test_history_cleanup_removes_json_sidecars(tmp_path)` creates `.mp3` + `.json` pairs with 48h-old timestamps, calls `POST /api/cleanup`, and asserts both files are deleted (count == 0 remaining)
- [ ] New test verifies `GET /api/history?cleanup=true` also removes `.json` sidecars alongside `.mp3` files (existing test `test_history_cleanup_with_cleanup_true_triggers_cleanup` only checks `.mp3`)
- [ ] New test creates a `.json` sidecar without a matching `.mp3` and verifies the cleanup does NOT remove orphaned `.json` files (cleanup only targets `.mp3`/`.wav` extensions)
- [ ] Existing tests in `test_history.py` continue to pass without modification
- [ ] `./run-backend-tests.sh` passes (all backend tests, lint, typecheck)

## Blocked by

None - can start immediately

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] POST /api/cleanup returns valid response with correct `removed_count`
- [ ] GET /api/history?cleanup=true returns valid response after cleanup runs

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 12 (Update Generation History and Cleanup)
- ADR: `docs/adr/ADR-008-synthesis-cache.md` — Cache entries cleaned by orphaned file mechanism
- Existing: `backend/tests/test_history.py` (test gap: cleanup test only verifies `.mp3`, not `.json`)
