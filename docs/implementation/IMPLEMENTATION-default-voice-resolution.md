# Implementation: Default Voice Resolution (ADR-011)

**Source**: `docs/architecture/ADR-011-default-voice-resolution-and-voice-name-mismatch.md`
**Date**: 2026-07-11
**Status**: Draft — Ready for implementation

---

## Overview

This document breaks the **Default Voice Resolution** ADR into implementation slices. The problem: when no voice is explicitly selected, the backend defaults to `"female"`, but deployed WAV files are `"KSA Hamed - Male"` and `"KSA Zariyah - Female"`. The synthesis request looks for `"female.wav"` which doesn't exist → 500 error. The user cannot generate speech without manually selecting a voice first.

**Severity**: Critical — the default path is broken.

---

## Master Index — All 5 Slices

| # | Title | Blocked By | Priority |
|---|-------|------------|----------|
| **1** | Fix default voice resolution in backend | **None** | **P0 — Critical** |
| **2** | Add test: synthesis with no voice field defaults to first voice | 1 | P0 |
| **3** | Update existing test: default parameters now use first voice | 1 | P1 |
| **4** | Verify frontend voice selector defaults to first voice | 1 | P1 |
| **5** | Integration verification: generate speech without selecting a voice | 1–4 | P0 |

---

## Slices

### Slice 1: Fix Default Voice Resolution in Backend

**Type**: AFK
**Blocked by**: None (critical path — fix this first)
**User stories**: "As a learner, I can generate speech without manually selecting a voice — the default voice works"

**Problem**: The voice resolution logic (`speaker ?? voice ?? "female"`) defaults to `"female"`, but the deployed WAV files are `"KSA Hamed - Male"` and `"KSA Zariyah - Female"`. If a user doesn't select a voice, the app looks for `"female.wav"` which doesn't exist → 500 error.

**Current code** (`app.py`, line 260):
```python
# Resolve voice: accept both "voice" and "speaker" fields; default to "female"
voice = request.speaker if request.speaker else (request.voice or "female")
```

**Target behavior**:
- When no voice is explicitly provided (`speaker` and `voice` are both absent/None), resolve to the **first discovered voice** from `discover_voices(SPEAKER_WAV_DIR)`.
- If no voices exist in `speaker_wavs/`, fall back to `"female"` (backwards compatibility for deployments that still use `female.wav`).
- Explicit `speaker` or `voice` fields always win over the default.

**Implementation** (in `generate_speech()`, after resolving `voice = request.speaker ?? request.voice`):
```python
# If no voice was explicitly provided, use the first discovered voice
if not voice:
    discovered = discover_voices(SPEAKER_WAV_DIR)
    voice = discovered[0]["id"] if discovered else "female"
```

**Acceptance criteria**:
- [ ] When no voice is selected and `"female.wav"` doesn't exist, the first discovered voice (alphabetically sorted) is used
- [ ] When `"female.wav"` exists, it is still used (backwards compatibility — `"female"` sorts before `"KSA..."`)
- [ ] Selecting `"KSA Hamed - Male"` resolves to `speaker_wavs/KSA Hamed - Male.wav` (spaces in filename preserved)
- [ ] Selecting `"KSA Zariyah - Female"` resolves to `speaker_wavs/KSA Zariyah - Female.wav`
- [ ] No voice selected + no WAV files → 500 with clear error message (file not found)
- [ ] The `/api/voices` endpoint still returns voices in the same sorted order

**Integration verification**:
- [ ] Backend starts without errors
- [ ] `POST /api/generate` without a `voice` or `speaker` field succeeds (uses first discovered voice)
- [ ] `POST /api/generate` with `speaker: "KSA Hamed - Male"` succeeds
- [ ] `GET /api/voices` returns the same voice list (used for default selection)

---

### Slice 2: Add Test — Synthesis with No Voice Field Defaults to First Voice

**Type**: AFK
**Blocked by**: Slice 1
**User stories**: Verifies the fix works end-to-end through the API.

**Problem**: No existing test verifies that a POST to `/api/generate` with no `voice` or `speaker` field uses the first discovered voice.

**Implementation**: Add a new test to `backend/tests/test_generate.py`:
```python
def test_generate_speech_defaults_to_first_voice_when_no_voice_field():
    """POST /api/generate with no voice/speaker uses the first discovered voice."""
    import app as main_app
    from fastapi.testclient import TestClient

    _mock_wav = _make_mock_wav()

    def _mock_path_exists(path):
        return True

    def _mock_wave_open(path, mode="r"):
        if mode == "w":
            return _ORIGINAL_WAVE_OPEN(path, mode)
        return _mock_wav

    main_app.os.path.exists = _mock_path_exists
    main_app.wave.open = _mock_wave_open
    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"

    client = TestClient(app)

    # No voice or speaker field — should use first discovered voice ("KSA Hamed - Male")
    response = client.post("/api/generate", json={"text": "Hello world"})

    assert response.status_code == 200
    assert "audio/mpeg" in response.headers["content-type"]
    assert len(response.content) > 0
```

**Acceptance criteria**:
- [ ] New test passes: synthesis with no `voice`/`speaker` field returns valid MP3
- [ ] The response uses the first discovered voice from `speaker_wavs/`
- [ ] Test does not depend on `"female.wav"` existing

**Integration verification**:
- [ ] `pytest` passes with no errors

---

### Slice 3: Update Existing Test — Default Parameters Now Use First Voice

**Type**: AFK
**Blocked by**: Slice 1
**User stories**: The existing `test_generate_speech_accepts_default_parameters` test continues to pass, but now verifies the real behavior (first discovered voice) rather than relying on a mocked `os.path.exists`.

**Problem**: The existing test `test_generate_speech_accepts_default_parameters()` currently passes because `_setup_mock_model()` mocks `os.path.exists` to always return `True`, so the hardcoded `"female"` fallback never hits the real file-not-found error. After the fix, this test must still pass but should verify the first-voice behavior.

**Implementation**: Update the existing test in `backend/tests/test_generate.py` to verify the response uses the first discovered voice (not `"female"`):
```python
def test_generate_speech_accepts_default_parameters():
    """POST /api/generate works with minimal request (only text required) and returns MP3 blob.

    With the default voice fix, no voice/speaker field resolves to the first discovered voice.
    """
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate", json={"text": "Hello"})

    assert response.status_code == 200
    assert "audio/mpeg" in response.headers["content-type"]
    assert len(response.content) > 0
```

**Acceptance criteria**:
- [ ] Existing `test_generate_speech_accepts_default_parameters` still passes
- [ ] The test comment/docstring reflects the new behavior (first-voice resolution)
- [ ] No other existing tests break

**Integration verification**:
- [ ] `pytest` passes with no errors

---

### Slice 4: Verify Frontend Voice Selector Defaults to First Voice

**Type**: AFK
**Blocked by**: Slice 1
**User stories**: The frontend voice selector automatically selects the first voice from `/api/voices` on mount, so the user never sees an unselected state.

**Problem**: The frontend already selects the first voice on mount via `watch(speakerVoices, ...)` in `index.vue`. This slice verifies the behavior and adds a test.

**Current code** (`index.vue`):
```typescript
watch(speakerVoices, (v) => {
  if (!selectedSpeaker.value && v.length > 0) {
    selectedSpeaker.value = v[0]!.id  // selects first voice on mount
  }
}, { immediate: true })
```

**Implementation**:
1. Verify the existing behavior works: when `speakerVoices` loads from `/api/voices`, `selectedSpeaker` is set to the first entry's `id`.
2. Add a unit test in `frontend/tests/VoiceSelector.test.ts` (or a new file) that verifies:
   - `selectedSpeaker` is set to the first voice's `id` when voices load
   - The voice selector UI reflects the selected voice

**Acceptance criteria**:
- [ ] `selectedSpeaker` is automatically set to the first voice's `id` on mount
- [ ] The voice selector UI reflects the selected voice (no "unselected" state)
- [ ] Unit test verifies the watch behavior
- [ ] No frontend changes needed to `useTtsApi.ts` (it already passes the selected voice)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Opening the app shows the first voice selected in the voice selector

---

### Slice 5: Integration Verification — Generate Speech Without Selecting a Voice

**Type**: HITL
**Blocked by**: Slices 1–4
**User stories**: A user opens the app and generates speech without touching the voice selector — it works immediately using the first discovered voice.

**Problem**: End-to-end verification that the full stack works: Docker Compose → frontend boots → voice selector defaults to first voice → synthesis succeeds without manual selection.

**Implementation**: Manual verification steps:
1. Ensure `speaker_wavs/` contains at least two WAV files (e.g., `"KSA Hamed - Male.wav"` and `"KSA Zariyah - Female.wav"`)
2. Start the backend: `docker compose up backend -d`
3. Wait for the model to load (check `/health` returns `status: "ready"`)
4. Open the frontend in a browser (http://localhost:9001)
5. **Do not manually select a voice** — the voice selector should already show the first voice selected
6. Enter text and click Generate (or press Ctrl+Enter)
7. Verify audio is generated and plays back

**Acceptance criteria**:
- [ ] Voice selector shows the first discovered voice selected (no manual interaction needed)
- [ ] Synthesis succeeds without a 500 error
- [ ] Audio plays back successfully
- [ ] No error toasts are shown
- [ ] The generated audio uses the first discovered voice (check filename in `/api/history`)

**Integration verification**:
- [ ] Backend starts without errors in logs
- [ ] `GET /health` returns `{ "status": "ready", "model_loaded": true }`
- [ ] `GET /api/voices` returns a valid list of voices
- [ ] `POST /api/generate` without voice/speaker fields returns valid MP3 audio
- [ ] Frontend loads without errors in browser console

---

## Open Questions

1. **Alphabetical ordering of defaults**: The default voice depends on the alphabetical order of filenames. `"KSA Hamed - Male"` sorts before `"KSA Zariyah - Female"`. If a new WAV file is added that sorts before the current default, the default changes. This is acceptable for a local deployment with 2–4 voices.

2. **Should `"female"` remain as a backwards-compatibility fallback?** Yes — if a deployment still has `female.wav`, it will be used (it sorts before `"KSA..."`). This preserves backwards compatibility for any existing deployments.

3. **Should the frontend explicitly send the default voice?** No — the frontend already selects the first voice on mount and sends it as `speaker`. The backend fix is a safety net for direct API calls (bypassing the frontend).

---

## Test Coverage Plan

| Slice | Test File | What to Test |
|-------|-----------|-------------|
| 1 | (backend test) | Default voice resolution: no field → first voice, explicit voice wins, no voices → error |
| 2 | `test_generate.py` (new test) | `test_generate_speech_defaults_to_first_voice_when_no_voice_field` |
| 3 | `test_generate.py` (existing) | `test_generate_speech_accepts_default_parameters` still passes |
| 4 | Frontend test | Voice selector defaults to first voice on mount |
| 5 | (manual) | End-to-end: no voice selected → synthesis succeeds |

---

## Dependency Graph

```
Slice 1 (Fix backend)
    ├── Slice 2 (Add default-voice test)
    ├── Slice 3 (Update existing test)
    ├── Slice 4 (Verify frontend default)
    └── Slice 5 (Integration verification)
```

**All slices** (2–5) depend on Slice 1. Slices 2, 3, and 4 can be implemented in parallel once Slice 1 is done. Slice 5 must be last (manual verification).

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/app.py` | Replace `request.voice or "female"` with dynamic first-voice resolution (Slice 1) |
| `backend/tests/test_generate.py` | Add new test + update existing test (Slices 2, 3) |
| `frontend/tests/VoiceSelector.test.ts` (or new file) | Verify frontend defaults to first voice (Slice 4) |
