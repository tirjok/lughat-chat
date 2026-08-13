# ISSUE-009: Backend — Update History and Cleanup for Cache-Based Filenames

## What to build

Update `GET /api/history` in `backend/app.py` to handle cache-based filenames (`{hash}.mp3`) instead of voice-based filenames (`{lang}_{voice}_{timestamp}.mp3`).

**Changes to `get_history()`:**
- Filename parsing: `{hash}.mp3` has no `_` separators — can't parse `language` and `voice` from filename
- Rely on sidecar JSON `{hash}.json` for metadata (text, language, voice, speed, created_at)
- If sidecar JSON missing or malformed, fall back to: `language="unknown"`, `voice="default"`, `text=""`
- Handle old XTTS-v2 sidecar JSON files gracefully (ignore unknown fields like `pitch`, `seed`)
- Old XTTS-v2 MP3 files (`{lang}_{voice}_{timestamp}.mp3`) will be cleaned by 24h TTL (existing behavior)

**Changes to `cleanup_old_files()`:**
- No change needed — already matches `*.mp3` and `*.json` extensions
- Cache-based `{hash}.mp3` and `{hash}.json` files are cleaned by existing 24h TTL mechanism

## Acceptance criteria

- [ ] `get_history()` reads metadata from `{hash}.json` sidecar files (not filename parsing)
- [ ] Old XTTS-v2 sidecar JSON files handled gracefully (ignore unknown fields)
- [ ] Old XTTS-v2 MP3 files (`{lang}_{voice}_{timestamp}.mp3`) coexist with cache files
- [ ] 24h TTL cleanup removes old files (existing behavior, no change needed)
- [ ] Cleanup handles both `{hash}.mp3` and `{hash}.json` files
- [ ] `./run-backend-tests.sh` passes (existing tests create mock files — update test fixtures to use cache-based format)

## Blocked by

- ISSUE-003 (Backend Synthesis Cache) — cache-based filenames depend on cache implementation

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] GET /api/history returns entries with correct metadata from sidecar JSON

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 12 (Update Generation History and Cleanup)
- ADR: `docs/adr/ADR-007-replace-xtts-with-chatterbox.md` — RC-10
