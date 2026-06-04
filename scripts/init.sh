#!/bin/bash
# scripts/init.sh - Startup validation script for Arabic TTS containers
# Validates model weights, speaker directories, and service prerequisites
# Exit codes: 0=success, 1=failure (container will fail gracefully)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[INIT]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# Track validation status
VALIDATION_FAILED=0

###############################################################################
# 1. Validate Model Weights Directory (T4.3)
###############################################################################
validate_model_weights() {
    log_info "Checking model weights directory: ${TTS_MODEL_PATH:-/app/models/default}"
    
    local model_path="${TTS_MODEL_PATH:-/app/models/default}"
    
    if [ ! -d "$model_path" ]; then
        log_warn "Model directory does not exist: $model_path"
        
        # Check if volume is mounted but empty (common in Docker)
        if [ ! -L "$model_path" ] && [ ! "$(ls -A "$model_path" 2>/dev/null)" ]; then
            log_error "Model directory is empty. Mount a volume with model weights at $model_path"
            log_error "Expected files: config.json, model.bin (or similar TTS model files)"
            VALIDATION_FAILED=1
            return 1
        fi
        
        mkdir -p "$model_path"
        log_warn "Created model directory: $model_path"
    fi
    
    # Check for common TTS model files (configurable)
    local required_files=("config.json" "model.bin" "vocab.txt")
    local found_any=0
    
    for file in "${required_files[@]}"; do
        if [ -f "$model_path/$file" ]; then
            log_info "Found model file: $file"
            found_any=1
        fi
    done
    
    if [ "$found_any" -eq 0 ]; then
        log_warn "No recognized model files found in $model_path"
        log_info "Model will be loaded at runtime if available via volume mount"
    fi
    
    return 0
}

###############################################################################
# 2. Validate Speaker Directory (T4.3)
###############################################################################
validate_speaker_dir() {
    log_info "Checking speaker directory: ${SPEAKER_DIR:-/app/speakers}"
    
    local speaker_dir="${SPEAKER_DIR:-/app/speakers}"
    
    if [ ! -d "$speaker_dir" ]; then
        log_warn "Speaker directory does not exist: $speaker_dir - creating it"
        mkdir -p "$speaker_dir"
    fi
    
    # Check directory is writable
    if [ ! -w "$speaker_dir" ]; then
        log_error "Speaker directory is not writable: $speaker_dir"
        VALIDATION_FAILED=1
        return 1
    fi
    
    log_info "Speaker directory validated: $speaker_dir"
    return 0
}

###############################################################################
# 3. Validate Audio Cache Directory (T4.3)
###############################################################################
validate_audio_cache() {
    log_info "Checking audio cache directory: ${AUDIO_CACHE_DIR:-/app/cache/audio}"
    
    local cache_dir="${AUDIO_CACHE_DIR:-/app/cache/audio}"
    
    if [ ! -d "$cache_dir" ]; then
        log_warn "Audio cache directory does not exist: $cache_dir - creating it"
        mkdir -p "$cache_dir"
    fi
    
    # Check directory is writable
    if [ ! -w "$cache_dir" ]; then
        log_error "Audio cache directory is not writable: $cache_dir"
        VALIDATION_FAILED=1
        return 1
    fi
    
    # Check disk space (warn if less than 100MB free)
    local available_space
    available_space=$(df -BM "$cache_dir" | tail -1 | awk '{print $4}' | tr -d 'M')
    if [ "$available_space" -lt 100 ]; then
        log_warn "Low disk space for audio cache: ${available_space}MB"
    else
        log_info "Audio cache directory validated: $cache_dir (${available_space}MB free)"
    fi
    
    return 0
}

###############################################################################
# 4. Validate Python Dependencies (Backend)
###############################################################################
validate_python_deps() {
    log_info "Validating Python dependencies"
    
    local required_packages=("fastapi" "uvicorn" "pydantic" "numpy" "soundfile")
    
    for pkg in "${required_packages[@]}"; do
        if python -c "import $(echo "$pkg" | tr '-' '_')" 2>/dev/null; then
            log_info "Package available: $pkg"
        else
            log_error "Missing package: $pkg"
            VALIDATION_FAILED=1
        fi
    done
    
    return 0
}

###############################################################################
# 5. Validate Port Availability (Backend)
###############################################################################
validate_port() {
    log_info "Checking port availability: ${PORT:-8000}"
    
    local port="${PORT:-8000}"
    
    # Check if port is already in use (best effort, may not work in containers)
    if command -v ss &>/dev/null; then
        if ss -tuln | grep -q ":${port}"; then
            log_warn "Port $port appears to be in use"
        else
            log_info "Port $port is available"
        fi
    elif command -v netstat &>/dev/null; then
        if netstat -tuln | grep -q ":${port}"; then
            log_warn "Port $port appears to be in use"
        else
            log_info "Port $port is available"
        fi
    else
        log_warn "Cannot check port availability (ss/netstat not available)"
    fi
    
    return 0
}

###############################################################################
# Main Validation Sequence
###############################################################################
main() {
    log_info "============================================"
    log_info "Arabic TTS Service - Startup Validation"
    log_info "============================================"
    
    # Run all validations
    validate_model_weights || true
    validate_speaker_dir || true
    validate_audio_cache || true
    validate_python_deps || true
    validate_port || true
    
    log_info "============================================"
    
    if [ "$VALIDATION_FAILED" -ne 0 ]; then
        log_error "Validation failed! Container will not start."
        log_error "Please check the errors above and fix the configuration."
        exit 1
    fi
    
    log_info "All validations passed. Starting service..."
    log_info "============================================"
    
    # If this script is used as an entrypoint wrapper, exec the actual command
    if [ "${EXEC_CMD:-}" = "1" ] && [ $# -gt 0 ]; then
        exec "$@"
    fi
    
    exit 0
}

# Run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
