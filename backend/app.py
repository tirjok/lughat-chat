"""FastAPI application — thin HTTP layer over the deep Synthesis Module.

The Synthesis Module (synthesis.py) handles:
  - Job queue (submit → job_id, get_status, get_result)
  - Single worker processing jobs sequentially
  - Lazy model load/unload (memory released during idle)
  - WAV → MP3 conversion via ffmpeg

This file (app.py) only maps HTTP endpoints to the Synthesis Module interface.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
import os
import time
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from synthesis import (
    get_module,
    AUDIO_DIR,
    SPEAKER_WAV_DIR,
)


# ---------------------------------------------------------------------------
# Ensure directories
# ---------------------------------------------------------------------------
for dir_path in [AUDIO_DIR]:
    try:
        os.makedirs(dir_path, exist_ok=True)
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Lifespan — minimal, delegates to SynthesisModule
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the SynthesisModule on startup; stop on shutdown."""
    print("Starting TTS backend...")
    get_module()  # Creates and starts the singleton
    print("TTS backend ready.")
    yield
    print("Shutting down TTS backend...")
    mod = get_module()
    mod.stop()


app = FastAPI(
    title="Lughat Chat TTS API",
    description="Text-to-Speech API with XTTS-v2 (Arabic & English)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve downloads and speaker_wavs statically
app.mount("/downloads", StaticFiles(directory=AUDIO_DIR), name="downloads")
try:
    os.makedirs(SPEAKER_WAV_DIR, exist_ok=True)
except OSError:
    pass
app.mount("/speaker_wavs", StaticFiles(directory=SPEAKER_WAV_DIR), name="speaker_wavs")


# ---------------------------------------------------------------------------
# Request model (unchanged)
# ---------------------------------------------------------------------------


class SynthesisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)
    language: str = Field(default="ar", pattern="^(ar|en)$")
    voice: Optional[str] = Field(default=None)
    speaker: Optional[str] = Field(default=None)
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=0.0, ge=-4.0, le=4.0)
    seed: Optional[int] = Field(default=None, ge=0)


# ---------------------------------------------------------------------------
# Health endpoint — delegates to SynthesisModule
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    """Health check — delegates to SynthesisModule."""
    return get_module().health()


# ---------------------------------------------------------------------------
# Voices endpoint — unchanged
# ---------------------------------------------------------------------------
@app.get("/api/voices")
async def list_voices():
    """List available voices."""
    return get_module().voices()


# ---------------------------------------------------------------------------
# Generate endpoint — now async, returns job_id
# ---------------------------------------------------------------------------
@app.post("/api/generate")
async def generate_speech(request: SynthesisRequest):
    """Generate speech — returns job_id immediately (async).

    The frontend should poll GET /api/jobs/{job_id} for status and result.
    """
    # Build request dict for the SynthesisModule
    req_dict = {
        "text": request.text,
        "language": request.language,
        "voice": request.voice,
        "speaker": request.speaker,
        "speed": request.speed,
        "pitch": request.pitch,
        "seed": request.seed,
    }

    try:
        job_id = get_module().submit(req_dict)
        return {"job_id": job_id, "status": "pending"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Job status endpoint (new)
# ---------------------------------------------------------------------------
@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    """Get job status and result.

    Returns:
      - status: pending | running | completed | failed | not_found
      - error: optional error message
      - audio_url: available when status is 'completed'
      - filename: available when status is 'completed'
    """
    status = get_module().get_status(job_id)

    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Job not found")

    # If completed, attach the result
    if status.get("status") == "completed":
        result = get_module().get_result(job_id)
        status.update(result)

    return status


# ---------------------------------------------------------------------------
# History endpoint — delegates to SynthesisModule
# ---------------------------------------------------------------------------
@app.get("/api/history")
async def get_history():
    """List previously generated audio files with metadata."""
    return get_module().history()


# ---------------------------------------------------------------------------
# Backwards-compatible generate endpoint (sync, returns MP3 directly)
#
# This endpoint is deprecated but kept for frontend compatibility.
# It blocks until generation completes, then returns the MP3.
# New frontend code should use /api/generate (async) + /api/jobs/{id}.
# ---------------------------------------------------------------------------
@app.post("/api/generate_sync")
async def generate_speech_sync(request: SynthesisRequest):
    """Sync generate — blocks until complete, returns MP3 directly.

    DEPRECATED: Use POST /api/generate + GET /api/jobs/{job_id} instead.
    Kept for frontend backwards compatibility.
    """
    req_dict = {
        "text": request.text,
        "language": request.language,
        "voice": request.voice,
        "speaker": request.speaker,
        "speed": request.speed,
        "pitch": request.pitch,
        "seed": request.seed,
    }

    job_id = get_module().submit(req_dict)

    # Poll until completed or failed

    while True:
        status_resp = get_module().get_status(job_id)
        status = status_resp.get("status")

        if status == "completed":
            result = get_module().get_result(job_id)
            mp3_path = result.get("audio_url", "").replace("/downloads/", "")
            if mp3_path:
                full_path = os.path.join(AUDIO_DIR, mp3_path)
                if os.path.exists(full_path):
                    return FileResponse(
                        path=full_path,
                        media_type="audio/mpeg",
                        filename=mp3_path,
                    )
            raise HTTPException(status_code=500, detail="Result not available")

        if status == "failed":
            raise HTTPException(
                status_code=500, detail=status_resp.get("error", "Generation failed")
            )

        if status == "not_found":
            raise HTTPException(status_code=404, detail="Job not found")

        # Still pending/running — wait and poll again
        time.sleep(0.5)
