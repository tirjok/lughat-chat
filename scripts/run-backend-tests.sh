#!/usr/bin/env bash
# Run backend tests inside Docker (no host Python deps needed)
set -euo pipefail

cd "$(dirname "$0")/.."

# Build (or reuse) the backend image, then run tests
docker compose run --rm backend pytest "$@"
