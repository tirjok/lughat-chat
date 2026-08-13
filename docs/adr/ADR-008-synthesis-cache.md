# ADR-008: Synthesis Cache — File-Based Audio Caching

**Status:** Proposed
**Date:** 2026-08-12
**Related:** ADR-007 (Replace XTTS-v2 with Chatterbox Multilingual TTS)

## Context

LughatChat's TTS Studio generates speech very frequently — students repeat lesson content, vocabulary, and dialogues multiple times. The current system has no mechanism to avoid re-generating audio for text that has already been synthesized. Each synthesis request triggers a full CPU inference pass, even when the exact same text+voice combination was generated seconds ago. This wastes CPU cycles, increases latency for repeat requests, and contributes to the fan noise / heat complaints that motivated the model swap.

The cache must integrate with the existing `downloads/` directory (already managed by the cleanup mechanism), support the new Chatterbox model's output format (WAV → MP3), and handle the composite input space (text + language + voice + speed) without collisions.

## Decision

Implement a **file-based synthesis cache** in the existing `downloads/` directory. Each cache entry is keyed by a SHA-256 hash of the composite input (`text + language + voice + speed`), stored as `{hash}.mp3`.

**Cache lookup happens before inference:** if a cache hit exists, return the cached file immediately. On cache miss, trigger full synthesis, then store the result for future requests.

**Cache key construction:** concatenate `text`, `language`, `voice`, and `speed` (if applicable) into a single string, compute SHA-256, use the hex digest as the filename. This guarantees collision-free storage — the probability of two different composite inputs producing the same hash is negligible (2^-128).

**Cache entries are regular MP3 files** in `downloads/` — they coexist with the existing cleanup mechanism (orphaned file cleanup, disk space limits). No separate cache directory or metadata store is needed.

**Cache invalidation:** no explicit invalidation. Stale cache entries are cleaned up by the existing orphaned file mechanism. If the Chatterbox model changes its output format, old cache entries become silently incompatible — this is acceptable because the model swap (ADR-007) is itself a breaking change that invalidates all existing cache.

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| **File-based cache in `downloads/`** (chosen) | Coexists with existing cleanup. Cache hits return a file path — no serialization overhead. Regular MP3 files playable/downloadable. Simple file existence check. | Disk space grows with unique inputs. No explicit invalidation. Stale entries from model changes are silently incompatible. |
| Database-backed cache (SQLite) | Explicit invalidation. Metadata (when cached, input params). Queryable. | Serialization/deserialization overhead. New dependency. Cache hits require read + decode before playback. More complex. |
| In-memory cache (LRU) | Fastest lookup. No disk I/O. | Lost on container restart. No persistence across deployments. |
| No cache | Simpler code. No disk space concern. | Every repeated request triggers full synthesis. Wastes CPU. Poor UX for repeat listening. |

## Consequences

**Easier:** Repeated requests for the same text+voice produce instant playback from disk. Reduced CPU load for students who review the same lesson multiple times. Cache entries are regular MP3 files — no special handling for playback, download, or history display.

**Harder:** Disk space grows unbounded as students generate unique content. No explicit cache invalidation — stale entries accumulate until the orphaned file cleanup runs. Cache key design is sensitive to input ordering (e.g., `text="مرحبا" + voice="female"` vs `text="female" + voice="مرحبا"` would collide if not properly delimited). The composite key must include a delimiter or length prefix to avoid such collisions. Cache misses still trigger full synthesis — the cache only helps repeated requests, not the first request for any given input.

**Reversibility:** The cache can be removed by deleting the cache lookup logic from `generate_speech()`. All existing cached files remain valid MP3s and will be cleaned by the existing orphaned file mechanism. No data migration needed.

**Specific risks:**
- **Cache key collision from input ordering:** If the composite string is constructed as `text+language+voice+speed` without delimiters, `"text=abvoice=c"` and `"text=avoice=bc"` produce the same hash. Fix: use a delimiter (e.g., `|`) or length-prefixed encoding.
- **Disk space growth:** Students generating unique content daily will fill `downloads/` over time. The existing cleanup mechanism must be verified to handle cache entries (currently it may only target files older than N days, not total count).
- **Model format mismatch:** If Chatterbox's output format changes (e.g., different WAV encoding), old cache entries become incompatible. Acceptable for the initial model swap but a concern for future model updates.
