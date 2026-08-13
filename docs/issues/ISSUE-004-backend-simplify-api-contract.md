# ISSUE-004: Backend — Simplify API Contract (SynthesisRequest)

## What to build

Simplify `SynthesisRequest` in `backend/app.py` from 6 fields to 3:

**Before:**
```python
class SynthesisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)
    language: str = Field(default="ar", pattern="^(ar|en)$")
    voice: str = Field(default="female")
    speaker: Optional[str] = Field(default=None)  # alias for voice
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=0.0, ge=-2.0, le=2.0)
    seed: Optional[int] = Field(default=None, ge=0)
```

**After:**
```python
class SynthesisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)
    language: str = Field(default="ar", pattern="^(ar|en)$")
    voice: str = Field(default="female")
```

Remove: `speaker`, `speed`, `pitch`, `seed`. Update `generate_speech()` to use `request.voice` directly (no `speaker` alias resolution).

## Acceptance criteria

- [ ] `SynthesisRequest` has exactly 3 fields: `text`, `language`, `voice`
- [ ] `text` constraint preserved: `min_length=1, max_length=3000`
- [ ] `language` constraint preserved: `default="ar", pattern="^(ar|en)$"`
- [ ] `voice` constraint preserved: `default="female"`
- [ ] `speaker` field removed (no alias resolution in `generate_speech()`)
- [ ] `speed` field removed (Chatterbox uses default speed)
- [ ] `pitch` field removed (no pitch control)
- [ ] `seed` field removed (Chatterbox deterministic by default)
- [ ] 422 validation error returned for missing `text`, text too long, invalid language
- [ ] 422 validation error returned for unknown extra fields (Pydantic strict mode)
- [ ] Default parameters work: only `text` provided → `language="ar"`, `voice="female"`
- [ ] `./run-backend-tests.sh` passes

## Blocked by

- ISSUE-003 (Backend Synthesis Cache) — cache key depends on the new request format

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Reference

- Workflow: `docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` — STEP 5 (Simplify API Contract — Backend)
- ADR: `docs/adr/ADR-007-replace-xtts-with-chatterbox.md` — C3, C6, RC-9
