# Implementation Plan: Add Model Loading Progress to Health Endpoint

**Source**: `docs/workflows/WORKFLOW-model-loading-readiness.md` (v0.1) — Open Question
**Date**: 2026-07-11
**Status**: Draft — Ready for implementation

---

## Problem Statement

The `/health` endpoint currently returns only coarse-grained status: `"loading"`, `"ready"`, or `"error"`. During the ~120-second model loading window, the frontend has no way to provide more granular status to the user. There's no indication of *which* model is loading, whether the model is downloading or initializing, or any estimate of remaining time.

This spec also prepares the infrastructure for the upcoming Whisper/STT model loading (a second model that loads after XTTS-v2), where the `/health` endpoint will need to report status for multiple models.

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity |
|---|---------|----------|
| RC-1 | `/health` returns only `"loading"` / `"ready"` / `"error"` — no granularity during 120s wait | **High** |
| Missing | No `/api/pronounce` endpoint (Whisper/STT not built yet) | Critical (future) |
| Missing | No STT model loading infrastructure (extends Model Loading workflow) | High (future) |

---

## Master Index — All 10 Slices Across 5 Files

This file is on the **critical path** (no blockers), but can be implemented in any order relative to M-01 and M-04.

| ID | File | Title | Blocked By | Priority |
|----|------|-------|------------|----------|
| **M-06** | This file | Add `model_name` + `sub_status` to `/health` | **None** | **P2** |
| M-07 | This file | Frontend reads new fields | M-01, M-06 | P2 |
| M-01 | IMPLEMENTATION-model-loading-polling-fix.md Slice 1 | Increase polling to 60 retries (120s) | **None** | P0 |
| M-02 | IMPLEMENTATION-model-loading-polling-fix.md Slice 2 | Update tests for 60-retry default | M-01 | P0 |
| M-03 | IMPLEMENTATION-model-loading-polling-fix.md Slice 3 | Update GenerateButton loading text | M-01 | P1 |
| M-04 | IMPLEMENTATION-model-cache-volume-fix.md Slice 1 | Fix volume mount path to `/app/.cache/tts` | **None** | P1 |
| M-05 | IMPLEMENTATION-model-cache-volume-fix.md Slice 2 | Verify model persistence | M-04 | P1 |
| M-08 | IMPLEMENTATION-model-loading-recovery.md Slice 1 | Retry-after-error state machine | M-01 | P2 |
| M-09 | IMPLEMENTATION-model-loading-recovery.md Slice 2 | UI shows "Retrying..." | M-08 | P2 |
| M-10 | IMPLEMENTATION-model-loading-recovery.md Slice 3 | Manual retry button | M-09 | P2 |
| M-11 | IMPLEMENTATION-model-loading-ux-during-wait.md Slice 1 | Persistent loading banner | M-01 | P2 |
| M-12 | IMPLEMENTATION-model-loading-ux-during-wait.md Slice 2 | Disable controls during loading | M-11 | P2 |
| M-13 | IMPLEMENTATION-model-loading-ux-during-wait.md Slice 3 | Ready toast notification | M-01, M-11, M-12 | P2 |

**Implementation order (topological sort):**
```
Phase 1 (no blockers): M-01 → M-04 → M-06  (can run in parallel)
Phase 2 (depends on Phase 1): M-02, M-03, M-05, M-07
Phase 3 (depends on Phase 2): M-08, M-11
Phase 4 (depends on Phase 3): M-09, M-10, M-12
Phase 5 (depends on Phase 4): M-13
```

---

## Slices

### Slice M-06: Extend Health Endpoint with Model Name and Sub-Status

**Type**: AFK
**Blocked by**: None (critical path — can start in parallel with M-01 and M-04)
**Depends on**: Nothing
**Used by**: M-07
**User stories**: User sees which model is loading during the 120s wait; backend prepares for multi-model support

**What to build**: Extend the `/health` endpoint response to include a `model_name` field and a `sub_status` field that provides more granularity during the loading phase.

**Current code** (`app.py`):
```python
@app.get("/health", response_model=HealthResponse)
async def health():
    return {
        "status": model_load_status,
        "model_loaded": tts_model is not None and model_load_status == "ready",
    }

class HealthResponse(BaseModel):
    status: str  # loading | ready | error
    model_loaded: bool
```

**Target behavior**:

```python
class HealthResponse(BaseModel):
    status: str  # loading | ready | error
    model_loaded: bool
    model_name: str = "XTTS-v2"  # Name of the loaded model
    sub_status: str = ""  # Optional: "downloading" | "initializing" | ""

@app.get("/health", response_model=HealthResponse)
async def health():
    return {
        "status": model_load_status,
        "model_loaded": tts_model is not None and model_load_status == "ready",
        "model_name": "XTTS-v2",
        "sub_status": "initializing" if model_load_status == "loading" else "",
    }
```

**Acceptance criteria**:
- [ ] `HealthResponse` model adds `model_name: str = "XTTS-v2"` field
- [ ] `HealthResponse` model adds `sub_status: str = ""` field (optional, defaults to empty string)
- [ ] `/health` endpoint returns `model_name: "XTTS-v2"` in all responses (loading, ready, error)
- [ ] `/health` returns `sub_status: "initializing"` when `model_load_status == "loading"`
- [ ] `/health` returns `sub_status: ""` (empty) when `model_load_status == "ready"` or `"error"`
- [ ] Existing `/health` consumers (frontend `useHealthPoll`) still work — the new fields are additive, not breaking
- [ ] Existing backend tests pass (add assertions for new fields)

**Integration verification**:
- [ ] `GET /health` returns valid JSON with new fields: `{"status": "loading", "model_loaded": false, "model_name": "XTTS-v2", "sub_status": "initializing"}`
- [ ] Backend starts without errors
- [ ] Health check endpoint returns success (not error)

---

### Slice M-07: Update Frontend to Display Model Loading Sub-Status

**Type**: AFK
**Blocked by**: M-01 (polling fix) + M-06 (progress API)
**Depends on**: M-01, M-06
**User stories**: User sees "Loading XTTS-v2..." instead of generic "Loading..."

**What to build**: Update the `ModelStatusIndicator` and `MobileStatusIndicator` components to display the model name from the extended `/health` response. Update `useHealthPoll` to parse and expose the new fields.

**Current behavior** (`ModelStatusIndicator.vue`):
- Shows "Loading..." (generic text)
- Shows colored dot (orange for loading, green for ready, red for error)

**Target behavior**:
- When `sub_status === "initializing"`: Show "Loading XTTS-v2..." (showing the model name)
- When `status === "ready"`: Keep showing "Ready" (no change)
- When `status === "error"`: Keep showing "Error" (no change)
- Tooltips update to reflect the specific model being loaded

**Acceptance criteria**:
- [ ] `useHealthPoll` parses `model_name` from `/health` response and exposes it
- [ ] `useHealthPoll` parses `sub_status` from `/health` response and exposes it
- [ ] `ModelStatusIndicator` shows "Loading XTTS-v2..." when `sub_status === "initializing"`
- [ ] `MobileStatusIndicator` shows "Loading XTTS-v2..." when `sub_status === "initializing"` (compact version)
- [ ] Tooltip text updates to reflect the specific model ("Model XTTS-v2 Loading...")
- [ ] No visual regression — layout, colors, and animations unchanged

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Model status indicator shows "Loading XTTS-v2..." during the 120s loading window
- [ ] Model status indicator shows "Ready" when model loads

---

## Open Questions

- Should we track download progress (percentage) during the model download phase? This would require hooking into Coqui TTS's download callbacks, which may not be exposed. If not available, we can skip this for now.
- When Whisper/STT model loading is added, should `/health` return an array of model statuses instead of a single `model_name`? Probably — but that's a future slice. For now, `model_name: "XTTS-v2"` is sufficient.
- Should the `sub_status` include download progress? (e.g., `"downloading: 45%"`) — Only if Coqui TTS exposes this via callbacks.
