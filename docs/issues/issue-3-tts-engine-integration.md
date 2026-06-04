# Issue 3: TTS Engine Integration — Model Loading & Speech Synthesis

## What to build

Integrate the XTTS-v2 neural TTS model into the backend: load it on startup with progress tracking, implement speech synthesis endpoint that accepts Arabic text and returns MP3 audio.

After this is complete, a complete end-to-end flow works: send Arabic text to `/api/generate` → receive MP3 blob. The UI layer is not required for this slice to be demoable.

## Acceptance criteria

- [ ] XTTS-v2 model downloads automatically on first container startup (~2GB)
- [ ] Model is cached in named volume (`tts-model-cache`) and persists across restarts
- [ ] Subsequent container startups load model from cache (no re-download)
- [ ] `/health` endpoint returns `status: "ready"` once model is loaded
- [ ] `POST /api/generate` accepts JSON with `text`, `language`, `voice`, `speed` fields
- [ ] Endpoint generates speech using XTTS-v2 and converts WAV → MP3 via ffmpeg
- [ ] Returns MP3 blob with `audio/mpeg` content type
- [ ] Generated audio files are saved to named volume (`tts-audio-cache`)
- [ ] Returns `duration_seconds` in response
- [ ] Handles errors gracefully (invalid text, model not ready) with proper HTTP status codes

## Blocked by

- Issue 2: Backend API Foundation — FastAPI Endpoints & Health Check
