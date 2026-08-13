FROM python:3.11-slim

# Note: Chatterbox (MIT-licensed) does not require a TOS agreement.
# Set LD_LIBRARY_PATH for FFmpeg shared libraries at runtime
ENV LD_LIBRARY_PATH=/usr/local/lib:/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH

WORKDIR /app

# Install ffmpeg and libsndfile (required by Chatterbox for WAV→MP3 conversion)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
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

# Create directories
RUN mkdir -p /app/downloads /app/.cache/tts

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check (retries until model is loaded)
HEALTHCHECK --interval=15s --timeout=5s --retries=60 --start-period=60s \
    CMD python -c "import urllib.request; import sys; r = urllib.request.urlopen('http://localhost:8000/health'); d = eval(r.read().decode()); sys.exit(0 if d.get('model_loaded') else 1)"

# Start server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
