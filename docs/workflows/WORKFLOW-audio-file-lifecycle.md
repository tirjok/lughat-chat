# WORKFLOW: Audio File Lifecycle

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: File creation, retention, and cleanup of generated audio files

---

## Overview

Generated audio files (MP3 + metadata sidecar .json) persist in the `/downloads/` directory indefinitely unless explicitly cleaned up. Two cleanup mechanisms exist: (1) inline cleanup via `GET /api/history?cleanup=true`, and (2) dedicated cleanup via `POST /api/cleanup`. Both remove files older than 24 hours. This workflow covers the complete filesystem lifecycle of audio files from creation to deletion.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| POST /api/generate | Creates MP3 + .json sidecar in `/downloads/` |
| GET /api/history | Lists MP3/WAV files; optionally triggers inline cleanup |
| POST /api/cleanup | Dedicated endpoint to remove files older than 24 hours |
| Docker volume (`tts-audio-cache`) | Persists `/downloads/` across container restarts |
| Operator | May manually clean up files (not UI-exposed) |

---

## Prerequisites

- `/downloads/` directory exists and is writable
- Docker volume `tts-audio-cache` is mounted at `/app/downloads`
- Files have valid timestamps (filesystem `st_mtime`)

---

## Trigger

Multiple triggers:
1. **Creation**: `POST /api/generate` succeeds → MP3 + .json written to `/downloads/`
2. **Listing**: `GET /api/history` → lists files in `/downloads/`
3. **Cleanup**: `GET /api/history?cleanup=true` or `POST /api/cleanup` → removes files older than 24h

---

## Workflow Tree

### STEP 1: File Creation (POST /api/generate)
**Actor**: FastAPI (POST /api/generate, STEP 5-7)
**Action**: Writes MP3 and .json sidecar to `/downloads/`
**Timeout**: N/A (synchronous file write)
**Input**: `{ mp3_path, meta_path }`
**Output on SUCCESS**: MP3 + .json files in `/downloads/`
**Output on FAILURE**: No files created (ABORT_CLEANUP handles intermediate files)

**Observable states during this step**:
- Customer sees: N/A (file creation is invisible to UI)
- Operator sees: Files appear in `/downloads/` directory
- Database: N/A
- Logs: `"Cleaned up intermediate file: {wav_path}"` (if WAV was cleaned)

---

### STEP 2: File Retention (Passive)
**Actor**: Filesystem (automatic)
**Action**: Files persist in `/downloads/` indefinitely (no automatic expiration)
**Timeout**: N/A (passive)
**Input**: N/A
**Output on SUCCESS**: Files remain in `/downloads/`
**Output on FAILURE**: N/A (no action)

**Observable states during this step**:
- Customer sees: N/A (files are not directly visible to UI)
- Operator sees: `/downloads/` grows over time (unbounded)
- Database: N/A
- Logs: (none)

**Risk**: The `tts-audio-cache` volume has no size limit. Over time, `/downloads/` grows unbounded, potentially filling the Docker volume.

---

### STEP 3: File Listing (GET /api/history)
**Actor**: FastAPI (GET /api/history)
**Action**: Scans `/downloads/` for `.mp3` and `.wav` files; reads metadata from sidecar .json (falls back to filename parsing); optionally triggers inline cleanup
**Timeout**: N/A (fast, directory scan)
**Input**: (none); optional query `?cleanup=true`
**Output on SUCCESS**: Array of `{ filename, text, language, voice, speed, pitch, created_at }`
**Output on FAILURE**: HTTP 500 — filesystem read error

**Observable states during this step**:
- Customer sees: N/A (endpoint not UI-exposed yet)
- Operator sees: N/A (endpoint not UI-exposed yet)
- Database: N/A
- Logs: `"Cleanup (history): removed old file: {filename}"` (if inline cleanup runs)

---

### STEP 4: Inline Cleanup (GET /api/history?cleanup=true)
**Actor**: FastAPI (GET /api/history, inline cleanup section)
**Action**: Scans `/downloads/` for `.mp3` and `.wav` files older than 24 hours; removes each file and its .json sidecar
**Timeout**: N/A (fast, directory scan)
**Input**: Query parameter `cleanup=true`
**Output on SUCCESS**: Old files removed; .json sidecars removed alongside; remaining files listed
**Output on FAILURE**: OSError (file removed by another process) → ignored (best effort); Exception → logged (non-blocking, does not affect response)

**Observable states during this step**:
- Customer sees: N/A (endpoint not UI-exposed yet)
- Operator sees: Backend logs `"Cleanup (history): removed old file: {filename}"`
- Database: N/A
- Logs: `"Cleanup (history): removed old file: {filename}"` (per file removed)

---

### STEP 5: Dedicated Cleanup (POST /api/cleanup)
**Actor**: FastAPI (POST /api/cleanup)
**Action**: Scans `/downloads/` for `.mp3` and `.wav` files older than 24 hours; removes each file and its .json sidecar; returns count of removed files
**Timeout**: N/A (fast, directory scan)
**Input**: (none)
**Output on SUCCESS**: `{ removed_count: number }`
**Output on FAILURE**: HTTP 500 — filesystem error (rare); or returns `{ removed_count: 0 }` if no old files

**Observable states during this step**:
- Customer sees: N/A (endpoint not UI-exposed yet)
- Operator sees: Backend logs `"Cleaned up old file: {filename} (age: {N}h)"` (per file removed)
- Database: N/A
- Logs: `"Cleaned up old file: {filename} (age: {N}h)"` (per file removed)

---

### STEP 6: Container Restart (Volume Persistence)
**Actor**: Docker Compose (`docker compose restart` or `docker compose up`)
**Action**: Volume `tts-audio-cache` is re-mounted at `/app/downloads`; existing files persist
**Timeout**: N/A (instant)
**Input**: N/A (automatic on container restart)
**Output on SUCCESS**: All previously generated files are available
**Output on FAILURE**: N/A (volume mount failure is unlikely)

**Observable states during this step**:
- Customer sees: N/A (files are not directly visible to UI)
- Operator sees: `/downloads/` contents persist across restarts
- Database: N/A
- Logs: (none)

---

## State Transitions

```
[No file] -> (POST /api/generate succeeds) -> [Created] (MP3 + .json in /downloads/)
[Created] -> (24h passes) -> [Aged] (eligible for cleanup)
[Aged] -> (GET /api/history?cleanup=true) -> [Removed] (file deleted)
[Aged] -> (POST /api/cleanup) -> [Removed] (file deleted)
[Created] -> (container restart) -> [Created] (persists in volume)
[Created] -> (manual deletion) -> [Removed] (operator action)
```

---

## Handoff Contracts

### Frontend → Backend: List History (`GET /api/history`)
**Endpoint**: `GET /api/history`
**Payload**: (none)
**Query**: `?cleanup=true` (optional, triggers inline cleanup of files > 24h)
**Success response**:
```json
[
  {
    "filename": "ar_female_abc123.mp3",
    "text": "generated text",
    "language": "ar",
    "voice": "female",
    "speed": 1.0,
    "pitch": 0.0,
    "created_at": "1722600000"
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
**On Failure**: HTTP 500 raised; endpoint not UI-exposed yet

---

### Frontend → Backend: Dedicated Cleanup (`POST /api/cleanup`)
**Endpoint**: `POST /api/cleanup`
**Payload**: (none)
**Success response**:
```json
{
  "removed_count": 5
}
```
**Failure response**:
```json
{
  "detail": "string (filesystem error)"
}
```
**Status code**: 500 (filesystem error)
**Timeout**: N/A (fast, directory scan)
**On Failure**: HTTP 500 raised; endpoint not UI-exposed yet

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| MP3 file | STEP 1 (POST /api/generate) | STEP 4 or STEP 5 (cleanup) | `os.remove(filepath)` |
| Metadata sidecar (.json) | STEP 1 (POST /api/generate) | STEP 4 or STEP 5 (cleanup, alongside MP3) | `os.remove(meta_path)` |
| Intermediate WAV file | POST /api/generate (STEP 4) | POST /api/generate (STEP 6, success) or ABORT_CLEANUP (failure) | `os.remove(wav_path)` |

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: File listing | GET /api/history | Returns array of all MP3/WAV files with metadata |
| TC-02: Sidecar metadata | GET /api/history (file has .json) | Returns metadata from .json (text, language, voice, speed, pitch, created_at) |
| TC-03: Filename parsing fallback | GET /api/history (file has no .json) | Returns parsed metadata from filename (language, voice), empty text, defaults for speed/pitch |
| TC-04: Inline cleanup | GET /api/history?cleanup=true | Old files (> 24h) removed; .json sidecars removed alongside; remaining files listed |
| TC-05: Inline cleanup errors non-blocking | GET /api/history?cleanup=true (some files can't be removed) | Old files removed where possible; errors logged; listing still returned |
| TC-06: Dedicated cleanup | POST /api/cleanup | Returns `{ removed_count: N }`; old files and sidecars removed |
| TC-07: No old files | POST /api/cleanup (all files < 24h) | Returns `{ removed_count: 0 }`; no files removed |
| TC-08: Volume persistence | Container restart, then GET /api/history | Previously generated files still listed (persisted in volume) |
| TC-09: Orphaned MP3 without .json | GET /api/history (MP3 exists, no .json) | Falls back to filename parsing; returns empty text, default speed/pitch |
| TC-10: Orphaned MP3 with corrupt .json | GET /api/history (MP3 + corrupt .json) | JSON parse error caught; falls back to filename parsing |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | The 24-hour cleanup threshold is appropriate for storage management | `app.py:531-532, 568` (both endpoints use `24 * 60 * 60`) | If storage is limited, 24h may not be enough; if storage is abundant, 24h may be too aggressive |
| A2 | The `/downloads/` directory is always writable | `app.py:133-137` (creates dir on startup, catches OSError) | If not writable, MP3 and .json files fail silently (non-fatal for MP3, non-fatal for .json) |
| A3 | The `tts-audio-cache` volume has no size limit | `docker-compose.yml:54` (volume defined without size constraint) | Volume could fill up, preventing new file writes |
| A4 | Files are sorted by filename (lexicographic), which approximates recency | `app.py:484` (`sorted(os.listdir(AUDIO_DIR), reverse=True)`) | Filenames encode timestamp (`uuid4().hex[:8]`), so lexicographic sort ≈ reverse chronological order (correct) |
| A5 | The `.json` sidecar always matches its `.mp3` file (one-to-one) | `app.py:435-451` (sidecar written immediately after MP3) | If the .json write fails (OSError), the MP3 exists without metadata (handled by filename parsing fallback) |

---

## Open Questions

1. Should the cleanup threshold (24h) be configurable? (Currently hardcoded.)

2. Should there be a UI for browsing and managing audio history? (Currently: no — endpoints exist but are not UI-exposed.)

3. Should there be a maximum storage limit on the `tts-audio-cache` volume? (Currently: no.)

4. Should the inline cleanup (GET /api/history?cleanup=true) be separate from the listing? (Currently: they are coupled — cleanup is a side effect of listing.)

5. What happens if the `/downloads/` directory is deleted (e.g., Docker volume recreated)? (Files are lost; new files start fresh.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `backend/app.py:475-593` | Documented that both endpoints use the same 24h threshold; inline cleanup is non-blocking; endpoints are not UI-exposed |
