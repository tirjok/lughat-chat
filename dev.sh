#!/usr/bin/env bash
# Start the development environment (Docker-based, zero host deps).
# Usage: ./dev.sh [up|down|restart|logs]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

case "${1:-up}" in
  up)
    echo "▶ Starting development environment..."
    # Build images (frontend dev image + backend image)
    echo ""
    echo "▶ Building backend image..."
    docker compose -f docker-compose.yml build backend 2>&1 | tail -1
    echo ""
    echo "▶ Building frontend dev image..."
    docker compose -f docker-compose.dev.yml build frontend-dev 2>&1 | tail -1
    echo ""
    # Start both environments
    echo "▶ Starting production services (backend + frontend)..."
    docker compose up -d 2>&1 | tail -3
    echo "▶ Starting development services (backend-dev + frontend-dev)..."
    docker compose -f docker-compose.dev.yml up -d 2>&1 | tail -3
    echo ""
    echo "✓ Development environment ready."
    echo "  Frontend dev:  http://localhost:3000"
    echo "  Backend dev:   http://localhost:9000"
    echo "  Frontend prod: http://localhost:9001"
    echo "  Backend prod:  http://localhost:9000"
    ;;
  down)
    echo "▶ Stopping all services..."
    docker compose down 2>&1 | tail -3
    docker compose -f docker-compose.dev.yml down 2>&1 | tail -3
    echo "✓ All services stopped."
    ;;
  restart)
    echo "▶ Restarting all services..."
    docker compose down 2>&1 | tail -1
    docker compose -f docker-compose.dev.yml down 2>&1 | tail -1
    exec "$0" up
    ;;
  logs)
    echo "▶ Backend prod logs:"
    docker compose logs -f backend 2>&1
    ;;
  *)
    echo "Usage: $0 [up|down|restart|logs]"
    exit 1
    ;;
esac
