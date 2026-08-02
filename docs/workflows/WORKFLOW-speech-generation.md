# WORKFLOW: Speech Generation Pipeline

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: POST /api/generate — text → MP3 audio synthesis

---

## Overview

A customer inputs Arabic (or English) text, selects a voice, adjusts speed, and clicks "Generate Speech." The frontend sends a POST request to `/api/generate`. The backend validates the request, checks model readiness, generates WAV audio via Coqui XTTS-v2, converts to MP3 via FFmpeg, writes a metadata sidecar, and returns the MP3 as a binary response. The frontend receives a Blob, creates an object URL, and plays the audio.

This is a multi-step pipeline with intermediate file creation, cleanup on partial failure, and several failure modes at each step.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Customer | Initiates synthesis via UI (textarea + voice selector + speed slider + generate button) |
| Frontend (index.vue) | Orchestrates the synthesis request, displays loading state, shows toast on success/error |
| Frontend (useTtsApi) | Makes HTTP POST to `/api/generate`, returns Blob |
| Nginx | Proxies request to backend; disables buffering; 1800s timeout |
| FastAPI (app.py) | Validates request, checks model readiness, generates audio, returns FileResponse |
| Coqui XTTS-v2 | Generates WAV audio from text + speaker reference |
| FFmpeg | Converts WAV to MP3 (192k bitrate, speed filter) |
| Filesystem (`/downloads/`) | Stores generated MP3 + metadata sidecar (.json) |
| Frontend (useAudioModule) | Receives Blob, creates object URL, wires to `<audio>` element, auto-plays |

---

## Prerequisites

- TTS model is loaded and ready (`model_load_status == "ready"`)
- Speaker WAV file exists in `speaker_wavs/` for selected voice
- Speaker WAV duration >= 0.33s (XTTS-v2 minimum)
- FFmpeg is installed and available in the backend container
- `/downloads/` directory is writable
- Frontend is loaded and connected to backend

---

## Trigger

Customer clicks "Generate Speech" button in the UI (or presses Ctrl+Enter).

Frontend calls `handleSynthesize()` → `useTtsApi().synthesize()` → `POST /api/generate`.

---

## Workflow Tree

### STEP 1: Request Validation (Frontend)
**Actor**: Frontend (`useInputValidation()`)
**Action**: Checks text is non-empty and model is ready; disables button if invalid
**Timeout**: N/A (synchronous)
**Input**: `{ textInput: string, modelStatus: 'loading' | 'ready' | 'error' }`
**Output on SUCCESS**: `{ isValid: true }` → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(empty_text)`: Text is empty → show toast "Please enter text to convert to speech" → ABORT (no API call)
  - `FAILURE(model_not_ready)`: Model is loading or in error → show toast "Model is loading, please wait..." → ABORT (no API call)

**Observable states during this step**:
- Customer sees: Button disabled (if empty text or model not ready); or button enabled (if valid)
- Operator sees: N/A (client-side validation)
- Database: N/A
- Logs: N/A

---

### STEP 2: HTTP Request to Backend
**Actor**: Frontend (`useTtsApi().synthesize()`)
**Action**: Sends `POST /api/generate` with JSON body `{ text, speaker, speed, seed }`
**Timeout**: 1800s (Nginx `proxy_read_timeout` for `/api/*`)
**Input**: `{ text: string (1-3000), speaker: string, speed: number (0.5-2.0), seed: number (default 42) }`
**Output on SUCCESS**: HTTP 200 with `audio/mpeg` binary → GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(network_error)`: Cannot connect to server → throw "Unable to connect to the server" → GO TO STEP 5 (error handling)
  - `FAILURE(http_503)`: Model not ready → throw "TTS model not ready" → GO TO STEP 5
  - `FAILURE(http_400)`: Pydantic validation error → throw `{ detail }` → GO TO STEP 5
  - `FAILURE(http_500)`: Backend error (speaker not found, generation failed, FFmpeg failed) → throw `{ detail }` → GO TO STEP 5

**Observable states during this step**:
- Customer sees: Button shows "Processing Model..." (loading state, spinner); button disabled
- Operator sees: Nginx logs request; backend logs `"Generating speech: {text[:50]}..."`
- Database: N/A
- Logs: `"Generating speech: {text[:50]}..."` (backend)

---

### STEP 3: Backend Validation
**Actor**: FastAPI (Pydantic + business logic)
**Action**: Validates request fields (`text` 1-3000 chars, `language` ar|en, `speed` 0.5-2.0, `pitch` -4.0-4.0); checks model is ready; resolves speaker WAV path
**Timeout**: N/A (synchronous, < 1s)
**Input**: `{ text, language, speaker, speed, pitch, seed }`
**Output on SUCCESS**: Speaker WAV path resolved → GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(model_not_ready)`: `model_load_status != "ready"` → HTTP 503 "TTS model not ready" → GO TO STEP 5
  - `FAILURE(speaker_not_found)`: WAV file not in `speaker_wavs/` → HTTP 500 "Speaker WAV file not found for voice '{voice}'" → GO TO STEP 5
  - `FAILURE(speaker_too_short)`: WAV duration < 0.33s → HTTP 500 "Speaker WAV file is too short (minimum 0.33s)" → GO TO STEP 5
  - `FAILURE(validation_error)`: Pydantic Field constraints violated → HTTP 400 → GO TO STEP 5

**Observable states during this step**:
- Customer sees: Loading spinner continues (button disabled)
- Operator sees: Backend logs validation errors (if any)
- Database: N/A
- Logs: `"Generating speech: {text[:50]}..."`

---

### STEP 4: Audio Generation (XTTS-v2)
**Actor**: FastAPI (calls `model.tts_to_file()`)
**Action**: Generates WAV audio using XTTS-v2 with speaker reference, language, and deterministic seed (PyTorch `manual_seed(seed)`)
**Timeout**: Variable (seconds to minutes, depends on text length and CPU speed)
**Input**: `{ text, speaker_wav, language, file_path=wav_path, temperature=0.4 }`
**Output on SUCCESS**: WAV file created in `/downloads/` → GO TO STEP 5
**Output on FAILURE**:
  - `FAILURE(no_output)`: WAV file not created → HTTP 500 "Failed to generate audio" → GO TO ABORT_CLEANUP

**Observable states during this step**:
- Customer sees: Loading spinner continues (no progress indicator)
- Operator sees: Backend logs `"Generating speech: {text[:50]}..."`; model CPU usage high
- Database: N/A
- Logs: `"Generating speech: {text[:50]}..."`

**Resources created**: Intermediate WAV file at `/downloads/{lang_code}_{voice}_{timestamp}.wav`

---

### STEP 5: Audio Conversion (FFmpeg)
**Actor**: FastAPI (subprocess call to FFmpeg)
**Action**: Converts WAV to MP3 (192k bitrate, speed filter applied)
**Timeout**: Variable (seconds, depends on WAV duration)
**Input**: `{ wav_path, mp3_path, speed }`
**Output on SUCCESS**: MP3 file created in `/downloads/` → GO TO STEP 6
**Output on FAILURE**:
  - `FAILURE(ffmpeg_error)`: FFmpeg conversion fails → HTTP 500 "Failed to encode audio — FFmpeg conversion error" → GO TO ABORT_CLEANUP

**Observable states during this step**:
- Customer sees: Loading spinner continues (no progress indicator)
- Operator sees: Backend logs `"FFmpeg error: {stderr}"`
- Database: N/A
- Logs: `"FFmpeg error: {stderr}"`

**Resources created**: MP3 file at `/downloads/{lang_code}_{voice}_{timestamp}.mp3`

---

### STEP 6: Cleanup Intermediate Files
**Actor**: FastAPI (post-generation)
**Action**: Deletes intermediate WAV file (5–10× larger than MP3)
**Timeout**: N/A (synchronous)
**Input**: `{ wav_path }`
**Output on SUCCESS**: WAV file deleted; only MP3 + .json remain → GO TO STEP 7
**Output on FAILURE**: OSError (file already gone, e.g., race condition) → ignored (best effort)

**Observable states during this step**:
- Customer sees: Loading spinner continues
- Operator sees: Backend logs `"Cleaned up intermediate file: {wav_path}"`
- Database: N/A
- Logs: `"Cleaned up intermediate file: {wav_path}"`

---

### STEP 7: Write Metadata Sidecar
**Actor**: FastAPI (post-generation)
**Action**: Writes JSON metadata alongside MP3 (`{filename}.json`)
**Timeout**: N/A (synchronous)
**Input**: `{ text, language, voice, speed, pitch, seed, created_at }`
**Output on SUCCESS**: `.json` file created → GO TO STEP 8
**Output on FAILURE**: OSError (directory not writable) → ignored (non-fatal; history falls back to filename parsing)

**Observable states during this step**:
- Customer sees: Loading spinner continues
- Operator sees: Backend logs nothing on success; errors are silently ignored
- Database: N/A
- Logs: (none on success)

---

### STEP 8: Return MP3 to Frontend
**Actor**: FastAPI (`FileResponse`)
**Action**: Returns MP3 file as `audio/mpeg` binary response
**Timeout**: N/A (streaming response)
**Input**: `{ mp3_path }`
**Output on SUCCESS**: HTTP 200 with `audio/mpeg` body → GO TO STEP 9 (frontend receives Blob)
**Output on FAILURE**: N/A (FileResponse should not fail if file exists)

**Observable states during this step**:
- Customer sees: Loading spinner continues (response streaming)
- Operator sees: Nginx logs response; backend logs nothing
- Database: N/A
- Logs: (none)

---

### STEP 9: Frontend Receives Blob
**Actor**: Frontend (`useTtsApi().synthesize()` returns Blob)
**Action**: Converts response to Blob → returns to `handleSynthesize()`
**Timeout**: N/A (synchronous)
**Input**: `{ Blob }`
**Output on SUCCESS**: Blob returned → GO TO STEP 10
**Output on FAILURE**: N/A (Blob always created from response)

**Observable states during this step**:
- Customer sees: Loading spinner continues (Blob processing)
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 10: Frontend Audio Playback
**Actor**: Frontend (`index.vue` → `audioModule.load(blob)` → `audioModule.play()`)
**Action**: Creates object URL from Blob, wires to `<audio>` element, plays audio, shows AudioPlayerPanel
**Timeout**: N/A (synchronous, except `nextTick()` for DOM settling)
**Input**: `{ Blob }`
**Output on SUCCESS**: Audio plays; AudioPlayerPanel slides up; waveform renders → WORKFLOW COMPLETE
**Output on FAILURE**:
  - `FAILURE(audio_error)`: `<audio>` element error → show toast "An error occurred during playback" → GO TO STEP 5 (error handling)

**Observable states during this step**:
- Customer sees: Loading spinner disappears; AudioPlayerPanel slides up from bottom; audio starts playing; waveform renders
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 5 (Error Handling — All Failure Modes): Show Error Toast
**Actor**: Frontend (`index.vue` → `handleSynthesize()` catch block)
**Action**: Catches error, calls `showToast(err.message, 'error')`, sets `isGenerating = false`
**Timeout**: N/A (synchronous)
**Input**: `{ Error }`
**Output on SUCCESS**: Error toast shown; button re-enabled → WORKFLOW ABORTED (error)
**Output on FAILURE**: N/A (showToast should not fail)

**Observable states during this step**:
- Customer sees: Error toast appears (red icon, 5s auto-dismiss); button re-enabled ("Generate Speech")
- Operator sees: N/A
- Database: N/A
- Logs: (none — frontend errors not logged to server)

---

### ABORT_CLEANUP: Partial Failure Recovery
**Triggered by**: STEP 4 (XTTS failure — no WAV output), STEP 5 (FFmpeg failure)
**Actions** (in order):
  1. Delete intermediate files listed in `intermediate_files` (WAV file, if not yet deleted)
  2. Return HTTP 500 to frontend with error detail
  3. Frontend catches error, shows toast, re-enables button

**What customer sees**: Error toast (red icon); button re-enabled ("Generate Speech")
**What operator sees**: Backend logs error detail; no MP3 or .json created (failed request leaves no filesystem trace)

**Resources created by this workflow that must be destroyed on failure**:
| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Intermediate WAV file | STEP 4 (XTTS output) | ABORT_CLEANUP | `os.remove(wav_path)` (in `finally` block) |
| MP3 file | STEP 5 (FFmpeg output) | ABORT_CLEANUP | **NOT CLEANED UP** — if FFmpeg creates MP3 but fails (unlikely), MP3 is orphaned |
| Metadata sidecar (.json) | STEP 6 | ABORT_CLEANUP | **NOT CLEANED UP** — if STEP 6 runs but STEP 7 fails (FileResponse), .json is orphaned |

**NOTE**: The `intermediate_files` list is managed correctly in the `finally` block. However, the MP3 file and .json sidecar are NOT added to the cleanup list. If FFmpeg succeeds but FileResponse fails (extremely unlikely), or if the OS crashes mid-write, orphaned files may remain. The daily cleanup endpoint (`/api/cleanup`) handles this as a fallback.

---

## State Transitions

```
[Idle] -> (valid input) -> [Generating]
[Generating] -> (all steps succeed) -> [Generated] (audio plays)
[Generating] -> (any step fails) -> [Error] (toast shown, button re-enabled)
[Generated] -> (user plays) -> [Playing] -> [Paused] | [Ended]
```

---

## Handoff Contracts

### Frontend → Backend: Speech Generation (`POST /api/generate`)
**Endpoint**: `POST /api/generate`
**Payload**:
```json
{
  "text": "string (1-3000 characters, Arabic or English)",
  "language": "ar" | "en" — default "ar",
  "speaker": "string (voice ID, e.g., 'KSA Hamed - Male')" | null,
  "speed": "number (0.5-2.0)" | 1.0,
  "pitch": "number (-4.0-4.0)" | 0.0,
  "seed": "integer (deterministic seed)" | 42
}
```
**Success response**: `audio/mpeg` binary (FileResponse, not JSON)
**Failure response**:
```json
{
  "detail": "string (descriptive error message)"
}
```
**Status codes**: 400 (validation), 503 (model not ready), 500 (various failures)
**Timeout**: 1800s (Nginx proxy_read_timeout for /api/*)
**On Failure**: Frontend catches error, shows toast, re-enables button

---

### Backend → Frontend: MP3 Response
**Endpoint**: `POST /api/generate` (response)
**Payload**: `audio/mpeg` binary (MP3, 192k bitrate)
**Success**: HTTP 200 with binary body
**Failure**: HTTP 400/500/503 with JSON error detail
**Timeout**: 1800s (Nginx proxy_read_timeout)
**On Success**: Frontend receives Blob → `audioModule.load(blob)` → auto-plays

---

### Backend Internal: File System Handoff
**From**: FastAPI (POST /api/generate)
**To**: Filesystem (`/downloads/`)
**Payload**: MP3 file + `.json` sidecar
**Success**: MP3 + .json files in `/downloads/`
**Failure**: No files created (ABORT_CLEANUP handles intermediate WAV)
**Cleanup**: Files older than 24h removed by `/api/cleanup` (dedicated) or `/api/history?cleanup=true` (inline)

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Intermediate WAV file | STEP 4 | STEP 6 (success) or ABORT_CLEANUP (failure) | `os.remove(wav_path)` |
| MP3 file | STEP 5 | Never (retained) | `/api/cleanup` (after 24h) |
| Metadata sidecar (.json) | STEP 7 | Never (retained) | `/api/cleanup` (after 24h, alongside MP3) |

---

## Reality Checker Findings

| # | Finding | Severity | Spec section affected | Resolution |
|---|---------|----------|----------------------|------------|
| RC-1 | The `finally` block cleans up `intermediate_files` (WAV), but does NOT clean up the MP3 or .json sidecar if they were created before the failure. If FFmpeg creates the MP3 but a subsequent error occurs (e.g., OSError writing .json), the MP3 is orphaned. | **Medium** | ABORT_CLEANUP | The daily cleanup endpoint handles orphaned files, but a failed request leaves an MP3 + .json pair in `/downloads/`. Consider adding MP3 and .json to the `intermediate_files` list (in addition to WAV) so they are cleaned up on any failure. |
| RC-2 | The `SynthesisResponse` Pydantic model is defined but never used. The endpoint returns `FileResponse` (binary MP3), not JSON. This is intentional but means the frontend cannot get structured metadata (filename, duration) from the response. | **Low** | STEP 8, Handoff Contracts | Frontend must parse the filename from the Content-Disposition header (if present) or generate its own filename (`tts_output_{Date.now()}.mp3` for download). Duration is not returned — frontend calculates it from the `<audio>` element's `duration` property after loading. |
| RC-3 | The seed parameter is hardcoded to 42 in `index.vue:129` (`seed: 42`), not exposed to the user. This means every synthesis with the same text + voice produces identical audio (deterministic). This is a feature, not a bug, but is undocumented. | **Low** | STEP 2 (Input) | Seed is not user-configurable. If non-deterministic output is desired, the seed must be exposed in the UI. |
| RC-4 | FFmpeg conversion is explicitly disabled from falling back to WAV serving. If FFmpeg fails, the request returns 500 (not a WAV labeled as MP3). This is correct behavior. | **None** | STEP 5 | Confirmed: FFmpeg failure → 500, no WAV fallback. |
| RC-5 | The `/downloads/` directory is shared between all requests (no per-request subdirectory). If two requests generate the same `{lang_code}_{voice}_{timestamp}` filename (extremely unlikely with UUID4 hex), the second request overwrites the first. | **Low** | STEP 3 (Input) | Timestamp is `uuid4().hex[:8]` (16 hex chars = 2^64 possible values). Collision probability is negligible. |

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: Happy path | Valid text, model ready, FFmpeg works | MP3 returned, audio plays, toast success |
| TC-02: Empty text | No text entered | Button disabled; toast "Please enter text to convert to speech" |
| TC-03: Model loading | Model status = "loading" | Button disabled; toast "Model is loading, please wait..." |
| TC-04: Model not ready (503) | Model in error state | HTTP 503; toast "TTS model not ready" |
| TC-05: Speaker not found | Selected voice has no WAV file | HTTP 500; toast "Speaker WAV file not found for voice '{voice}'" |
| TC-06: Speaker WAV too short | WAV duration < 0.33s | HTTP 500; toast "Speaker WAV file is too short (minimum 0.33s)" |
| TC-07: XTTS generation fails | No WAV output from TTS | HTTP 500; intermediate WAV cleaned up; toast "Failed to generate audio" |
| TC-08: FFmpeg fails | FFmpeg conversion error | HTTP 500; intermediate WAV cleaned up; toast "Failed to encode audio — FFmpeg conversion error" |
| TC-09: Network error | Backend unreachable | Frontend throws "Unable to connect to the server"; toast shown |
| TC-10: Text too long | Text > 3000 characters | Pydantic validation error (400); toast with validation message |
| TC-11: Speed out of range | Speed < 0.5 or > 2.0 | Pydantic validation error (400) |
| TC-12: Successful playback | All steps succeed, audio plays | AudioPlayerPanel slides up; waveform renders; audio plays |
| TC-13: Playback error | `<audio>` element error | Toast "An error occurred during playback" |
| TC-14: Keyboard shortcut | Ctrl+Enter pressed | Same as clicking generate button |
| TC-15: Clear text | Clear button clicked | Text input cleared; char count resets to 0 |
| TC-16: Download | Download button clicked | MP3 downloaded as `tts_output_{timestamp}.mp3` |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | XTTS-v2 generates WAV in seconds to minutes (CPU-only) | `app.py:388-394` | Long generation times risk hitting 1800s Nginx timeout for very long text |
| A2 | FFmpeg is always available in the backend container | `Dockerfile` installs ffmpeg | Without FFmpeg, all generation fails with 500 |
| A3 | `uuid4().hex[:8]` produces unique filenames across concurrent requests | Python `uuid4` | Collision probability is ~2^-64; effectively zero |
| A4 | The `temperature=0.4` parameter produces consistent, deterministic voice output | `app.py:393` | Higher temperature = more variation; lower = more robotic. 0.4 is a design choice. |
| A5 | The seed parameter (hardcoded to 42) produces deterministic audio across runs | `app.py:376-386` | Without seed, XTTS-v2 produces different output each run (non-deterministic) |
| A6 | The frontend `<audio>` element supports MP3 playback in all target browsers | HTML5 spec | Some browsers (e.g., Firefox) may have MP3 licensing issues; WAV fallback is explicitly disabled |
| A7 | Blob URLs created by `URL.createObjectURL()` are properly revoked on `dispose()` | `useAudioModule.ts:26-33` (`revokeAll()`) | Without disposal, memory leak from unreleased object URLs |

---

## Open Questions

1. Should the seed parameter be exposed to the user? (Currently hardcoded to 42.)

2. Should the frontend receive structured metadata (filename, duration) alongside the binary MP3? (Currently: no — `SynthesisResponse` model is defined but unused.)

3. What happens if the frontend tab is closed during generation? (The request continues on the backend; the MP3 is orphaned in `/downloads/`.)

4. Should the UI show a progress indicator during the multi-step generation? (Currently: no — just a spinner.)

5. What is the maximum text length that produces acceptable audio quality? (API limit is 3000 chars, but XTTS-v2 may have its own limits.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `backend/app.py:334-473` and `frontend/app/pages/index.vue:115-150` | Documented RC-1 (MP3/orphaned files not cleaned on failure), RC-2 (SynthesisResponse unused), RC-4 (FFmpeg no fallback) |
