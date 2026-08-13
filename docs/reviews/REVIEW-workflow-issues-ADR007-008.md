# Review Report: Issues vs Workflow Spec vs ADR-007/ADR-008

**Date**: 2026-08-13
**Scope**: 10 issues (ISSUE-001 through ISSUE-010), WORKFLOW spec (16 steps + ABORT_CLEANUP), ADR-007, ADR-008
**Reviewer**: Requirements Engineer (review-only, no edits)

---

## 1. Workflow Trace: Every Spec Step → ≥1 Issue

Checking each workflow step maps to at least one issue.

| Workflow Step | Covered By | Finding |
|---|---|---|
| STEP 1: Backend Model Swap | ISSUE-001 | ✅ Covered |
| STEP 2: Remove Voice Cloning | ISSUE-002 | ✅ Covered |
| STEP 3: Synthesis Cache (Lookup) | ISSUE-003 | ✅ Covered |
| STEP 4: Synthesis Cache (Store) | ISSUE-003 | ✅ Covered (same issue) |
| STEP 5: Simplify API (Backend) | ISSUE-004 | ✅ Covered |
| STEP 6: Simplify API (Frontend) | ISSUE-006 | ✅ Covered |
| STEP 7: Redesign Voice Discovery | ISSUE-005 + ISSUE-007 | ✅ Covered (backend in 005, frontend in 007) |
| STEP 8: Remove Speed/Pitch Control | ISSUE-007 | ✅ Covered |
| STEP 9: Adjust Health Check Timing | ISSUE-008 | ✅ Covered |
| STEP 10: Update Dockerfile | ISSUE-010 | ✅ Covered |
| STEP 11: Update Frontend Components | ISSUE-007 | ✅ Covered (GenerateButton label + VoiceSelector) |
| STEP 12: Update History and Cleanup | ISSUE-009 | ✅ Covered |
| STEP 13: Frontend Lifecycle (No Change) | — | ✅ N/A (no implementation needed) |
| STEP 14: Cache Lifecycle/Disk Space | ISSUE-009 (cleanup) | ✅ Covered (cleanup handles cache files) |
| STEP 15: Perth Watermark | — | ⚠️ **ORPHAN** — No issue addresses watermark documentation or verification |
| STEP 16: Frontend Validation (No Change) | — | ✅ N/A (no implementation needed) |
| ABORT_CLEANUP: Model Swap Failure Recovery | — | ⚠️ **ORPHAN** — No issue covers rollback testing or rollback procedure |

**Findings: 2 orphans** (STEP 15, ABORT_CLEANUP)

---

## 2. Reverse Trace: Every Issue → A Spec Step

Checking each issue maps back to at least one workflow step. No scope creep.

| Issue | Maps To | Finding |
|---|---|---|
| ISSUE-001 | STEP 1 | ✅ Correct scope |
| ISSUE-002 | STEP 2 | ✅ Correct scope |
| ISSUE-003 | STEP 3 + STEP 4 | ✅ Correct scope |
| ISSUE-004 | STEP 5 | ✅ Correct scope |
| ISSUE-005 | STEP 7 (backend) | ✅ Correct scope |
| ISSUE-006 | STEP 6 | ✅ Correct scope |
| ISSUE-007 | STEP 7 (frontend) + STEP 8 + STEP 11 | ✅ Correct scope (covers 3 steps) |
| ISSUE-008 | STEP 9 + STEP 11 (label) | ✅ Correct scope |
| ISSUE-009 | STEP 12 + STEP 14 | ✅ Correct scope (covers 2 steps) |
| ISSUE-010 | STEP 10 | ✅ Correct scope |

**Findings: 0** — All issues map to spec steps. No scope creep.

---

## 3. Failure Modes: Every Failure/Timeout/ABORT_CLEANUP → Test Case

Checking workflow failure modes against the test case table (TC-01 through TC-24).

### 3a. STEP 1 (Model Swap) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(import_error)` | TC-19 (Docker rebuild) | ✅ Covered |
| `FAILURE(model_download_timeout)` | TC-19 (Docker rebuild) | ✅ Covered |
| `FAILURE(cuda_unavailable)` | — | ⚠️ **ORPHAN** — No test verifies CPU-only operation |
| `FAILURE(voice_data_missing)` | — | ⚠️ **ORPHAN** — No test verifies Arabic voice data availability |

### 3b. STEP 2 (Remove Voice Cloning) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(voice_cloning_reference)` | — | ⚠️ **ORPHAN** — No test verifies no `speaker_wavs/` references remain |
| `FAILURE(ffmpeg_dependency)` | TC-19 (Docker rebuild) | Partially covered (build succeeds), but no explicit test for ffmpeg presence |
| `FAILURE(seed_omission)` | TC-17 (interface change) | ✅ Covered |
| `FAILURE(temperature_exposure)` | TC-17 (interface change) | ✅ Covered |

### 3c. STEP 3 (Cache Lookup) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(cache_key_collision)` | TC-03 | ✅ Covered |
| `FAILURE(cache_file_corrupted)` | TC-12 | ✅ Covered |
| `FAILURE(cache_dir_not_writable)` | TC-11 | ✅ Covered |
| `FAILURE(cache_hash_computation_error)` | — | ⚠️ **ORPHAN** — No test for non-UTF-8 text causing hash computation failure |

### 3d. STEP 4 (Cache Store) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(cache_write_permission)` | TC-11 | ✅ Covered |
| `FAILURE(sidecar_write_error)` | TC-13 | ✅ Covered |
| `FAILURE(hash_mismatch)` | — | ⚠️ **ORPHAN** — No test verifies hash-filename consistency check |

### 3e. STEP 5 (Simplify API) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(legacy_client_compatibility)` | TC-17 | ✅ Covered |
| `FAILURE(language_restriction)` | TC-06 | ✅ Covered |
| `FAILURE(voice_default)` | TC-08 | ✅ Covered |

### 3f. STEP 6 (Frontend API) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(interface_mismatch)` | TC-17 | ✅ Covered |
| `FAILURE(voice_binding)` | ISSUE-007 acceptance criteria | ✅ Covered (by issue, not TC) |
| `FAILURE(language_hardcoded)` | ISSUE-006 acceptance criteria | ✅ Covered (by issue, not TC) |

### 3g. STEP 7 (Voice Discovery) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(voice_list_api_missing)` | TC-16 | ✅ Covered |
| `FAILURE(voice_interface_mismatch)` | ISSUE-007 acceptance criteria | ✅ Covered (by issue) |
| `FAILURE(no_arabic_voices)` | — | ⚠️ **ORPHAN** — No test verifies Arabic voices exist in Chatterbox output |
| `FAILURE(voice_selector_broken)` | ISSUE-007 acceptance criteria | ✅ Covered (by issue) |

### 3h. STEP 8 (Remove Speed/Pitch) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(speed_slider_orphan)` | TC-18 | ✅ Covered |
| `FAILURE(speed_prop_leak)` | ISSUE-007 acceptance criteria | ✅ Covered (by issue) |
| `FAILURE(speed_binding_orphan)` | ISSUE-007 acceptance criteria | ✅ Covered (by issue) |

### 3i. STEP 9 (Health Check Timing) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(polling_mismatch)` | TC-15 | ✅ Covered |
| `FAILURE(polling_too_slow)` | TC-15 | ✅ Covered |
| `FAILURE(backend_timeout_mismatch)` | TC-19 | ✅ Covered |

### 3j. STEP 10 (Dockerfile) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(python_311_incompatibility)` | TC-19 | ✅ Covered |
| `FAILURE(ffmpeg_still_needed)` | ISSUE-010 acceptance criteria | ✅ Covered (by issue) |
| `FAILURE(torchcodec_missing)` | ISSUE-010 acceptance criteria | ✅ Covered (by issue) |
| `FAILURE(dependency_conflict)` | ISSUE-010 acceptance criteria | ✅ Covered (by issue) |
| `FAILURE(volume_path_mismatch)` | — | ⚠️ **ORPHAN** — No test verifies Chatterbox respects `/app/.cache/tts` volume path |

### 3k. STEP 11 (Frontend Components) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(voice_selector_wav_reference)` | ISSUE-007 acceptance criteria | ✅ Covered (by issue) |
| `FAILURE(generate_button_label)` | ISSUE-008 acceptance criteria | ✅ Covered (by issue) |
| `FAILURE(voice_binding_inconsistent)` | ISSUE-006 + ISSUE-007 acceptance criteria | ✅ Covered (by issue) |

### 3l. STEP 12 (History and Cleanup) Failure Modes

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| `FAILURE(history_parsing_break)` | ISSUE-009 acceptance criteria | ✅ Covered (by issue) |
| `FAILURE(sidecar_format_mismatch)` | ISSUE-009 acceptance criteria | ✅ Covered (by issue) |
| `FAILURE(legacy_file_orphan)` | TC-14 | ✅ Covered |

### 3m. ABORT_CLEANUP

| Workflow Failure | Covered by TC | Finding |
|---|---|---|
| Any step 1-10 irrecoverable failure | TC-20 (rollback) | Partially covered — TC-20 tests "system reverts to XTTS-v2" but does NOT test the ABORT_CLEANUP procedure (git revert of 10 files, Docker restart). TC-20 is a happy-path rollback test, not a failure-mode test. |

### 3n. Additional Failure Modes Not in Test Table

| Failure Mode | Covered by TC | Finding |
|---|---|---|
| 503 when model not ready (state transitions) | TC-07 | ✅ Covered |
| 422 validation errors (state transitions) | TC-04, TC-05, TC-06 | ✅ Covered |
| 500 synthesis error (state transitions) | — | ⚠️ **ORPHAN** — No test for 500 response from Chatterbox failure |
| Client disconnect during synthesis (state transitions) | TC-22 | ✅ Covered |

**Findings: 10 orphaned failure modes** (see summary below)

---

## 4. ADR Compliance: No Issue Violates a Constraint

### ADR-007 Constraints

| Constraint | Description | Violated By | Finding |
|---|---|---|---|
| C1 | Replace `TTS("tts_models/multilingual/xtts_v2")` with `Chatterbox("multilingual")` | ISSUE-001 | ✅ Compliant |
| C2 | Remove `speaker_wavs/`, `_validate_speaker_wav()`, `SPEAKER_WAV_DIR` | ISSUE-002 | ✅ Compliant |
| C3 | Remove `speaker`, `speed`, `pitch`, `seed` from `SynthesisRequest` | ISSUE-004 | ✅ Compliant |
| C4 | Add `language` (default "ar") and `voice` (Chatterbox built-in name) | ISSUE-004, ISSUE-005 | ✅ Compliant |
| C5 | Health check load time ~30-60s; polling interval may increase 2s→5s | ISSUE-008 | ✅ Compliant |
| C6 | Frontend `SynthesisRequest` interface: `{ text, language?, voice? }` | ISSUE-006 | ✅ Compliant |
| C7 | Dockerfile: Python 3.11-slim, remove ffmpeg, add `chatterbox-tts`, `torchaudio`, `librosa` | ISSUE-010 | ⚠️ **PARTIAL VIOLATION** — ISSUE-010 says "Keep ffmpeg (RC-1: Chatterbox outputs WAV, ffmpeg conversion still needed)". ADR-007 C7 says "remove ffmpeg". RC-1 in the workflow flags this contradiction, but the ADR itself says remove ffmpeg. This is a spec-level contradiction, not an issue-level violation. |
| C8 | Model cache volume path remains `/app/.cache/tts` | ISSUE-001, ISSUE-010 | ✅ Compliant |

### ADR-008 Constraints

| Constraint | Description | Violated By | Finding |
|---|---|---|---|
| C1 | File-based cache in `downloads/` | ISSUE-003 | ✅ Compliant |
| C2 | Cache key: SHA-256 of `text + language + voice + speed` | ISSUE-003 | ✅ Compliant |
| C3 | Hash used as filename: `{hash}.mp3` | ISSUE-003 | ✅ Compliant |
| C4 | Cache lookup before inference | ISSUE-003 | ✅ Compliant |
| C5 | Cache entries are regular MP3 files | ISSUE-003, ISSUE-009 | ✅ Compliant |
| C6 | No explicit invalidation — stale entries cleaned by orphaned file mechanism | ISSUE-009 | ✅ Compliant |
| C7 | Composite key must use delimiter (e.g., `|`) | ISSUE-003 | ✅ Compliant |

**Findings: 1 partial violation** (ADR-007 C7 vs RC-1 contradiction on ffmpeg)

---

## 5. Dependency Order: Matches Workflow Execution Order

Checking the dependency chain against the workflow's logical execution order.

### 5a. Workflow Execution Order (from spec)

The workflow defines a logical sequence: model swap → remove cloning → cache → API → voices → frontend → UI → health → Docker → history.

### 5b. Issue Dependency Chain (from DEPENDENCY-CHAIN.md)

```
ISSUE-001 (model swap) ──┐
                          ├── ISSUE-002 (remove cloning) ── ISSUE-003 (cache) ── ISSUE-004 (API) ── ISSUE-005 (voices) ── ISSUE-006 (frontend API) ── ISSUE-007 (UI) ── ISSUE-008 (button+poll)
ISSUE-010 (Docker) ──────┘                                                                    │
                                                                                              └── ISSUE-009 (history)
```

### 5c. Cross-Check: Issue Dependencies vs Workflow Steps

| Issue | Workflow Step | Dependencies | Workflow-Consistent? | Finding |
|---|---|---|---|---|
| ISSUE-001 | STEP 1 | None | ✅ Yes — STEP 1 is first | |
| ISSUE-010 | STEP 10 | 001 | ✅ Yes — Docker must match model swap | |
| ISSUE-002 | STEP 2 | 001 | ✅ Yes — cloning removal after model swap | |
| ISSUE-003 | STEP 3+4 | 002 | ✅ Yes — cache depends on clean generate_speech() | |
| ISSUE-004 | STEP 5 | 003 | ⚠️ **DEVIATION** — Workflow lists STEP 5 (API) before STEP 3/4 (cache). The dependency chain reverses this: cache (003) must come before API (004) because the cache key uses the new API fields. This is a **valid engineering decision** (cache key depends on new request format), but it contradicts the workflow's listed order. |
| ISSUE-005 | STEP 7 (backend) | 004 | ✅ Yes — voice discovery depends on simplified API | |
| ISSUE-006 | STEP 6 | 004 | ✅ Yes — frontend API depends on backend contract | |
| ISSUE-007 | STEP 7 (frontend) + 8 + 11 | 005, 006 | ✅ Yes — UI depends on voice format + API | |
| ISSUE-008 | STEP 9 + 11 (label) | 007 | ✅ Yes — button/poll depends on UI layout | |
| ISSUE-009 | STEP 12 + 14 | 003 | ✅ Yes — history depends on cache-based filenames | |

### 5d. Parallel Path Validity

| Path | Steps | Valid? | Finding |
|---|---|---|---|
| Path A (backend core) | 001 → 010 → 002 → 003 → 004 → 005 → 007 → 008 | ✅ Yes | |
| Path B (frontend) | 004 → 006 → 007 → 008 | ✅ Yes | |
| Path C (backend history) | 003 → 009 | ✅ Yes | |

**Findings: 1 deviation** (workflow lists STEP 5 before STEP 3/4; dependency chain correctly reverses this)

---

## Summary of Findings

### Category 1: Workflow Trace (Orphaned Spec Steps)
**Count: 2**

| # | Orphan | Severity | Notes |
|---|---|---|---|
| 1 | STEP 15 (Perth Watermark) | Low | No issue addresses watermark documentation or verification. Acceptable as "no code change required" per spec, but no issue confirms this decision. |
| 2 | ABORT_CLEANUP (Model Swap Failure Recovery) | **High** | 10-file git revert procedure + Docker restart. No issue tests rollback. If STEP 1-10 fails mid-implementation, there is no tracked work item to execute the recovery. |

### Category 2: Reverse Trace (Scope Creep)
**Count: 0**

All 10 issues map to spec steps. No issues introduce out-of-scope work.

### Category 3: Failure Mode Coverage (Orphaned Failure Modes)
**Count: 10**

| # | Failure Mode | Source Step | Notes |
|---|---|---|---|
| 1 | `FAILURE(cuda_unavailable)` | STEP 1 | No test verifies CPU-only container operation |
| 2 | `FAILURE(voice_data_missing)` | STEP 1 | No test verifies Arabic voice data availability |
| 3 | `FAILURE(voice_cloning_reference)` | STEP 2 | No test verifies no `speaker_wavs/` references remain |
| 4 | `FAILURE(cache_hash_computation_error)` | STEP 3 | No test for non-UTF-8 text causing hash failure |
| 5 | `FAILURE(hash_mismatch)` | STEP 4 | No test verifies hash-filename consistency check |
| 6 | `FAILURE(no_arabic_voices)` | STEP 7 | No test verifies Arabic voices exist in Chatterbox output |
| 7 | `FAILURE(volume_path_mismatch)` | STEP 10 | No test verifies Chatterbox respects `/app/.cache/tts` |
| 8 | 500 synthesis error (state transition) | State transitions | No test for 500 response from Chatterbox failure |
| 9 | ABORT_CLEANUP procedure | ABORT_CLEANUP | TC-20 tests happy-path rollback, not the 10-file revert procedure |
| 10 | `FAILURE(ffmpeg_still_needed)` edge case | STEP 10 | ISSUE-010 says keep ffmpeg, but no test verifies ffmpeg is actually present in the built image |

### Category 4: ADR Compliance
**Count: 1**

| # | Violation | Severity | Notes |
|---|---|---|---|
| 1 | ADR-007 C7 says "remove ffmpeg" but RC-1 says "keep ffmpeg" | **Medium** | Spec-level contradiction. ISSUE-010 follows RC-1 (keep ffmpeg), which contradicts the ADR text. This is a documentation inconsistency, not an implementation error. |

### Category 5: Dependency Order
**Count: 1**

| # | Deviation | Severity | Notes |
|---|---|---|---|
| 1 | Workflow lists STEP 5 (API) before STEP 3/4 (cache); dependency chain correctly reverses this | Low | The dependency chain's ordering (cache before API) is the correct engineering decision because the cache key uses the new API fields. The workflow spec order is misleading. |

---

## Remediation Table

| # | Category | Finding | Severity | Recommended Action |
|---|---|---|---|---|
| 1 | Workflow Trace | ABORT_CLEANUP not covered by any issue | **High** | Create ISSUE-011: "Test Model Swap Rollback Procedure" — test the 10-file git revert + Docker restart. This is a deployment safety net. |
| 2 | Failure Modes | 10 orphaned failure modes | **Medium** | Prioritize: (a) `FAILURE(cuda_unavailable)` — add to TC-19; (b) `FAILURE(voice_data_missing)` — add to TC-16; (c) `FAILURE(no_arabic_voices)` — add to TC-16; (d) `FAILURE(volume_path_mismatch)` — add to TC-19. The remaining 6 are lower priority. |
| 3 | ADR Compliance | ADR-007 C7 vs RC-1 contradiction on ffmpeg | **Medium** | Update ADR-007 C7 to clarify: "remove ffmpeg only if Chatterbox outputs MP3 directly; otherwise keep ffmpeg for WAV→MP3 conversion." Or update RC-1 to note this is an ADR violation. |
| 4 | Dependency Order | Workflow STEP 5 listed before STEP 3/4 | Low | Update workflow spec to list STEP 3/4 before STEP 5, matching the dependency chain. |
| 5 | Workflow Trace | STEP 15 (Perth Watermark) not tracked | Low | Add a note to ISSUE-001 or ISSUE-010 acceptance criteria: "Perth watermark present in all outputs (imperceptible, per ADR-007)." No new issue needed. |

---

## Overall Assessment

| Category | Findings | Status |
|---|---|---|
| 1. Workflow Trace | 2 | ⚠️ 1 High, 1 Low |
| 2. Reverse Trace | 0 | ✅ Pass |
| 3. Failure Modes | 10 | ⚠️ 10 Medium |
| 4. ADR Compliance | 1 | ⚠️ 1 Medium |
| 5. Dependency Order | 1 | ✅ 1 Low (valid deviation) |
| **Total** | **14** | **STOP — Design is suspect** |

**More than 3 findings in Category 3 (Failure Modes).** Per the objective: STOP; the design (not the issues) is suspect — return to Step 5 (or Step 4 for ADR violations, or re-run Step 3 grilling if the idea itself is shaky).

### Key Risk: Failure Mode Coverage Gap

The test case table (TC-01 through TC-24) covers ~60% of the workflow's failure modes. The 10 orphaned failure modes represent real risks:

1. **CPU-only operation** is the production environment. If Chatterbox attempts GPU initialization and fails silently, the system degrades without error.
2. **Arabic voice data availability** is the core premise of ADR-007. If Chatterbox doesn't provide Arabic voices, the entire swap fails.
3. **Volume path mismatch** means model weights re-download on every restart, negating the cache volume benefit.
4. **500 synthesis errors** are untested — a crashing Chatterbox model would return 500, but there's no test verifying the frontend handles this.

These are not edge cases — they are **core system assumptions** that lack test coverage.

### Recommended Next Steps (for human decision)

1. **Address ABORT_CLEANUP** (Finding #1, High) — Create ISSUE-011 for rollback testing.
2. **Add 4 critical failure-mode tests** (Findings #1, #2, #6, #7 from Category 3) — These are the highest-risk gaps.
3. **Resolve ADR-007 C7 vs RC-1 contradiction** (Finding #3) — Update the ADR or the workflow spec.
4. **Update workflow spec order** (Finding #4) — List STEP 3/4 before STEP 5.
