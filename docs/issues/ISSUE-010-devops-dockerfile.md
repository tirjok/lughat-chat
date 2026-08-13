# ISSUE-010: DevOps — Update Dockerfile and docker-compose.yml

## What to build

Update the Docker build configuration to support Chatterbox Multilingual TTS.

**Changes to `backend/Dockerfile`:**
- Base image: `python:3.12-slim` → `python:3.11-slim` (ADR-007 C7)
- Remove `COQUI_TOS_AGREED=1` env var (Chatterbox is MIT-licensed)
- Keep `ffmpeg` (RC-1: Chatterbox outputs WAV, ffmpeg conversion still needed)
- Remove `torchcodec` rebuild steps (lines 33-39)
- Remove `coqui-tts` from `requirements.txt`, add `chatterbox-tts`
- Add `torchaudio`, `librosa` to `requirements.txt`
- Keep model cache volume path `/app/.cache/tts`
- Keep `/app/downloads` directory creation

**Changes to `docker-compose.yml`:**
- Remove `COQUI_TOS_AGREED=1` from backend environment variables
- Remove `./backend/speaker_wavs:/app/speaker_wavs` volume mount (no longer needed)
- Keep `tts-model-cache:/app/.cache/tts` volume (persists Chatterbox model weights)
- Keep `tts-audio-cache:/app/downloads` volume (persists cached audio)
- Keep health check configuration (independent of model load time)

**Changes to `backend/requirements.txt`:**
- Remove `coqui-tts[codec]==0.27.5`
- Remove `ffmpeg-python==0.2.0` (not needed — direct ffmpeg subprocess call)
- Add `chatterbox-tts` (verify correct PyPI package name)
- Add `torchaudio`
- Add `librosa`

## Acceptance criteria

- [ ] `backend/Dockerfile` uses `python:3.11-slim` base image
- [ ] `COQUI_TOS_AGREED` removed from Dockerfile and docker-compose.yml
- [ ] `ffmpeg` still installed (Chatterbox outputs WAV → needs conversion)
- [ ] `torchcodec` rebuild steps removed from Dockerfile
- [ ] `requirements.txt` has `chatterbox-tts`, `torchaudio`, `librosa` (no `coqui-tts`)
- [ ] `speaker_wavs` volume mount removed from `docker-compose.yml`
- [ ] `tts-model-cache` and `tts-audio-cache` volumes preserved
- [ ] `docker compose up --build` succeeds (backend container starts)
- [ ] Chatterbox model loads successfully within 300s
- [ ] `./run-backend-tests.sh` passes (tests mock the model — no test changes needed)

## Blocked by

- ISSUE-001 (Backend Model Swap) — Dockerfile changes must match the model swap

## Integration Verification

- [ ] Docker image builds without errors
- [ ] Backend container starts without errors in logs
- [ ] Chatterbox model loads successfully
- [ ] `/health` endpoint returns `{"status": "ready", "model_loaded": true}`

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 10 (Update Dockerfile)
- ADR: `docs/adr/ADR-007-replace-xtts-with-chatterbox.md` — C7, RC-1, RC-5, RC-6
