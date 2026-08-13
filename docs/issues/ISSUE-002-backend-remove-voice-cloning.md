# ISSUE-002: Backend — Remove Voice Cloning Pipeline

## What to build

Remove all voice cloning logic from `backend/app.py`. This includes:

- `_validate_speaker_wav()` function (lines 28-50)
- `SPEAKER_WAV_DIR` constant (line 111-113)
- Speaker WAV file lookup in `generate_speech()` (lines 372-378)
- `torch.manual_seed()` seeding (lines 390-395)
- `temperature` parameter passed to `!model.tts_to_file()` (line 402)
- `app.mount("/speaker_wavs", ...)` static mount (lines 239-243)
- `import wave` module (line 14) — only used for speaker WAV validation

The `generate_speech()` function currently requires a speaker WAV file to exist in `speaker_wavs/`. After this change, it uses Chatterbox's built-in voices directly — no reference audio needed.

FFmpeg conversion from WAV to MP3 is still needed (Chatterbox outputs WAV, RC-1).

## Acceptance criteria

- [ ] `_validate_speaker_wav()` function removed from `app.py`
- [ ] `SPEAKER_WAV_DIR` constant removed from `app.py`
- [ ] `generate_speech()` no longer references `speaker_wavs/` directory
- [ ] `torch.manual_seed()` call removed from `generate_speech()`
- [ ] `temperature` parameter removed from `model.tts_to_file()` call
- [ ] `app.mount("/speaker_wavs", ...)` removed from `app.py`
- [ ] `import wave` removed from `app.py` (only used for speaker WAV validation)
- [ ] FFmpeg WAV→MP3 conversion still present (Chatterbox outputs WAV)
- [ ] `speaker_wavs/` directory marked for deletion (no longer referenced)
- [ ] `./run-backend-tests.sh` passes (existing tests mock the model — no test changes needed)

## Blocked by

- ISSUE-001 (Backend Model Swap) — Chatterbox must be integrated first

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 2 (Remove Voice Cloning Pipeline)
- ADR: `docs/adr/ADR-007-replace-xtts-with-chatterbox.md` — C2, RC-2, RC-6
