# PRD: Dynamic Voice Presets — Pre-loaded Speaker WAV Discovery

## Problem Statement

The Lughat Chat TTS application currently ships with only two hardcoded voice presets: `female` and `male`. Users who need additional Arabic dialect-specific voices (e.g., "Ahmed KSA", "Nada KSA", "Fatima UAE") have no way to add or select them through the application. The voice list is statically defined in both the backend and frontend, making it impossible to extend without code changes.

## Solution

Implement a dynamic voice preset system where speaker WAV files placed in the `speaker_wavs/` directory are automatically discovered and made available as selectable voices through the application. The system scans for `.wav` files at runtime, exposes them via the `/api/voices` endpoint, and renders a dropdown in the frontend populated from that API response. No upload UI or recording pipeline — WAV files are pre-loaded into the directory (e.g., via Docker volume mount).

## User Stories

1. As a TTS operator, I want the system to automatically discover all `.wav` files in the `speaker_wavs/` directory, so that I can add new voices by simply placing files in the directory without restarting the server.

2. As a TTS operator, I want each discovered voice to appear in the frontend dropdown with its filename (without extension) as both the display label and the internal ID, so that I can easily identify which voice corresponds to which recording.

3. As a TTS operator, I want the `/api/voices` endpoint to return all discovered voices on each request, so that new voices become available immediately after being dropped into the directory — no server restart required.

4. As a TTS operator, I want the existing `female.wav` and `male.wav` presets to continue working alongside any new custom voices, so that I can gradually migrate without breaking existing workflows.

5. As a TTS operator, I want the backend to validate that a speaker WAV file exists at generation time (not just at listing time), so that I get a clear error message if a file is missing when synthesis is requested.

6. As a frontend user, I want the voice dropdown to be populated from the `/api/voices` API response at page load, so that I see all available voices without any hardcoded defaults.

7. As a frontend user, I want the selected voice to be sent as a plain string value in the synthesis request, so that any discovered voice can be used without type constraints.

8. As a TTS operator, I want the `voice` field in the synthesis API to accept any string value (not just a fixed set), so that custom voice names like "ahmed_ksa" are accepted without validation errors.

9. As a TTS operator, I want the voice list to be discoverable through a dedicated `useVoices` composable in the frontend, so that it follows existing patterns and is easily testable.

10. As a TTS operator, I want the system to gracefully handle missing or unreadable WAV files by returning a clear 500 error with the filename, so that I can diagnose issues quickly.

11. As a TTS operator, I want the `/api/voices` endpoint to return each voice as an object with `id` (filename without extension) and `name` (same as id for display), so that the frontend has a consistent data shape to render.

12. As a TTS operator, I want the existing `female` and `male` presets to be treated as regular files in the directory with no special-casing, so that the system is uniform and easier to maintain.

## Implementation Decisions

### Module: Voice Discovery (Backend)
- The `VOICES` list in the backend is replaced with a dynamic scan function that reads all `.wav` files from `speaker_wavs/`.
- The scan runs on each `/api/voices` request (not cached), ensuring the list is always current.
- Each discovered file produces a voice entry: `{ id: filename_without_extension, name: filename_without_extension }`.
- The scan function is a deep module — it encapsulates directory traversal, file filtering (`.wav` only), and error handling in a simple interface.

### Module: Voice Resolution (Backend)
- The hardcoded `speaker_wavs` dict in `generate_speech()` is replaced with dynamic resolution: `speaker_wavs/{voice}.wav`.
- File existence is validated at generation time using the existing `_validate_speaker_wav()` function.
- If the file is missing, a 500 error with a descriptive message is returned.

### Module: Voice Field Validation (Backend)
- The regex pattern constraint on the `voice` field in `SynthesisRequest` is removed.
- The field accepts any string; validation happens at generation time via file existence check.

### Module: Voice List Composable (Frontend)
- A new `useVoices` composable fetches `/api/voices` on creation and returns a `{ voices: ref<Voice[]> }`.
- Simple, no refresh capability — one fetch on mount.

### Module: Voice Dropdown (Frontend)
- The hardcoded `speakers` array in `index.vue` is removed.
- The dropdown renders from the `voices` ref provided by `useVoices`.
- `selectedSpeaker` type changes from `'female' | 'male'` to `string`.

### Module: Synthesis Request Type (Frontend)
- `SynthesisRequest.speaker` in `useTtsApi.ts` changes from `'female' | 'male'` to `string | undefined`.

### API Contract
- `/api/voices` — GET — Returns array of `{ id: string, name: string }` for all `.wav` files in `speaker_wavs/`.
- `/api/generate` — POST — Accepts any string value for `voice`/`speaker` field. Validates file existence at runtime.

### Data Flow
```
speaker_wavs/*.wav  →  backend scan on /api/voices call  →  frontend fetches list  →  renders dropdown
                                                                    ↓
                                              user selects voice (string)  →  sent to /api/generate
                                                                    ↓
                                          backend resolves speaker_wavs/{voice}.wav  →  validates exists  →  generates speech
```

## Testing Decisions

### What makes a good test
- Tests should verify external behavior: given a directory with certain `.wav` files, `/api/voices` returns the correct list. Given a missing file, generation fails with 500.
- Tests should NOT depend on internal implementation details (e.g., how the scan function iterates files).

### Modules to test
1. **Voice discovery** — Test that the scan function returns correct entries for a given directory state. This is a deep module with a simple interface (input: directory path, output: list of voice objects).
2. **Voice resolution** — Test that `generate_speech` correctly resolves a voice name to a file path and validates existence.
3. **Voice field validation** — Test that the synthesis endpoint accepts any string for `voice` and rejects only when the file doesn't exist.
4. **Frontend composable** — Test that `useVoices` fetches from `/api/voices` and returns the list in a ref.
5. **Frontend dropdown** — Test that the dropdown renders from the fetched voice list and sends the selected value correctly.

### Prior art
- Existing backend tests in `backend/tests/` (e.g., `test_voices.py`) follow a similar pattern: mock the filesystem, call the endpoint, assert response.
- Existing frontend tests in `frontend/tests/` and inline `.test.ts` files mock composables and API calls.
- The `useHealthPoll` composable provides a pattern for polling-based state management that `useVoices` can follow (simplified).

## Out of Scope

- **Voice upload UI** — No in-app file upload or recording functionality. WAV files are pre-loaded externally (e.g., via Docker volume).
- **Voice recording in-browser** — No microphone capture or WAV encoding in the browser.
- **Voice management CRUD** — No ability to delete, rename, or manage voices through the app.
- **Voice metadata** — No support for region tags, speaker names, or other metadata beyond filename.
- **Caching** — No caching of the voice list; it is scanned fresh on each request.
- **GPU acceleration** — Voice generation remains CPU-only as per existing architecture.

## Further Notes

- The `speaker_wavs/` directory is already mounted as a Docker volume, so WAV files added to it persist across container restarts.
- The existing `_validate_speaker_wav()` function (which checks minimum duration of 0.33s) continues to apply to all discovered voices — no exceptions for custom files.
- The `temperature` parameter in XTTS generation (currently 0.4) applies uniformly to all voices.
- Seed behavior remains unchanged: deterministic output per voice preset (female=42, male=123), overridable via the `seed` field.
- The existing `/downloads/` and `/speaker_wavs/` static mounts in the backend already serve these directories, so no new routes are needed.
