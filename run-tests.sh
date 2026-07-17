#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Detect container runtime: prefer podman-compose, fall back to docker-compose
if command -v podman-compose &>/dev/null; then
    COMPOSE_CMD="podman-compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
elif command -v docker &>/dev/null && docker compose version &>/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo "ERROR: No container runtime found. Install podman-compose or Docker."
    exit 1
fi

# ── Backend tests (pytest inside container) ──────────────
echo "▶ Running backend tests..."
./scripts/run-backend-tests.sh "$@"

# ── Frontend: lint (inside container dev environment) ────
echo ""
echo "▶ Running frontend lint..."
$COMPOSE_CMD -f docker-compose.dev.yml run --rm frontend-dev sh -c "pnpm lint" "$@"

# ── Frontend: typecheck (inside container dev environment) ──
echo ""
echo "▶ Running frontend typecheck..."
$COMPOSE_CMD -f docker-compose.dev.yml run --rm frontend-dev sh -c "pnpm typecheck"

# ── Frontend tests (vitest inside container dev environment) ─
echo ""
echo "▶ Running frontend tests..."
$COMPOSE_CMD -f docker-compose.dev.yml run --rm frontend-dev sh -c "pnpm test"

echo ""
echo "✓ All checks passed!"
