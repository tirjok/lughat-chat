#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Backend tests (pytest inside Docker) ───────────────
echo "▶ Running backend tests..."
./scripts/run-backend-tests.sh "$@"

# ── Frontend: lint ─────────────────────────────────────
echo ""
echo "▶ Running frontend lint..."
cd frontend
pnpm lint "$@"

# ── Frontend: typecheck ────────────────────────────────
echo ""
echo "▶ Running frontend typecheck..."
pnpm typecheck "$@"

# ── Frontend tests (vitest via pnpm) ───────────────────
echo ""
echo "▶ Running frontend tests..."
pnpm test "$@"
cd ..

echo ""
echo "✓ All checks passed!"
