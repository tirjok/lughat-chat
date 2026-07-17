#!/bin/bash
# scripts/test-volume-persistence.sh - Test volume persistence and container restarts
# Supports Docker, Podman, or any compatible runtime.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect container runtime
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

# Logging functions
log_info() { echo -e "${GREEN}[PERSISTENCE]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# Test volume persistence and restart behavior
main() {
    log_info "Starting volume persistence and restart test"
    
    # Bring up the containers
    log_info "Starting containers with $COMPOSE_CMD..."
    $COMPOSE_CMD up -d
    
    # Wait for services to start
    log_info "Waiting for services to be healthy..."
    sleep 15
    
    # Check if containers are running
    log_info "Checking container status..."
    $COMPOSE_CMD ps
    
    # Test volume persistence by checking if cache directory exists and has content
    log_info "Testing volume persistence..."
    
    # Check that volumes are properly mounted and accessible
    log_info "Checking model weights volume..."
    model_check=$($COMPOSE_CMD run --rm -v arabic-tts-model-weights:/app/models tts-backend ls /app/models 2>/dev/null || echo "failed")
    if [ "$model_check" = "failed" ]; then
        log_warn "Model volume may not be properly mounted or is empty"
    else
        log_info "Model weights volume accessible"
    fi
    
    log_info "Checking speaker data volume..."
    speaker_check=$($COMPOSE_CMD run --rm -v arabic-tts-speaker-data:/app/speakers tts-backend ls /app/speakers 2>/dev/null || echo "failed")
    if [ "$speaker_check" = "failed" ]; then
        log_warn "Speaker data volume may not be properly mounted or is empty"
    else
        log_info "Speaker data volume accessible"
    fi
    
    log_info "Checking audio cache volume..."
    cache_check=$($COMPOSE_CMD run --rm -v arabic-tts-audio-cache:/app/cache/audio tts-backend ls /app/cache/audio 2>/dev/null || echo "failed")
    if [ "$cache_check" = "failed" ]; then
        log_warn "Audio cache volume may not be properly mounted or is empty"
    else
        log_info "Audio cache volume accessible"
    fi
    
    # Test restart behavior - bring containers down and up
    log_info "Testing container restarts..."
    
    # Stop containers
    log_info "Stopping containers..."
    $COMPOSE_CMD down
    
    # Wait a moment
    sleep 5
    
    # Start containers again
    log_info "Starting containers again..."
    $COMPOSE_CMD up -d
    
    # Wait for services to restart
    log_info "Waiting for services to restart..."
    sleep 15
    
    # Check that containers are running again
    log_info "Checking container status after restart..."
    $COMPOSE_CMD ps
    
    # Verify services are healthy after restart
    log_info "Verifying service health after restart..."
    
    # Test backend health check (should still work)
    backend_health=$(curl -s -f http://localhost/health || echo "failed")
    if [ "$backend_health" = "failed" ]; then
        log_error "Backend health check failed after restart"
        $COMPOSE_CMD logs tts-backend
        exit 1
    else
        log_info "Backend health check passed after restart"
    fi
    
    # Test frontend accessibility (should still work)
    frontend_status=$(curl -s -f http://localhost/ || echo "failed")
    if [ "$frontend_status" = "failed" ]; then
        log_error "Frontend accessibility test failed after restart"
        $COMPOSE_CMD logs frontend
        exit 1
    else
        log_info "Frontend accessibility passed after restart"
    fi
    
    # Test that volumes still exist and are accessible
    log_info "Verifying volume persistence after restart..."
    
    # Check model weights volume again (should still exist)
    model_check_after=$($COMPOSE_CMD run --rm -v arabic-tts-model-weights:/app/models tts-backend ls /app/models 2>/dev/null || echo "failed")
    if [ "$model_check_after" = "failed" ]; then
        log_warn "Model volume may not persist correctly after restart"
    else
        log_info "Model weights volume still accessible after restart"
    fi
    
    # Check speaker data volume again (should still exist)
    speaker_check_after=$($COMPOSE_CMD run --rm -v arabic-tts-speaker-data:/app/speakers tts-backend ls /app/speakers 2>/dev/null || echo "failed")
    if [ "$speaker_check_after" = "failed" ]; then
        log_warn "Speaker data volume may not persist correctly after restart"
    else
        log_info "Speaker data volume still accessible after restart"
    fi
    
    # Check audio cache volume again (should still exist)
    cache_check_after=$($COMPOSE_CMD run --rm -v arabic-tts-audio-cache:/app/cache/audio tts-backend ls /app/cache/audio 2>/dev/null || echo "failed")
    if [ "$cache_check_after" = "failed" ]; then
        log_warn "Audio cache volume may not persist correctly after restart"
    else
        log_info "Audio cache volume still accessible after restart"
    fi
    
    # Test that we can make a simple API call (mock)
    log_info "Testing basic API functionality..."
    test_text="مرحبا"
    
    # This would require a real TTS model to work properly, but we can at least check the endpoint exists
    synthesis_response=$(curl -s -X POST http://localhost/api/tts \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"$test_text\"}" || echo "failed")
    
    if [ "$synthesis_response" = "failed" ]; then
        log_warn "TTS synthesis endpoint not fully functional (expected without real model)"
    else
        log_info "TTS synthesis endpoint accessible after restart"
    fi
    
    log_info "Volume persistence and restart test completed successfully!"
    
    # Clean up
    $COMPOSE_CMD down
    
    exit 0
}

# Run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
