# Implementation Plan: Speech Synthesis — Core Fixes

**Source**: `docs/workflows/WORKFLOW-speech-synthesis.md` (v0.1)
**Date**: 2026-07-11
**Status**: Draft — Ready for implementation

---

## Overview

This document breaks the **Speech Synthesis** workflow into **8 implementation issues** (vertical slices). Each slice is a thin, end-to-end path through all layers (validation, API, playback, error handling, tests). They are ordered by dependency — blockers first — so that each subsequent slice can reference real issue identifiers once implemented.

This workflow covers the **entire synthesis lifecycle**: user types text → frontend validates → API call → backend generates audio → frontend plays back → user interacts with player. It depends on the **Model Loading** workflow (the model must be ready before synthesis can succeed).

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity | Spec section | Resolution |
|---|---------|----------|-------------|-------------|
| RC-005 | Backend does NOT store original text with generated audio — `text: ""` always in history response | **High** | STEP 4 | `get_history()` parses metadata from filename only. Original text is lost. |
| RC-028 | `SynthesisResponse` Pydantic model (audio_url, filename, duration_seconds) is defined but **never used** — endpoint returns `FileResponse` directly | Medium | STEP 2 | Dead code. The model exists but the endpoint doesn't use it. |
| RC-003 | Default voice name mismatch: `generate_speaker_wavs.py` generates `female.wav`/`male.wav`, but deployed files are `"KSA Hamed - Male.wav"`/`"KSA Zariyah - Female.wav"`. Default resolution `speaker ?? voice ?? "female"` looks for `"female.wav"` → 500 error. | **Critical** | STEP 2 | Fix default voice resolution to match deployed filenames. |
| RC-006 | FFmpeg fallback copies WAV to `.mp3` extension — browser may not decode WAV content served as `audio/mpeg` | Medium | STEP 2 | Intentional fallback, but risky. |
| RC-007 | No rate limiting on `/api/generate` — any user can trigger unlimited synthesis, consuming CPU and disk | Medium | STEP 2 | No rate limiting exists. |
| RC-029 | `seed` parameter defaults to 42 per-request but is optional in the API — frontend does NOT send `seed` | Low | STEP 2 | Frontend never sends `seed`, so the backend always uses default 42. |
| RC-030 | Frontend hardcodes `language: 'ar'` in `useTtsApi.synthesize()` when the API accepts `'ar'` | Low | STEP 2 | Frontend should send the language the user selects (or default to 'ar'). |
| RC-007 | Generated MP3 files in `tts-audio-cache` are never cleaned up — volume grows indefinitely | High | STEP 4 | No cleanup mechanism exists. |

---

## Master Index — All 8 Slices

| ID | Title | Blocked By | Priority |
|----|-------|------------|----------|
| **S-01** | Fix default voice resolution (RC-003) | **None** | **P0 — Critical** |
| S-02 | Store original text with generated audio (RC-005) | S-01 | P1 |
| S-03 | Add `language` field to frontend API (RC-030) | **None** | P1 |
| S-04 | Add seed support to frontend (RC-029) | **None** | P2 |
| S-05 | Clean up old audio files (RC-007) | S-02 | P2 |
| S-06 | Frontend: handle all error responses (RC-028, RC-006) | **None** | P2 |
| S-07 | Frontend: handle browser autoplay blocking (TC-11) | **None** | P2 |
| S-08 | Frontend: keyboard shortcut + download UX (TC-12, TC-13) | **None** | P3 |

**Implementation order (topological sort):**
```
Phase 1 (no blockers): S-01 → S-03 → S-04 → S-06 → S-07 → S-08  (S-01 is critical, do first)
Phase 2 (depends on P1): S-02 → S-05
```

---

## Slices

### Slice S-01: Fix Default Voice Resolution (RC-003)

**Type**: AFK
**Blocked by**: None (critical path — fix this first)
**User stories**: "As a learner, I can generate speech without manually selecting a voice — the default voice works"

**Problem**: The voice resolution logic (`speaker ?? voice ?? "female"`) defaults to `"female"`, but the actual WAV files are `"KSA Hamed - Male"` and `"KSA Zariyah - Female"`. If a user doesn't select a voice, the app looks for `"female.wav"` which doesn't exist → 500 error.

**Current code** (`app.py`):
```python
# Resolve voice: accept both "voice" and "speaker" fields; default to "female"
voice = request.speaker if request.speaker else (request.voice or "female")

# ...
speaker_wav = os.path.join(SPEAKER_WAV_DIR, f"{voice}.wav")

if not os.path.exists(speaker_wav):
    raise HTTPException(
        status_code=500,
        detail=f"Speaker WAV file not found for voice '{voice}'..."
    )
```

**Target behavior**:
- When no voice is selected, use the **first discovered voice** from `/api/voices` instead of hardcoded `"female"`.
- The `/api/voices` endpoint returns voices sorted from `speaker_wavs/` directory.
- If no voices exist, fall back to `"female"` (current behavior for backwards compatibility).

**Implementation approach**:
- Option A (recommended): In `generate_speech()`, call `discover_voices(SPEAKER_WAV_DIR)` to get available voices. If `voice` resolves to `"female"` (default) and `"female.wav"` doesn't exist, use the first discovered voice instead.
- Option B: Change the default from `"female"` to the first voice in `discover_voices()`.

**Acceptance criteria**:
- [ ] When no voice is selected and `"female.wav"` doesn't exist, the first discovered voice is used
- [ ] When `"female.wav"` exists, it is still used (backwards compatibility)
- [ ] Selecting `"KSA Hamed - Male"` resolves to `speaker_wavs/KSA Hamed - Male.wav` (spaces in filename preserved)
- [ ] Selecting `"KSA Zariyah - Female"` resolves to `speaker_wavs/KSA Zariyah - Female.wav`
- [ ] No voice selected + no WAV files → 500 with clear error message
- [ ] Existing `/api/voices` endpoint returns voices in the same order (used for default selection)

**Integration verification**:
- [ ] Backend starts without errors
- [ ] `POST /api/generate` without a voice field succeeds (uses first available voice)
- [ ] `POST /api/generate` with `speaker: "KSA Hamed - Male"` succeeds
- [ ] Frontend `/api/voices` returns the same voice list (used for default selection)

---

### Slice S-02: Store Original Text with Generated Audio (RC-005)

**Type**: AFK
**Blocked by**: S-01 (needs voice resolution to work correctly first)
**User stories**: "As a learner, I can see what text was synthesized for each file in my audio history"

**Problem**: `get_history()` always returns `text: ""` because the original text is not stored with the generated audio file. The filename only contains `{lang}_{voice}_{timestamp}.mp3` — no text content.

**Current code** (`app.py`):
```python
@app.get("/api/history")
async def get_history():
    for filename in sorted(os.listdir(AUDIO_DIR), reverse=True):
        if filename.endswith((".mp3", ".wav")):
            parts = filename.split("_")
            language = parts[0] if len(parts) > 0 else "unknown"
            voice = parts[1] if len(parts) > 1 else "default"
            items.append({
                "filename": filename,
                "text": "",  # We don't store the original text
                "language": language,
                "voice": voice,
                ...
            })
```

**Target behavior**:
- Store the original text alongside each generated audio file.
- **Approach**: Write a small JSON sidecar file next to each MP3 (e.g., `{timestamp}.meta.json`) containing the original text and metadata. Or embed metadata in the MP3 file's ID3 tags.
- **Recommended approach**: Sidecar JSON file. Simpler, doesn't require ID3 tagging libraries, and survives re-encoding.

**Sidecar file format** (`{timestamp}.meta.json`):
```json
{
  "text": "مرحبا بك في لغةات",
  "language": "ar",
  "voice": "KSA Zariyah - Female",
  "speed": 1.0,
  "pitch": 0.0,
  "seed": 42,
  "created_at": "1720000000"
}
```

**Implementation approach**:
1. In `generate_speech()`, after creating the MP3, write a sidecar JSON file `{timestamp}.meta.json` with the original text and metadata.
2. In `get_history()`, read the sidecar JSON file and include `text` in the response.
3. If the sidecar file is missing (old files), return `text: ""` (graceful fallback).

**Acceptance criteria**:
- [ ] `POST /api/generate` writes a sidecar `{timestamp}.meta.json` file next to the MP3
- [ ] Sidecar contains: `text`, `language`, `voice`, `speed`, `pitch`, `seed`, `created_at`
- [ ] `GET /api/history` reads sidecar files and returns `text` field (not empty)
- [ ] Old MP3 files (without sidecar) still return `text: ""` (graceful fallback)
- [ ] Sidecar files are cleaned up when MP3 files are cleaned up (see S-05)
- [ ] Backend starts without errors

**Integration verification**:
- [ ] `POST /api/generate` with text → MP3 + sidecar file created
- [ ] `GET /api/history` returns text from sidecar file
- [ ] Sidecar file is visible at `{AUDIO_DIR}/{timestamp}.meta.json`

---

### Slice S-03: Add `language` Field to Frontend API (RC-030)

**Type**: AFK
**Blocked by**: None
**User stories**: "As a learner, I can generate speech in either Arabic or English"

**Problem**: The frontend hardcodes `language: 'ar'` in `useTtsApi.synthesize()`, but the backend API accepts both `'ar'` and `'en'`. The frontend should support language selection (or at least pass through what the backend accepts).

**Current code** (`useTtsApi.ts`):
```typescript
body: JSON.stringify({
  text: request.text,
  speaker: request.speaker,
  speed: request.speed || 1.0,
  language: 'ar'  // ← hardcoded, ignores user selection
})
```

**Target behavior**:
- Add a `language` field to `SynthesisRequest` interface (default: `'ar'`).
- Pass the `language` field to the backend API.
- The frontend UI (voice selector or a new language toggle) should allow selecting `'ar'` or `'en'`.

**Implementation approach**:
1. Update `SynthesisRequest` interface to include `language?: 'ar' | 'en'`.
2. Pass `language` in the request body: `language: request.language ?? 'ar'`.
3. The frontend can expose a language selector (or default to `'ar'` if no selector exists yet).

**Acceptance criteria**:
- [ ] `SynthesisRequest` interface includes `language?: 'ar' | 'en'`
- [ ] `synthesize()` passes `language` to the backend (defaults to `'ar'`)
- [ ] Backend receives and processes the correct language
- [ ] Existing behavior (Arabic text) is unchanged
- [ ] English text with `language: 'en'` works correctly

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] `POST /api/generate` with `language: 'ar'` works (existing behavior)
- [ ] `POST /api/generate` with `language: 'en'` works (new capability)

---

### Slice S-04: Add Seed Support to Frontend (RC-029)

**Type**: AFK
**Blocked by**: None
**User stories**: "As a learner, I can get deterministic speech output for the same text + voice + seed"

**Problem**: The backend supports a `seed` parameter for deterministic XTTS generation (defaults to 42), but the frontend never sends `seed`. This means the feature exists but is never exercised.

**Current code** (`useTtsApi.ts`):
```typescript
body: JSON.stringify({
  text: request.text,
  speaker: request.speaker,
  speed: request.speed || 1.0,
  language: 'ar'
  // seed is NEVER sent
})
```

**Target behavior**:
- Add a `seed` field to `SynthesisRequest` interface (optional, defaults to `42`).
- Pass `seed` to the backend API when provided.
- This is a low-priority feature — deterministic output is useful for testing and reproducibility.

**Implementation approach**:
1. Update `SynthesisRequest` interface to include `seed?: number`.
2. Pass `seed` in the request body: `seed: request.seed`.
3. If not provided, the backend defaults to 42 (existing behavior).

**Acceptance criteria**:
- [ ] `SynthesisRequest` interface includes `seed?: number`
- [ ] `synthesize()` passes `seed` to the backend when provided
- [ ] Backend receives and processes the seed (deterministic output)
- [ ] When `seed` is not provided, backend uses default 42 (existing behavior)
- [ ] Same text + voice + seed produces identical audio (deterministic)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] `POST /api/generate` with `seed: 42` produces deterministic output
- [ ] `POST /api/generate` without `seed` uses default 42 (existing behavior)

---

### Slice S-05: Clean Up Old Audio Files (RC-007)

**Type**: AFK
**Blocked by**: S-02 (needs sidecar files to be written before cleanup)
**User stories**: "As an operator, I know the audio cache won't fill up the disk indefinitely"

**Problem**: Generated MP3 files in `tts-audio-cache` are never cleaned up. The volume grows without bound, potentially filling the disk.

**Current behavior**: `get_history()` lists all files in `/app/downloads/` — no cleanup logic exists.

**Target behavior**:
- Implement a cleanup mechanism that removes old audio files when the cache approaches capacity.
- **Approach**: Keep the N most recent files (configurable, default: 100 files). Delete older files and their sidecar metadata files.

**Implementation approach**:
1. Add a `MAX_AUDIO_FILES` environment variable (default: 100).
2. Create a `cleanup_audio()` function that:
   - Lists all files in `/app/downloads/`
   - Sorts by `created_at` (newest first)
   - Deletes files beyond `MAX_AUDIO_FILES` (both MP3/WAV and sidecar JSON)
3. Call `cleanup_audio()` after each successful synthesis (lazy cleanup) OR run it periodically (e.g., via a background task).
4. **Recommended**: Lazy cleanup — run after each successful synthesis. Simple, no background thread needed.

**Acceptance criteria**:
- [ ] `MAX_AUDIO_FILES` environment variable controls the limit (default: 100)
- [ ] `cleanup_audio()` function deletes files beyond the limit (both MP3 and sidecar JSON)
- [ ] Cleanup is called after each successful synthesis (lazy)
- [ ] Cleanup preserves the N most recent files
- [ ] Sidecar files are deleted alongside their MP3 counterparts
- [ ] Backend starts without errors
- [ ] No files are deleted if the count is below the limit

**Integration verification**:
- [ ] Backend starts without errors
- [ ] After 101 syntheses, the 101st file exists but the oldest is deleted
- [ ] Sidecar files are deleted alongside MP3 files
- [ ] `GET /api/history` returns only files below the limit

---

### Slice S-06: Frontend — Handle All Error Responses (RC-028, RC-006)

**Type**: AFK
**Blocked by**: None
**User stories**: "As a learner, I get clear error messages when synthesis fails"

**Problem**: The frontend error handling is basic — it shows generic messages for 400, 503, and 500 errors, but doesn't distinguish between specific failure modes (speaker not found, speaker too short, XTTS failed, FFmpeg failed).

**Current code** (`useTtsApi.ts`):
```typescript
const errorMessages: Record<number, string> = {
  400: 'Invalid text for synthesis',
  503: 'Server is currently unavailable',
  500: 'An error occurred on the server'  // ← too generic
}
```

**Target behavior**:
- Distinguish between specific 500 error messages from the backend:
  - `"Speaker WAV file not found"` → "Voice not available. Please select a different voice."
  - `"Speaker WAV file is too short"` → "Voice reference audio is too short. Please select a different voice."
  - `"Failed to generate audio"` → "Speech synthesis failed. Please try again."
  - `"TTS model not ready"` → "Model is loading, please wait..." (503)
  - FFmpeg fallback (intentional) → No error shown (already handled by backend returning MP3)

**Implementation approach**:
1. Update the error handling in `synthesize()` to parse the `detail` field from the backend response.
2. Map specific backend error messages to user-friendly frontend messages.
3. For FFmpeg fallback (backend returns MP3 even if conversion failed), don't show an error — the user gets audio.

**Acceptance criteria**:
- [ ] 500 with `"Speaker WAV file not found"` → "Voice not available. Please select a different voice."
- [ ] 500 with `"Speaker WAV file is too short"` → "Voice reference audio is too short. Please select a different voice."
- [ ] 500 with `"Failed to generate audio"` → "Speech synthesis failed. Please try again."
- [ ] 503 → "Server is currently unavailable" (model loading)
- [ ] 400 → "Invalid text for synthesis"
- [ ] FFmpeg fallback (backend returns MP3) → No error shown to user
- [ ] Connection error → "Unable to connect to the server"
- [ ] All error messages are shown as toasts (via `showToast()`)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Each specific backend error shows the correct user-facing message
- [ ] FFmpeg fallback (MP3 returned) does NOT show an error

---

### Slice S-07: Frontend — Handle Browser Autoplay Blocking (TC-11)

**Type**: AFK
**Blocked by**: None
**User stories**: "As a learner, I understand when the browser blocks autoplay and can manually play the audio"

**Problem**: When the browser blocks autoplay, `audio.play()` throws, the frontend catches the error and shows a toast, but the AudioPlayerPanel does NOT slide up. The user sees no feedback that audio was generated — they just see the Generate button return to normal state.

**Current behavior** (`useAudioModule.ts`):
```typescript
async function play() {
  try {
    await audioRef.value.play()
  } catch (err) {
    error.value = `Unable to play audio: ${msg}`
  }
}
```

**Target behavior**:
- When autoplay is blocked, still show the AudioPlayerPanel (slide up) so the user can manually press play.
- Show a subtle info toast: "Autoplay blocked by browser. Click play to listen."
- The Generate button should return to normal state (generation succeeded, just playback was blocked).

**Implementation approach**:
1. In `handleSynthesize()` (in `index.vue`), after `synthesize()` succeeds, call `audioModule.load(blob)`.
2. Then call `audioModule.play()` — if it throws (autoplay blocked), show an info toast (not error toast).
3. Always show the AudioPlayerPanel (slide up) regardless of autoplay success.

**Acceptance criteria**:
- [ ] AudioPlayerPanel slides up even when autoplay is blocked
- [ ] Info toast shown: "Autoplay blocked by browser. Click play to listen." (info level, not error)
- [ ] Generate button returns to normal state (generation succeeded)
- [ ] User can manually press play on the AudioPlayerPanel
- [ ] When autoplay succeeds, no toast is shown (silent success)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] In a browser that blocks autoplay, the panel slides up and shows a play button
- [ ] No error toast shown (info toast instead)

---

### Slice S-08: Frontend — Keyboard Shortcut + Download UX (TC-12, TC-13)

**Type**: AFK
**Blocked by**: None
**User stories**: "As a learner, I can use Ctrl+Enter to generate speech and download generated audio"

**Problem**: The keyboard shortcut (`Ctrl+Enter`) and download functionality exist in the UI but may not be fully wired up or tested.

**Current behavior**:
- Keyboard shortcut: `@keydown` on root element checks for `Ctrl+Enter` → calls `handleSynthesize()`.
- Download: `audioModule.download()` creates a temporary link and clicks it.

**Target behavior**:
- Verify keyboard shortcut works on all pages (Dashboard placeholder, Playground).
- Verify download works with the new sidecar metadata (filename includes timestamp).
- Add keyboard shortcut documentation (tooltip or help text).

**Implementation approach**:
1. Ensure `@keydown.ctrl.enter` or `@keydown.meta.enter` is wired on all pages that have a text input.
2. Verify `download()` produces a filename with timestamp: `tts_output_{timestamp}.mp3`.
3. Add a subtle help text: "Press Ctrl+Enter to generate" (visible when text input is focused).

**Acceptance criteria**:
- [ ] `Ctrl+Enter` (or `Cmd+Enter` on Mac) triggers synthesis from any page with text input
- [ ] `Cmd+Enter` works on macOS (meta key instead of ctrl)
- [ ] Download produces a file with timestamped filename
- [ ] Help text "Press Ctrl+Enter to generate" is visible when text input is focused (or always visible)
- [ ] Keyboard shortcut is disabled when the form is invalid (same as button disabled state)
- [ ] Download succeeds silently (no error toast, per spec)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Pressing Ctrl+Enter from Playground page triggers synthesis
- [ ] Download button produces a file download with timestamped name
- [ ] Keyboard shortcut is disabled when text is empty or model is loading

---

## Open Questions

1. **Should the frontend expose a language selector?** Currently hardcoded to `'ar'`. A toggle (AR/EN) would be simple (2-state button) and unlocks English synthesis.
2. **Should the seed be exposed in the UI?** Probably not for end users — it's a developer/testing feature. Leave it as a backend default (42).
3. **What is the appropriate `MAX_AUDIO_FILES` limit?** 100 files × ~10MB each = ~1GB. Reasonable for a local deployment. Should this be configurable per deployment?
4. **Should the sidecar JSON use a different naming convention?** Currently `{timestamp}.meta.json` next to `{lang}_{voice}_{timestamp}.mp3`. The timestamp is the linking key. Alternative: embed the timestamp in the sidecar name to match the MP3 filename pattern (e.g., `{lang}_{voice}_{timestamp}.meta.json`).

---

## Test Coverage Plan

Tests should be created in `frontend/tests/` (following project convention):

| Slice | Test File | What to Test |
|-------|-----------|-------------|
| S-01 | (backend test) | Voice resolution: default → first voice, explicit voice, no voices |
| S-02 | (backend test) | Sidecar file creation, history returns text, old files fallback |
| S-03 | `useTtsApiLanguage.test.ts` | `language` field passed to backend, defaults to 'ar' |
| S-04 | `useTtsApiSeed.test.ts` | `seed` field passed to backend, defaults to 42 |
| S-05 | (backend test) | Cleanup removes old files, preserves N most recent, sidecar cleanup |
| S-06 | `useTtsApiErrors.test.ts` | Specific error messages for 500, 503, 400, connection errors |
| S-07 | `AutoplayBlocked.test.ts` | Panel slides up on autoplay failure, info toast shown |
| S-08 | `KeyboardShortcut.test.ts`, `Download.test.ts` | Ctrl+Enter triggers synthesis, download produces timestamped file |

---

## Dependency Graph

```
S-01 (Fix default voice) ──────────────────────────────┐
                                                       │
S-03 (Language field) ─────────────────────────────────┤
                                                       │
S-04 (Seed support) ───────────────────────────────────┤
                                                       │
S-06 (Error handling) ─────────────────────────────────┤
                                                       │
S-07 (Autoplay handling) ──────────────────────────────┤
                                                       │
S-08 (Keyboard + download) ────────────────────────────┤
                                                       │
S-02 (Store text) ◄────────────────────────────────────┘
         │
         ▼
S-05 (Cleanup)
```

**Parallelizable**: S-03, S-04, S-06, S-07, S-08 can all be implemented in parallel (no cross-dependencies).
**Critical path**: S-01 → S-02 → S-05 (fix voice resolution → store text → cleanup old files).

---

## External Dependencies

| Dependency | Source | Status | Notes |
|-----------|--------|--------|-------|
| `POST /api/generate` | Existing backend (`app.py`) | **Available** | Core synthesis endpoint. Needs voice resolution fix (S-01). |
| `GET /api/voices` | Existing backend (`app.py`) | **Available** | Used for default voice selection. |
| `GET /api/history` | Existing backend (`app.py`) | **Available** | Needs text storage (S-02) and cleanup (S-05). |
| `useInputValidation` | Existing composable | **Available** | Validates text before synthesis. |
| `useAudioModule` | Existing composable | **Available** | Handles audio playback, download, waveform. |
| `useToast` | Existing composable | **Available** | Shows user-facing messages. |
| `ModelStatusIndicator` | Existing component | **Available** | Shows model loading state. |
| `GenerateButton` | Existing component | **Available** | Triggers synthesis. |
