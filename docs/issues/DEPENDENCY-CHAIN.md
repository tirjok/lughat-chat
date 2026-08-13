# ISSUE Dependency Chain

## Workflow Reference

`docs/workflows/WORKFLOW-tts-model-swap-and-cache.md` (STEP 1 through STEP 12)
`docs/adr/ADR-007-replace-xtts-with-chatterbox.md`
`docs/adr/ADR-008-synthesis-cache.md`

## Dependency Graph

```
ISSUE-001 (model swap) ──┐
                          ├── ISSUE-002 (remove cloning) ── ISSUE-003 (cache) ── ISSUE-004 (API) ── ISSUE-005 (voices) ── ISSUE-006 (frontend API) ── ISSUE-007 (UI) ── ISSUE-008 (button+poll)
ISSUE-010 (Docker) ──────┘                                                                    │
                                                                                              └── ISSUE-009 (history)
```

## Linear Execution Order (longest path)

1. **ISSUE-001** — Backend Model Swap (no blockers)
2. **ISSUE-010** — DevOps Dockerfile (blocked by: 001)
3. **ISSUE-002** — Backend Remove Voice Cloning (blocked by: 001)
4. **ISSUE-003** — Backend Synthesis Cache (blocked by: 002)
5. **ISSUE-004** — Backend Simplify API Contract (blocked by: 003)
6. **ISSUE-005** — Backend Voice Discovery (blocked by: 004)
7. **ISSUE-006** — Frontend API Composable (blocked by: 004)
8. **ISSUE-007** — Frontend UI Redesign (blocked by: 005, 006)
9. **ISSUE-008** — Frontend Button + Health Poll (blocked by: 007)
11. **ISSUE-011** — Backend Cache Cleanup Verification (blocked by: 009)
12. **ISSUE-012** — Frontend Cleanup Settings UI (blocked by: 011)

## Parallelizable Paths

- **Path A (backend core):** 001 → 010 → 002 → 003 → 004 → 005 → 007 → 008
- **Path B (frontend):** 004 → 006 → 007 → 008
- **Path C (backend history):** 003 → 009 → 011 → 012

Path B can start once 004 completes (in parallel with 005).
Path C can start once 003 completes (in parallel with 004).

## Issue Files

Located in `docs/issues/`:
- `ISSUE-001-backend-model-swap.md`
- `ISSUE-002-backend-remove-voice-cloning.md`
- `ISSUE-003-backend-synthesis-cache.md`
- `ISSUE-004-backend-simplify-api-contract.md`
- `ISSUE-005-backend-voice-discovery.md`
- `ISSUE-006-frontend-api-composable.md`
- `ISSUE-007-frontend-ui-redesign.md`
- `ISSUE-008-frontend-button-health-poll.md`
- `ISSUE-011-backend-cache-cleanup-verification.md`
- `ISSUE-012-frontend-cleanup-settings-ui.md`
