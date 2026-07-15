#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Backend tests (pytest inside Docker) ───────────────
echo "▶ Running backend tests..."
./scripts/run-backend-tests.sh "$@"

# ── Frontend: lint (inside Docker dev container) ───────
echo ""
echo "▶ Running frontend lint..."
docker compose -f docker-compose.dev.yml run --rm frontend-dev sh -c "pnpm lint" "$@"

# ── Frontend: typecheck (inside Docker dev container) ──
echo ""
echo "▶ Running frontend typecheck..."
docker compose -f docker-compose.dev.yml run --rm frontend-dev sh -c "pnpm typecheck"

# ── Frontend tests (vitest inside Docker dev container) ─
echo ""
echo "▶ Running frontend tests..."
docker compose -f docker-compose.dev.yml run --rm frontend-dev sh -c "pnpm test"

echo ""
echo "✓ All checks passed!"
