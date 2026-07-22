#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Backend tests (pytest inside container) ──────────────
echo "▶ Running backend tests..."
./scripts/run-backend-tests.sh "$@"

# ── Frontend: lint/typecheck/tests ──
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
  # ── Run frontend checks on host using Node 24 (via nvm) ──
  # The container approach OOM-kills (exit 137) because the Podman VM has
  # ~15.5GB total, and running 'nuxi prepare' + ESLint inside it while the
  # backend container (PyTorch ~4GB) is active exceeds available memory.
  # Host has Node 24.16.0 installed via nvm — use it directly.
  NODE24="$NVM_DIR/versions/node/v24.16.0/bin/node"
  if [ -f "$NODE24" ]; then
    export PATH="$(dirname "$NODE24"):$PATH"
  else
    echo "⚠ Node 24 not found at $NODE24 — skipping frontend checks"
    return
  fi

  cd "$SCRIPT_DIR/frontend"

  # pnpm install will run 'nuxt prepare' via postinstall — this generates .nuxt
  # which ESLint and typecheck depend on. On the host with Node 24, this
  # completes in ~2s without OOM issues.
  echo ""
  echo "▶ Installing frontend dependencies (generates .nuxt)..."
  pnpm install --frozen-lockfile 2>&1 | tail -3

  echo ""
  echo "▶ Running frontend lint..."
  pnpm lint

  # ── Frontend: typecheck (inside container dev environment) ──
  echo ""
  echo "▶ Running frontend typecheck..."
  pnpm typecheck

  # ── Frontend tests (vitest on host with Node 24) ──
  echo ""
  echo "▶ Running frontend tests..."
  npx vitest run --no-watch

  echo ""
  echo "✓ All checks passed!"
fi
