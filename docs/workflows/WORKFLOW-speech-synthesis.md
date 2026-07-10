# WORKFLOW: Speech Synthesis
**Version**: 0.1
**Date**: 2026-07-10
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Core user action — convert Arabic/English text to speech

---

## Overview
A user enters Arabic or English text, selects a voice and speed, and triggers speech synthesis. The system validates the input, generates reference audio using XTTS-v2 voice cloning, converts to MP3, plays it back, and optionally allows download. This is the **only** reason the product exists — every failure mode must be handled gracefully.

---

## Actors
| Actor | Role in this workflow |
|---|---|
| User (Customer) | Types text, selects voice/speed, clicks "Generate Speech" |
| Frontend (Nuxt/SPA) | Validates input, sends request, manages playback UI state |
| Nginx (reverse proxy) | Routes `/api/generate` to backend, handles timeouts |
| Backend (FastAPI) | Validates request, runs TTS model, returns MP3 |
| Coqui XTTS-v2 (model) | Generates audio from text + speaker reference WAV |
| FFmpeg (CLI) | Converts WAV to MP3 with speed filter |
| Browser `<audio>` element | Plays back the audio blob |

---

## Prerequisites
- TTS model is loaded and `model_load_status == "ready"` (frontend health polling confirms this)
- Speaker WAV file exists for the selected voice in `backend/speaker_wavs/`
- Speaker WAV file is ≥ 0.33 seconds (XTTS-v2 minimum)
- Disk space is available in `/app/downloads/` for output
- FFmpeg is installed and available in the backend container PATH
- Network connectivity between frontend (Nginx) and backend (FastAPI) on port 8000

---

## Trigger
**Primary**: User clicks "Generate Speech" button (desktop) or bottom panel button (mobile).
**Secondary**: User presses `Ctrl+Enter` / `Cmd+Enter` keyboard shortcut.
**API**: Direct `POST /api/generate` call (from any client).

---

## Workflow Tree

### STEP 1: Input Validation (Frontend)
**Actor**: Frontend (`useInputValidation` composable + `handleSynthesize` in `index.vue`)
**Action**: Validate text is non-empty, model is ready, text ≤ 3000 characters.
**Timeout**: N/A (synchronous, < 1ms)
**Input**: `{ text: string, modelStatus: 'loading'|'ready'|'error' }`
**Output on SUCCESS**: `{ isValid: true }` → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(empty_text)`: User hasn't entered any text → Show toast: "Please enter text to convert to speech" (no API call made)
  - `FAILURE(model_not_ready)`: Model is still loading → Show toast: "Model is loading, please wait..." (no API call made)
  - `FAILURE(text_too_long)`: Text > 3000 characters → Button disabled, char count turns red (validation happens reactively as user types)

**Observable states during this step**:
  - Customer sees: Button disabled (grayed out) if invalid; char count turns amber (≥ 80%) or red (> 3000)
  - Operator sees: Nothing — this is purely client-side validation
  - Database: No changes
  - Logs: No logs

---

### STEP 2: API Request (Frontend → Backend)
**Actor**: Frontend (`useTtsApi.synthesize()`)
**Action**: Send `POST /api/generate` with `{ text, speaker, speed, language: 'ar' }`.
**Timeout**: Nginx `proxy_read_timeout 1800s` (30 minutes — TTS on CPU can take several seconds to minutes)
**Input**: `{ text: string, speaker: string, speed: number, language: 'ar' }`
**Output on SUCCESS**: `{ audio: Blob (MP3 binary) }` → GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(connection_error)`: Backend unreachable → Frontend throws "Unable to connect to the server" → Show error toast → ABORT (no cleanup needed)
  - `FAILURE(503_model_not_ready)`: Backend model still loading → Frontend throws "Server is currently unavailable" → Show error toast → ABORT (model will eventually load; user can retry)
  - `FAILURE(400_invalid_text)`: Backend rejects text (shouldn't reach here — frontend validates) → Frontend throws "Invalid text for synthesis" → Show error toast → ABORT
  - `FAILURE(500_speaker_not_found)`: Speaker WAV file missing for selected voice → Backend throws 500 → Frontend shows server error toast → ABORT (no cleanup needed — no files created yet)
  - `FAILURE(500_speaker_too_short)`: Speaker WAV < 0.33s → Backend throws 500 with detail → Frontend shows server error toast → ABORT
  - `FAILURE(500_generation_failed)`: XTTS model produced no output file → Backend throws 500 → Frontend shows server error toast → ABORT
  - `FAILURE(500_ffmpeg_failed)`: FFmpeg conversion fails → Backend falls back to WAV copy → Returns MP3 anyway (content-type is `audio/mpeg`) → Success, but file may be WAV with .mp3 extension

**Observable states during this step**:
  - Customer sees: Generate button shows "Processing Model..." with spinner (`.generate-btn .loading-state`). Button is disabled.
  - Operator sees: Backend log: `"Generating speech: {text[:50]}..."`
  - Database: No changes (intermediate WAV not persisted yet)
  - Logs: `[backend] Generating speech: ...`

---

### STEP 3: Audio Playback (Frontend)
**Actor**: Frontend (`useAudioModule.load()` → `audioModule.play()`)
**Action**: Create `URL.createObjectURL(blob)`, set as `<audio>` element source, call `.play()`.
**Timeout**: N/A (synchronous blob handling, < 100ms)
**Input**: `{ audioBlob: Blob (MP3) }`
**Output on SUCCESS**: Audio plays, waveform canvas animates, AudioPlayerPanel slides up → GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(browser_blocked_autoplay)`: Browser policy blocks autoplay → `audio.play()` throws → Frontend catches, sets `error.value = "Unable to play audio: {message}"` → Show error toast → Panel does NOT slide up (user must manually press play)
  - `FAILURE(invalid_audio_format)`: Browser cannot decode the blob → `audio.error` event fires → Frontend shows "Failed to load audio" toast → Panel does NOT slide up

**Observable states during this step**:
  - Customer sees: Generate button returns to normal state ("Generate Speech" with play icon). AudioPlayerPanel slides up from bottom with waveform animation. Audio plays automatically (if browser allows).
  - Operator sees: Backend log: (nothing — generation is complete)
  - Database: Intermediate WAV file exists briefly on disk (see cleanup)
  - Logs: (no new logs)

---

### STEP 4: Audio Persistence (Backend — side effect)
**Actor**: Backend (implicit, not a separate step — happens during STEP 2)
**Action**: XTTS generates `.wav` file in `/app/downloads/`, FFmpeg converts to `.mp3`, intermediate `.wav` is deleted.
**Timeout**: N/A (happens as part of synthesis)
**Input**: `{ text, speaker_wav, language, speed, seed }`
**Output on SUCCESS**: `{ mp3_path: string }` → File persisted in `/app/downloads/`
**Output on FAILURE**:
  - `FAILURE(no_output_wav)`: XTTS didn't produce output file → Backend throws 500 "Failed to generate audio" → No files persisted → Frontend error toast
  - `FAILURE(ffmpeG_failed)`: FFmpeg fails → Backend copies WAV to `.mp3` path → File persisted but may be WAV content with `.mp3` extension → Frontend receives valid blob (fallback is intentional)
  - `FAILURE(wav_cleanup_failed)`: Intermediate `.wav` deletion fails (race condition) → File left on disk → No user-visible impact (cleanup is fire-and-forget with `try/except`)

**Observable states during this step**:
  - Customer sees: (nothing — this is invisible backend work)
  - Operator sees: `/app/downloads/` grows by ~5–50 MB per generation (MP3) + temporary WAV (5–10× MP3 size, deleted immediately)
  - Database: MP3 file exists in `tts-audio-cache` volume — **never cleaned up** (known limitation)
  - Logs: `[backend] FFmpeg error: ...` (only if FFmpeg fails, then fallback activates)

---

### STEP 5: User Interaction with Generated Audio
**Actor**: User (Customer)
**Action**: User can play/pause, seek, download, or close the player panel.
**Timeout**: N/A (interactive)
**Input**: User gestures (click play, drag waveform, click download, click close)
**Output on SUCCESS**: Various — playback, seek position, file download, panel dismissal
**Output on FAILURE**:
  - `FAILURE(download_fails)`: `URL.createObjectURL` on blob fails (rare, memory pressure) → `download()` returns silently (no error shown — graceful degradation)
  - `FAILURE(audio_element_disposed)`: User closes panel while audio is playing → `audioModule.pause()` called → Audio stops → Panel slides down

**Observable states during this step**:
  - Customer sees: Play/pause button, seekable waveform, download button, close button. Panel slides down when closed.
  - Operator sees: (nothing — purely client-side)
  - Database: No changes
  - Logs: No logs

---

### ABORT_CLEANUP: Synthesis Failure Recovery
**Triggered by**: Any failure in STEP 2 (API call) that results in no audio being returned.
**Actions** (in order):
  1. Frontend shows error toast with appropriate message
  2. Frontend resets `isGenerating.value = false` (button returns to normal state)
  3. Frontend does NOT show AudioPlayerPanel (no audio to display)
  4. Backend: If XTTS produced a `.wav` file but FFmpeg failed, the WAV is copied as `.mp3` (intentional fallback — not a cleanup case)
  5. Backend: If XTTS produced a `.wav` file and FFmpeg succeeded, the `.wav` is deleted (normal path — not a cleanup case)
  6. Backend: If XTTS failed to produce any output, no files exist — no cleanup needed

**What customer sees**: Error toast at top-center (red), button returns to "Generate Speech" state, no audio panel appears.

**What operator sees**: Backend log with error detail. `/app/downloads/` may contain orphaned `.wav` files if XTTS produced output but FFmpeg path was never reached (extremely rare — would require process kill between WAV creation and MP3 conversion).

---

## State Transitions
```
[Idle: no audio]
  → (user triggers synthesis, all steps succeed) → [Playing: audio loaded, playing]
  → (user triggers synthesis, API fails) → [Idle: error toast shown]
  → (user triggers synthesis, playback blocked) → [Idle: error toast shown, button normal]
  → (user clicks download) → [Idle: file downloaded to browser]
  → (user closes player) → [Idle: panel hidden, audio paused]
  → (user plays/pauses) → [Playing] ↔ [Paused]
```

---

## Handoff Contracts

### Frontend → Nginx (Reverse Proxy)
**Endpoint**: `POST /api/generate` (via Nginx proxy)
**Payload**:
```json
{
  "text": "string (1-3000 chars) — Arabic or English text to synthesize",
  "speaker": "string — voice ID matching a .wav file in speaker_wavs/",
  "speed": "number (0.5–2.0) — playback speed multiplier",
  "language": "string — always 'ar' from frontend (backend accepts 'ar' | 'en')"
}
```
**Success response**: `audio/mpeg` (binary MP3 blob, no JSON wrapper)
**Failure response**: `application/json` with `{ "detail": "error message" }` + HTTP status code
**Timeout**: 1800s (30 minutes) — configured in Nginx `proxy_read_timeout`
**On timeout**: Nginx returns 504 Gateway Timeout → Frontend catches network error → Shows "Unable to connect to the server" toast

### Nginx → Backend (FastAPI)
**Endpoint**: `POST /api/generate` (internal, port 8000)
**Payload**: Same as above (Nginx does not transform)
**Success response**: `audio/mpeg` binary (Nginx `proxy_buffering off` — streaming)
**Failure response**: `application/json` `{ "detail": "..." }` with appropriate HTTP status
**Timeout**: 1800s (Nginx `proxy_read_timeout`) → 504 Gateway Timeout
**On timeout**: 504 → Frontend treats as connection error

### Backend → Coqui XTTS-v2 (Model)
**Endpoint**: In-process Python call (`tts_model.tts_to_file()`)
**Payload**: `{ text, speaker_wav: path, language, file_path: path, temperature: 0.4 }`
**Success response**: `.wav` file written to `{AUDIO_DIR}/{lang}_{voice}_{timestamp}.wav`
**Failure response**: Raises `Exception` → caught by FastAPI → returns 500
**Timeout**: No explicit timeout — runs until completion (can take 10s–5min on CPU)
**On timeout/failure**: 500 "Failed to generate audio" if no `.wav` file produced

### Backend → FFmpeg (CLI)
**Endpoint**: `subprocess.run(["ffmpeg", ...])` (in-process)
**Payload**: `{ input: .wav path, speed filter, output: .mp3 path }`
**Success response**: `.mp3` file written to `{AUDIO_DIR}/{lang}_{voice}_{timestamp}.mp3`
**Failure response**: Raises `subprocess.CalledProcessError` → caught → WAV copied to `.mp3` path (fallback)
**Timeout**: No explicit timeout — runs until completion
**On failure**: WAV file is copied to `.mp3` path (intentional fallback — user gets audio, just may be WAV content)

---

## Cleanup Inventory
| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Intermediate WAV file | Step 2 (XTTS generation) | Step 2 (FFmpeg success) | `os.remove(wav_path)` (fire-and-forget) |
| Output MP3 file | Step 2 (FFmpeg conversion) | — | **Never cleaned up** (known limitation — `tts-audio-cache` volume grows indefinitely) |
| Blob URL (frontend) | Step 3 (`URL.createObjectURL`) | Step 5 (panel close) / Page unload | `URL.revokeObjectURL()` in `audioModule.dispose()` |
| Generated audio history entry | Step 2 (file persisted) | — | **Never cleaned up** (known limitation) |

---

## Reality Checker Findings
| # | Finding | Severity | Spec section | Resolution |
|---|---|---|---|---|
| RC-1 | Backend does NOT store original text with generated audio — `text: ""` always in history response | High | STEP 4 | `get_history()` parses metadata from filename only (language, voice). Original text is lost. This means `/api/history` cannot tell the user what text was synthesized for each file. |
| RC-2 | `SynthesisResponse` Pydantic model (audio_url, filename, duration_seconds) is defined but **never used** — endpoint returns `FileResponse` directly | Medium | STEP 2 | Dead code. The model exists but the endpoint doesn't use it. |
| RC-3 | Speaker WAV files in Docker are mounted from `./backend/speaker_wavs` on host — but the actual files are named `"KSA Hamed - Male.wav"` and `"KSA Zariyah - Female.wav"`, while the `generate_speaker_wavs.py` script generates `female.wav` and `male.wav` | High | STEP 2 voice resolution | The voice resolution logic (`speaker ?? voice ?? "female"`) defaults to `"female"`, but the actual WAV files are `"KSA Hamed - Male"` and `"KSA Zariyah - Female"`. If a user selects the default voice, the app looks for `"female.wav"` which doesn't exist → 500 error. **This is a critical mismatch between default behavior and actual files.** |
| RC-4 | FFmpeg fallback copies WAV to `.mp3` extension — browser may not decode WAV content served as `audio/mpeg` | Medium | STEP 2 failure modes | Browsers are generally lenient with content-type mismatches, but some may fail to decode. The fallback is intentional but risky. |
| RC-5 | No rate limiting on `/api/generate` — any user can trigger unlimited synthesis, consuming CPU and disk | Medium | STEP 2 | No rate limiting exists. A single user (or bot) could fill the `tts-audio-cache` volume indefinitely. |
| RC-6 | `seed` parameter defaults to 42 per-request but is optional in the API — frontend does NOT send `seed` | Low | STEP 2 | Frontend `useTtsApi.synthesize()` never sends `seed`, so the backend always uses default 42. Deterministic output is guaranteed but the frontend never exercises the seed feature. |

---

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path | Valid text, model ready, valid voice, FFmpeg works | MP3 returned, audio plays, panel slides up |
| TC-02: Empty text | User clicks with no text entered | Button disabled, toast: "Please enter text to convert to speech" |
| TC-03: Model loading | User clicks during model load | Button disabled (via `modelStatus === 'loading'`), toast: "Model is loading, please wait..." |
| TC-04: Text too long | User enters > 3000 chars | Char count turns red, button disabled |
| TC-05: Backend unreachable | Network failure | Frontend throws "Unable to connect to the server", toast shown, button returns to normal |
| TC-06: Model not ready (503) | API called while model still loading | Backend returns 503, frontend shows "Server is currently unavailable", toast shown |
| TC-07: Speaker WAV not found | Selected voice has no `.wav` file | Backend returns 500, frontend shows server error toast |
| TC-08: Speaker WAV too short | WAV file < 0.33s | Backend returns 500 with detail message, frontend shows server error toast |
| TC-09: XTTS generation fails | XTTS produces no output file | Backend returns 500 "Failed to generate audio", no files persisted, frontend shows error |
| TC-10: FFmpeg fails | FFmpeg binary missing or fails | Backend copies WAV to `.mp3`, returns MP3 (fallback), frontend plays audio |
| TC-11: Browser autoplay blocked | Browser policy blocks `.play()` | Frontend catches error, shows toast, panel does NOT slide up, user must manually press play |
| TC-12: Keyboard shortcut | User presses Ctrl+Enter | Same as clicking Generate Speech button |
| TC-13: Download | User clicks download button | File downloaded with timestamped filename, no error shown even if it fails silently |
| TC-14: Close while playing | User closes player panel while audio plays | Audio pauses, panel slides down |
| TC-15: Voice resolution | User selects "KSA Hamed - Male" | Backend resolves to `speaker_wavs/KSA Hamed - Male.wav` (note: spaces in filename) |
| TC-16: Default voice fallback | User doesn't select a voice | Frontend auto-selects first voice from `/api/voices` list |

---

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | FFmpeg is installed in the backend Docker image | Backend Dockerfile (verified: `apt-get install ffmpeg`) | Low — confirmed in Dockerfile |
| A2 | Speaker WAV files are mounted from host `./backend/speaker_wavs` into container at `/app/speaker_wavs` | `docker-compose.yml` volumes (verified) | Low — confirmed in compose file |
| A3 | XTTS-v2 model loads in ~120 seconds on CPU-only hardware | Docker health check `start_period: 120s`, 200 retries at 15s (verified) | Medium — could be longer on slow hardware |
| A4 | Frontend health polling (every 2s, max 10 retries) will always find the model ready before user attempts generation | Frontend `useHealthPoll` (verified: 20s max polling window) | **Critical** — 20s polling window is much shorter than 120s model load. User could attempt synthesis before model is ready, getting 503. The frontend guard (`modelStatus === 'loading'` → button disabled) prevents this, but only if health polling catches up in time. |
| A5 | Generated MP3 files in `tts-audio-cache` are never cleaned up | Backend `get_history()` lists all files (verified: no cleanup logic) | High — volume grows indefinitely, could fill disk |
| A6 | The `generate_speaker_wavs.py` script and the actual deployed WAV files use the same naming convention | **NOT verified** — script generates `female.wav`/`male.wav`, deployed files are `KSA Hamed - Male.wav`/`KSA Zariyah - Female.wav` | **Critical** — see RC-3 |

---

## Open Questions
- What happens if the `tts-audio-cache` volume fills up during generation? Does XTTS fail gracefully, or does it corrupt existing files?
- Should `/api/history` return the original text? Currently it always returns `text: ""`.
- Is there a plan to clean up old audio files from the cache? The volume grows without bound.
- Why does the frontend hardcode `language: 'ar'` in `useTtsApi.synthesize()` when the API accepts `'en'` too?

---

## Spec vs Reality Audit Log
| Date | Finding | Action taken |
|---|---|---|
| 2026-07-10 | Initial spec created from codebase analysis | — |
| 2026-07-10 | RC-3: Default voice name mismatch discovered | Flagged as Critical — needs immediate fix |
