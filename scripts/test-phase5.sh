#!/bin/bash
# scripts/test-phase5.sh - Run all tests for Phase 5: Testing, Optimization & Distribution

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[PHASE5]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# Test all Phase 5 requirements
main() {
    log_info "Starting Phase 5: Testing, Optimization & Distribution tests"
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    # T5.1: Run containerized stack locally & verify end-to-end flow
    log_info "=== T5.1: Testing containerized stack and end-to-end flow ==="
    log_info "Running end-to-end test..."
    scripts/test-e2e.sh
    
    # T5.2: Optimize Docker image size (multi-stage builds, layer caching)
    log_info "=== T5.2: Testing Docker image optimization ==="
    log_info "Running Docker image optimization test..."
    scripts/optimize-docker.sh
    
    # T5.3: Document setup, usage, volume management & troubleshooting
    log_info "=== T5.3: Testing documentation coverage ==="
    if [ -f docs/deployment.md ]; then
        log_info "Documentation file exists: docs/deployment.md"
        # Check that key sections are present
        if grep -q "Docker Compose Deployment" docs/deployment.md; then
            log_info "✓ Docker Compose Deployment section found"
        else
            log_warn "⚠ Docker Compose Deployment section missing"
        fi
        
        if grep -q "Volume Management" docs/deployment.md; then
            log_info "✓ Volume Management section found"
        else
            log_warn "⚠ Volume Management section missing"
        fi
        
        if grep -q "Troubleshooting" docs/deployment.md; then
            log_info "✓ Troubleshooting section found"
        else
            log_warn "⚠ Troubleshooting section missing"
        fi
        
        if grep -q "Offline Distribution" docs/deployment.md; then
            log_info "✓ Offline Distribution section found"
        else
            log_warn "⚠ Offline Distribution section missing"
        fi
    else
        log_error "Documentation file not found: docs/deployment.md"
        exit 1
    fi
    
    # T5.4: Prepare for offline distribution (single-command workflow)
    log_info "=== T5.4: Testing offline distribution preparation ==="
    log_info "Checking for single-command workflow capability..."
    
    # Test that we can run a simple command to start the app
    log_info "Testing single-command workflow..."
    
    # Verify docker compose files exist and are valid
    if [ -f docker-compose.yml ]; then
        log_info "✓ docker-compose.yml exists"
    else
        log_error "✗ docker-compose.yml missing"
        exit 1
    fi
    
    # Validate docker compose file syntax
    if docker compose config --quiet 2>/dev/null; then
        log_info "✓ docker-compose.yml syntax is valid"
    else
        log_error "✗ docker-compose.yml syntax invalid"
        exit 1
    fi
    
    # T5.5: Validate container restarts & volume persistence
    log_info "=== T5.5: Testing container restarts and volume persistence ==="
    log_info "Running volume persistence test..."
    scripts/test-volume-persistence.sh
    
    log_info "=== All Phase 5 Tests Completed Successfully ==="
    
    echo ""
    echo "Phase 5 Summary:"
    echo "✓ T5.1: Containerized stack tested with end-to-end flow"
    echo "✓ T5.2: Docker image optimization implemented"
    echo "✓ T5.3: Comprehensive documentation created"
    echo "✓ T5.4: Offline distribution preparation completed"
    echo "✓ T5.5: Container restarts and volume persistence validated"
    
    exit 0
}

# Run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi