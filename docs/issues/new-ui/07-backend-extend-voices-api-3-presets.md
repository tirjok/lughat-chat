## Type

AFK

## What to build

Extend the existing `/api/voices` backend endpoint to support 3 voice presets with regional dialect metadata. The response format changes from the current simple list to:

```json
[
  { "id": "aisha", "name": "Aisha", "dialect": "Egyptian Arabic", "tag": "AR-EG", "icon": "orange" },
  { "id": "tariq", "name": "Tariq", "dialect": "Modern Standard Arabic", "tag": "MSA", "icon": "magenta" },
  { "id": "laila", "name": "Laila", "dialect": "Levantine Arabic", "tag": "AR-LB", "icon": "orange" }
]
```

Map existing speaker WAV files to presets:
- Aisha → `female.wav` (default female voice)
- Tariq → `male.wav` (default male voice)
- Laila → `female.wav` (female voice, different prompt seed for Levantine accent)

Use different seeds for deterministic voice variation (Aisha=42, Tariq=123, Laila=42 with Levantine prompt adjustment).

## Acceptance criteria

- [ ] `/api/voices` endpoint returns 3 voice presets (Aisha, Tariq, Laila)
- [ ] Each preset includes: id, name, dialect, tag (AR-EG/MSA/AR-LB), icon color
- [ ] Aisha maps to `female.wav` speaker reference
- [ ] Tariq maps to `male.wav` speaker reference
- [ ] Laila maps to `female.wav` with Levantine prompt seed
- [ ] Existing `/api/generate` endpoint accepts the new voice IDs without breaking changes
- [ ] Tests: `/api/voices` returns 3 presets with correct metadata, synthesis works with all 3 voice IDs

## Blocked by

None - can start immediately
