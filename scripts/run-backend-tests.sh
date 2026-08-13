#!/usr/bin/env bash
# Run backend tests inside Docker (no host Python deps needed)
set -euo pipefail

cd "$(dirname "$0")/.."

# Build (or reuse) the backend image, then run tests.
# Mount test and config files from host for source-inspection tests.
docker compose run --rm --no-TTY \
  -v tts-model-cache:/root/.local/share/tts \
  -v tts-audio-cache:/app/downloads \
  -v ./backend/speaker_wavs:/app/speaker_wavs \
  -v ./backend:/app/backend \
  -v ./backend/tests:/app/tests \
  -v ./docker-compose.yml:/app/docker-compose.yml \
  backend pytest "$@"
