# WORKFLOW: Voice Discovery & Selection

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: GET /api/voices — filesystem-scoped voice discovery

---

## Overview

When the frontend loads, it fetches the list of available voices from `/api/voices`. The backend scans the `speaker_wavs/` directory for `.wav` files and returns a list of voice entries. This workflow covers voice discovery, selection, and the lifecycle of speaker reference audio files.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Frontend (`useVoices()`) | Fetches `/api/voices` on mount; populates VoiceSelector |
| Frontend (VoiceSelector) | Dropdown UI for voice selection; displays voice name, icon, color |
| Backend (FastAPI) | Scans `speaker_wavs/` for `.wav` files; returns voice list |
| Operator | Places `.wav` files in `speaker_wavs/` directory |
| `generate_speaker_wavs.py` | Generates speaker reference WAV files from TTS model |

---

## Prerequisites

- `speaker_wavs/` directory exists (or is creatable) in the backend container
- `.wav` files are placed in `speaker_wavs/` (manually or via generator script)
- WAV files meet XTTS-v2 minimum duration (>= 0.33s)

---

## Trigger

Frontend `useVoices()` runs `loadVoices()` on `onMounted` (runs once).

---

## Workflow Tree

### STEP 1: Voice Discovery (Backend)
**Actor**: FastAPI (`list_voices()` endpoint)
**Action**: Scans `speaker_wavs/` directory for `.wav` files; parses filename to extract voice ID; returns list of voice entries
**Timeout**: N/A (fast, directory scan)
**Input**: (none); reads `speaker_wavs/` directory
**Output on SUCCESS**: Array of `{ id, name, dialect, tag, icon, speaker_wav }`
**Output on FAILURE**: HTTP 500 — filesystem read error

**Observable states during this step**:
- Customer sees: N/A (backend processing is invisible)
- Operator sees: `.wav` files in `speaker_wavs/` directory
- Database: N/A
- Logs: (none — directory scan is silent)

---

### STEP 2: Voice List Returned to Frontend
**Actor**: FastAPI (response)
**Action**: Returns JSON array of voice entries
**Timeout**: N/A (fast)
**Input**: (none)
**Output on SUCCESS**: `{ id, name, dialect, tag, icon, speaker_wav }[]`
**Output on FAILURE**: HTTP 500

**Observable states during this step**:
- Customer sees: N/A (response is consumed by composable)
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 3: Frontend Populates Voice Selector
**Actor**: `useVoices()` (frontend)
**Action**: Receives voice list; populates `voices` ref; if no voice is pre-selected, defaults to first voice
**Timeout**: N/A (synchronous)
**Input**: `{ id, name, dialect, tag, icon, speaker_wav }[]`
**Output on SUCCESS**: `voices` ref populated; `selectedSpeaker` set to first voice (if empty) → WORKFLOW COMPLETE
**Output on FAILURE**:
  - `FAILURE(load_error)`: Network error → `error` ref set; console.error logged; voice selector shows empty state

**Observable states during this step**:
- Customer sees: Voice selector dropdown populates with discovered voices; first voice auto-selected
- Operator sees: N/A
- Database: N/A
- Logs: `"Failed to load voices: {error}"` (console.error, if load fails)

---

### STEP 4: Voice Selection (UI)
**Actor**: Frontend (VoiceSelector component)
**Action**: User clicks dropdown; selects a voice; `update:modelValue` emitted with selected voice ID
**Timeout**: N/A (synchronous)
**Input**: Voice ID string
**Output on SUCCESS**: `selectedSpeaker` updated; GenerateButton re-evaluates validation (voice change doesn't affect validation)
**Output on FAILURE**: N/A (selection is synchronous)

**Observable states during this step**:
- Customer sees: Dropdown shows selected voice name; color-coded icon (orange for female, magenta for male)
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 5: Adding New Voices (Operator Action)
**Actor**: Operator
**Action**: Places a `.wav` file in `speaker_wavs/` directory (manually or via `generate_speaker_wavs.py`)
**Timeout**: N/A (file system operation)
**Input**: `.wav` file (>= 0.33s duration)
**Output on SUCCESS**: File appears in `speaker_wavs/`; next `/api/voices` call discovers it
**Output on FAILURE**:
  - `FAILURE(wav_too_short)`: WAV duration < 0.33s → file discovered but rejected at generation time
  - `FAILURE(wav_invalid_format)`: Not a valid WAV file → file discovered but may fail at generation time

**Observable states during this step**:
- Customer sees: N/A (voice not discovered until page refresh or voice reload)
- Operator sees: New `.wav` file in `speaker_wavs/` directory
- Database: N/A
- Logs: (none)

---

## State Transitions

```
[No voices] -> (GET /api/voices returns []) -> [Empty] (no voices available)
[No voices] -> (GET /api/voices returns voices) -> [Loaded] (voices in selector)
[Loaded] -> (operator adds .wav) -> [Loaded] (next /api/voices call discovers it)
[Loaded] -> (operator removes .wav) -> [Loaded] (next /api/voices call no longer includes it)
[Loaded] -> (voice selected) -> [Selected] (selectedSpeaker set)
```

---

## Handoff Contracts

### Backend → Frontend: Voice Discovery (`GET /api/voices`)
**Endpoint**: `GET /api/voices`
**Payload**: (none)
**Success response**:
```json
[
  {
    "id": "KSA Hamed - Male",
    "name": "KSA Hamed",
    "dialect": "Arabic (Saudi)",
    "tag": "male",
    "icon": "ph-microphone",
    "speaker_wav": "KSA Hamed - Male.wav"
  }
]
```
**Failure response**:
```json
{
  "detail": "string (filesystem error)"
}
```
**Status code**: 500 (filesystem error)
**Timeout**: N/A (fast, directory scan)
**On Failure**: Frontend sets error ref; console.error logged; voice selector shows empty state

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Speaker WAV file | Operator places in `speaker_wavs/` | Operator removes or replaces | `os.remove(filepath)` |

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: Voices exist | `speaker_wavs/` contains .wav files | Voice selector populates with discovered voices |
| TC-02: No voices | `speaker_wavs/` is empty | Voice selector shows empty state |
| TC-03: Voice load fails | /api/voices returns error | Voice selector shows empty state; console.error logged |
| TC-04: First voice auto-selected | No pre-selected voice | First voice in list is selected by default |
| TC-05: New voice added | Operator places new .wav in `speaker_wavs/` | Next /api/voices call discovers new voice |
| TC-06: Voice removed | Operator removes .wav from `speaker_wavs/` | Next /api/voices call no longer includes removed voice |
| TC-07: Short WAV file | WAV duration < 0.33s | Voice is discovered but rejected at generation time (not at discovery time) |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | Voice discovery is file-based (no database) | `app.py:116-129` (`discover_voices()`) | Renaming .wav files changes voice ID (no aliasing) |
| A2 | Only `.wav` files are discovered | `app.py:124` (`str.endswith('.wav')`) | Other audio formats (.mp3, .flac) are ignored |
| A3 | Voice ID = filename (without .wav extension) | `app.py:125` | Filenames with special characters may cause issues |
| A4 | Speaker WAV files are mounted from host into container | `docker-compose.yml` mounts `./backend/speaker_wavs:/app/speaker_wavs` | If mount fails (read-only filesystem), voices not discoverable |

---

## Open Questions

1. Should voice metadata (name, dialect, icon) be stored alongside the WAV file (e.g., in a .json sidecar)? (Currently: hardcoded in backend `discover_voices()`.)

2. Should there be a UI for managing voices (upload, rename, delete)? (Currently: no — manual file placement only.)

3. Should the frontend retry voice loading if it fails? (Currently: no — runs once on mount.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `backend/app.py:328-331` and `useVoices.ts` | Documented that voice metadata is hardcoded in backend; no sidecar metadata for voices |
