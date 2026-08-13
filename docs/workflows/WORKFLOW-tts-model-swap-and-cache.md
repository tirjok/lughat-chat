# WORKFLOW: Replace XTTS-v2 with Chatterbox Multilingual TTS + Synthesis Cache

**Version**: 0.2
**Date**: 2026-08-13
**Author**: Workflow Architect
**Status**: Updated (addresses all review findings from REVIEW-workflow-issues-ADR007-008.md)
**Implements**: ADR-007 (Replace XTTS-v2 with Chatterbox Multilingual TTS) + ADR-008 (Synthesis Cache)

---

## Overview

This workflow defines the complete system journey for replacing the Coqui XTTS-v2 TTS model with Chatterbox Multilingual TTS (0.5B parameters, 23 languages including Arabic) and adding a file-based synthesis cache. The workflow covers: model swap (backend), cache integration (backend), API contract simplification (backend + frontend), voice discovery redesign (backend + frontend), health check adjustment (backend + frontend), removal of the voice cloning pipeline (backend + frontend), removal of speed/pitch control (frontend), Dockerfile rebuild, and cache lifecycle management. It touches 12+ existing components across backend and frontend, the Dockerfile, docker-compose.yml, and all existing tests.

**ADR-007 constraints enforced:**
- C1: Replace `TTS("tts_models/multilingual/xtts_v2")` with `Chatterbox("multilingual")` (0.5B params)
- C2: Remove `speaker_wavs/` directory, `_validate_speaker_wav()`, `SPEAKER_WAV_DIR`
- C3: Remove `speaker`, `speed`, `pitch`, `seed` parameters from `SynthesisRequest`
- C4: Add `language` (default "ar") and `voice` (Chatterbox built-in name) to request
- C5: Health check load time ~30-60s (vs ~120s); polling interval may increase from 2s to 5s
- C6: Frontend `SynthesisRequest` interface changes: `{ text, language?, voice? }`
- C7: Dockerfile: Python 3.11-slim, **keep ffmpeg** (Chatterbox outputs WAV, ffmpeg converts to MP3), add `chatterbox-tts`, `torchaudio`, `librosa`
- C8: Model cache volume path remains `/app/.cache/tts`

**ADR-008 constraints enforced:**
- C1: File-based cache in `downloads/` directory
- C2: Cache key: SHA-256 hash of composite input (`text + language + voice + speed`)
- C3: Hash used as filename: `{hash}.mp3`
- C4: Cache lookup before inference — hit returns cached file, miss triggers synthesis
- C5: Cache entries are regular MP3 files — coexist with existing cleanup mechanism
- C6: No explicit invalidation — stale entries cleaned by orphaned file mechanism
- C7: Composite key must use delimiter (e.g., `|`) to avoid collision from input ordering

---

## Actors

| Actor | Role in this workflow |
|---|---|
| User (Customer) | Interacts with TTS Studio, selects voice, enters text, triggers synthesis |
| Frontend (Nuxt) | SPA shell, composable layer, component layer — sends requests, displays results |
| Nginx | Reverse proxy, streams audio responses, handles SPA fallback |
| Backend (FastAPI) | Receives synthesis requests, checks cache, runs Chatterbox inference, returns MP3 |
| Chatterbox Model | 0.5B parameter multilingual TTS model (CPU inference, 1-3s for 600 chars) |
| File System (`downloads/`) | Stores cached MP3 files, sidecar JSON metadata, orphaned files |
| Docker Compose | Orchestrates backend + frontend containers, manages named volumes |
| Docker Health Check | Monitors backend `/health` endpoint, controls container readiness |

---

## Prerequisites

- [ ] Current XTTS-v2 system is fully operational (baseline)
- [ ] `./run-tests.sh` passes in current state (quality gate)
- [ ] All existing tests pass (zero modifications allowed per AGENTS.md)
- [ ] Docker Compose stack is running (backend + frontend)
- [ ] Chatterbox Multilingual TTS library is available and tested locally
- [ ] Chatterbox model weights for Arabic are downloadable (~500MB)
- [ ] Docker Hub or equivalent registry has `python:3.11-slim` base image

---

## Workflow Tree

### STEP 1: Backend Model Swap (Chatterbox Integration)

**Actor**: Backend (app.py — `lifespan()`)
**Action**: Replace Coqui XTTS-v2 import and model loading with Chatterbox Multilingual TTS.

**Input**: Current `app.py` with `from TTS.api import TTS`, `TTS("tts_models/multilingual/xtts_v2")`
**Output on SUCCESS**: `app.py` imports Chatterbox, loads `Chatterbox("multilingual")` in background thread — GO TO STEP 2

**Output on FAILURE**:
  - `FAILURE(import_error)`: Chatterbox library not installed or incompatible Python version (3.11 required) -> abort, verify Dockerfile installs `chatterbox-tts`
  - `FAILURE(model_download_timeout)`: Chatterbox model weights (~500MB) fail to download within 300s -> retry 3x with exponential backoff (same pattern as XTTS-v2), then set status to "error"
  - `FAILURE(cuda_unavailable)`: Chatterbox attempts GPU initialization on CPU-only container -> verify `CUDA_VISIBLE_DEVICES=""` or equivalent CPU-only flag is set
  - `FAILURE(voice_data_missing)`: Chatterbox Arabic voice data not bundled or not found in cache -> abort, verify model cache volume contains Arabic voice weights

**Observable states during this step**:
  - Customer sees: nothing (backend startup, no visual effect)
  - Operator sees: `app.py` diff showing Chatterbox import, `backend/Dockerfile` diff showing Python 3.11 + new deps
  - Database: no change (model weights stored in `/app/.cache/tts` named volume)
  - Logs: `[backend] Loading Chatterbox multilingual model...`, `[backend] Chatterbox model loaded successfully!`

---

### STEP 2: Remove Voice Cloning Pipeline

**Actor**: Backend (app.py — `generate_speech()`, `discover_voices()`, `_validate_speaker_wav()`)
**Action**: Remove all voice cloning logic: `_validate_speaker_wav()`, `SPEAKER_WAV_DIR`, speaker WAV file lookup, WAV-to-MP3 conversion (ffmpeg), `torch.manual_seed()` seeding, `temperature` parameter.

**Input**: Current `app.py` with speaker WAV validation, WAV-to-MP3 ffmpeg conversion, seed seeding
**Output on SUCCESS**: `generate_speech()` no longer references `speaker_wavs/`, no ffmpeg call, no seed/temperature — GO TO STEP 3

**Output on FAILURE**:
  - `FAILURE(voice_cloning_reference)`: One or more references to `speaker_wavs/` remain in `generate_speech()` -> abort, audit with `grep -rn "speaker_wav\|SPEAKER_WAV" backend/app.py`
  - `FAILURE(ffmpeg_dependency)`: Chatterbox outputs WAV — ffmpeg is still required for WAV→MP3 conversion (per RC-1). Dockerfile must keep ffmpeg.
  - `FAILURE(seed_omission)`: Deterministic seed logic removed but frontend still sends `seed: 42` -> update frontend to not send seed (ADR-007 C3)
  - `FAILURE(temperature_exposure)`: Temperature parameter exposed in API but Chatterbox ignores it -> remove from `SynthesisRequest` Pydantic model (ADR-007 C3)

**Observable states during this step**:
  - Customer sees: nothing (no voice selector change yet — Step 5 handles UI)
  - Operator sees: `app.py` diff showing removed functions, `backend/speaker_wavs/` directory marked for deletion
  - Database: no change
  - Logs: `[backend] generate_speech() no longer validates speaker WAV files`

---

### STEP 3: Implement Synthesis Cache (Cache Lookup)

**Actor**: Backend (app.py — `generate_speech()`)
**Action**: Before running Chatterbox inference, compute SHA-256 hash of composite input (`text + "|" + language + "|" + voice`) and check if `{hash}.mp3` exists in `downloads/`. If found, return the cached file immediately. If not found, proceed to inference (Step 4).

**Input**: Synthesis request with `text`, `language`, `voice`
**Output on SUCCESS**: Cache hit returns cached MP3 file — GO TO STEP 4 (for cache misses)

**Output on FAILURE**:
  - `FAILURE(cache_key_collision)`: Two different composite inputs produce the same SHA-256 hash -> ADR-008 C7 requires delimiter (`|`) in key construction; probability of collision is 2^-128, acceptable
  - `FAILURE(cache_file_corrupted)`: Cached MP3 file exists but is unreadable or truncated -> treat as cache miss, run full synthesis, overwrite corrupted file
  - `FAILURE(cache_dir_not_writable)`: `downloads/` directory is read-only (e.g., Docker volume mounted read-only) -> abort, verify Docker volume mount permissions
  - `FAILURE(cache_hash_computation_error)`: SHA-256 computation fails (e.g., non-UTF-8 text) -> abort, return 400 with error message

**Observable states during this step**:
  - Customer sees: instant playback for repeated requests (cache hit), normal synthesis time for first request (cache miss)
  - Operator sees: `{hash}.mp3` files appearing in `downloads/` after first synthesis
  - Database: no change (files on disk in `/app/downloads/`)
  - Logs: `[backend] Cache HIT for hash=abc123...`, `[backend] Cache MISS for hash=def456...`

---

### STEP 4: Implement Synthesis Cache (Cache Store)

**Actor**: Backend (app.py — `generate_speech()`)
**Action**: After successful Chatterbox inference, save the output MP3 as `{hash}.mp3` in `downloads/`. Write a sidecar JSON metadata file `{hash}.json` containing: `text`, `language`, `voice`, `created_at` (Unix timestamp). Note: `speed` is excluded from the cache key because ADR-007 removes speed control — Chatterbox handles speed internally.

**Input**: Synthesis response (MP3 binary)
**Output on SUCCESS**: `{hash}.mp3` and `{hash}.json` stored in `downloads/` — GO TO STEP 5

**Output on FAILURE**:
  - `FAILURE(cache_write_permission)`: Cannot write to `downloads/` (read-only filesystem) -> log warning, proceed without caching (synthesis succeeds, cache simply not updated)
  - `FAILURE(sidecar_write_error)`: MP3 written but sidecar JSON fails to write -> MP3 is still valid, history browsing will parse filename (existing fallback behavior)
  - `FAILURE(hash_mismatch)`: Computed hash doesn't match filename -> abort, log error, do not store (data integrity violation)

**Observable states during this step**:
  - Customer sees: normal synthesis completes, audio plays
  - Operator sees: `{hash}.mp3` and `{hash}.json` files in `downloads/`
  - Database: no change (files on disk)
  - Logs: `[backend] Cached synthesis: hash=abc123.mp3 (size=45KB)`

---

### STEP 5: Simplify API Contract (Backend)

**Actor**: Backend (app.py — `SynthesisRequest` Pydantic model, `generate_speech()` handler)
**Action**: Replace 6-field `SynthesisRequest` (`text`, `speaker`, `speed`, `pitch`, `seed`, `voice`) with 3-field model (`text`, `language`, `voice`). Remove `speaker` field (alias for `voice`), remove `speed` and `pitch` (ADR-007 removes speed/pitch control), remove `seed` (ADR-007 C4).

**Input**: Current `SynthesisRequest` with 6 fields
**Output on SUCCESS**: `SynthesisRequest` with 3 fields (`text`, `language`, `voice`) — GO TO STEP 6

**Output on FAILURE**:
  - `FAILURE(legacy_client_compatibility)`: Existing frontend sends `speaker`, `speed`, `seed` fields -> update frontend before deployment (ADR-007 C6)
  - `FAILURE(language_restriction)`: Chatterbox doesn't support "ar" or "en" -> verify Chatterbox language IDs match ADR-007 (Arabic = "ar")
  - `FAILURE(voice_default)`: Default voice "female" not available in Chatterbox -> verify Chatterbox built-in voice names, adjust default

**Observable states during this step**:
  - Customer sees: nothing (API contract change, no visual effect)
  - Operator sees: `app.py` diff showing simplified `SynthesisRequest`
  - Database: no change
  - Logs: FastAPI auto-generates new OpenAPI schema

---

### STEP 6: Simplify API Contract (Frontend)

**Actor**: Frontend (composables/useTtsApi.ts, pages/index.vue)
**Action**: Update `SynthesisRequest` interface to `{ text: string, language?: string, voice?: string }`. Update `synthesize()` to send `language` and `voice` instead of `speaker`, `speed`, `seed`. Update `handleSynthesize()` call in `index.vue`.

**Input**: Current `SynthesisRequest` with `text`, `speaker?`, `speed?`, `seed?`
**Output on SUCCESS**: Frontend sends `{ text, language: 'ar', voice: selectedVoice }` — GO TO STEP 7

**Output on FAILURE**:
  - `FAILURE(interface_mismatch)`: Frontend still sends removed fields (`speaker`, `speed`, `seed`) -> backend rejects with 422 (extra fields not allowed by Pydantic strict mode)
  - `FAILURE(voice_binding)`: `selectedSpeaker` variable in `index.vue` not renamed to `selectedVoice` -> update all references (index.vue, DesktopPanels, MobileSplitScreen)
  - `FAILURE(language_hardcoded)`: `language: 'ar'` hardcoded in `useTtsApi.ts` instead of being configurable -> verify PRD requirement (PRD #14: bilingual support required)

**Observable states during this step**:
  - Customer sees: nothing (interface change, no visual effect)
  - Operator sees: `useTtsApi.ts` diff showing new interface, `index.vue` diff showing updated `handleSynthesize()` call
  - Database: no change
  - Logs: Network tab shows new request body format

---

### STEP 7: Redesign Voice Discovery

**Actor**: Backend (app.py — `list_voices()`), Frontend (composables/useVoices.ts, components/VoiceSelector.vue)
**Action**: Replace `discover_voices(SPEAKER_WAV_DIR)` (file-based discovery from `speaker_wavs/`) with Chatterbox's built-in voice list. Backend calls `Chatterbox.list_voices()` (or equivalent API) to get available voices. Frontend `Voice` interface changes: remove `speaker_wav` field, update `loadVoices()` to parse Chatterbox voice data.

**Input**: Current `discover_voices()` scanning `speaker_wavs/` directory for `.wav` files
**Output on SUCCESS**: `GET /api/voices` returns Chatterbox built-in voices (Arabic male/female presets) — GO TO STEP 8

**Output on FAILURE**:
  - `FAILURE(voice_list_api_missing)`: Chatterbox doesn't expose a `list_voices()` API -> hardcode known voice names (per ADR-007: "built-in Arabic voices")
  - `FAILURE(voice_interface_mismatch)`: Frontend `Voice` interface still expects `speaker_wav` field -> update `useVoices.ts` and `VoiceSelector.vue` (ADR-007 C2)
  - `FAILURE(no_arabic_voices)`: Chatterbox doesn't provide Arabic voices -> abort, verify ADR-007 claim (23 languages including Arabic)
  - `FAILURE(voice_selector_broken)`: `VoiceSelector.vue` references `speaker_wav` property for preview icon -> remove preview functionality (PRD: "Voice Preview (Dead Code)" — RF-14 in REGISTRY.md)

**Observable states during this step**:
  - Customer sees: voice dropdown shows Chatterbox built-in voices (e.g., "Arabic Female", "Arabic Male")
  - Operator sees: `GET /api/voices` returns JSON array of Chatterbox voice objects
  - Database: no change
  - Logs: `[backend] Discovered voices: ['arabic_female', 'arabic_male']`

---

### STEP 8: Remove Speed/Pitch Control (Frontend)

**Actor**: Frontend (components/SpeedSlider.vue, DesktopPanels.vue, MobileSplitScreen.vue, index.vue)
**Action**: Remove `SpeedSlider` component from `DesktopPanels.vue` and `MobileSplitScreen.vue`. Remove `speedValue` prop from both components. Remove `speedValue` state from `index.vue`. Remove `update:speedValue` emit from both layout components.

**Input**: Current `DesktopPanels.vue` and `MobileSplitScreen.vue` with `SpeedSlider` component, `speedValue` prop
**Output on SUCCESS**: No `SpeedSlider` references in layout components, no `speedValue` state — GO TO STEP 9

**Output on FAILURE**:
  - `FAILURE(speed_slider_orphan)`: `SpeedSlider.vue` component exists but no component references it -> either remove the file or repurpose (ADR-007: "SpeedSlider.vue: May be removed or repurposed")
  - `FAILURE(speed_prop_leak)`: `speedValue` still passed as prop to `DesktopPanels` or `MobileSplitScreen` -> TypeScript compilation error (prop not defined in interface)
  - `FAILURE(speed_binding_orphan)`: `speedValue` state in `index.vue` not removed -> dead state, wastes memory, may cause confusion

**Observable states during this step**:
  - Customer sees: speed slider removed from TTS Studio UI
  - Operator sees: `SpeedSlider.vue` file marked for deletion or repurposing
  - Database: no change
  - Logs: Nuxt dev server re-compiles without SpeedSlider import

---

### STEP 9: Adjust Health Check Timing

**Actor**: Backend (app.py — `lifespan()`), Frontend (composables/useHealthPoll.ts), Docker Compose (docker-compose.yml)
**Action**: Chatterbox loads in ~30-60s (vs XTTS-v2's ~120s). Adjust:
  - Backend: `MAX_LOAD_RETRIES = 3`, `LOAD_RETRY_DELAYS = [2.0, 4.0, 8.0]`, `LOAD_HARD_TIMEOUT = 300` (keep same — Chatterbox should complete well within 300s)
  - Frontend: `maxRetries` from 150 to ~30-60 (at 5s interval = 150-300s; at 2s interval = 60-120s)
  - Docker: `start_period: 60s` (keep), `retries: 60` (keep — Docker health check is independent of model load)
  - Frontend polling interval: may increase from 2s to 5s (per ADR-007)

**Input**: Current health polling (150 retries × 2s = 300s), backend 300s hard timeout
**Output on SUCCESS**: Frontend polls at 5s interval, max 30-60 retries (150-300s total) — GO TO STEP 10

**Output on FAILURE**:
  - `FAILURE(polling_mismatch)`: Frontend max retries × interval exceeds backend hard timeout -> frontend gives up before backend finishes (current: 150 × 2s = 300s = backend 300s; new: 30 × 5s = 150s < 300s — acceptable, frontend shows "error" while backend still loading)
  - `FAILURE(polling_too_slow)`: 5s interval too slow for user feedback -> keep 2s interval, reduce retries to 60 (120s total)
  - `FAILURE(backend_timeout_mismatch)`: Backend hard timeout reduced below Chatterbox load time -> verify Chatterbox loads within 300s (ADR-007: "~30-60s")

**Observable states during this step**:
  - Customer sees: nothing (health check timing, no visual effect)
  - Operator sees: `docker-compose.yml` health check unchanged (independent), `useHealthPoll.ts` updated retry count
  - Database: no change
  - Logs: `[frontend] Health poll #15/30: status=loading`

---

### STEP 10: Update Dockerfile

**Actor**: DevOps (backend/Dockerfile)
**Action**: Change base image from `python:3.12-slim` to `python:3.11-slim`. Keep ffmpeg installation (Chatterbox outputs WAV, ffmpeg converts to MP3 — per RC-1). Add Chatterbox dependencies: `chatterbox-tts`, `torchaudio`, `librosa`. Remove torchcodec rebuild steps. Keep model cache volume path `/app/.cache/tts`.

**Input**: Current `backend/Dockerfile` (55 lines, Python 3.12, ffmpeg, torchcodec rebuild)
**Output on SUCCESS**: Dockerfile builds successfully, container starts, Chatterbox loads — GO TO STEP 11

**Output on FAILURE**:
  - `FAILURE(python_311_incompatibility)`: Chatterbox requires Python 3.12+ (contradicts ADR-007) -> revert to Python 3.12, verify Chatterbox version compatibility
  - `FAILURE(ffmpeg_still_needed)`: Chatterbox outputs WAV — ffmpeg is required for WAV→MP3 conversion (per RC-1). Dockerfile must keep ffmpeg.
  - `FAILURE(torchcodec_missing)`: Application code imports `torchcodec` (app.py lines 17-22) -> either remove torchcodec references or keep torchcodec build step
  - `FAILURE(dependency_conflict)`: `chatterbox-tts` conflicts with existing `coqui-tts` in `requirements.txt` -> remove `coqui-tts` from requirements.txt (ADR-007 C7)

**Observable states during this step**:
  - Customer sees: nothing (Docker rebuild, no visual effect)
  - Operator sees: Docker image rebuilt (~500MB model vs ~2GB XTTS-v2), container starts in ~30-60s
  - Database: no change (model weights in named volume)
  - Logs: `[backend] Loading Chatterbox multilingual model... (model size: ~500MB)`

---

### STEP 11: Update Frontend Components

**Actor**: Frontend (components/VoiceSelector.vue, components/GenerateButton.vue, pages/index.vue)
**Action**: Update `VoiceSelector.vue` to display Chatterbox built-in voices (no WAV file references). Update `GenerateButton.vue` loading state labels (faster generation time: 1-3s vs several seconds). Update `index.vue` to use `selectedVoice` instead of `selectedSpeaker`.

**Input**: Current `VoiceSelector.vue` (231 lines, WAV file references), `GenerateButton.vue` (163 lines, "Processing Model..." label)
**Output on SUCCESS**: UI displays Chatterbox voices, faster loading labels, correct voice binding — GO TO STEP 12

**Output on FAILURE**:
  - `FAILURE(voice_selector_wav_reference)`: `VoiceSelector.vue` still references `speaker_wav` property -> update to use Chatterbox voice metadata (ADR-007 C2)
  - `FAILURE(generate_button_label)`: "Processing Model..." label misleading (model is loaded, synthesis is in progress) -> update to "Generating Speech..." (PRD #15: "disable the Generate button while speech is being synthesized")
  - `FAILURE(voice_binding_inconsistent)`: `selectedSpeaker` used in `index.vue` but `selectedVoice` in `useTtsApi.ts` -> rename consistently across all components

**Observable states during this step**:
  - Customer sees: voice dropdown shows Chatterbox voices, "Generate Speech" button shows "Generating Speech..." during synthesis
  - Operator sees: `VoiceSelector.vue`, `GenerateButton.vue`, `index.vue` diffs
  - Database: no change
  - Logs: Nuxt dev server re-compiles

---


---

## ABORT_CLEANUP: Model Swap Failure Recovery
**Triggered by**: Any step in STEP 1-16 fails irrecoverably (cannot proceed with partial swap)


**Actions** (in order):
1. Revert `backend/app.py` to XTTS-v2 import and model loading (git revert)
2. Revert `backend/Dockerfile` to Python 3.12 + ffmpeg + new deps (git revert)
3. Revert `backend/requirements.txt` to `coqui-tts` (git revert)
4. Revert `frontend/app/composables/useTtsApi.ts` to old `SynthesisRequest` interface (git revert)
5. Revert `frontend/app/composables/useVoices.ts` to old `Voice` interface (git revert)
6. Revert `frontend/app/pages/index.vue` to `selectedSpeaker` binding (git revert)
7. Revert `frontend/app/components/VoiceSelector.vue` to WAV file references (git revert)
8. Revert `frontend/app/components/SpeedSlider.vue` inclusion in layout components (git revert)
9. Revert `frontend/app/components/SpeedSlider.vue` file (git revert or delete)
10. Revert `frontend/app/components/GenerateButton.vue` labels (git revert)
11. Revert `backend/app.py` history endpoint to old filename parsing (`{lang}_{voice}_{timestamp}.mp3`) and old sidecar format (`pitch`, `seed`, `speed`) (git revert)
12. Revert `frontend/app/composables/useInputValidation.ts` if any validation changes were made (git revert)
13. Revert `frontend/app/components/GenerateButton.vue` cleanup dialog to old XTTS-specific labels (git revert)
**What customer sees**: App reverts to XTTS-v2 behavior (original state)
**What operator sees**: Git diff showing reverted files, Docker Compose stack running with XTTS-v2

---

## State Transitions

### TTS Model States (Post-Swap)

```
[loading] -> (Chatterbox loads in ~30-60s) -> [ready]
[loading] -> (all 3 retries fail, 300s timeout) -> [error]
[error] -> (user triggers /health?reload=1) -> [loading] -> [ready] | [error]
```

### Cache States

```
[no cache entry] -> (first synthesis) -> [cached: {hash}.mp3 + {hash}.json]
[cached: {hash}.mp3] -> (cache hit) -> [served from cache]
[cached: {hash}.mp3] -> (24h TTL expires) -> [deleted by cleanup]
[cached: {hash}.mp3] -> (model format changes) -> [silently incompatible — acceptable]
```

### Audio Generation States (Post-Swap)

```
[idle] -> (user clicks "Generate Speech") -> [loading (synthesizing)]
[loading] -> (cache hit) -> [playing (instant)]
[loading] -> (cache miss, synthesis complete) -> [playing (1-3s)]
[loading] -> (503 model not ready) -> [error]
[loading] -> (422 validation error) -> [error]
[loading] -> (500 synthesis error) -> [error]
[error] -> (user clears text, retries) -> [idle]
```

---

## Handoff Contracts

### Frontend → Backend: Synthesis Request

**Endpoint**: `POST /api/generate`
**Payload**:
```json
{
  "text": "مرحبا بك في لغةات",
  "language": "ar",
  "voice": "female"
}
```
**Field constraints**:
- `text`: string, min 1 char, max 3000 chars
- `language`: string, default "ar", pattern "^(ar|en)$"
- `voice`: string, default "female", Chatterbox built-in voice name

**Success response**: `audio/mpeg` binary (FileResponse), filename: `{hash}.mp3`
**Failure response**:
```json
{
  "detail": "string — error description"
}
```
**Failure codes**:
- `422`: Validation error (missing text, too long, invalid language)
- `503`: TTS model not ready (loading or error state)
- `500`: Synthesis error (Chatterbox failure, cache write failure)

**Timeout**: 1800s (30min) — Nginx `proxy_read_timeout` (current setting, more than sufficient for 1-3s synthesis)

---

### Frontend → Backend: Voice List

**Endpoint**: `GET /api/voices`
**Payload**: None
**Success response**:
```json
[
 !  { "id": "arabic_female", "name": "Arabic Female" },
  { "id": "arabic_male", "name": "Arabic Male" }
]
```
**Failure response**:
```json
{
  "detail": "string — error description"
}
```
**Failure codes**:
- `500`: Chatterbox voice list retrieval failed

**Timeout**: 30s (Nginx default for `/api/*`)

---

### Frontend → Backend: Health Check

**Endpoint**: `GET /health`
**Payload**: None (optional `?reload=1` to trigger reload)
**Success response**:
```json
{
  "status": "loading" | "ready" | "error",
  "model_loaded": boolean
}
```
**Failure response**: HTTP non-200 (network error)
**Timeout**: 30s (Nginx `/health` proxy timeout)

---

### Backend → File System: Cache Store

**Handoff**: `generate_speech()` → `downloads/` directory
**Payload**: `{hash}.mp3` (binary MP3), `{hash}.json` (sidecar metadata)
**Sidecar JSON**:
```json
{
  "text": "مرحبا بك في لغةات",
  "language": "ar",
  "voice": "female",
  "speed": 1.0,
  "created_at": "1723456789"
}
```
**Success**: Files written to `downloads/`
**Failure**: Log warning, proceed without caching (synthesis succeeds)
**Timeout**: N/A (file system operation, typically < 100ms)

---

### Backend → File System: Cache Lookup


---

### STEP 12: Update Generation History and Cleanup

**Actor**: Backend (app.py — `get_history()`, `cleanup_old_files()`)
**Action**: Update history endpoint to parse cache-based filenames (`{hash}.mp3`) instead of voice-based filenames (`{lang}_{voice}_{timestamp}.mp3`). Update sidecar JSON to store cache key fields (`text`, `language`, `voice`) instead of XTTS-specific fields (`pitch`, `seed`, `speed`). Cleanup endpoint already handles `.mp3` and `.json` files — no change needed for file extension matching.

**Input**: Current `get_history()` parsing `{lang}_{voice}_{timestamp}.mp3` format
**Output on SUCCESS**: History displays cache-based entries with correct metadata — GO TO STEP 13

**Output on FAILURE**:
  - `FAILURE(history_parsing_break)`: `get_history()` filename parsing logic `{lang}_{voice}_{timestamp}` doesn't match `{hash}.mp3` -> update parsing to handle hash-based filenames (fallback: use sidecar JSON)
  - `FAILURE(sidecar_format_mismatch)`: Old sidecar JSON files contain `pitch`, `seed` fields -> handle gracefully (ignore unknown fields, use available data)
  - `FAILURE(legacy_file_orphan)`: Old XTTS-v2 MP3 files remain in `downloads/` -> they will be cleaned by 24h TTL cleanup mechanism (existing behavior)

**Observable states during this step**:
  - Customer sees: generation history shows cache-based entries (hash filenames)
  - Operator sees: `get_history()` returns entries with `{hash}.mp3` filenames
  - Database: no change (files on disk)
  - Logs: `[backend] History: hash=abc123.mp3 (cached synthesis)`

---

### STEP 13: Frontend Application Lifecycle (No Change Required)

**Actor**: Frontend (pages/index.vue — `onUnmounted`, `onBeforeRouteLeave`)
**Action**: No changes required. The existing cleanup navigation logic (`useCleanupNavigation`) and audio module disposal (`audioModule.dispose()`) work with the new cache-based synthesis. The `isGenerating` state and `playerVisible` state remain unchanged.

**Input**: Current `index.vue` cleanup logic
**Output on SUCCESS**: Navigation during synthesis still triggers cleanup dialog — GO TO STEP 14

**Output on FAILURE**:
  - `FAILURE(cleanup_dialog_break)`: Cleanup dialog references `speaker_wavs/` or XTTS-specific paths -> verify dialog only calls `/api/cleanup` (file system operation, model-agnostic)
  - `FAILURE(audio_module_break)`: `useAudioModule` depends on XTTS-specific blob format -> verify `useAudioModule.load(blob)` accepts any MP3 blob (model-agnostic)

**Observable states during this step**:
  - Customer sees: navigation during synthesis still shows cleanup dialog (no change)
  - Operator sees: no diff in `index.vue` cleanup logic
  - Database: no change
  - Logs: No change

---

### STEP 14: Cache Lifecycle and Disk Space Management

**Actor**: Backend (app.py — `cleanup_old_files()`), Docker (named volumes)
**Action**: Existing 24h TTL cleanup mechanism handles cache entries. Cache entries are regular MP3 files in `downloads/` — they coexist with the existing cleanup mechanism. No new cleanup logic needed. However, verify that the cleanup mechanism handles cache-based filenames (`{hash}.mp3`) correctly (it does — it matches `*.mp3` extension).

**Input**: Current `cleanup_old_files()` scanning `downloads/` for `.mp3` files older than 24h
**Output on SUCCESS**: Cache entries cleaned up by existing 24h TTL mechanism — GO TO STEP 15

**Output on FAILURE**:
  - `FAILURE(cache_grows_unbounded)`: Unique content daily fills `downloads/` over time -> verify disk space limits, consider adding max file count or size limit (PRD: "Disk space grows unbounded as students generate unique content")
  - `FAILURE(legacy_xtts_files)`: Old XTTS-v2 MP3 files (`{lang}_{voice}_{timestamp}.mp3`) not matched by cleanup -> verify cleanup matches `*.mp3` (it does — all MP3 files are cleaned)
  - `FAILURE(sidecar_orphan)`: Cache-based `.json` sidecar files not cleaned with `.mp3` -> verify cleanup removes `.json` files alongside `.mp3` (it does — `f"{filename}.json"`)

**Observable states during this step**:
  - Customer sees: nothing (cleanup runs silently)
  - Operator sees: `downloads/` directory size stable (old files cleaned)
  - Database: no change (files on disk)
  - Logs: `[backend] Cleaned up old file: abc123.mp3 (age: 25.3h)`

---

### STEP 15: Perth Watermark Handling

**Actor**: Backend (Chatterbox model output)
**Action**: Chatterbox embeds imperceptible Perth watermarks in every audio output. This is a consequence of using Chatterbox — it does NOT affect audio quality or playback. No code changes required. Document as a known characteristic. Covered by TC-23.

**Input**: Chatterbox model output (WAV → MP3)
**Output on SUCCESS**: All synthesized audio contains Perth watermark (imperceptible) — GO TO STEP 16

**Output on FAILURE**:
  - `FAILURE(watermark_detectable)`: Perth watermark becomes audible -> abort, verify Chatterbox version (watermark is imperceptible per ADR-007)
  - `FAILURE(watermark_privacy)`: Watermark encodes generation metadata that could be extracted -> document as privacy consideration (PRD: "acceptable for this use case")

**Observable states during this step**:
  - Customer sees: nothing (watermark is imperceptible)
  - Operator sees: audio files contain Perth watermark (detectable by `perth` library if needed)
  - Database: no change
  - Logs: No log entry (watermark is embedded in audio data)

---

### STEP 16: Frontend Validation (No Change Required)

**Actor**: Frontend (composables/useInputValidation.ts)
**Action**: No changes required. The validation logic checks `text` length and `modelStatus`. The new `SynthesisRequest` still requires `text` (min 1, max 3000). The validation state (`isValid`, `error`) remains the same.

**Input**: Current `useInputValidation.ts` checking text length and model status
**Output on SUCCESS**: Validation works identically with new API — (final step, no next step)

**Output on FAILURE**:
  - `FAILURE(validation_language_check)`: Validation doesn't check `language` field -> verify language is validated at API level (422 on invalid language), not frontend level
  - `FAILURE(validation_voice_check)`: Validation doesn't check `voice` field -> verify voice is validated at API level (default "female" if not provided)

**Observable states during this step**:
  - Customer sees: validation works identically (character count, color warnings, error messages)
  - Operator sees: no diff in `useInputValidation.ts`
  - Database: no change
  - Logs: No change

---

---

## State Transitions

### TTS Model States (Post-Swap)

```
[loading] -> (Chatterbox loads in ~30-60s) -> [ready]
[loading] -> (all 3 retries fail, 300s timeout) -> [error]
[error] -> (user triggers /health?reload=1) -> [loading] -> [ready] | [error]
```

### Cache States

```
[no cache entry] -> (first synthesis) -> [cached: {hash}.mp3 + {hash}.json]
[cached: {hash}.mp3] -> (cache hit) -> [served from cache]
[cached: {hash}.mp3] -> (24h TTL expires) -> [deleted by cleanup]
[cached: {hash}.mp3] -> (model format changes) -> [silently incompatible — acceptable]
```

### Audio Generation States (Post-Swap)

```
[idle] -> (user clicks "Generate Speech") -> [loading (synthesizing)]
[loading] -> (cache hit) -> [playing (instant)]
[loading] -> (cache miss, synthesis complete) -> [playing (1-3s)]
[loading] -> (503 model not ready) -> [error]
[loading] -> (422 validation error) -> [error]
[loading] -> (500 synthesis error) -> [error]
[error] -> (user clears text, retries) -> [idle]
```

---

## Handoff Contracts

### Frontend → Backend: Synthesis Request

**Endpoint**: `POST /api/generate`
**Payload**:
```json
{
  "text": "مرحبا بك في لغةات",
  "language": "ar",
  "voice": "female"
}
```
**Field constraints**:
- `text`: string, min 1 char, max 3000 chars
- `language`: string, default "ar", pattern "^(ar|en)$"
- `voice`: string, default "female", Chatterbox built-in voice name

**Success response**: `audio/mpeg` binary (FileResponse), filename: `{hash}.mp3`
**Failure response**:
```json
{
  "detail": "string — error description"
}
```
**Failure codes**:
- `422`: Validation error (missing text, too long, invalid language)
- `503`: TTS model not ready (loading or error state)
- `500`: Synthesis error (Chatterbox failure, cache write failure)

**Timeout**: 1800s (30min) — Nginx `proxy_read_timeout` (current setting, more than sufficient for 1-3s synthesis)

---

### Frontend → Backend: Voice List

**Endpoint**: `GET /api/voices`
**Payload**: None
**Success response**:
```json
[
  { "id": "arabic_female", "name": "Arabic Female" },
  { "id": "arabic_male", "name": "Arabic Male" }
]
```
**Failure response**:
```json
{
  "detail": "string — error description"
}
```
**Failure codes**:
- `500`: Chatterbox voice list retrieval failed

**Timeout**: 30s (Nginx default for `/api/*`)

---

### Frontend → Backend: Health Check

**Endpoint**: `GET /health`
**Payload**: None (optional `?reload=1` to trigger reload)
**Success response**:
```json
{
  "status": "loading" | "ready" | "error",
  "model_loaded": boolean
}
```
**Failure response**: HTTP non-200 (network error)
**Timeout**: 30s (Nginx `/health` proxy timeout)

---

### Backend → File System: Cache Store

**Handoff**: `generate_speech()` → `downloads/` directory
**Payload**: `{hash}.mp3` (binary MP3), `{hash}.json` (sidecar metadata)
**Sidecar JSON**:
```json
{
  "text": "مرحبا بك في لغةات",
  "language": "ar",
  "voice": "female",
  "created_at": "1723456789"
}
```
**Success**: Files written to `downloads/`
**Failure**: Log warning, proceed without caching (synthesis succeeds)
**Timeout**: N/A (file system operation, typically < 100ms)

---

### Backend → File System: Cache Lookup

**Handoff**: `generate_speech()` → `downloads/` directory
**Payload**: `{hash}.mp3` (check existence)
**Success**: File exists → return cached MP3
**Failure**: File not found → proceed to synthesis (cache miss)
**Timeout**: N/A (file system operation, typically < 1ms)

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Chatterbox model weights | STEP 1 (Docker build) | Docker volume `tts-model-cache` (named volume) | Volume deletion or Docker `docker system prune` |
| Cached MP3 files | STEP 6 (cache store) | `cleanup_old_files()` (24h TTL) | `os.remove()` (existing cleanup endpoint) |
| Cache sidecar JSON | STEP 6 (cache store) | `cleanup_old_files()` (24h TTL) | `os.remove()` (existing cleanup endpoint) |
| Old XTTS-v2 model weights | STEP 1 (Docker build) | Docker volume `tts-model-cache` (named volume) | Volume deletion or Docker `docker system prune` |
| Old XTTS-v2 cached MP3 files | Pre-existing | `cleanup_old_files()` (24h TTL) | `os.remove()` (existing cleanup endpoint) |
| Old speaker WAV files | Pre-existing | Manual deletion (no longer needed) | `rm -rf backend/speaker_wavs/` |
| `app.py` history endpoint | STEP 12 | ABORT_CLEANUP | `os.remove()` (revert to old filename parsing) |
| `useInputValidation.ts` | STEP 16 | ABORT_CLEANUP | `os.remove()` (revert if any validation changes) |
| `GenerateButton.vue` cleanup dialog | STEP 13 | ABORT_CLEANUP | `os.remove()` (revert to old labels) |
| `app.py` sidecar format | STEP 12 | ABORT_CLEANUP | `os.remove()` (revert to old sidecar format) |

---

## Reality Checker Findings

| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | Chatterbox outputs WAV, not MP3 directly — ffmpeg conversion is still needed | High | STEP 2, STEP 10 | ADR-007 claims "no ffmpeg needed" but Chatterbox outputs WAV. FFmpeg is still required for WAV→MP3 conversion. Dockerfile must keep ffmpeg. |
| RC-2 | Current `app.py` imports `wave` module (line 14) for speaker WAV validation — this import must be removed along with `_validate_speaker_wav()` | Medium | STEP 2 | Wave module import is only used for speaker WAV duration validation. Remove import when removing validation. |
| RC-3 | Current `app.py` sets `COQUI_TTS_CACHE` environment variable (line 188) — this must be replaced with Chatterbox cache path | Medium | STEP 1 | Chatterbox may use a different cache environment variable. Verify Chatterbox documentation. |
| RC-4 | Current `app.py` uses `torch.manual_seed()` (line 393) — this is removed per ADR-007 C4, but Chatterbox may have its own determinism mechanism | Low | STEP 2 | Chatterbox is deterministic by default (per PRD #13). No seed control needed. |
| RC-5 | Current `app.py` has `COQUI_TOS_AGREED=1` environment variable — this is Chatterbox-specific (not Coqui). Verify Chatterbox doesn't require a TOS agreement. | Low | STEP 10 | Chatterbox (Resemble AI) is MIT-licensed, no TOS agreement needed. Remove `COQUI_TOS_AGREED` from docker-compose.yml. |
| RC-6 | Current `app.py` mounts `/speaker_wavs` as a static directory (line 240-243) — this mount must be removed from both `app.py` and `docker-compose.yml` | Medium | STEP 2, STEP 10 | Remove `app.mount("/speaker_wavs", ...)` and `./backend/speaker_wavs:/app/speaker_wavs` from docker-compose.yml. |
| RC-7 | Current `useTtsApi.ts` hardcodes `language: 'ar'` in the fetch body (line 43) — this is acceptable as default but must allow override | Low | STEP 8 | PRD #14 requires bilingual support (Arabic + English). `language` must be configurable, not hardcoded. |
| RC-8 | Current `index.vue` passes `seed: 42` to `synthesize()` (line 110) — this must be removed per ADR-007 C4 | Medium | STEP 8 | Remove `seed: 42` from `handleSynthesize()` call. |
| RC-9 | Current `app.py` `SynthesisRequest` accepts both `voice` and `speaker` fields (lines 250-255) — `speaker` is an alias for `voice` in current code | Low | STEP 7 | Remove `speaker` field from `SynthesisRequest`. Keep only `voice`. |
| RC-10 | Current `app.py` `generate_speech()` creates both `.mp3` and `.json` sidecar files — cache-based filenames (`{hash}.mp3`) change the sidecar naming convention | Medium | STEP 12 | Sidecar should be `{hash}.json` (matching cache filename), not `{lang}_{voice}_{timestamp}.json`. |

---

## Test Cases

| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — cache miss | Valid text, no cache entry, model ready | Chatterbox runs, MP3 stored as `{hash}.mp3`, sidecar `{hash}.json` written, audio returned |
| TC-02: Cache hit | Same text+language+voice as cached entry | Cached `{hash}.mp3` returned immediately (no Chatterbox inference) |
| TC-03: Cache key collision avoidance | Two different inputs that could collide without delimiter | Delimiter (`|`) in composite key prevents collision: `"ab|female"` ≠ `"a|bfemale"` |
| TC-04: Validation — missing text | Empty or missing `text` field | 422 returned, no synthesis attempted |
| TC-05: Validation — text too long | `text` exceeds 3000 characters | 422 returned, no synthesis attempted |
| TC-06: Validation — invalid language | `language` not "ar" or "en" | 422 returned, no synthesis attempted |
| TC-07: Model not ready | Model in "loading" or "error" state | 503 returned, no synthesis attempted |
| TC-08: Default parameters | Only `text` provided (no `language`, no `voice`) | Defaults: `language="ar"`, `voice="female"` |
| TC-09: Custom voice | `voice="male"` provided | Chatterbox uses male voice |
| TC-10: English synthesis | `language="en"` provided | Chatterbox synthesizes in English |
| TC-11: Cache write failure | `downloads/` is read-only | Synthesis succeeds, cache not updated (logged warning) |
| TC-12: Cache file corrupted | Cached `{hash}.mp3` exists but is unreadable | Treated as cache miss, full synthesis runs, corrupted file overwritten |
| TC-13: Sidecar write failure | MP3 written but JSON sidecar fails | MP3 is valid, history falls back to filename parsing |
| TC-14: Old XTTS-v2 files coexist | Old `{lang}_{voice}_{timestamp}.mp3` files in `downloads/` | 24h TTL cleanup removes old files; new cache files coexist |
| TC-15: Health check timing | Model loads in ~30-60s | Frontend polling (5s interval, 30-60 retries = 150-300s) covers load time |
| TC-16: Voice list from Chatterbox | `GET /api/voices` called | Returns Chatterbox built-in voices (not WAV file discovery) |
| TC-17: Frontend interface change | Frontend sends `{ text, language, voice }` | Backend accepts new interface, rejects old fields (`speaker`, `speed`, `seed`) |
| TC-18: Speed slider removed | `SpeedSlider` component not rendered | No speed control in UI, Chatterbox uses default speed |
| TC-19: Docker rebuild | `docker compose up --build` | Backend container starts with Python 3.11, Chatterbox loads successfully |
| TC-20: Model swap rollback | Chatterbox fails to load after 3 retries | System reverts to XTTS-v2 (git revert + Docker restart) |
| TC-21: Concurrent synthesis | Multiple synthesis requests simultaneously | `_model_lock` serializes access (existing behavior, unchanged) |
| TC-22: Client disconnect during synthesis | Client disconnects before response delivered | Orphan cleanup removes `{hash}.mp3` and `{hash}.json` (existing behavior, unchanged) |
| TC-23: Perth watermark present | Synthesized audio examined with `perth` library | Watermark present in every output (imperceptible, per ADR-007) |
| TC-24: Model format compatibility | Old cache entries from XTTS-v2 era | Old cache entries are silently incompatible (acceptable per ADR-008) |
| TC-25: CPU-only operation (RC-1) | Docker container starts without GPU | Chatterbox initializes on CPU, no CUDA error. Verify `CUDA_VISIBLE_DEVICES=""` or equivalent. |
| TC-26: Arabic voice data available (RC-2) | `GET /api/voices` called | Chatterbox returns Arabic voices (at least male + female). If none, swap fails. |
| TC-27: No speaker_wavs references remain (RC-3) | Codebase scan after swap | `grep -rn "speaker_wav\|SPEAKER_WAV" backend/app.py` returns zero matches. |
| TC-28: Non-UTF-8 text hash computation (RC-4) | Text containing non-UTF-8 bytes | Hash computation handles encoding gracefully (returns 400 on failure). |
| TC-29: Hash-filename consistency (RC-5) | Cache store step | Computed hash matches the `.mp3` filename exactly. Mismatch aborts storage. |
| TC-30: 500 synthesis error handling (RC-6) | Chatterbox crashes during inference | 500 returned to frontend, error toast shown, orphan cleanup runs. |
| TC-31: Volume path mismatch (RC-7) | Docker container restarts | Chatterbox respects `/app/.cache/tts` volume path — model weights persist. |
| TC-32: ABORT_CLEANUP procedure (RC-8) | Step 1-16 irrecoverable failure | 13-file git revert + Docker restart successfully restores XTTS-v2. |
| TC-33: ffmpeg present in built image (RC-9) | Docker container runs synthesis | `ffmpeg` binary available in container for WAV→MP3 conversion. |
| TC-34: Cache key excludes speed (RC-10) | Synthesis with different speed values | Cache hit works regardless of speed because speed is excluded from key (Chatterbox handles speed internally). |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | Chatterbox outputs WAV format (not MP3) — ffmpeg conversion is still needed | **Verified** — RC-1 confirms Chatterbox outputs WAV. FFmpeg is required for WAV→MP3 conversion. Dockerfile must keep ffmpeg. |
| A2 | Chatterbox Arabic support uses `language_id="ar"` (same as Coqui XTTS) | **Not verified** — Chatterbox language IDs may differ from Coqui. | If language ID differs, `language` validation pattern must be updated. |
| A3 | Chatterbox model weights download within 300s (same as XTTS-v2 hard timeout) | **Not verified** — Chatterbox is ~500MB (vs ~2GB XTTS-v2), should be faster. | If download exceeds 300s, increase `LOAD_HARD_TIMEOUT`. |
| A4 | Chatterbox provides Arabic voices (at least one male, one female) | **Not verified** — ADR-007 claims "23 languages including Arabic" but doesn't specify voice count. TC-26 verifies. | If no Arabic voices, the swap fails. |
| A5 | Chatterbox is deterministic by default (same input → same output) | **Not verified** — PRD #13 states "same Arabic text with same voice to produce identical audio output". Cache key excludes `speed` because ADR-007 removes speed control. | If not deterministic, cache keys may not match on retry. |
| A6 | Chatterbox loads in ~30-60s (vs XTTS-v2's ~120s) | **Not verified** — ADR-007 states this but no benchmark data provided. TC-15 verifies polling covers load time. | If load time exceeds 300s, frontend polling may need adjustment. |
| A7 | Chatterbox cache path can be configured via environment variable (like `COQUI_TTS_CACHE`) | **Not verified** — Chatterbox may use a different cache mechanism. TC-31 verifies Chatterbox respects `/app/.cache/tts`. | If cache path is hardcoded, Docker volume mount may not persist model weights. |
| A8 | Chatterbox doesn't require a TOS agreement (unlike Coqui) | **Not verified** — Coqui requires `COQUI_TOS_AGREED=1`. Chatterbox is MIT-licensed. TC-19 verifies Docker build without TOS variable. | If Chatterbox requires TOS, docker-compose.yml must set the appropriate variable. |
| A9 | Chatterbox exposes a `list_voices()` API (or equivalent) | **Not verified** — Chatterbox may not expose a voice listing API. TC-16 verifies voices are returned. | If no API, voices must be hardcoded (less flexible). |
| A10 | Chatterbox Perth watermark is truly imperceptible | **Not verified** — ADR-007 claims this but no audio analysis performed. TC-23 verifies presence via `perth` library. | If watermark is audible, user experience degrades. |
| A11 | Chatterbox CPU inference time for 3000-char Arabic text is < 30s (within Nginx 1800s timeout) | **Not verified** — ADR-007 claims 1-3s for 600 chars; 3000 chars may be slower. | If synthesis exceeds 1800s, Nginx returns 504. |
| A12 | Python 3.11 is compatible with Chatterbox and all dependencies | **Not verified** — ADR-007 specifies Python 3.11-slim. TC-19 verifies Docker build succeeds. | If Chatterbox requires Python 3.12+, Dockerfile must use 3.12. |
| A13 | `chatterbox-tts` package name is correct on PyPI | **Not verified** — Chatterbox may be distributed under a different package name. TC-19 verifies Docker build. | If package name is wrong, Docker build fails. |
| A14 | Existing 24h TTL cleanup handles cache-based filenames (`{hash}.mp3`) | **Verified** — cleanup matches `*.mp3` extension (all MP3 files cleaned). Low risk. |
| A15 | Docker named volume `tts-model-cache` persists Chatterbox model weights across restarts | **Not verified** — Volume path `/app/.cache/tts` was configured for Coqui XTTS. TC-31 verifies Chatterbox respects this path. | If Chatterbox caches to a different path, model must re-download on every restart. |
| A16 | Chatterbox returns 500 on synthesis failure (not crash silently) | **Not verified** — TC-30 verifies 500 response is returned to frontend. |

---

## Open Questions

1. **Chatterbox language IDs**: Does Arabic use `language_id="ar"` (same as Coqui) or a different identifier? (A2)
2. **Chatterbox model cache path**: What environment variable or configuration controls Chatterbox model cache location? Does `/app/.cache/tts` work? (A7, A15)
3. **Chatterbox TOS**: Does Chatterbox require any terms-of-service agreement (unlike Coqui's `COQUI_TOS_AGREED`)? (A8)
4. **Chatterbox inference time for 3000-char text**: ADR-007 claims 1-3s for 600 chars. What about 3000 chars (max length)? (A11)
5. **Concurrent synthesis under cache**: If 10 users request the same cached text simultaneously, does the cache serve all 10 from disk, or does the first one trigger synthesis while the other 9 wait?
6. **Docker volume `tts-audio-cache` size at scale**: How large does `downloads/` grow with cache-based filenames? Is there a maximum size limit?
7. **Existing tests that reference `speaker_wavs/`**: How many existing tests create mock WAV files? All `test_generate.py` tests that use `_setup_mock_model()` and `_make_mock_wav()` must be rewritten.

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|---|---|---|
| 2026-08-12 | Initial spec created from codebase scan | — |
| 2026-08-12 | RC-1: Chatterbox outputs WAV, ffmpeg still needed | Flagged in Reality Checker Findings |
| 2026-08-12 | RC-6: `speaker_wavs/` static mount must be removed from docker-compose.yml | Flagged in Reality Checker Findings |
| 2026-08-12 | RC-8: `index.vue` passes `seed: 42` — must be removed | Flagged in Reality Checker Findings |
| 2026-08-12 | RC-7: `useTtsApi.ts` hardcodes `language: 'ar'` — must be configurable | Flagged in Reality Checker Findings |
| 2026-08-13 | v0.2: All review findings addressed — 10 new test cases (TC-25 through TC-34), 1 ABORT_CLEANUP procedure test (TC-32), dependency order fixed (STEP 3/4 before STEP 5/6), ADR-007 C7 corrected (ffmpeg kept), speed excluded from cache key | Updated spec with TC-25 through TC-34, fixed step numbering, resolved A1 via RC-1 |
