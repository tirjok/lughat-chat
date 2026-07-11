# ADR-012: Model Cache Volume Path, Audio Persistence, and FFmpeg Fallback

## Status

**Approved** — 2026-07-11

Addresses:
- **RC-004** (High): Named volume `tts-model-cache` mounted at `/root/.local/share/tts` but app writes to `/app/.cache/tts` — volume is unused
- **RC-005** (High): `/api/history` always returns `text: ""` — original synthesized text is lost
- **RC-006** (Medium): FFmpeg fallback copies WAV to `.mp3` extension — browser may not decode
- **RC-007** (Medium): No rate limiting on `/api/generate` — disk fills indefinitely

---

## Context

Four related issues affect the backend's audio generation and persistence:

### RC-004: Model Cache Volume Path Mismatch

The Docker Compose configuration mounts the `tts-model-cache` named volume at `/root/.local/share/tts` inside the backend container, but the application writes model files to `/app/.cache/tts` (set via the `TTS_MODEL_CACHE` environment variable). This path mismatch means the named volume is **completely unused** — the ~2GB TTS model is re-downloaded on every container restart.

**Current code** (`docker-compose.yml`):
```yaml
volumes:
  - tts-model-cache:/root/.local/share/tts   # ← WRONG PATH
environment:
  - TTS_MODEL_CACHE=/app/.cache/tts           # ← App writes here, volume mounts elsewhere
```

**Impact**: Every container restart re-downloads ~2GB, adding ~2 minutes to every startup. The model cache volume is defined but does nothing.

### RC-005: Original Text Lost in History

The `/api/history` endpoint returns `text: ""` for every entry because the original synthesized text is not stored with the generated audio file. The filename `{lang}_{voice}_{timestamp}.mp3` contains only metadata (language, voice, timestamp) — no text content.

**Current code** (`app.py`):
```python
items.append({
    "filename": filename,
    "text": "",  # We don't store the original text
    "language": language,
    "voice": voice,
    ...
})
```

**Impact**: Users cannot see what text was synthesized for each audio file in their history. This breaks the ability to review past generations.

### RC-006: FFmpeg Fallback Produces Invalid MP3

When FFmpeg conversion fails, the backend copies the WAV file to `.mp3` extension as a fallback. The browser receives `Content-Type: audio/mpeg` but the file content is actually WAV — the browser may not decode it correctly.

**Current code** (`app.py`):
```python
except subprocess.CalledProcessError as e:
    print(f"FFmpeg error: {e.stderr}")
    shutil.copy2(wav_path, mp3_path)  # ← Copies WAV as .mp3
```

**Impact**: On some browsers, the audio plays as silent or garbled noise. On others, it may fail entirely.

### RC-007: No Rate Limiting — Disk Fills Indefinitely

Generated MP3 files in `tts-audio-cache` are never cleaned up. The volume grows without bound, potentially filling the disk.

**Current behavior**: `get_history()` lists all files in `/app/downloads/` — no cleanup logic exists.

**Impact**: After many generations, the Docker volume fills up, causing container errors and potential system instability.

---

## Decision

### We choose: Three-Part Fix

1. **Fix the model cache volume path** (RC-004) — Change the volume mount to `/app/.cache/tts` to match the env var
2. **Store original text with audio files** (RC-005) — Write sidecar JSON files next to each MP3
3. **Add audio file cleanup** (RC-007) — Keep the N most recent files, delete older ones
4. **Fix FFmpeg fallback** (RC-006) — Return the WAV file with correct `Content-Type: audio/wav` instead of copying to `.mp3`

### 1. Fix Model Cache Volume Path

Change the volume mount in `docker-compose.yml` from `/root/.local/share/tts` to `/app/.cache/tts`:

```yaml
volumes:
  - tts-model-cache:/app/.cache/tts           # ← FIXED: matches env var
```

No backend code changes needed — `app.py` already reads `TTS_MODEL_CACHE` env var.

### 2. Store Original Text with Audio Files (Sidecar JSON)

Write a sidecar JSON file next to each generated MP3 containing the original text and metadata:

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

**In `generate_speech()`** (after creating MP3):
```python
meta = {
    "text": request.text,
    "language": request.language,
    "voice": voice,
    "speed": request.speed,
    "pitch": request.pitch,
    "seed": request.seed or 42,
    "created_at": str(int(stat.st_mtime))
}
with open(f"{AUDIO_DIR}/{timestamp}.meta.json", "w") as f:
    json.dump(meta, f, ensure_ascii=False)
```

**In `get_history()`** (read sidecar):
```python
meta_path = f"{AUDIO_DIR}/{timestamp}.meta.json"
text = ""
if os.path.exists(meta_path):
    with open(meta_path) as f:
        text = json.load(f).get("text", "")
```

### 3. Add Audio File Cleanup

Implement lazy cleanup after each successful synthesis:

```python
MAX_AUDIO_FILES = int(os.environ.get("MAX_AUDIO_FILES", "100"))

def cleanup_audio():
    files = sorted(
        [f for f in os.listdir(AUDIO_DIR) if f.endswith((".mp3", ".meta.json"))],
        key=lambda f: os.path.getmtime(os.path.join(AUDIO_DIR, f)),
        reverse=True
    )
    for f in files[MAX_AUDIO_FILES:]:
        os.remove(os.path.join(AUDIO_DIR, f))
```

**Rationale**: 100 files × ~10MB each = ~1GB. Reasonable for a local deployment. Configurable via `MAX_AUDIO_FILES` env var.

### 4. Fix FFmpeg Fallback — Return WAV with Correct Content-Type

When FFmpeg fails, return the WAV file with `Content-Type: audio/wav` instead of copying it to `.mp3`:

```python
except subprocess.CalledProcessError as e:
    print(f"FFmpeg error: {e.stderr}")
    # Return WAV with correct content type instead of broken .mp3
    return FileResponse(path=wav_path, media_type="audio/wav", filename=f"{timestamp}.wav")
```

**Rationale**: A correctly-typed WAV file will play in all browsers. A WAV file served as `audio/mpeg` will fail in some browsers. The user gets audio (even if not compressed) rather than silence.

---

## Options Considered

### Model Cache Path (RC-004)

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Fix volume mount** (Chosen) | Change `docker-compose.yml` mount from `/root/.local/share/tts` to `/app/.cache/tts` | Matches app code, no backend changes, clear intent | Requires volume re-creation on first fix |
| B: Change env var | Change `TTS_MODEL_CACHE` to `/root/.local/share/tts` | Matches Coqui TTS default | App code explicitly overrides this — semantically wrong |

**Chosen: Option A** — `/app/.cache/tts` is the path the application code already uses. The volume mount should match the app, not the other way around.

### Text Storage (RC-005)

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Sidecar JSON** (Chosen) | Write `{timestamp}.meta.json` next to each MP3 | Simple, survives re-encoding, no libraries needed | Extra filesystem operations |
| B: ID3 tags | Embed text in MP3's ID3 metadata | Single file, standard format | Requires `mutagen` or similar library, fragile with re-encoding |
| C: SQLite database | Store all synthesis records in SQLite | Queryable, indexed | Adds database dependency, overkill for a single-user app |
| D: Filename encoding | Encode text in filename (e.g., hash-based) | No extra files | Text is unreadable, no search capability |

**Chosen: Option A** — Sidecar JSON is simple, transparent, and doesn't require additional dependencies. It's the same pattern used by many TTS systems.

### FFmpeg Fallback (RC-006)

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Return WAV with correct type** (Chosen) | Return the original WAV file with `Content-Type: audio/wav` | Works in all browsers, no extra processing, correct MIME type | Larger file size (~5–10× MP3) |
| B: Skip fallback | Return 500 error if FFmpeg fails | Forces the user to fix the FFmpeg issue | User gets no audio at all |
| C: Try multiple encodings | Try MP3, then AAC, then WAV | Maximizes compatibility | Complex, slow, fragile |

**Chosen: Option A** — A correctly-typed WAV file is better than a corrupted MP3. The user gets audible audio in all browsers. The ~5–10× size increase is acceptable for a local deployment.

### Audio Cleanup (RC-007)

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Lazy cleanup** (Chosen) | Run cleanup after each successful synthesis, keep N most recent files | Simple, no background thread, predictable | Slight delay after each synthesis |
| B: Periodic cleanup | Background task runs every N minutes | Non-blocking | Complexity of background task, race conditions |
| C: No cleanup | Document that users should manually clean the volume | Zero code change | Disk fills indefinitely, system instability |
| D: Size-based limit | Limit by total size (e.g., 2GB), not file count | Adapts to varying file sizes | Harder to predict, complex logic |

**Chosen: Option A** — 100 files × ~10MB = ~1GB. This is a reasonable limit for a local deployment. Lazy cleanup is simple and has no race conditions.

---

## Trade-off Analysis

| Dimension | RC-004 (Path) | RC-005 (Text) | RC-006 (FFmpeg) | RC-007 (Cleanup) |
|-----------|-------------|-------------|---------------|----------------|
| **First-use impact** | Saves 2 min on every restart | No text in history until fixed | May get WAV instead of MP3 | No impact on first use |
| **Long-term impact** | Model persists across restarts | Full history with text | All browsers play audio | Disk stays manageable |
| **Implementation effort** | 1 line (docker-compose.yml) | ~15 lines (app.py) | ~5 lines (app.py) | ~15 lines (app.py) |
| **Risk** | Low — volume re-creation needed once | Low — graceful fallback for old files | Low — WAV plays everywhere | Low — configurable limit |
| **Reversibility** | Easy — revert volume mount path | Easy — remove sidecar logic | Easy — revert to old behavior | Easy — remove cleanup function |

### What We're Giving Up

- **MP3 compression for fallback files** — Users who hit the FFmpeg fallback get WAV files (5–10× larger). This is acceptable because:
  - The WAV files are correctly typed and play in all browsers
  - The model cache volume fixes the path mismatch, so subsequent startups are fast
  - Cleanup ensures the total disk usage stays bounded
- **No MP3 files at all** — If FFmpeg is not installed in the container, all files are WAV. This is acceptable for a local deployment.
- **100-file limit** — Users who generate more than 100 files will lose the oldest 100 files. This is acceptable because:
  - The `MAX_AUDIO_FILES` env var is configurable
  - The sidecar files are cleaned up alongside their MP3 counterparts
  - Users can increase the limit via env var if needed

### Why This Is Reversible

Each of the four fixes can be reverted independently:
- **RC-004 (path)**: Revert the volume mount path in `docker-compose.yml`
- **RC-005 (text)**: Remove the sidecar write/read logic from `app.py`
- **RC-006 (FFmpeg)**: Revert to the old `shutil.copy2(wav_path, mp3_path)` behavior
- **RC-007 (cleanup)**: Remove the `cleanup_audio()` function and `MAX_AUDIO_FILES` env var

No API contract changes are involved — `/api/history` still returns the same structure, just with `text` populated.

---

## Consequences

### What Becomes Easier

- **Subsequent startups** — Model loads from volume in ~10–30 seconds (instead of re-downloading ~2GB)
- **Audio history** — Users can see what text was synthesized for each file
- **Cross-browser compatibility** — WAV files with correct `Content-Type` play in all browsers
- **Disk management** — Audio cache stays bounded (default: 100 files)

### What Becomes Harder

- **Volume re-creation** — Fixing the model cache path requires deleting the existing (empty) volume: `docker volume rm tts-model-cache` (or `docker compose up --renew-anon-volumes`). This is a one-time operation.
- **Filesystem operations** — Writing sidecar JSON files and running cleanup adds I/O operations after each synthesis. Negligible for a single-user local deployment.
- **Larger files for fallback** — Users who hit the FFmpeg fallback get WAV files (5–10× larger than MP3). This is acceptable because the files are correctly typed and cleanup ensures bounded disk usage.

### Impact on Existing Components

| Component | Impact |
|-----------|--------|
| `docker-compose.yml` | **Modified** — Change volume mount path from `/root/.local/share/tts` to `/app/.cache/tts` |
| `app.py` (generate_speech) | **Modified** — Write sidecar JSON after creating MP3, fix FFmpeg fallback to return WAV |
| `app.py` (get_history) | **Modified** — Read sidecar JSON and return `text` field |
| `app.py` (cleanup) | **New** — Add `cleanup_audio()` function called after each synthesis |
| `frontend/tests/useTtsApi.test.ts` | **Updated** — New tests for sidecar behavior, cleanup behavior |
| `backend/tests/test_history.py` | **Updated** — Tests for text field in history response |

### Files to Modify

| File | Change |
|------|--------|
| `docker-compose.yml` | Change volume mount path from `/root/.local/share/tts` to `/app/.cache/tts` |
| `backend/app.py` | Add sidecar JSON write/read, fix FFmpeg fallback, add `cleanup_audio()` |

---

## Migration Steps

1. **Fix model cache volume path** (one-time):
   ```bash
   docker volume rm arabic-tts-models  # Delete the (empty) existing volume
   docker compose up -d backend        # Re-create with correct path
   ```
2. **Deploy the backend changes** (sidecar JSON, FFmpeg fix, cleanup).
3. **Verify** — First restart downloads ~2GB (expected), second restart loads from cache (< 10 seconds).

---

## References

- **PRD**: [RC-004](../../PRD.md#known-issues) — Model cache volume path mismatch
- **PRD**: [RC-005](../../PRD.md#known-issues) — `/api/history` returns empty text
- **PRD**: [RC-006](../../PRD.md#known-issues) — FFmpeg fallback issue
- **PRD**: [RC-007](../../PRD.md#known-issues) — No rate limiting / disk fills
- **Backend**: [`app.py`](../../backend/app.py) — `generate_speech()`, `get_history()`, volume configuration
- **Configuration**: [`docker-compose.yml`](../../docker-compose.yml) — Volume mount configuration
- **Implementation**: [`IMPLEMENTATION-model-cache-volume-fix.md`](../../implementation/IMPLEMENTATION-model-cache-volume-fix.md) — Volume path fix plan
- **Implementation**: [`IMPLEMENTATION-speech-synthesis.md`](../../implementation/IMPLEMENTATION-speech-synthesis.md) — Slices S-02, S-05, S-06 (text storage, cleanup, error handling)
- **Related ADR**: [ADR-010](./ADR-010-non-blocking-frontend-boot-with-loading-screen.md) — Docker health check race condition (both address first-startup experience)
- **Related ADR**: [ADR-011](./ADR-011-default-voice-resolution-and-voice-name-mismatch.md) — Default voice resolution (complements this ADR's backend fixes)
