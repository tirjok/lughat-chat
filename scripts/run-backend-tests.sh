#!/usr/bin/env bash
# Run backend tests inside Docker (no host Python deps needed)
set -euo pipefail

cd "$(dirname "$0")/.."

# Build (or reuse) the backend image, then run tests.
# Mount speaker_wavs volume so tests see the same files as production.
docker compose run --rm --no-TTY \
  -v tts-model-cache:/root/.local/share/tts \
  -v tts-audio-cache:/app/downloads \
  -v ./backend/speaker_wavs:/app/speaker_wavs \
  backend pytest "$@"
