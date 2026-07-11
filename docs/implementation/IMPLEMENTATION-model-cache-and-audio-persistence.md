# Implementation: Model Cache Volume, Audio Persistence, and FFmpeg Fallback (ADR-012)

**Source**: `docs/architecture/ADR-012-model-cache-volume-and-audio-persistence.md`
**Date**: 2026-07-11
**Status**: Draft — Ready for implementation

---

## Overview

This document breaks the **Model Cache Volume, Audio Persistence, and FFmpeg Fallback** ADR into implementation slices. Four related issues affect the backend's audio generation and persistence:

- **RC-5 (Docker)**: Named volume `tts-model-cache` mounted at `/root/.local/share/tts` but app writes to `/app/.cache/tts` — volume is unused, ~2GB re-downloaded on every restart
- **RC-1 (Synthesis)**: `/api/history` always returns `text: ""` — original synthesized text is lost
- **RC-4 (Synthesis)**: FFmpeg fallback copies WAV to `.mp3` extension — browser may not decode
- **RC-5 (Synthesis)**: No rate limiting on `/api/generate` — disk fills indefinitely

---

## Master Index — All 5 Slices

| # | Title | Blocked By | Priority |
|---|-------|------------|----------|
| **1** | Fix model cache volume mount path (Docker Compose) | **None** | **P0 — Critical** |
| **2** | Store original text with generated audio (sidecar JSON) | **None** | P1 |
| **3** | Fix FFmpeg fallback — return WAV with correct Content-Type | 2 | P1 |
| **4** | Add audio file cleanup (lazy, keep N most recent) | 2 | P1 |
| **5** | Integration verification: end-to-end persistence + history | 1–4 | P0 |

---

## Slices

### Slice 1: Fix Model Cache Volume Mount Path (Docker Compose)

**Type**: AFK
**Blocked by**: None
**User stories**: "As an operator, the TTS model persists across container restarts — subsequent startups load in ~10–30 seconds instead of re-downloading ~2GB"

**Problem**: The Docker Compose configuration mounts the `tts-model-cache` named volume at `/root/.local/share/tts` inside the backend container, but the application writes model files to `/app/.cache/tts` (set via the `TTS_MODEL_CACHE` environment variable). This path mismatch means the named volume is **completely unused** — the ~2GB TTS model is re-downloaded on every container restart.

**Current code** (`docker-compose.yml`):
```yaml
volumes:
  - tts-model-cache:/root/.local/share/tts   # ← WRONG PATH
environment:
  - TTS_MODEL_CACHE=/app/.cache/tts           # ← App writes here, volume mounts elsewhere
```

**Target behavior**: Change the volume mount to `/app/.cache/tts` to match the env var. No backend code changes needed — `app.py` already reads `TTS_MODEL_CACHE` env var.

**Implementation** (in `docker-compose.yml`, backend service volumes):
```yaml
volumes:
  - tts-model-cache:/app/.cache/tts           # ← FIXED: matches env var
```

**Acceptance criteria**:
- [ ] `docker-compose.yml` mounts `tts-model-cache` at `/app/.cache/tts` (not `/root/.local/share/tts`)
- [ ] The `TTS_MODEL_CACHE` env var remains set to `/app/.cache/tts` (unchanged)
- [ ] `docker compose config` validates without errors
- [ ] Migration step documented: `docker volume rm` the old (empty) volume, then `docker compose up`

**Integration verification**:
- [ ] `docker compose up backend -d` starts without errors
- [ ] Model files are written to `/app/.cache/tts` inside the container
- [ ] The named volume `tts-model-cache` is actually used (not dangling)

---

### Slice 2: Store Original Text with Generated Audio (Sidecar JSON)

**Type**: AFK
**Blocked by**: None
**User stories**: "As a learner, I can see what text was synthesized for each file in my audio history"

**Problem**: The `/api/history` endpoint returns `text: ""` for every entry because the original synthesized text is not stored with the generated audio file. The filename `{lang}_{voice}_{timestamp}.mp3` contains only metadata (language, voice, timestamp) — no text content.

**Current code** (`app.py`, `generate_speech()` and `get_history()`):
```python
# In generate_speech():
filename = f"{lang_code}_{voice}_{timestamp}.mp3"

# In get_history():
items.append({
    "filename": filename,
    "text": "",  # We don't store the original text
    ...
})
```

**Target behavior**: Write a sidecar JSON file next to each generated MP3 containing the original text and metadata. Read it back in `get_history()`.

**Implementation** (in `app.py`):

In `generate_speech()` (after creating the MP3):
```python
import json

meta = {
    "text": request.text,
    "language": request.language,
    "voice": voice,
    "speed": request.speed,
    "pitch": request.pitch,
    "seed": request.seed if request.seed is not None else 42,
    "created_at": str(int(stat.mp3_path.st_mtime))
}
meta_path = f"{AUDIO_DIR}/{timestamp}.meta.json"
with open(meta_path, "w") as f:
    json.dump(meta, f, ensure_ascii=False)
```

In `get_history()` (read sidecar):
```python
meta_path = f"{AUDIO_DIR}/{timestamp}.meta.json"
text = ""
if os.path.exists(meta_path):
    with open(meta_path) as f:
        text = json.load(f).get("text", "")
```

**Sidecar format** (`{timestamp}.meta.json`):
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

**Acceptance criteria**:
- [ ] `POST /api/generate` writes a sidecar `{timestamp}.meta.json` file next to the MP3
- [ ] Sidecar contains: `text`, `language`, `voice`, `speed`, `pitch`, `seed`, `created_at`
- [ ] `GET /api/history` reads sidecar files and returns `text` field (not empty string)
- [ ] Old MP3 files (without sidecar) still return `text: ""` (graceful fallback)
- [ ] Sidecar files use `ensure_ascii=False` for Arabic text preservation

**Integration verification**:
- [ ] Backend starts without errors
- [ ] `POST /api/generate` with text → MP3 + sidecar file created in downloads directory
- [ ] `GET /api/history` returns text from sidecar file (not empty string)

---

### Slice 3: Fix FFmpeg Fallback — Return WAV with Correct Content-Type

**Type**: AFK
**Blocked by**: Slice 2 (sidecar must be written before the fallback path returns)
**User stories**: "As a learner, audio plays correctly in all browsers, even when FFmpeg fails"

**Problem**: When FFmpeg conversion fails, the backend copies the WAV file to `.mp3` extension as a fallback. The browser receives `Content-Type: audio/mpeg` but the file content is actually WAV — the browser may not decode it correctly (silent or garbled audio).

**Current code** (`app.py`, `generate_speech()`):
```python
except subprocess.CalledProcessError as e:
    print(f"FFmpeg error: {e.stderr}")
    shutil.copy2(wav_path, mp3_path)  # ← Copies WAV as .mp3 — wrong Content-Type
```

**Target behavior**: When FFmpeg fails, return the WAV file with `Content-Type: audio/wav` instead of copying to `.mp3`.

**Implementation** (in `app.py`, `generate_speech()`):
```python
except subprocess.CalledProcessError as e:
    print(f"FFmpeg error: {e.stderr}")
    # Return WAV with correct content type instead of broken .mp3
    return FileResponse(path=wav_path, media_type="audio/wav", filename=f"{lang_code}_{voice}_{timestamp}.wav")
```

**Acceptance criteria**:
- [ ] When FFmpeg fails, the response is `audio/wav` (not `audio/mpeg`)
- [ ] The WAV file is returned with the correct filename (`.wav` extension)
- [ ] The WAV file plays correctly in all browsers
- [ ] The sidecar JSON is still written (if FFmpeg fails, the WAV was generated by TTS)
- [ ] The error is logged to stderr (existing behavior preserved)

**Integration verification**:
- [ ] Backend starts without errors
- [ ] If FFmpeg is unavailable, `POST /api/generate` returns `audio/wav` (not broken `.mp3`)
- [ ] Audio plays correctly in Chrome, Firefox, and Safari

---

### Slice 4: Add Audio File Cleanup (Lazy, Keep N Most Recent)

**Type**: AFK
**Blocked by**: Slice 2 (cleanup must understand sidecar files to clean them up too)
**User stories**: "As an operator, the audio cache stays bounded — disk doesn't fill indefinitely"

**Problem**: Generated MP3 files in `tts-audio-cache` are never cleaned up. The volume grows without bound, potentially filling the disk and causing container errors.

**Current behavior**: `get_history()` lists all files in `/app/downloads/` — no cleanup logic exists.

**Target behavior**: Implement lazy cleanup after each successful synthesis. Keep the N most recent files (configurable via `MAX_AUDIO_FILES` env var, default: 100). Delete older files and their sidecar metadata files.

**Implementation** (in `app.py`):
```python
import os

MAX_AUDIO_FILES = int(os.environ.get("MAX_AUDIO_FILES", "100"))

def cleanup_audio():
    """Remove files beyond MAX_AUDIO_FILES, keeping the most recent."""
    try:
        all_files = [
            f for f in os.listdir(AUDIO_DIR)
            if f.endswith((".mp3", ".wav", ".meta.json"))
        ]
        # Sort by modification time, newest first
        all_files.sort(
            key=lambda f: os.path.getmtime(os.path.join(AUDIO_DIR, f)),
            reverse=True
        )
        # Delete files beyond the limit
        for f in all_files[MAX_AUDIO_FILES:]:
            os.remove(os.path.join(AUDIO_DIR, f))
    except OSError:
        pass  # Directory doesn't exist or is read-only — ignore

# Call cleanup_audio() at the end of generate_speech()
```

**Acceptance criteria**:
- [ ] `MAX_AUDIO_FILES` environment variable controls the limit (default: 100)
- [ ] `cleanup_audio()` function deletes files beyond the limit (both MP3/WAV and `.meta.json`)
- [ ] Cleanup is called after each successful synthesis (lazy)
- [ ] Cleanup preserves the N most recent files
- [ ] Sidecar files (`.meta.json`) are deleted alongside their MP3 counterparts
- [ ] No files are deleted if the count is below the limit
- [ ] Backend starts without errors (cleanup is called in a try/except)

**Integration verification**:
- [ ] Backend starts without errors
- [ ] After 101 syntheses, the 101st file exists but the oldest is deleted
- [ ] Sidecar files are deleted alongside MP3 files
- [ ] `GET /api/history` returns only files below the limit

---

### Slice 5: Integration Verification — End-to-End Persistence + History

**Type**: HITL
**Blocked by**: Slices 1–4
**User stories**: A user generates speech, checks history, restarts the backend, and verifies the model loads from cache (fast) and audio persists.

**Problem**: End-to-end verification that all four fixes work together: model cache persists, text is stored in history, audio plays in all browsers, and disk stays bounded.

**Implementation**: Manual verification steps:

**Part A — Model Cache Persistence**:
1. Run `docker compose down` and `docker volume rm tts-model-cache` (simulate first startup)
2. Run `docker compose up backend -d`
3. Wait for model to download (~5–10 minutes), verify `/health` returns `status: "ready"`
4. Record the time it took for the model to load
5. Run `docker compose down` and `docker compose up backend -d` again
6. Verify the model loads from cache in ~10–30 seconds (not re-downloading)

**Part B — Audio History with Text**:
1. Generate 3–5 audio files with different text via `POST /api/generate`
2. Call `GET /api/history` and verify each entry has a non-empty `text` field
3. Verify the text matches what was sent in the synthesis request

**Part C — FFmpeg Fallback**:
1. If possible, verify that when FFmpeg is unavailable, the response is `audio/wav` and plays correctly
2. Verify that when FFmpeg is available, MP3 files are returned with `audio/mpeg`

**Part D — Disk Cleanup**:
1. Generate enough files to exceed `MAX_AUDIO_FILES` (default: 100)
2. Verify that old files are deleted (both MP3 and `.meta.json`)
3. Verify the total disk usage stays within bounds

**Acceptance criteria**:
- [ ] Model cache persists across restarts (subsequent startup < 30 seconds)
- [ ] Audio history returns non-empty `text` for all generated files
- [ ] Old audio files are cleaned up when exceeding `MAX_AUDIO_FILES`
- [ ] Sidecar files are cleaned up alongside their MP3 counterparts
- [ ] WAV fallback plays correctly in all browsers (if FFmpeg unavailable)
- [ ] No errors in backend logs

**Integration verification**:
- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API (`/api/generate`, `/api/history`) returns valid responses
- [ ] `docker compose up` completes with both frontend and backend running

---

## Open Questions

1. **What is the appropriate `MAX_AUDIO_FILES` limit?** 100 files × ~10MB each = ~1GB. Reasonable for a local deployment. Should this be configurable per deployment? (Answer: Yes, via `MAX_AUDIO_FILES` env var.)

2. **Should the sidecar JSON use a different naming convention?** Currently `{timestamp}.meta.json` next to `{lang}_{voice}_{timestamp}.mp3`. The timestamp is the linking key. Alternative: embed the timestamp in the sidecar name to match the MP3 filename pattern (e.g., `{lang}_{voice}_{timestamp}.meta.json`). (Answer: Keep `{timestamp}.meta.json` — simpler, timestamp is the linking key.)

3. **Should the cleanup also delete orphaned sidecar files (without MP3)?** Currently cleanup deletes all files beyond the limit, including sidecars. This handles the case where a sidecar exists without an MP3 (e.g., if synthesis failed after writing the sidecar). (Answer: Yes, cleanup deletes all file types beyond the limit.)

---

## Test Coverage Plan

| Slice | Test File | What to Test |
|-------|-----------|-------------|
| 1 | (none — Docker Compose change) | `docker compose config` validates, volume mounts at correct path |
| 2 | `backend/tests/test_history.py` (new test) | Sidecar file created, history returns text, old files fallback |
| 3 | `backend/tests/test_generate.py` (new test) | FFmpeg fallback returns `audio/wav` with correct Content-Type |
| 4 | `backend/tests/test_history.py` (new test) | Cleanup removes old files, preserves N most recent, sidecar cleanup |
| 5 | (manual) | End-to-end: model cache persists, history has text, disk stays bounded |

---

## Dependency Graph

```
Slice 1 (Fix volume path) ───────────────────────────────┐
                                                          │
Slice 2 (Sidecar JSON) ◄──────────────────────────────────┤
         │                                                │
         ├─ Slice 3 (FFmpeg fallback)                     │
         │                                                │
         └─ Slice 4 (Cleanup)                             │
                                                          │
Slice 5 (Integration verification) ◄──────────────────────┘
```

**Parallelizable**: Slices 1, 2 can be implemented in parallel. Slices 3 and 4 both depend on 2 (cleanup needs to understand sidecar files; FFmpeg fallback is independent of 2 but the sidecar should be written before the fallback path returns). Slice 5 must be last (manual verification).

**Critical path**: 1 → 2 → 3/4 → 5.

---

## Files to Modify

| File | Change |
|------|--------|
| `docker-compose.yml` | Change volume mount path from `/root/.local/share/tts` to `/app/.cache/tts` (Slice 1) |
| `backend/app.py` | Add sidecar JSON write/read, fix FFmpeg fallback, add `cleanup_audio()` (Slices 2–4) |
| `backend/tests/test_history.py` | Add tests for sidecar text, cleanup (Slices 2, 4) |
| `backend/tests/test_generate.py` | Add test for FFmpeg fallback (Slice 3) |

---

## Migration Steps (One-Time)

1. **Fix model cache volume path** (Slice 1):
   ```bash
   docker volume rm arabic-tts-models  # Delete the (empty) existing volume
   docker compose up -d backend        # Re-create with correct path
   ```
2. **Deploy the backend changes** (Slices 2–4: sidecar JSON, FFmpeg fix, cleanup).
3. **Verify** — First restart downloads ~2GB (expected), second restart loads from cache (< 30 seconds).
