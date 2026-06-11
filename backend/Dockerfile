FROM python:3.12-slim

# Accept Coqui TOS to bypass interactive license agreement
ENV COQUI_TOS_AGREED=1
# Ensure libtorchcodec can find FFmpeg shared libraries at runtime
ENV LD_LIBRARY_PATH=/usr/local/lib:/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH

WORKDIR /app

# Install ffmpeg and build tools for Python packages
# The ffmpeg package pulls in libavcodec/avformat/etc. shared libraries needed by torchcodec
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    build-essential \
    cmake \
    git \
    pybind11-dev \
    && ldconfig \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch (lighter than full CUDA version)
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install test dependencies
COPY requirements-test.txt .
RUN pip install --no-cache-dir -r requirements-test.txt

# Rebuild torchcodec from source without CUDA (pre-built wheel has libnvrtc dependency)
# Patch pyproject.toml to remove deprecated 'license-files' field, then install with --no-build-isolation
RUN pip uninstall -y torchcodec && \
    git clone --depth 1 --branch v0.13.0 https://github.com/pytorch/torchcodec.git /tmp/torchcodec && \
    cd /tmp/torchcodec && \
    sed -i '/^license-files/d' pyproject.toml && \
    TORCH_CUDA_ARCH_LIST="" BUILD_AGAINST_ALL_FFMPEG_FROM_S3=1 pip install --no-cache-dir . --no-build-isolation

# Create directories
RUN mkdir -p /app/downloads /app/.cache/tts

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check (retries until model is loaded)
HEALTHCHECK --interval=15s --timeout=5s --retries=20 --start-period=60s \
    CMD python -c "import urllib.request; import sys; r = urllib.request.urlopen('http://localhost:8000/health'); d = eval(r.read().decode()); sys.exit(0 if d.get('model_loaded') else 1)"

# Start server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
