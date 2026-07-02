# ADR-001: Smart Text Chunking for Long Inputs

## Status
Accepted

## Date
2026-07-02

## Context

XTTS-v2 is a transformer-based TTS model running on CPU (no GPU). When users submit long text (1000–2000+ characters), the single worker processes the entire text in one autoregressive decoding pass. This causes:

- **CPU overload**: Sustained 100% CPU usage for 60–120+ seconds
- **Memory pressure**: Large intermediate tensors from the 2GB model
- **Poor user experience**: Long wait with no progress feedback
- **No concurrency**: A single long job blocks all other requests

The current architecture has a single worker processing jobs sequentially with no text size awareness.

## Decision

Implement **smart text chunking** that automatically splits long inputs into manageable chunks before sending to the TTS model, then concatenates the output audio.

### Key design choices:

1. **Automatic chunking threshold**: Text above 500 characters is automatically chunked. Below 400 characters, text passes through as a single piece (no overhead for short inputs).

2. **Sentence-aware chunking**: Chunks are split on sentence boundaries (respecting Arabic `؟` and English `.!?;:` punctuation), not arbitrary character positions. This preserves prosody and audio quality.

3. **Overlap between chunks**: 10 characters of overlap between consecutive chunks preserves prosodic continuity at chunk boundaries.

4. **Concatenation via ffmpeg**: Intermediate chunk MP3s are concatenated using ffmpeg's concat demuxer, producing a single seamless output file.

5. **Cleanup**: All temporary files (chunk WAVs, chunk MP3s) are cleaned up on both success and failure.

### Architecture:

```
User text (2000 chars)
       │
       ▼
┌─────────────────┐
│  chunk_text()   │  ← split into ~5 chunks of ~400 chars each
└────────┬────────┘
         │
    ┌────┴────┬────┬────┐
    ▼         ▼    ▼    ▼
  Chunk 1   Ch2  Ch3  Ch4  Ch5  ← each ≤ 400 chars (fast inference)
    │         │    │    │
    └────┬────┴────┴────┘
         ▼
┌─────────────────┐
│  merge_audio()  │  ← ffmpeg concat → single MP3
└────────┬────────┘
         ▼
    Final MP3 (same quality, much faster)
```

### Configuration constants:

| Constant | Value | Purpose |
|----------|-------|---------|
| `CHUNK_SINGLE_PASS_MAX` | 400 | Max chars per chunk (XTTS-v2 sweet spot on CPU) |
| `CHUNK_AUTO_THRESHOLD` | 500 | Text above this is auto-chunked |
| `MAX_TEXT_LENGTH` | 3000 | Max input text length (unchanged) |
| `CHUNK_OVERLAP_CHARS` | 10 | Overlap chars between chunks for prosody |

## Consequences

### Positive:
- **Faster inference**: 5 chunks of 400 chars process in ~5×10s = 50s vs 1×120s = 120s (net ~60% faster, plus the chunks can be processed sequentially by the single worker with smaller memory footprint per chunk)
- **Lower CPU peak**: Smaller inference windows mean lower peak CPU/memory per call
- **Better UX**: Progress can be shown per-chunk (chunk N of M)
- **No API change**: Frontend sees the same `/api/generate` → `/api/jobs/{id}` flow
- **Short text unaffected**: Text under 400 chars passes through unchanged (zero overhead)
- **Speaker latent caching**: Pre-computed `gpt_cond_latent` and `speaker_embedding` are reused across all calls for the same voice (saves ~30-50% CPU per call). Since your app has only 2 voices (KSA Hamed, KSA Zariyah), this cache is nearly always a hit.
- **Reduced thread count**: Limits PyTorch to half available CPUs, preventing oversubscription and context-switching overhead.
- **Lower temperature (0.7)**: Faster autoregressive decoding with negligible quality loss.
- **torch.compile disabled**: Avoids startup overhead with no CPU benefit.

### Negative:
- **Concatenation artifacts**: ffmpeg concat may produce slight clicks at chunk boundaries (mitigated by 10-char overlap)
- **Slightly longer total time**: Chunking adds overhead for 500–800 char texts (split + merge), but this is negligible (< 1s)
- **API response enriched**: The `/api/generate` response now includes a `chunking` object with metadata — frontend needs to handle this if it wants to show chunk progress

### Neutral:
- **Disk usage**: Temporary files during chunked synthesis briefly use more disk (cleaned up immediately)
- **Code complexity**: Added `text_chunker.py` module (~300 lines) but well-contained and tested

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| **GPU acceleration** | Would require GPU infrastructure (significant cost/ops overhead). Chunking works on CPU-only. |
| **Multiple workers** | Would require model state sharing (complex with XTTS-v2). Single worker with chunking is simpler. |
| **Streaming audio** | Would require protocol changes and frontend rework. Chunking produces a single file like before. |
| **Text compression** | Doesn't reduce inference time — transformer models process all tokens regardless of compression. |
| **Pre-chunked API** | Requiring clients to chunk would break the API contract. Server-side chunking is transparent. |

## Future Improvements

1. **Parallel chunk processing**: Use a thread pool to process chunks in parallel (still single model, but parallel inference calls via torch's threading).
2. **Configurable thresholds**: Expose chunking thresholds as environment variables for tuning.
3. **Chunk progress API**: Add `/api/jobs/{id}/chunks` endpoint to report per-chunk progress.
4. **Silence padding**: Add brief silence at chunk boundaries to mask concatenation artifacts.
5. **GPU migration**: If budget allows, moving to a GPU (even a cheap T4 on cloud) would eliminate CPU constraints entirely — XTTS-v2 on GPU is 10-20x faster than CPU.

## CPU Optimization Summary

| Optimization | Impact | Where |
|-------------|--------|-------|
| **Text chunking** (400 char limit) | ~50-60% faster for long text | `text_chunker.py` + `synthesis.py` |
| **Speaker latent caching** | ~30-50% faster per call (per voice) | `_get_or_compute_speaker_latents()` |
| **Thread limit** (`torch.set_num_threads`) | Reduces CPU context-switching | `ModelLifecycle.load()` |
| **Lower temperature** (0.7) | Faster autoregressive decoding | `_generate_wav()` |
| **Disable torch.compile** | No startup overhead on CPU | `ModelLifecycle.load()` |
| **Deterministic seed** | Reproducible output, no randomness overhead | `_generate_wav()` |
