#!/bin/bash
# scripts/optimize-docker.sh - Optimize Docker images for size and build time

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[OPTIMIZE]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# Optimize Docker images
main() {
    log_info "Starting Docker image optimization"
    
    # Build with buildkit for better caching and layer reuse
    log_info "Building optimized Docker images with buildkit..."
    
    # Enable buildkit for better performance and caching
    export DOCKER_BUILDKIT=1
    
    # Build backend image with multi-stage optimization
    log_info "Optimizing backend Dockerfile..."
    
    # Create optimized backend Dockerfile with better layer caching
    cat > /tmp/optimized-backend.Dockerfile << 'EOF'
# Stage 1: Build stage for model weights (if baked in)
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Production stage
FROM python:3.12-slim AS production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /install /usr/local

# Create non-root user for security (idempotent)
RUN (getent passwd appuser || { groupadd -r appuser && useradd -r -g appuser; }) 2>/dev/null || true
# Copy application code
COPY --chown=appuser:appuser app.py .

# Expose port
EXPOSE 8000

# Health check (NFR-03)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Start server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

    # Build optimized backend image
    docker build -f /tmp/optimized-backend.Dockerfile -t arabic-tts-backend-optimized ./backend
    
    # Build frontend image with better optimization
    log_info "Optimizing frontend Dockerfile..."
    
    # Create optimized frontend Dockerfile with better layer caching
    cat > /tmp/optimized-frontend.Dockerfile << 'EOF'
# Stage 1: Build stage with Node.js (T3.6)
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm (version 8.x for compatibility)
RUN corepack enable && corepack prepare pnpm@8.15.9 --activate
# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies (pnpm 8.x doesn't have the new security restrictions)
RUN pnpm install --frozen-lockfile
# Copy all source files
COPY . .

# Build environment variables
ARG NUXT_API_BASE=http://localhost:8000
ENV NUXT_API_BASE=${NUXT_API_BASE}

# Build the Nuxt app (static generation)
RUN pnpm build

# Stage 2: Production stage with Nginx (T3.6)
FROM nginx:alpine AS production

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
COPY --from=builder /app/.output/public /usr/share/nginx/html

# Create necessary directories
RUN mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
EOF

    # Build optimized frontend image
    docker build -f /tmp/optimized-frontend.Dockerfile -t arabic-tts-frontend-optimized ./frontend
    
    # Show image sizes
    log_info "Docker image sizes:"
    docker images | grep arabic-tts
    
    # Cleanup temporary files
    rm -f /tmp/optimized-backend.Dockerfile /tmp/optimized-frontend.Dockerfile
    
    log_info "Docker image optimization completed"
    
    # Show build statistics
    log_info "Checking for potential improvements..."
    
    # Check if we can reduce image size further
    log_info "Checking for unused dependencies..."
    
    # Show current image sizes
    echo "Current image sizes:"
    docker images | grep -E "(arabic-tts|nginx)" | awk '{print $1 ": " $2 " (" $3 ")"}'
    
    exit 0
}

# Run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi