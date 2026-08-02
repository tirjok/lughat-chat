# WORKFLOW: CI/CD Pipeline Execution

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: GitHub Actions CI workflows (backend, frontend, root CI)

---

## Overview

The project uses GitHub Actions for continuous integration. Three workflows exist:
1. **Backend CI** (`backend.yml`): Runs on push/PR to `main`/`develop` when `backend/**` or `.github/workflows/backend.yml` changes. Runs pytest with coverage.
2. **Frontend CI** (`frontend.yml`): Runs on push/PR to `main`/`develop` when `frontend/**` or `.github/workflows/frontend.yml` changes. Runs lint, typecheck, and Vitest tests with coverage.
3. **Root CI** (`ci.yml` — frontend root): Runs on push to any branch. Runs lint and typecheck (no tests).

Additionally, the local `run-tests.sh` quality gate script runs all four checks sequentially (backend tests → lint → typecheck → frontend tests), stopping at the first failure. This script is also configured as a pre-commit hook.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| GitHub Actions | Orchestrates CI pipeline execution |
| Backend CI (`backend.yml`) | Runs pytest with coverage on Ubuntu |
| Frontend CI (`frontend.yml`) | Runs lint, typecheck, and Vitest tests on Ubuntu |
| Root CI (`ci.yml`) | Runs lint and typecheck (no tests) on Ubuntu |
| `run-tests.sh` | Local quality gate (all four checks, sequential) |
| Pre-commit hooks | Runs `run-tests.sh` on every commit |

---

## Prerequisites

- Git repository with commits on `main` or `develop` branches
- GitHub repository configured with Actions enabled
- Backend CI: Python 3.12, ffmpeg installed
- Frontend CI: pnpm 10.33.4, Node.js 24

---

## Trigger

Three triggers:
1. **Backend CI**: Push or PR to `main`/`develop` when `backend/**` or `.github/workflows/backend.yml` changes
2. **Frontend CI**: Push or PR to `main`/`develop` when `frontend/**` or `.github/workflows/frontend.yml` changes
3. **Root CI**: Push to any branch (no path filter)

---

## Workflow Tree

### STEP 1: Backend CI Pipeline
**Actor**: GitHub Actions (backend.yml)
**Action**:
  1. Checkout repository
  2. Set up Python 3.12
  3. Install ffmpeg (`sudo apt-get install -y ffmpeg`)
  4. Install dependencies (`pip install -r backend/requirements-test.txt`)
  5. Run tests (`pytest --cov=app --cov-report=term-missing -v`)

**Timeout**: N/A (GitHub Actions default: 6 hours)
**Input**: Code changes in `backend/**` or `.github/workflows/backend.yml`
**Output on SUCCESS**: All tests pass; coverage report generated
**Output on FAILURE**: First failing test stops the pipeline; error message displayed

**Observable states during this step**:
- Customer sees: N/A (CI is backend process)
- Operator sees: GitHub Actions tab shows pipeline status (green check / red X); logs available
- Database: N/A
- Logs: GitHub Actions run logs

---

### STEP 2: Frontend CI Pipeline
**Actor**: GitHub Actions (frontend.yml)
**Action**:
  1. Checkout repository
  2. Setup pnpm 10.33.4
  3. Setup Node.js 24 (with pnpm cache)
  4. Install dependencies (`pnpm install --frozen-lockfile`)
  5. Run lint (`pnpm lint`)
  6. Run typecheck (`pnpm typecheck`)
  7. Run tests (`pnpm test -- --coverage`)

**Timeout**: N/A (GitHub Actions default: 6 hours)
**Input**: Code changes in `frontend/**` or `.github/workflows/frontend.yml`
**Output on SUCCESS**: All checks pass; coverage report generated
**Output on FAILURE**: First failing step stops the pipeline; error message displayed

**Observable states during this step**:
- Customer sees: N/A (CI is backend process)
- Operator sees: GitHub Actions tab shows pipeline status (green check / red X); logs available
- Database: N/A
- Logs: GitHub Actions run logs

---

### STEP 3: Root CI Pipeline
**Actor**: GitHub Actions (ci.yml)
**Action**:
  1. Checkout repository
  2. Setup pnpm + Node.js 22
  3. Run lint (`pnpm lint`)
  4. Run typecheck (`pnpm typecheck`)

**Timeout**: N/A (GitHub Actions default: 6 hours)
**Input**: Push to any branch (no path filter)
**Output on SUCCESS**: All checks pass
**Output on FAILURE**: First failing step stops the pipeline; error message displayed

**Observable states during this step**:
- Customer sees: N/A (CI is backend process)
- Operator sees: GitHub Actions tab shows pipeline status (green check / red X); logs available
- Database: N/A
- Logs: GitHub Actions run logs

---

### STEP 4: Local Quality Gate (`run-tests.sh`)
**Actor**: Local shell script
**Action**: Runs all four checks sequentially, stopping at first failure:
  1. Backend tests (`./scripts/run-backend-tests.sh` — Docker + pytest)
  2. Frontend lint (`pnpm lint`)
  3. Frontend typecheck (`pnpm typecheck`)
  4. Frontend tests (`pnpm test`)

**Timeout**: N/A (no explicit timeout; each step has its own timeout)
**Input**: Code changes (committed locally)
**Output on SUCCESS**: `"✓ All checks passed!"`
**Output on FAILURE**: First failing step stops the script; error message displayed

**Observable states during this step**:
- Customer sees: N/A (quality gate is developer-facing)
- Operator sees: Terminal output showing each step's result (pass/fail)
- Database: N/A
- Logs: Terminal output

---

## Pre-Commit Hook Integration

**Trigger**: `git commit` (any commit)
**Action**: Runs `.pre-commit-config.yaml` hooks:
  1. `ruff` (lint + fix)
  2. `ruff-format` (format)
  3. `./run-tests.sh` (full quality gate)

**Timeout**: N/A (no explicit timeout; quality gate has its own timeout)
**Output on SUCCESS**: Commit proceeds
**Output on FAILURE**: Commit is blocked; developer must fix failing checks

**NOTE**: The pre-commit hook runs the full quality gate (`run-tests.sh`) on every commit. This is expensive (Docker build + all tests) but ensures code quality before any commit.

---

## State Transitions

```
[Code changed] -> (push/PR) -> [CI queued]
[CI queued] -> (pipeline runs) -> [Pass] (green check) | [Fail] (red X)
[Pass] -> (merge to main/develop) -> [Deployed] (if deployment configured)
[Fail] -> (developer fixes) -> [Code changed] (new push/PR)
[Code committed locally] -> (pre-commit hook) -> [Commit proceeds] | [Commit blocked]
```

---

## Handoff Contracts

### Backend CI → Operator: Test Results
**From**: `backend.yml` (GitHub Actions)
**To**: GitHub Actions UI
**Payload**: Test results, coverage report, error messages
**Success**: Green check mark; test output in logs
**Failure**: Red X mark; test output + error traceback in logs
**On Failure**: Developer must fix failing tests; re-push

---

### Frontend CI → Operator: Quality Gate Results
**From**: `frontend.yml` (GitHub Actions)
**To**: GitHub Actions UI
**Payload**: Lint results, typecheck results, test results, coverage report
**Success**: Green check mark; all checks pass
**Failure**: Red X mark; first failing step displayed
**On Failure**: Developer must fix failing checks; re-push

---

### Pre-Commit Hook → Developer: Commit Gate
**From**: `.pre-commit-config.yaml`
**To**: Local git commit
**Payload**: Lint results, quality gate results
**Success**: Commit proceeds
**Failure**: Commit blocked; error messages displayed
**On Failure**: Developer must fix failing checks; re-attempt commit

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| GitHub Actions run artifacts | STEP 1-3 (pipeline execution) | GitHub (automatic, after retention period) | GitHub cleanup policy |
| Pre-commit hook lock | STEP 4 (local commit) | Commit succeeds or is blocked | Git commit mechanism |

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: Backend CI passes | Push to main/develop with backend changes | All tests pass; green check mark |
| TC-02: Backend CI fails | Push to main/develop with failing test | Pipeline stops at first failure; red X mark |
| TC-03: Frontend CI passes | Push to main/develop with frontend changes | Lint, typecheck, and tests pass; green check mark |
| TC-04: Frontend CI fails (lint) | Push with ESLint error | Pipeline stops at lint step; red X mark |
| TC-05: Frontend CI fails (typecheck) | Push with TypeScript error | Pipeline stops at typecheck step; red X mark |
| TC-06: Frontend CI fails (tests) | Push with failing Vitest test | Pipeline stops at test step; red X mark |
| TC-07: Root CI runs on any branch | Push to non-main/develop branch | Lint and typecheck run (no tests); pass or fail |
| TC-08: Pre-commit hook blocks commit | Commit with failing quality gate | Commit blocked; error messages displayed |
| TC-09: Pre-commit hook passes | Commit with passing quality gate | Commit proceeds |
| TC-10: Backend CI path filter | Push to main with only frontend changes | Backend CI does NOT run (path filter: `backend/**`) |
| TC-11: Frontend CI path filter | Push to main with only backend changes | Frontend CI does NOT run (path filter: `frontend/**`) |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | Backend CI runs on Ubuntu latest | `backend.yml:17` (`runs-on: ubuntu-latest`) | Test environment may differ from production (Docker-based) |
| A2 | Frontend CI uses Node.js 24 (current LTS) | `frontend.yml:31` (`node-version: 24`) | Node 24 may not be available in all GitHub Actions runners |
| A3 | Root CI uses Node.js 22 | `ci.yml` (assumed from comment) | Version mismatch between root CI (Node 22) and frontend CI (Node 24) |
| A4 | Pre-commit hooks are configured to run `run-tests.sh` | `AGENTS.md:388` | If pre-commit hooks are not installed, quality gate is not enforced on every commit |
| A5 | Backend tests run inside Docker (same environment as production) | `scripts/run-backend-tests.sh` (Docker) | Backend CI runs on bare Ubuntu (no Docker) — test environment differs from production |

---

## Open Questions

1. Should backend CI also run inside Docker (matching production)? (Currently: backend CI runs on bare Ubuntu with pytest; Docker is only used for local quality gate.)

2. Should there be a deployment step after CI passes? (Currently: no — CI only runs tests.)

3. Should the root CI run on PRs (not just pushes)? (Currently: root CI runs on push to any branch, not on PRs.)

4. Should the pre-commit hook be optional (e.g., `--no-verify` bypass)? (Currently: no bypass mechanism.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `backend.yml`, `frontend.yml`, `run-tests.sh`, `.pre-commit-config.yaml` | Documented that backend CI runs on bare Ubuntu (not Docker); root CI uses Node 22 while frontend CI uses Node 24 |
