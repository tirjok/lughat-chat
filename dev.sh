#!/usr/bin/env bash
# Start the development environment (Podman-based, zero host deps).
# Usage: ./dev.sh [up|down|restart|logs]
set -euo pipefail

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

case "${1:-up}" in
  up)
    echo "▶ Starting development environment..."
    # Build images (frontend dev image + backend image)
    echo ""
    echo "▶ Building backend image..."
    $COMPOSE_CMD -f docker-compose.yml build backend 2>&1 | tail -1
    echo ""
    echo "▶ Building frontend dev image..."
    $COMPOSE_CMD -f docker-compose.dev.yml build frontend-dev 2>&1 | tail -1
    echo ""
    # Start both environments
    echo "▶ Starting production services (backend + frontend)..."
    $COMPOSE_CMD up -d 2>&1 | tail -3
    echo "▶ Starting development services (backend-dev + frontend-dev)..."
    $COMPOSE_CMD -f docker-compose.dev.yml up -d 2>&1 | tail -3
    echo ""
    echo "✓ Development environment ready."
    echo "  Frontend dev:  http://localhost:3000"
    echo "  Backend dev:   http://localhost:9100"
    echo "  Frontend prod: http://localhost:9101"
    echo "  Backend prod:  http://localhost:9000"
    ;;
  down)
    echo "▶ Stopping all services..."
    $COMPOSE_CMD down 2>&1 | tail -3
    $COMPOSE_CMD -f docker-compose.dev.yml down 2>&1 | tail -3
    echo "✓ All services stopped."
    ;;
  restart)
    echo "▶ Restarting all services..."
    $COMPOSE_CMD down 2>&1 | tail -1
    $COMPOSE_CMD -f docker-compose.dev.yml down 2>&1 | tail -1
    exec "$0" up
    ;;
  logs)
    echo "▶ Backend prod logs:"
    $COMPOSE_CMD logs -f backend 2>&1
    ;;
  *)
    echo "Usage: $0 [up|down|restart|logs]"
    exit 1
    ;;
esac
