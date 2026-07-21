#!/usr/bin/env bash
# Start the development environment (Podman-based, zero host deps).
# Usage: ./dev.sh [up|backend|down|restart|logs]
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

# Helper: stop all existing backend containers (both envs share port 9100)
stop_all_backends() {
    echo "▶ Stopping any existing backend containers..."
    $COMPOSE_CMD stop backend 2>/dev/null || true
    $COMPOSE_CMD rm -f backend 2>/dev/null || true
    $COMPOSE_CMD -f docker-compose.dev.yml stop backend-dev 2>/dev/null || true
    $COMPOSE_CMD -f docker-compose.dev.yml rm -f backend-dev 2>/dev/null || true
}

case "${1:-up}" in
  up)
    target="${2:-all}"
    qualifier="${3:-}"
    echo "▶ Starting development environment..."
    # Build images (frontend dev image + backend image)
    echo ""
    case "$target" in
      backend)
        echo "▶ Building backend image..."
        $COMPOSE_CMD -f docker-compose.yml build backend 2>&1 | tail -1
        echo ""
        echo "▶ Building frontend dev image..."
        $COMPOSE_CMD -f docker-compose.dev.yml build frontend-dev 2>&1 | tail -1
        echo ""
        # Stop any existing backend containers first (both envs share port 9100)
        stop_all_backends
        echo ""
        if [ "$qualifier" = "prod" ]; then
          echo "▶ Starting production backend..."
          $COMPOSE_CMD -f docker-compose.yml up -d backend 2>&1 | tail -1
          echo ""
          echo "✓ Backend prod ready."
          echo "  Backend prod:  http://localhost:9100"
        elif [ "$qualifier" = "dev" ]; then
          echo "▶ Starting development backend..."
          $COMPOSE_CMD -f docker-compose.dev.yml up -d backend-dev 2>&1 | tail -1
          echo ""
          echo "✓ Backend dev ready."
          echo "  Backend dev:   http://localhost:9100"
        else
          # No qualifier — default to dev (was the old behavior)
          echo "▶ Starting development backend..."
          $COMPOSE_CMD -f docker-compose.dev.yml up -d backend-dev 2>&1 | tail -1
          echo ""
          echo "✓ Backend dev ready."
          echo "  Backend dev:   http://localhost:9100"
        fi
        ;;
      frontend)
        echo "▶ Building frontend dev image..."
        $COMPOSE_CMD -f docker-compose.dev.yml build frontend-dev 2>&1 | tail -1
        echo ""
        echo "▶ Starting development frontend..."
        $COMPOSE_CMD -f docker-compose.dev.yml up -d frontend-dev 2>&1 | tail -3
        echo ""
        echo "✓ Frontend dev ready."
        echo "  Frontend dev:  http://localhost:3000"
        ;;
      *)
        echo "▶ Building backend image..."
        $COMPOSE_CMD -f docker-compose.yml build backend 2>&1 | tail -1
        echo ""
        echo "▶ Building frontend dev image..."
        $COMPOSE_CMD -f docker-compose.dev.yml build frontend-dev 2>&1 | tail -1
        echo ""
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
    esac
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
  backend)
    target="${2:-all}"
    case "$target" in
      prod)
        echo "▶ Building backend image..."
        $COMPOSE_CMD -f docker-compose.yml build backend 2>&1 | tail -1
        echo ""
        # Stop any existing backend containers first (both envs share port 9100)
        stop_all_backends
        echo ""
        echo "▶ Starting production backend..."
        $COMPOSE_CMD -f docker-compose.yml up -d backend 2>&1 | tail -1
        echo ""
        echo "✓ Backend prod ready."
        echo "  Backend prod:  http://localhost:9100"
        ;;
      dev)
        echo "▶ Building backend image..."
        $COMPOSE_CMD -f docker-compose.yml build backend 2>&1 | tail -1
        echo ""
        echo "▶ Building frontend dev image..."
        $COMPOSE_CMD -f docker-compose.dev.yml build frontend-dev 2>&1 | tail -1
        echo ""
        # Stop any existing backend containers first (both envs share port 9100)
        stop_all_backends
        echo ""
        echo "▶ Starting development backend..."
        $COMPOSE_CMD -f docker-compose.dev.yml up -d backend-dev 2>&1 | tail -1
        echo ""
        echo "✓ Backend dev ready."
        echo "  Backend dev:   http://localhost:9100"
        ;;
      *)
        echo "▶ Building backend image..."
        $COMPOSE_CMD -f docker-compose.yml build backend 2>&1 | tail -1
        echo ""
        echo "▶ Building frontend dev image..."
        $COMPOSE_CMD -f docker-compose.dev.yml build frontend-dev 2>&1 | tail -1
        echo ""
        # Stop any existing backend containers first (both envs share port 9100)
        stop_all_backends
        echo ""
        echo "▶ Starting development backend..."
        $COMPOSE_CMD -f docker-compose.dev.yml up -d backend-dev 2>&1 | tail -1
        echo ""
        echo "✓ Backend dev ready."
        echo "  Backend dev:   http://localhost:9100"
        ;;
    esac
    ;;
  logs)
    echo "▶ Backend prod logs:"
    $COMPOSE_CMD logs -f backend 2>&1
    ;;
  *)
    echo "Usage: $0 [up|down|restart|logs|backend]"
    echo ""
    echo "Commands:"
    echo "  up        Start all services (prod + dev)"
    echo "  up <svc>  Start a specific service (backend|frontend)"
    echo "  up <svc> <env>  Start a specific service in a specific env (backend prod|dev)"
    echo "  backend   Start backend only (dev)"
    echo "  backend <env>  Start backend env (prod|dev)"
    echo "  down      Stop all services"
    echo "  restart   Restart all services"
    echo "  logs      View production backend logs"
    exit 1
    ;;
esac
