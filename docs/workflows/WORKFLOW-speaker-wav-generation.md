# WORKFLOW: Speaker WAV Generation Utility

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: `generate_speaker_wavs.py` — generates speaker reference audio files

---

## Overview

The `generate_speaker_wavs.py` script generates speaker reference WAV files for the two preset voices (female and male). These WAV files are used by XTTS-v2 for voice cloning during speech generation. The script first attempts to generate WAV files using the TTS model (with Arabic text for female, English text for male). If the TTS model is not available, it falls back to generating silent WAV files (3 seconds of silence at 22050 Hz, 16-bit mono).

This workflow covers the complete WAV generation process, including both the TTS path and the silent fallback path.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Operator | Runs the script: `python generate_speaker_wavs.py` |
| TTS model (XTTS-v2) | Generates WAV audio from text (if available) |
| Silent WAV generator | Generates 3 seconds of silence (fallback) |
| Filesystem (`speaker_wavs/`) | Stores generated WAV files |

---

## Prerequisites

- Python 3.12 environment
- Coqui TTS library installed (for TTS path) OR `wave` module available (for silent fallback)
- `speaker_wavs/` directory exists (or is creatable)

---

## Trigger

Operator runs: `python generate_speaker_wavs.py`

---

## Workflow Tree

### STEP 1: Directory Setup
**Actor**: Script (`generate_speaker_wavs()`)
**Action**: Creates `speaker_wavs/` directory if it doesn't exist
**Timeout**: N/A (synchronous)
**Input**: (none)
**Output on SUCCESS**: Directory created → GO TO STEP 2
**Output on FAILURE**: OSError (read-only filesystem) → script exits with error

**Observable states during this step**:
- Customer sees: N/A (utility script, operator-facing)
- Operator sees: `speaker_wavs/` directory created
- Database: N/A
- Logs: (none)

---

### STEP 2: TTS Path — Generate Speaker WAVs
**Actor**: Script (TTS model)
**Action**: Loads XTTS-v2 model; generates WAV files for each voice:
  - **female**: Arabic text ("مرحبا، هذا نص لتوليد صوت أنثي...")
  - **male**: English text ("Hello, this is a text to generate a male voice...")
  - Skips voices that already exist (checks `os.path.exists()`)

**Timeout**: Variable (TTS model load + generation time; ~120s + several seconds per voice)
**Input**: (none) (uses hardcoded text samples)
**Output on SUCCESS**: WAV files created in `speaker_wavs/` → WORKFLOW COMPLETE
**Output on FAILURE**:
  - `FAILURE(tts_not_available)`: TTS library not installed → falls back to silent WAV generation (STEP 3)
  - `FAILURE(generation_error)`: TTS model fails to generate → falls back to silent WAV generation (STEP 3)

**Observable states during this step**:
- Customer sees: N/A (utility script, operator-facing)
- Operator sees: Console output showing model loading, generation progress, and results
- Database: N/A
- Logs: `"Loading XTTS-v2 model..."`, `"Generating {voice} reference audio..."`, `"Created {path}"` (or error messages)

---

### STEP 3: Silent Fallback — Generate Silent WAVs
**Actor**: Script (`fallback_generate_silence()`)
**Action**: Generates 3 seconds of silence (22050 Hz, 16-bit mono) for each voice:
  - **female**: `speaker_wavs/female.wav` (3 seconds of silence)
  - **male**: `speaker_wavs/male.wav` (3 seconds of silence)
  - Overwrites existing files (deletes before creating)

**Timeout**: N/A (synchronous, very fast)
**Input**: (none)
**Output on SUCCESS**: Silent WAV files created in `speaker_wavs/` → WORKFLOW COMPLETE
**Output on FAILURE**: OSError (read-only filesystem) → script exits with error

**Observable states during this step**:
- Customer sees: N/A (utility script, operator-facing)
- Operator sees: Console output showing silent file creation
- Database: N/A
- Logs: `"Creating silent fallback: {voice}.wav"`

---

## State Transitions

```
[No WAV files] -> (TTS generation succeeds) -> [TTS WAVs] (Arabic/English reference audio)
[No WAV files] -> (TTS fails, silent fallback) -> [Silent WAVs] (3 seconds of silence)
[TTS WAVs] -> (script re-run) -> [TTS WAVs] (skipped — files already exist)
[Silent WAVs] -> (script re-run with TTS) -> [TTS WAVs] (TTS path overwrites silent files)
[TTS WAVs] -> (script re-run with TTS unavailable) -> [Silent WAVs] (TTS fails, falls back to silent)
```

---

## Handoff Contracts

### Script → Filesystem: WAV File Generation
**From**: `generate_speaker_wavs.py`
**To**: `speaker_wavs/` directory
**Payload**: WAV files (female.wav, male.wav)
**TTS path**: Arabic/English reference audio (several seconds, 22050 Hz, 16-bit mono)
**Silent fallback**: 3 seconds of silence (22050 Hz, 16-bit mono)
**On TTS failure**: Silent fallback is always available (uses only `wave` module)

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Speaker WAV files | STEP 2 (TTS) or STEP 3 (silent) | Operator removes or replaces | `os.remove(filepath)` |

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: TTS available, no existing WAVs | Script runs, TTS model loads, no WAVs exist | TTS-generated WAVs created (Arabic for female, English for male) |
| TC-02: TTS available, WAVs exist | Script runs, TTS model loads, WAVs already exist | Existing WAVs skipped; no changes made |
| TC-03: TTS unavailable | Script runs, TTS library not installed | Silent fallback WAVs created (3 seconds of silence) |
| TC-04: TTS fails during generation | Script runs, TTS model crashes | Silent fallback WAVs created (3 seconds of silence) |
| TC-05: Partial WAVs exist | Only female.wav exists | Female skipped; male generated (TTS or silent) |
| TC-06: Read-only filesystem | Script runs on read-only filesystem | Script exits with error (OSError) |
| TC-07: Re-run with TTS after silent | Silent WAVs exist; script re-run with TTS available | TTS path overwrites silent WAVs |
| TC-08: Re-run with TTS unavailable | TTS WAVs exist; script re-run with TTS unavailable | Silent fallback overwrites TTS WAVs |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | TTS-generated WAVs are several seconds long (enough for voice cloning) | `generate_speaker_wavs.py:33-39` (long Arabic/English text samples) | Short text samples may produce WAVs < 0.33s (XTTS-v2 minimum) |
| A2 | Silent WAVs are 3 seconds long (enough for voice cloning) | `generate_speaker_wavs.py:83` (22050 * 3 samples) | 3 seconds of silence may not produce usable voice cloning reference |
| A3 | Silent WAVs use 22050 Hz sample rate (XTTS default) | `generate_speaker_wavs.py:81` | Sample rate mismatch with XTTS model may cause issues |
| A4 | Script skips existing WAV files (no overwrite) | `generate_speaker_wavs.py:45-47` | If operator wants to regenerate a specific voice, they must manually delete the existing file |
| A5 | Silent fallback always works (uses only `wave` module, no external dependencies) | `generate_speaker_wavs.py:65-86` | Silent WAVs are not usable for voice cloning (XTTS-v2 needs actual speech reference) |

---

## Open Questions

1. Should the script generate WAVs for custom voices (not just female/male)? (Currently: hardcoded to two voices.)

2. Should the script accept text input (instead of hardcoded samples)? (Currently: hardcoded.)

3. Should the script support generating WAVs for dialects other than Arabic (Saudi) and English? (Currently: hardcoded text samples.)

4. Should the silent fallback be documented as "not usable for voice cloning"? (Currently: silent WAVs are generated without warning.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `generate_speaker_wavs.py` | Documented that silent fallback WAVs are not usable for voice cloning (XTTS-v2 needs actual speech reference); script skips existing files (no overwrite) |
