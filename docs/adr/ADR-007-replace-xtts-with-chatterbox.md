# ADR-007: Replace XTTS-v2 with Chatterbox Multilingual TTS

**Status:** Proposed

## Context

LughatChat uses Coqui XTTS-v2 for Arabic speech synthesis. It is a voice-cloning model (~2GB) that consumes significant CPU resources during inference — the primary complaint from users. The app generates speech very frequently (lesson content, vocabulary, dialogues), making CPU load a persistent issue.

XTTS-v2 is the only Coqui model with Arabic support, but it requires voice cloning (speaker WAV references) and heavy inference. No lightweight Coqui model supports Arabic.

## Decision

Replace XTTS-v2 with **Chatterbox Multilingual TTS** (Resemble AI), a 0.5B parameter model with 23 languages including Arabic. Key changes:

- **Remove voice cloning pipeline** — no more speaker WAV files, no `speaker_wavs/` directory
- **Use Chatterbox's built-in Arabic voices** — no reference audio needed
- **Add synthesis caching** — file-based storage in `downloads/`, keyed by SHA-256 hash of `text + language + voice + speed` to eliminate redundant inference for repeated requests
- **Update API** — `/api/generate` simplifies to `text` + `language` + `voice` (Chatterbox built-in name); removes `speaker`, `speed`, `pitch`, `seed` parameters
- **Health check adjustment** — Chatterbox loads in ~30-60s (vs XTTS-v2's ~120s); `useHealthPoll` polling interval may be increased from 2s to 5s, max retries reduced proportionally

## Considered Options

| Option | Arabic Quality | CPU Load | Model Size | License |
|--------|---------------|----------|------------|---------|
| Keep XTTS-v2 | High (voice cloning) | High | ~2GB | MPL-2 |
| Chatterbox Multilingual | Clear/correct pronunciation | Low | ~500MB | MIT |
| Coqui Glow-TTS (multilingual) | No Arabic support | Low | ~100MB | MPL-2 |
| Kokoro 82M | No Arabic support | Very Low | ~150MB | Apache-2.0 |
| Piper | No Arabic voices | Very Low | ~50MB | MIT |

## Consequences

**Easier:** Lower CPU usage during inference (fan noise, heat). Smaller model download (~500MB vs ~2GB). No speaker WAV file management. Built-in Arabic voices. MIT license.

**Harder:** Breaking API change — frontend `SynthesisRequest` interface changes. New Docker dependencies (Python 3.11, torchaudio, librosa). Chatterbox is newer/less battle-tested than XTTS-v2. Built-in Perth watermarks in every audio output (imperceptible but present).

**Reversibility:** Can revert to XTTS-v2 by changing the model import and restoring speaker WAV handling, but this requires another Docker rebuild and re-testing.
