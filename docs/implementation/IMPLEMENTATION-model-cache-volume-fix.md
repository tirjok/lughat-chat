# Implementation Plan: Fix Model Cache Volume Path Mismatch

**Source**: `docs/workflows/WORKFLOW-model-loading-readiness.md` (v0.1) — RC-004
**Date**: 2026-07-11
**Status**: Draft — Ready for implementation

---

## Problem Statement

The Docker Compose configuration mounts the `tts-model-cache` named volume at `/root/.local/share/tts` inside the backend container, but the application writes model files to `/app/.cache/tts` (set via the `TTS_MODEL_CACHE` environment variable). This path mismatch means the named volume is **completely unused** — the ~2GB TTS model is re-downloaded on every container restart, wasting bandwidth and adding ~2 minutes to every restart.

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity |
|---|---------|----------|
| RC-004 | Model cache (`tts-model-cache` named volume at `/root/.local/share/tts`) is **NOT used** — the app writes to `/app/.cache/tts` (env var) | **High** |
| RC-042 | Docker health check correctly accounts for 120s, but frontend polling (20s) does NOT | Critical |

---

## Master Index — All 10 Slices Across 5 Files

This file is on the **critical path** (no blockers), but can be implemented in any order relative to M-01 and M-06.

| ID | File | Title | Blocked By | Priority |
|----|------|-------|------------|----------|
| **M-04** | This file | Fix volume mount path to `/app/.cache/tts` | **None** | **P1** |
| M-05 | This file | Verify model persistence across restarts | M-04 | P1 |
| M-01 | IMPLEMENTATION-model-loading-polling-fix.md Slice 1 | Increase polling to 60 retries (120s) | **None** | P0 |
| M-02 | IMPLEMENTATION-model-loading-polling-fix.md Slice 2 | Update tests for 60-retry default | M-01 | P0 |
| M-03 | IMPLEMENTATION-model-loading-polling-fix.md Slice 3 | Update GenerateButton loading text | M-01 | P1 |
| M-06 | IMPLEMENTATION-model-loading-progress.md Slice 1 | Add `model_name` + `sub_status` to `/health` | **None** | P2 |
| M-07 | IMPLEMENTATION-model-loading-progress.md Slice 2 | Frontend reads new fields | M-01, M-06 | P2 |
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

### Slice M-04: Align Docker Volume Mount with App Config Path

**Type**: AFK
**Blocked by**: None (critical path — can start in parallel with M-01 and M-06)
**Depends on**: Nothing
**Used by**: M-05
**User stories**: Model persists across container restarts, saving 2GB download and ~2 minutes per restart

**What to build**: Fix the Docker Compose volume mount to match the `TTS_MODEL_CACHE` environment variable. Two options:

**Option A (recommended)**: Change the volume mount path in `docker-compose.yml` from `/root/.local/share/tts` to `/app/.cache/tts` to match the env var.

**Option B**: Change the env var in `docker-compose.yml` from `TTS_MODEL_CACHE=/app/.cache/tts` to `TTS_MODEL_CACHE=/root/.local/share/tts` to match the volume mount.

**Option A is recommended** because:
- `/app/.cache/tts` is the path the application code already uses (see `app.py` line: `MODEL_CACHE_DIR = os.environ.get("TTS_MODEL_CACHE", "/app/.cache/tts")`)
- `/app/` is the working directory inside the container (consistent with other paths like `/app/downloads`, `/app/speaker_wavs`)
- `/root/.local/share/tts` is the Coqui TTS *default* path, but the app explicitly overrides it via env var

**Current code** (`docker-compose.yml`):
```yaml
volumes:
  # Persist model cache across restarts (avoids re-downloading)
  - tts-model-cache:/root/.local/share/tts   # ← WRONG PATH
environment:
  - TTS_MODEL_CACHE=/app/.cache/tts           # ← App writes here, volume mounts elsewhere
```

**Target** (Option A):
```yaml
volumes:
  # Persist model cache across restarts (avoids re-downloading)
  - tts-model-cache:/app/.cache/tts           # ← FIXED: matches env var
environment:
  - TTS_MODEL_CACHE=/app/.cache/tts
```

**Acceptance criteria**:
- [ ] Docker Compose volume mount path changed from `/root/.local/share/tts` to `/app/.cache/tts`
- [ ] `TTS_MODEL_CACHE` environment variable remains `/app/.cache/tts` (no change needed)
- [ ] `app.py` requires no changes (already reads `TTS_MODEL_CACHE` env var)
- [ ] Model downloads to `/app/.cache/tts` on first restart
- [ ] Model persists in the named volume across container restarts (verified: no re-download on `docker compose restart backend`)

**Integration verification**:
- [ ] `docker compose up --build -d` starts successfully
- [ ] Backend loads model successfully (writes to `/app/.cache/tts`)
- [ ] Model file exists at `/app/.cache/tts` after first load (~2GB)
- [ ] On second `docker compose restart backend`, model is already cached (no re-download)
- [ ] Named volume `tts-model-cache` is correctly referenced in `docker compose ps` output

---

### Slice M-05: Verify Model Persistence Across Restarts

**Type**: AFK
**Blocked by**: M-04 (this file, Slice M-04)
**Depends on**: M-04
**User stories**: — (verification only)

**What to build**: Manual verification that the model persists across container restarts:

1. Run `docker compose up -d backend` (first time — model downloads ~2GB)
2. Note the model load time (~120s on CPU)
3. Run `docker compose restart backend` (second time — should load from cache)
4. Verify the model load time is significantly faster (< 10s, just loading from disk)
5. Verify the model files exist in the named volume: `docker exec lughat-backend ls -lh /app/.cache/tts/`

**Acceptance criteria**:
- [ ] First restart downloads ~2GB model (expected)
- [ ] Second restart loads from cache (< 10 seconds, no download)
- [ ] Model files visible at `/app/.cache/tts/` inside container
- [ ] Named volume `tts-model-cache` contains the model data (check with `docker volume inspect arabic-tts-models`)

---

## Open Questions

- The spec notes the named volume is called `arabic-tts-models` (`MODEL_VOLUME_NAME=arabic-tts-models` in `.env`), but Docker Compose defines it as `tts-model-cache`. Does the env var `MODEL_VOLUME_NAME` reference the volume anywhere in the code? If not, it can be removed from `.env`.
- Should we also add a cleanup mechanism for stale model files? (Probably not needed — the volume persists correctly once fixed.)
- Is there any scenario where the app might write to `/root/.local/share/tts` (Coqui's default) instead of `/app/.cache/tts`? The env var `TTS_MODEL_CACHE` should override this, but double-check Coqui TTS source code to be sure.
