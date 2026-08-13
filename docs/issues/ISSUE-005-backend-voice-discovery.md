# ISSUE-005: Backend — Redesign Voice Discovery Endpoint

## What to build

Replace `GET /api/voices` in `backend/app.py` from file-based discovery (scanning `speaker_wavs/` for `.wav` files) to Chatterbox's built-in voice list.

**Before:** `discover_voices(SPEAKER_WAV_DIR)` scans directory for `.wav` files, returns `{id, name}` objects sorted alphabetically.

**After:** Call Chatterbox's voice listing API (or equivalent) to get available built-in voices. Return format:
```json
[
  {"id": "arabic_female", "name": "Arabic Female"},
  {"id": "arabic_male", "name": "Arabic Male"}
]
```

If Chatterbox doesn't expose a `list_voices()` API, hardcode known voice names (per ADR-007: "built-in Arabic voices").

Remove `discover_voices()` function from `app.py` (no longer needed — it was only used for speaker WAV discovery).

## Acceptance criteria

- [ ] `GET /api/voices` returns Chatterbox built-in voices (not WAV file discovery)
- [ ] Response format: array of `{id, name}` objects
- [ ] Arabic voices included (at least one male, one female)
- [ ] `discover_voices()` function removed from `app.py`
- [ ] `SPEAKER_WAV_DIR` no longer referenced in `list_voices()`
- [ ] 500 error returned if Chatterbox voice list retrieval fails
- [ ] `./run-backend-tests.sh` passes (existing tests mock `discover_voices` — update mocks to return Chatterbox voice format)

## Blocked by

- ISSUE-004 (Backend Simplify API Contract) — voice field must be simplified first

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] GET /api/voices returns a valid voice list

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 7 (Redesign Voice Discovery — Backend)
- ADR: `docs/adr/ADR-007-replace-xtts-with-chatterbox.md` — C2, RC-1, RC-8
