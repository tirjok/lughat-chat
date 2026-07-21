#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Backend tests (pytest inside container) ──────────────
echo "▶ Running backend tests..."
./scripts/run-backend-tests.sh "$@"

# ── Frontend: lint/typecheck/tests (inside running dev container) ──
# Skip frontend steps if production containers are running on
# conflicting ports (production backend uses host port 9000,
# which collides with the dev backend container port mapping).
# Production containers are named 'lughat-backend' and 'lughat-frontend'
# (no '-dev' suffix), whereas dev containers are 'lughat-backend-dev'
# and 'lughat-frontend-dev'.
if podman ps --format '{{.Names}}' 2>/dev/null | grep -q '^lughat-backend$'; then
  echo ""
  echo "⏭ Skipping frontend lint/typecheck/tests — production containers are running."
  echo "  (Dev backend port 9200 conflicts with production backend.)"
else
  # Ensure the frontend-dev container is running.
  FRONTEND_CONTAINER="lughat-frontend-dev"
  if ! podman ps --format '{{.Names}}' 2>/dev/null | grep -q "^${FRONTEND_CONTAINER}$"; then
    echo "Starting frontend-dev container..."
    podman-compose -f docker-compose.dev.yml up -d frontend-dev 2>&1
    # Wait for the container to become healthy-ish.
    sleep 5
  fi

  _exec_frontend() {
    podman exec "$FRONTEND_CONTAINER" sh -c "$1"
  }

  echo ""
  echo "▶ Running frontend lint..."
  _exec_frontend "cd /app && pnpm lint"

  # ── Frontend: typecheck (inside container dev environment) ──
  echo ""
  echo "▶ Running frontend typecheck..."
  _exec_frontend "cd /app && pnpm typecheck"

  # ── Frontend tests (vitest inside container dev environment) ─
  echo ""
  echo "▶ Running frontend tests..."
  _exec_frontend "cd /app && npx vitest run --no-watch"

  echo ""
  echo "✓ All checks passed!"
fi
