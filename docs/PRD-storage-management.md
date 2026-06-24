# PRD: Smart Storage Management for Generated Audio

## Problem Statement

Every time a user generates speech, a new MP3 file is written to persistent Docker storage (`tts-audio-cache` volume). There is no cleanup mechanism, no deduplication, and no metadata about what each file contains. Over time, the storage volume grows unbounded — generating the same text multiple times creates duplicate files, intermediate WAV files are never cleaned up, and users have no visibility into how much storage is being consumed. This makes long-term operation unsustainable and risks filling the Docker volume, which would break the entire application.

## Solution

Implement a smart storage management system that automatically keeps storage bounded while preserving audio the user cares about. The system works on three principles:

1. **Deduplication** — Identical generations (same text + voice + speed + pitch + language) return the existing file instead of creating a new one.
2. **TTL-based cleanup** — Files not accessed within a configurable time window are automatically deleted, with shorter TTLs for low-value files (short, no text metadata).
3. **User control** — Users can favorite/star generations to exempt them from automatic deletion.

The system operates transparently in the background. Users see storage usage in the UI and can manage their library. No user action is required for storage to remain bounded.

## User Stories

1. As a user who generates the same text multiple times, I want the system to return the existing audio instead of creating a new file, so that I don't waste storage on duplicates.
2. As a user who generates many test phrases, I want short or low-value audio files to be automatically cleaned up after a few days, so that my storage doesn't fill up with experiments.
3. As a user who generates important content (audiobook chapters, educational material), I want to be able to favorite a generation so it is never auto-deleted, so that my important audio is always available.
4. As a user, I want to see how much storage my generated audio is consuming, so that I can monitor usage and decide whether to clean up.
5. As a user, I want to see the original text alongside each file in my history, so that I can identify what each audio file contains without playing it.
6. As a user, I want intermediate WAV files to be automatically removed after MP3 conversion, so that storage is not wasted on redundant formats.
7. As a user, I want the system to clean up storage silently in the background, so that I don't have to manually manage files.
8. As a user, I want to be able to manually delete individual files from my history, so that I can remove specific audio without affecting others.
9. As a user, I want the history endpoint to return metadata (text, language, voice, speed, pitch, duration, created_at, is_favorited) for each file, so that the frontend can display useful information.
10. As an operator, I want the storage to remain bounded even with unbounded usage, so that the Docker volume never fills and breaks the application.
11. As a user, I want the cleanup behavior to be configurable (TTL duration, minimum file size for retention), so that I can adjust based on my storage constraints.
12. As a user, I want the system to tell me when a generation was a duplicate (i.e., it returned an existing file), so that I know my storage was saved.
13. As a user, I want to be able to bulk-delete all non-favorited files, so that I can quickly reset my library.
14. As a user, I want the history to be sortable (by date, by voice, by length), so that I can find specific generations quickly.

## Implementation Decisions

### Architecture

The storage management system is implemented entirely on the backend as a module within `app.py`. No new services, databases, or external dependencies are introduced. The system uses the filesystem as its data store, augmented by a lightweight JSON metadata index.

### Metadata Index

A JSON file (`audio_index.json`) stored alongside the audio files in the downloads directory serves as the metadata index. Each entry maps a filename to:

```json
{
  "filename": "ar_female_abc123.mp3",
  "text": "السلام عليكم ورحمة الله",
  "language": "ar",
  "voice": "female",
  "speed": 1.0,
  "pitch": 0.0,
  "created_at": 1718900000,
  "last_accessed_at": 1719000000,
  "is_favorited": false,
  "duration_seconds": 3.2,
  "cache_key": "sha256_hash_of_request_params"
}
```

The index is read on startup and written to disk on every generate, favorite, or delete operation. This is a trade-off: simple, no database needed, but the index must always stay in sync with the filesystem.

### Cache Key (Deduplication)

A deterministic cache key is computed from the synthesis request parameters:

```
cache_key = SHA256(text + "|" + speaker + "|" + speed + "|" + pitch + "|" + language)
```

On generation, the system checks if a file with this cache_key already exists. If yes, it returns the existing file and sets `is_duplicate: true` in the response. If no, it generates a new file and stores the cache_key mapping.

### TTL Policy

Files are classified into three tiers based on their metadata:

| Tier | Criteria | TTL |
|------|----------|-----|
| **Permanent** | `is_favorited = true` | Never deleted |
| **Standard** | Has text metadata, duration ≥ 60s | 7 days |
| **Ephemeral** | No text metadata OR duration < 60s | 3 days |

The TTL is measured from `last_accessed_at` (updated on every playback or history fetch). A background check runs on each generate call: it scans the index, identifies files whose `last_accessed_at + TTL < now`, and deletes both the file and the index entry.

### API Changes

**`POST /api/generate`** — Response now includes:
- `is_duplicate: boolean` — whether this was a cache hit
- `audio_url: string` — URL to the audio file (replaces raw binary response for programmatic access; binary response is still returned for backward compatibility)
- `cache_key: string` — the cache key for this generation (useful for frontend dedup display)

**`GET /api/history`** — Response now includes:
- `text: string` — the original text (previously empty)
- `is_favorited: boolean` — whether the file is favorited
- `duration_seconds: number` — audio duration (previously missing)
- `last_accessed_at: number` — Unix timestamp of last access (new)
- `cache_key: string` — deduplication key (new)

**`POST /api/history/:filename/favorite`** — Toggle favorite status (new endpoint).

**`DELETE /api/history/:filename`** — Delete a specific file (new endpoint).

**`DELETE /api/history/cleanup`** — Bulk delete all non-favorited files (new endpoint).

**`GET /api/storage`** — Return storage usage stats (new endpoint):
- `total_size_bytes: number`
- `file_count: number`
- `favorited_count: number`
- `oldest_file_age_days: number`

### Frontend Changes

- Display storage usage in the UI (top bar or settings area).
- Show text alongside each history entry.
- Add a star/favorite button to each history entry.
- Add a "Clear All" button for non-favorited files.
- Show a toast notification when a generation is a duplicate ("This audio was already generated — using cached version").

### Testing Decisions

Testing is done at the highest seam: the HTTP API. No unit tests for internal functions are required beyond what already exists.

**Backend tests (pytest, in `backend/tests/`):**

- `test_generate_deduplication` — Generate the same request twice; second call returns the existing file with `is_duplicate: true`.
- `test_generate_stores_text_metadata` — Generated files include the original text in the index.
- `test_history_returns_text_and_metadata` — History entries include `text`, `is_favorited`, `duration_seconds`, `last_accessed_at`, and `cache_key`.
- `test_favorite_endpoint_toggles_status` — POST `/api/history/:filename/favorite` toggles `is_favorited`.
- `test_favorited_files_survive_cleanup` — Files marked as favorited are not deleted by cleanup.
- `test_cleanup_removes_expired_files` — Files past their TTL are deleted; favorited files are preserved.
- `test_cleanup_respects_tier_levels` — Standard tier files (≥ 60s with text) get 7-day TTL; ephemeral files (< 60s or no text) get 3-day TTL.
- `test_delete_endpoint_removes_file` — DELETE `/api/history/:filename` removes the file and index entry.
- `test_bulk_cleanup_removes_non_favorited` — DELETE `/api/history/cleanup` removes all non-favorited files.
- `test_storage_endpoint_returns_stats` — GET `/api/storage` returns correct size, count, and favorited count.
- `test_cache_key_is_deterministic` — Same parameters always produce the same cache key.
- `test_cache_key_differs_for_different_params` — Different parameters produce different cache keys.

**Frontend tests (Vitest, in `frontend/tests/`):**

- `useStorageModule.test.ts` — Tests for a new composable (if one is created) that fetches and displays storage stats.
- `index.test.ts` — Updated integration test to verify storage info is displayed in the UI.
- `ToastNotification.test.ts` — Updated to verify duplicate-generation toast is shown.

**Testing approach:** Tests should only verify external behavior (HTTP responses, file system state). Internal implementation details (how the index is structured, how the cache key is computed) are not tested directly. Tests should use the existing mock patterns from `test_generate.py` (mocking `os.path.exists`, `wave.open`, and the TTS model) and extend them to verify index file state.

**Existing tests that need updating:**
- `test_history_returns_list_of_audio_files` — Now includes additional fields; assertion should verify new fields exist.
- `test_history_entries_contain_expected_fields` — Must be updated to include `text`, `is_favorited`, `duration_seconds`, `last_accessed_at`, `cache_key`.

### Docker / Deployment

- The `tts-audio-cache` volume continues to be used as-is. No volume changes needed.
- The `audio_index.json` file is stored inside the volume (in the `/app/downloads` directory).
- No new environment variables or configuration required. Default TTLs (7 days standard, 3 days ephemeral) are hardcoded but can be exposed as env vars in a future iteration.

## Out of Scope

- **Database-backed storage** — No SQLite, PostgreSQL, or other database is introduced. The JSON index is sufficient for the expected scale.
- **User accounts / authentication** — This is a single-user deployment. No login system, no multi-user isolation.
- **Sharing / embedding** — Generating shareable links or embed codes for audio is not part of this PRD.
- **AI Smart Tools** — The "Translate," "Add Diacritics," and "Continue Script" buttons remain placeholders. They are not implemented in this PRD.
- **Unlimited text** — The 3000-character limit is not changed in this PRD.
- **GUI storage management** — A dedicated "Storage Settings" page is not built. Storage info is displayed in the existing UI (top bar / status area).
- **Compression** — Audio files are not re-compressed or converted to more efficient formats.

## Further Notes

### Why a JSON index instead of parsing filenames?

The current system parses filenames like `ar_female_abc123.mp3` to extract metadata. This is fragile and loses information (the original text is not stored). The JSON index is a simple, readable format that can be extended without breaking existing filename patterns. The filename format is preserved for backward compatibility with the existing `/api/history` parsing logic.

### Why not delete WAV files at conversion time?

The current code generates a WAV file (XTTS native format) and converts it to MP3 via ffmpeg. The WAV is never deleted. This wastes roughly 5–10× the MP3 size. The cleanup system deletes WAV files immediately after successful MP3 conversion. This is a low-hanging fruit that provides immediate storage savings.

### Why is `last_accessed_at` better than `created_at` for TTL?

A file that was generated 30 days ago but played yesterday is clearly still useful. A file generated 30 minutes ago that was never played is likely a test or mistake. Using `last_accessed_at` (updated on every playback, history fetch, or generate call) ensures that actively used audio survives longer.

### Backward compatibility

The `/api/generate` endpoint continues to return an MP3 binary response (FileResponse) for backward compatibility with the existing frontend. The new metadata fields (`is_duplicate`, `audio_url`, `cache_key`) are returned as additional JSON headers or in a parallel JSON response. The frontend can be updated incrementally to consume the new fields.

### Edge cases

- **Concurrent generations** — If two identical requests arrive simultaneously, both may generate files. The second one will be a "near-duplicate" but not caught by the cache key check. This is acceptable; the cleanup system will eventually remove one.
- **Index corruption** — If `audio_index.json` is corrupted or deleted, the system falls back to parsing filenames (current behavior). A rebuild command can regenerate the index from the filesystem.
- **Volume full** — If the Docker volume is full, the cleanup system cannot write the index. A fallback mechanism should attempt cleanup on every generate call regardless of index state.
