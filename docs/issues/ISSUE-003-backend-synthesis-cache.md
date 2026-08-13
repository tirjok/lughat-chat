# ISSUE-003: Backend — Synthesis Cache (Lookup + Store)

## What to build

Implement a file-based synthesis cache in `backend/app.py`'s `generate_speech()` function. The cache operates in two phases:

**Cache Lookup (before inference):** Compute SHA-256 hash of composite input `text|language|voice|speed` (pipe-delimited to avoid collisions). Check if `{hash}.mp3` exists in `downloads/`. If found, return the cached file immediately (cache hit). If not found, proceed to inference (cache miss).

**Cache Store (after inference):** After successful Chatterbox inference, save the output MP3 as `{hash}.mp3` in `downloads/`. Write a sidecar JSON file `{hash}.json` containing: `text`, `language`, `voice`, `speed`, `created_at` (Unix timestamp).

Error handling:
- Corrupted/unreadable cached file → treat as cache miss, run full synthesis, overwrite
- Read-only filesystem → log warning, proceed without caching (synthesis succeeds)
- Sidecar write failure → MP3 is still valid, history falls back to filename parsing

## Acceptance criteria

- [ ] SHA-256 hash computed from `text|language|voice|speed` (pipe-delimited composite key)
- [ ] Cache lookup checks for `{hash}.mp3` in `downloads/` before inference
- [ ] Cache hit returns cached MP3 file immediately (no Chatterbox inference)
- [ ] Cache miss proceeds to full Chatterbox inference
- [ ] Cache store saves `{hash}.mp3` and `{hash}.json` (sidecar with `text`, `language`, `voice`, `speed`, `created_at`)
- [ ] Corrupted cached file treated as cache miss (full synthesis, overwrite)
- [ ] Read-only filesystem logged as warning, synthesis still succeeds
- [ ] Sidecar write failure does not prevent MP3 from being returned
- [ ] Existing 24h TTL cleanup handles `{hash}.mp3` and `{hash}.json` files (matches `*.mp3` and `*.json`)
- [ ] `./run-backend-tests.sh` passes

## Blocked by

- ISSUE-002 (Backend Remove Voice Cloning) — `generate_speech()` must be refactored first

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 3 (Cache Lookup) + STEP 4 (Cache Store)
- ADR: `docs/adr/ADR-008-synthesis-cache.md` — C1 through C7
