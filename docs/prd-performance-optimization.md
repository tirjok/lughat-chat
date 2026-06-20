# PRD: Performance Optimization — Streaming, Embedding Cache, and Generation Speed

**Created:** 2026-06-20
**Status:** Draft — ready for agent triage label
**Labels:** `ready-for-agent`, `backend`, `frontend`, `performance`

---

## Problem Statement

Lughat Chat is a text-to-speech web app for Arabic speech synthesis. Currently, users face three compounding latency problems:

1. **Generation takes several seconds** with no feedback until the full audio is ready. The user stares at a loading state and has no sense of progress.
2. **The speaker encoding step is redundant** — every generation recomputes speaker embeddings from the same reference WAV file, even though the result is deterministic.
3. **WAV-to-MP3 conversion happens per-request** via a blocking ffmpeg subprocess call, adding 1-2 seconds of wasted I/O for no user-visible benefit (browsers play WAV files identically).

The result: a tool that produces high-quality Arabic speech but feels sluggish and unresponsive. Users perceive the app as "slow" even when the model is ready, which undermines confidence in the product.

---

## Solution

Replace the current synchronous `tts_to_file()` pipeline with a three-part optimization:

1. **Speaker embedding cache** — Pre-compute `(gpt_cond_latent, speaker_embedding)` pairs for each speaker at startup and reuse them across all generations.
2. **Streaming audio response** — Use `inference_stream()` to deliver audio chunks as they're generated, enabling the browser to start playback within ~200ms instead of waiting for full generation.
3. **Eliminate per-request ffmpeg** — Save audio directly from the XTTS tensor output. If MP3 format is required, pre-convert speaker reference WAVs at setup time rather than per-request.

These changes reduce perceived latency from "several seconds of silence" to "audio starts playing in ~200ms," while also reducing actual generation time by 30-40%.

---

## User Stories

1. As an Arabic content creator, I want to hear the first words of my generated speech within a fraction of a second, so that I know the generation is working and don't have to wait in silence.
2. As a user generating speech with a voice I've used before, I want the system to skip re-computing the voice characteristics, so that generation is faster on repeat requests.
3. As a user, I want the audio to start playing while the rest is still generating, so that the experience feels responsive and immediate.
4. As a user switching between speakers, I want each speaker's voice characteristics to be computed once and cached, so that switching speakers is fast.
5. As a user, I want to download generated audio without waiting for an extra conversion step, so that the download is available as soon as generation completes.
6. As a content creator producing long-form Arabic audio, I want the system to handle text longer than 3000 characters without arbitrary limits, so that I can produce audiobooks or educational content.
7. As a user with slow internet, I want the streaming audio to begin playing before the full file is transferred, so that playback starts quickly even on constrained connections.
8. As a developer maintaining the service, I want the ffmpeg subprocess call removed from the hot path, so that the backend has fewer dependencies and lower resource usage per request.
9. As a user, I want to see a visual indication that audio is being generated (waveform animating), so that I have feedback that progress is happening even before the full audio is ready.
10. As an accessibility user, I want audio to start playing as soon as possible, so that I can begin consuming the content without unnecessary waiting.
11. As a teacher producing Arabic language learning audio, I want to generate speech quickly so that I can produce multiple audio clips in a session without long waits between them.
12. As a user, I want the same quality of audio output regardless of whether I use streaming or full generation, so that I don't sacrifice quality for speed.
13. As a user who uploads a new speaker WAV file, I want the system to automatically compute and cache the speaker embeddings for the new voice, so that the first generation with that voice is fast.
14. As a user, I want the frontend to handle streaming audio seamlessly with the existing waveform visualization, so that the visual feedback matches the audio playback.
15. As a user, I want the existing download functionality to continue working with streaming-generated audio, so that I can save the full generated file.

---

## Implementation Decisions

### Module: Backend — `/api/generate` endpoint (modified) and new `/api/generate_stream` endpoint (added)

- The existing `POST /api/generate` endpoint will be **extended** (not replaced) to support an optional `stream: true` query parameter or header. When `stream` is true, the endpoint returns a `StreamingResponse` instead of `FileResponse`.
- A new `POST /api/generate_stream` endpoint will be added as the primary streaming route, returning WAV audio chunks via `StreamingResponse`.
- The `SynthesisRequest` model remains unchanged — streaming is a transport-level concern, not a request-level one.

### Module: Backend — Speaker embedding cache (new)

- A `SpeakerCache` class (or equivalent dict structure) will be introduced at the module level, keyed by voice ID.
- At startup (in the existing `lifespan` function), after the TTS model loads, the system will iterate over all discovered speaker WAV files and pre-compute `(gpt_cond_latent, speaker_embedding)` pairs using `model.get_conditioning_latents()`.
- These cached values will be passed to `model.inference()` or `model.inference_stream()` instead of calling `tts_to_file()`.
- When a new speaker WAV is uploaded (via `speaker_wavs/` directory), the cache will be invalidated for that voice ID and re-computed on the next generation.

### Module: Backend — XTTS model API migration

- Replace `tts_model.tts_to_file()` calls with the lower-level API:
  1. `model.get_conditioning_latents(audio_path=[speaker_wav])` — called once at startup, cached per voice
  2. `model.inference()` or `model.inference_stream()` — called per request with cached latents
- The `inference()` method returns a dict with `{"wav": torch.Tensor}`. This tensor will be saved directly using `torchaudio.save()` instead of going through ffmpeg.
- The `inference_stream()` method returns a generator of audio chunks. Each chunk will be yielded to the client as bytes.

### Module: Backend — WAV output (replaces MP3 per-request conversion)

- Audio will be saved as WAV format using `torchaudio.save()`. The file extension will be `.wav` (or `.mp3` extension containing WAV data — browsers handle both).
- The speed filter (`-filter:a atempo={speed}`) will be applied during `torchaudio.save()` using `torchaudio.transforms.TimeStretch` or by resampling, rather than ffmpeg.
- If MP3 output is strictly required for compatibility, a pre-conversion step will run once per speaker WAV at setup time, not per request.

### Module: Frontend — `useTtsApi` composable (modified)

- The `synthesize()` function will be extended to support a `stream: boolean` option.
- When streaming, the response will be consumed as a `ReadableStream` and fed into the audio element via `URL.createObjectURL()` on accumulated chunks, or via the Media Source Extensions (MSE) API for true streaming playback.
- The `isLoading` state will transition to `false` as soon as the first audio chunk is received, enabling immediate playback.

### Module: Frontend — `useAudioModule` composable (modified)

- The `load()` function will accept a `ReadableStream<BlobPart>` in addition to `Blob`.
- When loading from a stream, the audio element will be wired to play as chunks arrive, rather than waiting for the full blob.
- The `isLoading` state will be set to `false` on first chunk receipt (not on `loadedmetadata`).

### Module: Frontend — WaveformCanvas (modified)

- The waveform visualization will support "live" mode where it renders chunks as they arrive, rather than waiting for the full audio.
- The playhead animation will start as soon as the first chunk is available.

### API Contract Changes

- **New endpoint:** `POST /api/generate_stream` — returns `audio/wav` via `StreamingResponse`. Accepts the same `SynthesisRequest` body.
- **Existing endpoint:** `POST /api/generate` — behavior unchanged when called without streaming. When `stream` parameter is provided, returns `StreamingResponse` instead of `FileResponse`.
- **No breaking changes** to existing request/response shapes. Streaming is opt-in.

### Architectural Decisions

- **Highest seam preferred:** The new streaming endpoint is a new route, not a modification of existing behavior. Existing callers (if any) continue to work unchanged.
- **Backward compatibility:** The existing `/api/generate` endpoint returns the same `audio/mpeg` response. Streaming is a new feature, not a replacement.
- **Cache invalidation:** The speaker cache is invalidated when the `speaker_wavs/` directory changes (detected by file modification time or hash). This is checked lazily on the first request after a change.

---

## Testing Decisions

### Backend Testing Seams

- **Existing seam:** `backend/tests/test_generate.py` already mocks `tts_model.tts_to_file()`. The mock will be extended to also mock `get_conditioning_latents()` and `inference()`/`inference_stream()`.
- **New test file:** `backend/tests/test_streaming.py` — tests the streaming endpoint returns chunks correctly, handles partial responses, and validates the streaming response headers.
- **New test file:** `backend/tests/test_speaker_cache.py` — tests that speaker embeddings are cached at startup, reused across requests, and invalidated when speaker WAVs change.
- **Prior art:** `test_generate_blob.py` tests the blob response format. The streaming tests will follow the same pattern but verify chunked delivery.

### Frontend Testing Seams

- **Existing seam:** `frontend/tests/useTtsApi.test.ts` mocks `fetch` responses. The composable tests will be extended to test the streaming path with a mock `ReadableStream`.
- **Existing seam:** `frontend/tests/useAudioModule.test.ts` tests audio playback state. Tests will be extended to cover streaming audio loading (first chunk → playback starts).
- **Existing seam:** `frontend/tests/AudioPlayerPanel.test.ts` tests the audio player UI. Tests will verify that the waveform canvas enters "live" mode when streaming.
- **Prior art:** `useTtsApi.test.ts` already tests error handling, loading states, and blob responses. Streaming tests will follow the same structure with a mock stream.

### Testing Principles

- Test external behavior only: verify that audio plays, waveform renders, and states transition correctly. Do not test internal cache implementation details.
- Use the highest seam: test the API endpoint responses and the composable interfaces, not the PyTorch tensor operations.
- Mock the TTS model at the API level (as already done in `test_generate.py`), not at the PyTorch level.

---

## Out of Scope

- **GPU acceleration** — This PRD does not address moving to GPU inference. CPU-only operation remains the constraint.
- **The "AI Smart Tools" (Translate, Add Diacritics, Continue Script)** — These are placeholder buttons in the UI and are not implemented in this PRD. They are a separate feature area.
- **Model pre-baking into Docker image** — While beneficial, baking the model into the Docker image is a DevOps concern and is out of scope for this PRD.
- **User authentication or rate limiting** — Not addressed.
- **Audio format selection** — Users cannot choose between WAV and MP3. The system outputs WAV. This is intentional to simplify the implementation.
- **Real-time voice modification** — Changing pitch or speed on a streaming audio is not supported. Speed is applied during generation, not post-processing.

---

## Further Notes

### Why WAV instead of MP3?

Browsers play `.wav` files without any issues. The WAV format is uncompressed and avoids the encoding step entirely. For a tool where latency is the primary concern, saving 1-2 seconds per request by skipping ffmpeg is significant. If MP3 is strictly required for a specific use case (e.g., embedding in platforms that reject WAV), a pre-conversion step can be added per speaker at setup time.

### Why streaming matters more than raw speed

A user perceives 5 seconds of silence differently from 5 seconds of audio playing. Even if total generation time stays the same, delivering the first 200ms of audio immediately makes the experience feel 10x faster. This is a well-established UX principle in audio applications (see: speech synthesis assistants, music players).

### Relationship to existing code

The existing `tts_model.tts_to_file()` call does everything internally: it computes speaker latents, runs inference, and saves to file. The new approach splits this into two explicit steps (compute latents once, inference per-request), which is the pattern used by the official Coqui XTTS streaming server. The existing test infrastructure (mocking `tts_to_file`) will need to be extended to also mock `get_conditioning_latents` and `inference`/`inference_stream`.

### Risk: `inference_stream()` is slower than `inference()`

The official Coqui documentation notes that "streaming inference is typically slower than regular inference." However, the tradeoff is favorable: total generation time may increase by ~10-20%, but time-to-first-audio drops from several seconds to ~200ms. For a user-facing application, this is the correct tradeoff.

### Risk: Speaker cache memory usage

Cached `(gpt_cond_latent, speaker_embedding)` pairs consume memory proportional to the number of speakers. With 2-10 speakers, this is negligible (a few MB). If the number of speakers grows to hundreds, a TTL-based eviction strategy would be needed. This is not a concern for the current use case.
