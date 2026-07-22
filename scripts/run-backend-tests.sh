#!/usr/bin/env bash
# Run backend tests inside Podman (no host Python deps needed).
# ALL backend commands MUST go through this script — never run pytest directly on host.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

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

# ── Build backend image only on first run or when requirements change ──
# Rebuilding the full PyTorch+Coqui image (~3GB) on every commit triggers
# OOM kill (exit code 137) on hosts with limited VM memory.
# Only build if the image doesn't exist or requirements.txt changed.
echo "▶ Checking backend image..."
if podman images --format '{{.Repository}}' 2>/dev/null | grep -q 'backend-dev'; then
    echo "✓ Backend image exists — skipping rebuild."
else
    echo "▶ Building backend image (first time)..."
    $COMPOSE_CMD -f docker-compose.dev.yml build backend-dev 2>&1 | tail -1
fi

# ── Run tests inside container ───────────────────────────
# Mount tests/ from host so test changes are picked up without rebuild.
# app.py is NOT mounted from host — it must come from the container image
# (which contains the S-02/S-05 implementation).
$COMPOSE_CMD -f docker-compose.dev.yml run --rm \
  -v ./backend/speaker_wavs:/app/speaker_wavs \
  -v ./backend/tests:/app/tests \
  -v ./frontend/app:/app/frontend_source \
  backend-dev pytest "$@"
