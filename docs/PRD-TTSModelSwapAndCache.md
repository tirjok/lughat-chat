# PRD: Replace XTTS-v2 with Chatterbox Multilingual TTS + Synthesis Cache

**Status:** Draft
**Date:** 2026-08-12
**Related:** ADR-007 (Replace XTTS-v2 with Chatterbox Multilingual TTS)

---

## Problem Statement

The Language Learning Platform's TTS Studio generates Arabic speech using Coqui XTTS-v2, a voice-cloning model (~2GB) that consumes significant CPU resources during inference. Users generate speech very frequently — repeating lesson content, vocabulary, and dialogues — and the current model causes excessive CPU load (fan noise, heat) during each synthesis. The 600-character text inputs take several seconds per request, and there is no mechanism to avoid re-generating audio for text that has already been synthesized. The speaker WAV file management (voice cloning pipeline) adds operational overhead with no benefit, since users select from two fixed voices rather than cloning arbitrary ones.

## Solution

Replace the XTTS-v2 Synthesis Model with Chatterbox Multilingual TTS (0.5B parameters, 23 languages including Arabic), a non-cloning model that delivers clear and correct Arabic pronunciation with significantly lower CPU usage and faster inference (1-3s vs several seconds). Remove the Voice Cloning pipeline and Speaker WAV Files entirely, replacing them with Chatterbox's built-in Arabic voices. Add a Synthesis Cache that stores previously generated audio in `downloads/`, keyed by a SHA-256 hash of the composite input (`text + language + voice + speed`), eliminating redundant CPU inference for repeated requests — critical since users generate speech very frequently and often repeat the same lesson content.

## User Stories

1. As a language learning student, I want Arabic speech to generate quickly (under 3 seconds) so that I can practice pronunciation without long waits between attempts.
2. As a language learning student, I want the app to use minimal CPU during speech synthesis so that my laptop runs cool and quiet during study sessions.
3. As a language learning student, I want repeated requests for the same lesson text to play instantly from cache so that I can review vocabulary without re-waiting for synthesis.
4. As a language learning student, I want clear and correct Arabic pronunciation from the synthesized speech so that I learn proper pronunciation and accent.
5. As a language learning student, I want to choose from multiple Arabic voice presets (male/female) so that I can hear the same text spoken in different voices.
6. As a language learning student, I want the app to work immediately after container restart without waiting for a 2GB model download so that my study sessions start quickly.
7. As a language learning student, I want the model to load in under 60 seconds after container restart so that I can start using the TTS Studio quickly.
8. As a language learning student, I want to generate Arabic speech without needing to upload or manage voice reference files so that the setup is simple and frictionless.
9. As a language learning student, I want the TTS Studio to show a loading indicator while the model loads so that I understand the app is preparing.
10. As a language learning student, I want to see the available voices listed clearly so that I can choose the voice that sounds best for my learning style.
11. As a language learning student, I want to be able to play, pause, seek, and download synthesized audio so that I can review lessons at my own pace.
12. As a language learning student, I want the app to handle network errors gracefully with clear Arabic error messages so that I understand what went wrong.
13. As a language learning student, I want the same Arabic text with the same voice to produce identical audio output so that my cached results are reliable.
14. As a language learning student, I want the app to support both Arabic and English text synthesis so that I can practice bilingual content.
15. As a language learning student, I want the TTS Studio to disable the Generate button while speech is being synthesized so that I don't accidentally queue multiple requests.
16. As a language learning student, I want keyboard shortcuts (Ctrl+Enter) to trigger synthesis so that I can generate speech quickly without reaching for the mouse.
17. As a language learning student, I want the app to show a toast notification when synthesis fails so that I know something went wrong.
18. As a language learning student, I want the app to prevent navigation away from the TTS Studio during in-flight synthesis with a confirmation dialog so that I don't lose generated audio.
19. As a language learning student, I want the audio player to appear smoothly after synthesis completes so that I can immediately start listening.
20. As a language learning student, I want the text input to show a character count with color-coded warnings (warn at 60%, near-limit at 80%, over-limit in red) so that I stay within the synthesis limit.
21. As a language learning student, I want the maximum text length to be 3000 characters per synthesis request so that I can generate substantial lesson content in one request.
22. As a language learning student, I want the app to work on both desktop (side-by-side panels) and mobile (split-screen with draggable divider) so that I can study on any device.
23. As a language learning student, I want the synthesized audio to be accessible via screen readers through ARIA announcements so that I can use the app with assistive technology.
24. As a language learning student, I want the app to support dark mode with proper contrast so that I can study at night without eye strain.
25. As a language learning student, I want the app to use RTL layout for Arabic text so that the interface respects Arabic reading direction.
26. As a language learning student, I want the app to remember my last selected voice across sessions so that I don't have to re-select it every time.
27. As a language learning student, I want the app to auto-select the first available voice when no voice is selected so that I can start generating immediately.
28. As a language learning student, I want the app to validate my text input before sending it to the server so that I get immediate feedback on invalid content.
29. As a language learning student, I want the app to handle the case where the TTS model is still loading (503) with a clear status indicator so that I know when the service is ready.
30. As a language learning student, I want the app to clean up orphaned generated files if I navigate away during synthesis so that disk space is not wasted.

## Implementation Decisions

### 1. Synthesis Model Swap

- Replace Coqui XTTS-v2 with Chatterbox Multilingual TTS (Resemble AI, 0.5B parameters, MIT license)
- Chatterbox supports 23 languages including Arabic (`language_id="ar"`)
- Chatterbox delivers clear and correct Arabic pronunciation (quality tier: clear/correct, not studio-grade)
- Chatterbox runs on CPU with 1-3s inference time for 600-character text (vs several seconds with XTTS-v2)
- Chatterbox model size is ~500MB (vs ~2GB for XTTS-v2)
- Chatterbox has built-in Perth watermarks in every audio output (imperceptible, no audio quality impact)

### 2. Voice Cloning Removal

- Remove the entire Voice Cloning pipeline — no more speaker WAV files, no `speaker_wavs/` directory
- Remove `_validate_speaker_wav()` function and its calls
- Remove `speaker_wav` parameter from synthesis requests
- Remove `torch.manual_seed()` seeding logic (not needed for Chatterbox)
- Remove WAV-to-MP3 conversion pipeline (Chatterbox outputs WAV directly, no ffmpeg needed)
- Remove `temperature` parameter (Chatterbox uses its own internal settings)

### 3. Synthesis Cache

- File-based storage in `downloads/` directory
- Cache key: SHA-256 hash of composite input (`text + language + voice + speed`)
- Hash is used as the filename for cached audio files (e.g., `{hash}.mp3`)
- Collision-free storage guaranteed by SHA-256
- Cache lookup happens before inference — if a cache hit exists, return the cached file immediately
- Cache miss triggers full synthesis, then stores the result for future requests
- Cache entries are regular MP3 files in `downloads/` — they coexist with the existing cleanup mechanism

### 4. API Contract Changes

**`POST /api/generate` — Simplified Request Body:**

```json
{
  "text": "مرحبا بك في لغةات",
  "language": "ar",
  "voice": "female"
}
```

**Removed fields from request:**
- `speaker` — no longer needed (no voice cloning)
- `speed` — Chatterbox handles speed internally
- `pitch` — not supported by Chatterbox
- `seed` — not needed (Chatterbox is deterministic by default)

**Response:** Unchanged — `audio/mpeg` binary via `FileResponse`.

**`GET /api/voices` — Changed Response:**

Returns Chatterbox's built-in Arabic voices (not discovered from `speaker_wavs/` directory). Each voice entry has `{ id, name }`.

### 5. Frontend SynthesisRequest Interface

**Current interface:**

```ts
interface SynthesisRequest {
  text: string
  speaker?: string
  speed?: number
  seed?: number
}
```

**New interface:**

```ts
interface SynthesisRequest {
  text: string
  language?: string  // optional, default "ar"
  voice?: string     // optional, Chatterbox built-in voice name
}
```

**Removed fields:** `speaker`, `speed`, `seed`

### 6. Health Check Adjustment

- Chatterbox model loads in ~30-60s (vs XTTS-v2's ~120s)
- `useHealthPoll` polling interval may be increased from 2s to 5s
- Max retries reduced proportionally (from 150 to ~30-60)
- Backend health check `start_period` and `retries` in docker-compose.yml adjusted accordingly

### 7. Dockerfile Changes

- Base image: `python:3.11-slim` (Chatterbox requirement, current is 3.12)
- Remove ffmpeg dependency (Chatterbox outputs WAV directly, no conversion needed)
- Add Chatterbox dependencies: `chatterbox-tts`, `torchaudio`, `librosa`
- Remove torchcodec rebuild steps (not needed for Chatterbox)
- Model cache volume path remains `/app/.cache/tts`

### 8. Frontend Component Changes

- `useTtsApi.ts`: Update `SynthesisRequest` interface, update `synthesize()` to send `language` and `voice` instead of `speaker`, `speed`, `seed`
- `index.vue` (TTS Studio): Update `handleSynthesize()` call to use new interface
- `useVoices.ts`: Update `Voice` interface — remove `speaker_wav` field, update `loadVoices()` to parse Chatterbox voice list
- `VoiceSelector.vue`: Update to display Chatterbox built-in voices (no WAV file references)
- `DesktopPanels.vue` and `MobileSplitScreen.vue`: Remove `speedValue` prop and speed slider UI (Chatterbox handles speed internally)
- `SpeedSlider.vue`: May be removed or repurposed (speed control no longer needed)
- `GenerateButton.vue`: Update loading state labels (faster generation time)

### 9. Backend Module Changes

- `app.py`: Replace Coqui TTS import with Chatterbox import
- Replace `generate_speech()` endpoint: remove speaker WAV validation, remove WAV-to-MP3 conversion, add cache lookup, use Chatterbox API
- Replace `discover_voices()` with Chatterbox voice list
- Remove `_validate_speaker_wav()` function
- Remove `SPEAKER_WAV_DIR` constant
- Add cache lookup logic to `generate_speech()`

### 10. Existing Tests That Need Updating

- `backend/tests/test_generate.py`: Update all tests — remove speaker WAV file setup, remove speed/pitch validation tests, remove seed tests, add cache hit/miss tests
- `backend/tests/test_voices.py`: Update `discover_voices` tests — voices now come from Chatterbox, not `speaker_wavs/` directory
- `frontend/tests/composables/useTtsApi.test.ts`: Update `SynthesisRequest` interface tests — remove `speaker`, `speed`, `seed` tests, add `language` and `voice` tests
- `frontend/tests/composables/useHealthPoll.test.ts`: Update retry count and polling interval tests
- `frontend/tests/composables/useVoices.test.ts`: Update voice loading tests — voices now from Chatterbox API, not WAV files
- `frontend/tests/components/VoiceSelector.test.ts`: Update to use Chatterbox voice data
- `frontend/tests/components/SpeedSlider.test.ts`: May need removal or update (speed control removed)
- `frontend/tests/components/GenerateButton.test.ts`: Update loading state labels

## Testing Decisions

### What Makes a Good Test

- Test observable behavior only — never internal implementation details
- No tautological mocks (mock returns exactly what the test asserts)
- Tests assert external behavior: API responses, frontend DOM updates, error handling
- Follow existing patterns: `tests/composables/` for composables, `tests/components/` for Vue components, `backend/tests/` for API endpoints
- Use `vi.resetModules()` or explicit reset functions to isolate between test cases (module-level state leaks between tests)
- For component tests needing async DOM settling, use `await nextTick()` (elements inside `<Transition>`/`v-if` don't exist immediately)

### Modules to Test

**Backend (highest seam — API endpoints):**
- `POST /api/generate` — cache hit returns cached file, cache miss triggers synthesis and stores result
- `POST /api/generate` — validation: empty text, too-long text, invalid language
- `POST /api/generate` — 503 when model not ready
- `GET /api/voices` — returns Chatterbox built-in voices (not WAV file discovery)
- `GET /health` — returns correct status during Chatterbox loading

**Frontend (highest seam — composable interfaces):**
- `useTtsApi.synthesize()` — sends correct request body (`text`, `language`, `voice`), returns Blob
- `useTtsApi.healthCheck()` — returns correct status, respects new retry count
- `useVoices.loadVoices()` — returns Chatterbox voice list
- `useHealthPoll` — singleton behavior, polling interval, retry count

**Frontend (component level):**
- `VoiceSelector` — displays Chatterbox voices, selects default voice
- `GenerateButton` — shows correct loading state for faster generation
- `DesktopPanels` / `MobileSplitScreen` — updated props (no `speedValue`)
- TTS Studio page (`index.vue`) — `handleSynthesize()` uses new interface

### Prior Art

- `backend/tests/test_generate.py` — existing generate endpoint tests (mock TTS model, create mock WAV files, test validation)
- `backend/tests/test_voices.py` — existing voice discovery tests (mock `speaker_wavs/` directory)
- `frontend/tests/composables/useTtsApi.test.ts` — existing TTS API composable tests (mock `fetch`, test request body, test error handling)
- `frontend/tests/composables/useHealthPoll.test.ts` — existing health polling tests (singleton pattern, retry logic, SPA navigation)
- `frontend/tests/composables/useVoices.test.ts` — existing voice loading tests (mock `/api/voices`)

## Out of Scope

- **Voice cloning functionality** — intentionally removed, not replaced
- **Speaker WAV file management** — intentionally removed, not replaced
- **Speed/pitch control UI** — removed (Chatterbox handles speed internally)
- **Deterministic seed control** — removed (Chatterbox is deterministic by default)
- **WAV-to-MP3 conversion** — removed (Chatterbox outputs WAV directly, no ffmpeg needed)
- **Speech recognition** — not part of this PRD (separate PRD-SpeechRecognition)
- **Multi-user authentication** — out of scope (single anonymous user, per ADR-006)
- **GPU acceleration** — not pursued (CPU-only deployment is a constraint)
- **Real-time streaming synthesis** — not pursued (batch synthesis is sufficient for learning use case)
- **Emotion/exaggeration control** — Chatterbox supports it but not included in this PRD (could be a future enhancement)
- **Arabic dialect-specific models** — Chatterbox uses standard Arabic; dialect-specific fine-tunes (Egyptian, Saudi) are not included

## Further Notes

### Model Selection Rationale

The research identified that **no lightweight Coqui model supports Arabic** — XTTS-v2 is the only one. Among alternatives:

| Model | Arabic? | CPU Time | Size | License |
|-------|---------|----------|------|---------|
| XTTS-v2 (current) | ✅ | ~5-15s | ~2GB | MPL-2 |
| Chatterbox Multilingual | ✅ | ~1-3s | ~500MB | MIT |
| Coqui Glow-TTS | ❌ | ~1s | ~100MB | MPL-2 |
| Kokoro 82M | ❌ | ~0.5s | ~150MB | Apache-2.0 |
| Piper | ❌ | ~0.1s | ~50MB | MIT |
| KittenTTS | ❌ | ~0.1s | ~25MB | Apache-2.0 |
| CosyVoice 2 | ❌ | ~1s | ~500MB | Apache-2.0 |

Chatterbox is the **only** model that checks all boxes: Arabic support, CPU-friendly, clear/correct pronunciation, MIT licensed, and no voice cloning needed.

### Cache Strategy Rationale

File-based caching in `downloads/` was chosen because:
- It coexists with the existing cleanup mechanism (files in `downloads/` are already managed)
- Cache hits return a file path — no serialization/deserialization overhead
- Cache entries are regular MP3 files — they can be played, downloaded, or viewed in history
- SHA-256 hash as filename guarantees collision-free storage
- Cache lookup is a simple file existence check before inference

### Perth Watermark Note

Chatterbox embeds imperceptible Perth watermarks in every audio output. This:
- Does NOT affect audio quality or playback
- Does NOT add any audible artifact
- Is detectable by the `perth` library if needed for provenance
- Is a privacy consideration (encodes generation metadata) but acceptable for this use case

### Existing Code That Will Be Affected

- `backend/app.py` — entire synthesis pipeline rewritten
- `backend/requirements.txt` — new dependencies
- `backend/Dockerfile` — Python 3.11, new deps, removed ffmpeg
- `backend/speaker_wavs/` — directory removed
- `frontend/app/composables/useTtsApi.ts` — interface change
- `frontend/app/composables/useVoices.ts` — interface change
- `frontend/app/composables/useHealthPoll.ts` — retry count change
- `frontend/app/pages/index.vue` — `handleSynthesize()` call change
- `frontend/app/components/VoiceSelector.vue` — voice data change
- `frontend/app/components/DesktopPanels.vue` — remove `speedValue` prop
- `frontend/app/components/MobileSplitScreen.vue` — remove `speedValue` prop
- `frontend/app/components/SpeedSlider.vue` — may be removed
- `frontend/app/components/GenerateButton.vue` — loading state labels
- All existing tests in `frontend/tests/` and `backend/tests/`
