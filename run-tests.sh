#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Backend tests (pytest inside Docker) ───────────────
echo "▶ Running backend tests..."
./scripts/run-backend-tests.sh "$@"

# ── Frontend tests (vitest via pnpm) ───────────────────
echo ""
echo "▶ Running frontend tests..."
cd frontend
pnpm test "$@"
cd ..

echo ""
echo "✓ All tests passed!"
