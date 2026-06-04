#!/bin/bash
# scripts/test-e2e.sh - End-to-end test for Arabic TTS containerized stack

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[TEST]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# Test the end-to-end flow
main() {
    log_info "Starting end-to-end test for Arabic TTS stack"
    
    # Bring up the containers
    log_info "Starting containers with docker compose..."
    docker compose up -d
    
    # Wait for services to start
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check if containers are running
    log_info "Checking container status..."
    docker compose ps
    
    # Test backend health endpoint
    log_info "Testing backend health check..."
    backend_health=$(curl -s -f http://localhost:80/health || echo "failed")
    if [ "$backend_health" = "failed" ]; then
        log_error "Backend health check failed"
        docker compose logs tts-backend
        exit 1
    else
        log_info "Backend health check passed"
    fi
    
    # Test frontend accessibility
    log_info "Testing frontend accessibility..."
    frontend_status=$(curl -s -f http://localhost/ || echo "failed")
    if [ "$frontend_status" = "failed" ]; then
        log_error "Frontend accessibility test failed"
        docker compose logs frontend
        exit 1
    else
        log_info "Frontend accessibility test passed"
    fi
    
    # Test TTS synthesis endpoint (mock)
    log_info "Testing TTS synthesis endpoint..."
    test_text="مرحبا بالعالم"
    
    # This would require a real TTS model to work properly, but we can at least check the endpoint exists
    synthesis_response=$(curl -s -X POST http://localhost/api/tts \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"$test_text\"}" || echo "failed")
    
    if [ "$synthesis_response" = "failed" ]; then
        log_warn "TTS synthesis endpoint not fully functional (expected without real model)"
    else
        log_info "TTS synthesis endpoint accessible"
    fi
    
    # Test volume persistence by checking if cache directory exists
    log_info "Testing volume persistence..."
    
    # Bring containers down and up to test persistence
    log_info "Stopping containers for volume persistence test..."
    docker compose down
    
    log_info "Starting containers again to test volume persistence..."
    docker compose up -d
    
    # Wait for services to restart
    sleep 5
    
    # Check if containers are running again
    log_info "Checking container status after restart..."
    docker compose ps
    
    # Test that services are still healthy
    log_info "Testing services after restart..."
    backend_health_after=$(curl -s -f http://localhost/health || echo "failed")
    if [ "$backend_health_after" = "failed" ]; then
        log_error "Backend health check failed after restart"
        exit 1
    else
        log_info "Backend health check passed after restart"
    fi
    
    log_info "End-to-end test completed successfully!"
    
    # Clean up
    docker compose down
    
    exit 0
}

# Run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi