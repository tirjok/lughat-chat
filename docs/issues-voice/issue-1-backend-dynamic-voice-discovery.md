# Backend: Dynamic Voice Discovery and Resolution

## Type
AFK (Automated — can be implemented without human interaction)

## Blocked by
None — can start immediately

---

## What to build

Replace the hardcoded `female`/`male` voice presets with a dynamic system that auto-discovers `.wav` files from the `speaker_wavs/` directory. The scan runs on each `/api/voices` request (no caching), ensuring new voices appear immediately after files are dropped into the directory — no server restart required.

### Scope (4 sub-tasks in one issue)

1. **Voice discovery scan function** — Replace the static `VOICES` list with a scan function that reads all `.wav` files from `speaker_wavs/`. Each discovered file produces a voice entry: `{ id: filename_without_extension, name: filename_without_extension }`.

2. **Dynamic voice resolution** — In `generate_speech()`, replace the hardcoded `speaker_wavs` dict with dynamic resolution: `speaker_wavs/{voice}.wav`. File existence is validated at generation time via the existing `_validate_speaker_wav()` function. If missing, return a 500 error with a descriptive message.

3. **Remove voice field regex constraint** — Remove the `pattern="^(female|male|default)$"` from `SynthesisRequest.voice`. The field accepts any string; validation happens at runtime via file existence check.

4. **Update `/api/voices` endpoint** — Call the scan function instead of returning static `VOICES`. Returns `{ id, name }` objects for each `.wav` file.

### Prototype / Decision Record

The scan function should be a thin wrapper around `os.listdir()` + `.wav` filter:

```python
def discover_voices(directory: str) -> list[dict]:
    """Scan directory for .wav files and return voice entries."""
    voices = []
    if not os.path.isdir(directory):
        return voices
    for filename in sorted(os.listdir(directory)):
        if filename.endswith('.wav'):
            name = filename[:-4]  # strip extension
            voices.append({"id": name, "name": name})
    return voices
```

The `generate_speech()` resolution replaces:
```python
# OLD (hardcoded dict)
speaker_wavs = {
    "female": os.path.join(SPEAKER_WAV_DIR, "female.wav"),
    "male": os.path.join(SPEAKER_WAV_DIR, "male.wav"),
}
speaker_wav = speaker_wavs.get(voice)
```

With:
```python
# NEW (dynamic resolution)
speaker_wav = os.path.join(SPEAKER_WAV_DIR, f"{voice}.wav")
```

The `SynthesisRequest` model changes:
```python
# OLD
voice: Optional[str] = Field(default=None, pattern="^(female|male|default)$")

# NEW
voice: Optional[str] = Field(default=None)  # any string accepted
```

The `speaker` alias field can be removed or kept for backward compatibility (it maps to `voice`).

### Acceptance criteria

- [ ] `/api/voices` returns all `.wav` files from `speaker_wavs/` directory as `{ id, name }` objects
- [ ] Adding a new `.wav` file to `speaker_wavs/` makes it immediately available via `/api/voices` without server restart
- [ ] `generate_speech()` resolves any voice name to `speaker_wavs/{voice}.wav` dynamically
- [ ] Missing speaker WAV files return a 500 error with the filename in the detail message
- [ ] The `voice` field in `SynthesisRequest` accepts any string (no regex constraint)
- [ ] Existing `female.wav` and `male.wav` continue to work alongside any new custom voices
- [ ] The `_validate_speaker_wav()` duration check (≥ 0.33s) applies to all discovered voices
- [ ] Existing backend tests (`test_voices.py`, `test_generate.py`) updated to reflect new behavior
- [ ] New tests added for the scan function (mock filesystem state)

### Notes

- The `speaker_wavs/` directory is already mounted as a Docker volume, so WAV files added to it persist across container restarts.
- The existing `_validate_speaker_wav()` function (minimum duration 0.33s) continues to apply to all discovered voices — no exceptions for custom files.
- The `temperature` parameter (0.4) and seed behavior remain unchanged.
