#!/usr/bin/env bash
# Run backend tests inside Docker (no host Python deps needed).
# ALL backend commands MUST go through this script — never run pytest directly on host.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# ── Build backend image if needed ──────────────────────
echo "▶ Building backend image..."
docker compose build backend 2>&1 | tail -1

# ── Run tests inside Docker ────────────────────────────
# Mount tests/ from host so test changes are picked up without rebuild.
# app.py is NOT mounted from host — it must come from the Docker image
# (which contains the S-02/S-05 implementation).
docker compose run --rm --no-TTY \
  -v tts-model-cache:/root/.local/share/tts \
  -v tts-audio-cache:/app/downloads \
  -v ./backend/speaker_wavs:/app/speaker_wavs \
  -v ./backend/tests:/app/tests \
  backend pytest "$@"
