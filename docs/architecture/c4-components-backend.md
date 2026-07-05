# C4 Component Diagram — Lughat Chat Backend

> **System:** Lughat Chat — Arabic Text-to-Speech Studio
> **Generated:** 2026-07-05
> **Level:** 3 — Component (Internal structure of the FastAPI server)
> **Container:** FastAPI Server (Python 3.12 + FastAPI 0.115.6)

---

## Component Overview

The FastAPI backend is a single-file application (`app.py`) with four REST endpoints, a background TTS model loader, and static file serving. It is organized into **configuration**, **model management**, **request/response models**, **endpoints**, and **middleware**.

## Diagram

```mermaid
C4Component
  title Component Diagram - Lughat Chat Backend

  Container(server, "FastAPI Server", "Python 3.12 + FastAPI + uvicorn", "REST API for TTS synthesis")

  Component_Boundary(config, "Configuration") {
    Component(appInit, "FastAPI() init", "App setup", "Title, description, version, lifespan. Adds CORSMiddleware. Mounts /downloads and /speaker_wavs static directories.")
    Component(envConfig, "Environment config", "Constants", "AUDIO_DIR, MODEL_CACHE_DIR, SPEAKER_WAV_DIR from env vars and filesystem paths.")
  }

  Component_Boundary(model_mgmt, "Model Management") {
    Component(lifespan, "lifespan()", "Lifespan handler", "Starts background TTS model loading thread on startup. Yields control to FastAPI. Shutdown handler.")
    Component(modelLoader, "load_model()", "Background thread", "Loads XTTS-v2 model. Updates global tts_model and model_load_status. Handles torch/transformers patches for CPU-only.")
    Component(torchPatches, "torch patches", "Compatibility shim", "Patches isin_mps_friendly, load_library for CPU-only inference (suppresses libnvrtc/libcuda errors).")
  }

  Component_Boundary(apis, "API Endpoints") {
    Component(health, "/health", "GET endpoint", "Returns model status (loading/ready/error) and model_loaded boolean.")
    Component(voices, "/api/voices", "GET endpoint", "Discovers voices from speaker_wavs/ directory. Returns array of {id, name}.")
    Component(generate, "/api/generate", "POST endpoint", "Generates speech from text. Resolves voice, validates speaker WAV, runs XTTS inference, converts WAV→MP3 via ffmpeg, returns FileResponse.")
    Component(history, "/api/history", "GET endpoint", "Lists previously generated audio files with metadata (filename, language, voice, created_at).")
  }

  Component_Boundary(models, "Data Models") {
    Component(synthesisReq, "SynthesisRequest", "Pydantic model", "text (1-3000 chars), language (ar|en), voice, speaker, speed (0.5-2.0), pitch (-4.0-4.0), seed (optional int).")
    Component(synthesisResp, "SynthesisResponse", "Pydantic model", "audio_url, filename, duration_seconds. (Defined but not used — endpoint returns FileResponse.)")
    Component(healthResp, "HealthResponse", "Pydantic model", "status (loading/ready/error), model_loaded (boolean).")
  }

  Component_Boundary(utils, "Utilities") {
    Component(discoverVoices, "discover_voices()", "Utility function", "Scans speaker_wavs/ directory for .wav files. Returns {id, name} entries.")
    Component(validateWav, "_validate_speaker_wav()", "Utility function", "Validates WAV file duration ≥ 0.33s (XTTS-v2 minimum). Returns 500 if too short.")
  }

  Rel(appInit, lifespan, "Registers", "lifespan handler")
  Rel(appInit, CORSMiddleware, "Adds", "CORS middleware (all origins)")
  Rel(appInit, StaticFiles, "Mounts", "/downloads and /speaker_wavs")

  Rel(lifespan, modelLoader, "Starts", "Background thread")
  Rel(modelLoader, torchPatches, "Applies", "CPU-only compatibility patches")

  Rel(health, modelLoadStatus, "Reads", "Global state variable")
  Rel(voices, discoverVoices, "Calls", "discover_voices(SPEAKER_WAV_DIR)")
  Rel(generate, synthesisReq, "Accepts", "SynthesisRequest body")
  Rel(generate, modelLoader, "Checks", "tts_model is not None and status == ready")
  Rel(generate, validateWav, "Calls", "Validate speaker WAV duration")
  Rel(generate, ffmpeg, "Uses", "Converts WAV to MP3 (192k, speed filter)")
  Rel(generate, StaticFiles, "Serves", "FileResponse from /downloads")
  Rel(history, StaticFiles, "Reads", "Files from /downloads directory")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")
```

## Component Inventory

### Configuration

| Component | Description |
|-----------|-------------|
| `FastAPI()` init | Creates the FastAPI app with title, description, version, lifespan handler. Adds `CORSMiddleware` (allow all origins). Mounts `/downloads` and `/speaker_wavs` as static directories. |
| Environment config | Sets `AUDIO_DIR` (`{backend}/downloads`), `MODEL_CACHE_DIR` (env `TTS_MODEL_CACHE` → `/app/.cache/tts`), `SPEAKER_WAV_DIR` (`{backend}/speaker_wavs`). |

### Model Management

| Component | Description |
|-----------|-------------|
| `lifespan()` | FastAPI lifespan handler. On startup, starts a background daemon thread that calls `load_model()`. On shutdown, logs shutdown message. |
| `load_model()` | Background thread function. Loads `tts_models/multilingual/xtts_v2` from Coqui TTS library. Sets global `model_load_status` to `"ready"` on success or `"error"` on failure. |
| Torch patches | Compatibility shims for CPU-only environments: patches `isin_mps_friendly` (removed in newer transformers) and `load_library` (suppresses libnvrtc/libcuda errors). |

### API Endpoints

| Endpoint | Method | Status Codes | Description |
|----------|--------|-------------|-------------|
| `/health` | GET | 200 | Returns `{status, model_loaded}`. Status is `"loading"`, `"ready"`, or `"error"`. |
| `/api/voices` | GET | 200 | Returns array of `{id, name}` from discovered `.wav` files in `speaker_wavs/`. |
| `/api/generate` | POST | 200, 400, 500, 503 | Generates speech from text. Returns MP3 binary via `FileResponse`. |
| `/api/history` | GET | 200, 500 | Returns array of previously generated audio files with metadata. |

### Data Models

| Model | Fields | Used By |
|-------|--------|---------|
| `SynthesisRequest` | `text` (1-3000), `language` (ar\|en), `voice`, `speaker`, `speed` (0.5-2.0), `pitch` (-4.0-4.0), `seed` (optional int) | `/api/generate` |
| `SynthesisResponse` | `audio_url`, `filename`, `duration_seconds` | **Defined but not used** — endpoint returns raw FileResponse |
| `HealthResponse` | `status`, `model_loaded` | `/health` |

### Utilities

| Function | Description |
|----------|-------------|
| `discover_voices(directory)` | Scans directory for `.wav` files. Returns `{id: name_without_ext, name: name_without_ext}`. |
| `_validate_speaker_wav(wav_path)` | Validates WAV file duration ≥ 0.33s (XTTS-v2 minimum). Raises 500 if too short. |

## API Request Flow (Synthesis)

```
POST /api/generate
    │
    ├─ 1. Validate: tts_model is not None AND status == "ready" → 503 if not
    ├─ 2. Resolve voice: speaker ?? voice ?? "female"
    ├─ 3. Generate filename: {lang}_{voice}_{uuid8}.mp3
    ├─ 4. Locate speaker WAV: speaker_wavs/{voice}.wav → 500 if not found
    ├─ 5. Validate WAV duration ≥ 0.33s → 500 if too short
    ├─ 6. Set PyTorch seed (deterministic output, default 42)
    ├─ 7. XTTS inference: tts_to_file(text, speaker_wav, language, wav_path)
    ├─ 8. ffmpeg: WAV → MP3 (192k, speed filter)
    ├─ 9. Clean up intermediate WAV file
    └─ 10. Return: FileResponse(path=mp3_path, media_type="audio/mpeg")
```

## Error Handling

| Status | Condition | Detail |
|--------|-----------|--------|
| 400 | Empty or > 3000 char text | Pydantic validation error |
| 503 | TTS model not ready | `tts_model is None or status != "ready"` |
| 500 | Speaker WAV not found | 404-style: `{voice}.wav` missing from `speaker_wavs/` |
| 500 | WAV too short (< 0.33s) | XTTS-v2 minimum duration not met |
| 500 | Generation fails | WAV file not created after inference |
| 500 | FFmpeg fails | Falls back to serving raw WAV |

## Key Design Decisions

1. **Single-file architecture** — All logic in `app.py` (~300 lines). Suitable for a focused TTS service but limits testability and extensibility.
2. **Global mutable state** — `tts_model` and `model_load_status` are module-level globals. This is intentional for the background thread pattern but makes testing harder.
3. **Two-step audio generation** — XTTS generates WAV natively; ffmpeg converts to MP3. Intermediate WAV is cleaned up after conversion.
4. **Voice resolution** — Accepts both `voice` and `speaker` fields; resolves as `speaker ?? voice ?? "female"`. Allows API evolution without breaking clients.
5. **Static file serving** — `/downloads` and `/speaker_wavs` are mounted as static directories, allowing direct file access without API calls.
