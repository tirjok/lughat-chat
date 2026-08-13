# ISSUE-001: Backend — Replace XTTS-v2 with Chatterbox Model Loading

## What to build

Replace the Coqui XTTS-v2 model import and loading logic in `backend/app.py` with Chatterbox Multilingual TTS. The `lifespan()` function currently imports `from TTS.api import TTS` and loads `TTS("tts_models/multilingual/xtts_v2")` in a background thread. This issue replaces that with `Chatterbox("multilingual")` using the same retry/backoff/timeout pattern.

Also update:
- Log messages: "Loading XTTS-v2 model..." → "Loading Chatterbox multilingual model..."
- Cache env var: `COQUI_TTS_CACHE` → Chatterbox's cache configuration (verify env var or config path)
- Remove `COQUI_TOS_AGREED=1` from `docker-compose.yml` (Chatterbox is MIT-licensed, no TOS required)
- Keep the same retry parameters: `MAX_LOAD_RETRIES = 3`, `LOAD_RETRY_DELAYS = [2.0, 4.0, 8.0]`, `LOAD_HARD_TIMEOUT = 300`

## Acceptance criteria

- [ ] `app.py` imports Chatterbox instead of Coqui TTS (`from TTS.api import TTS` → `from chatterbox import Chatterbox`)
- [ ] `lifespan()` loads `Chatterbox("multilingual")` in the background thread with the same retry/backoff/timeout pattern
- [ ] Log messages updated to reference Chatterbox (not XTTS-v2)
- [ ] `COQUI_TOS_AGREED` removed from `docker-compose.yml` environment variables
- [ ] Model cache volume path `/app/.cache/tts` remains configured (verify Chatterbox respects it or set equivalent)
- [ ] Backend starts, loads model, `/health` returns `{"status": "ready", "model_loaded": true}`
- [ ] `./run-backend-tests.sh` passes (existing tests mock the model — no test changes needed)

## Blocked by

None - can start immediately

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 1 (Backend Model Swap)
- ADR: `docs/adr/ADR-007-replace-xtts-with-chatterbox.md` — C1, C5, C7, RC-3, RC-5
