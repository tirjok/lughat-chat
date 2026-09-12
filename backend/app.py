"""FastAPI endpoints — thin adapters over deep modules.

The Synthesis, ModelManager, and AudioStore modules each own their
domain. This file wires them into FastAPI routes.
"""

from __future__ import annotations

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from typing import Optional
from pydantic import BaseModel, Field
from model_manager import ModelManager, _ensure_torch
AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
import wave
from audio_store import AudioStore
from synthesis import Synthesis
SPEAKER_WAV_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "speaker_wavs"
)
MODEL_CACHE_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), ".cache", "tts"
)
# Global deep module instances
tts_model_manager: ModelManager | None = None
synthesis_module: Synthesis | None = None
audio_store_module: AudioStore | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load TTS model in background; initialize deep modules."""
    global tts_model_manager, synthesis_module, audio_store_module

    # Ensure directories exist
    for dir_path in [AUDIO_DIR, MODEL_CACHE_DIR]:
        try:
            os.makedirs(dir_path, exist_ok=True)
        except OSError:
            pass  # Read-only filesystem

    # Patch transformers for MPS/CPU compatibility BEFORE importing TTS
    _ensure_torch()
    try:
        from TTS.api import TTS as TTS_Class
    except ImportError:
        TTS_Class = None

    tts_model_manager = ModelManager(
        TTS_class=TTS_Class,
        cache_dir=MODEL_CACHE_DIR,
    )

    # Start model loading in background
    load_thread = tts_model_manager.load_in_background()
    # Note: we don't wait for the thread — lifespan yields immediately
    # and model status is checked per-request.

    # Initialize deep modules
    audio_store_module = AudioStore(
        audio_dir=AUDIO_DIR,
        speaker_wav_dir=SPEAKER_WAV_DIR,
    )
    synthesis_module = Synthesis(
        tts_model=tts_model_manager.model,
        audio_dir=AUDIO_DIR,
        speaker_wav_dir=SPEAKER_WAV_DIR,
    )

    yield

    # Shutdown
    print("Shutting down TTS backend...")
    if tts_model_manager:
        tts_model_manager.shutdown()


# FastAPI app — thin adapter
app = FastAPI(
    title="Lughat Chat TTS API",
    description="Text-to-Speech API with XTTS-v2 (Arabic & English)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend container IP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve downloads and speaker_wavs directories statically
app.mount("/downloads", StaticFiles(directory=AUDIO_DIR), name="downloads")
try:
    os.makedirs(SPEAKER_WAV_DIR, exist_ok=True)
except OSError:
    pass  # Read-only filesystem
app.mount(
    "/speaker_wavs", StaticFiles(directory=SPEAKER_WAV_DIR), name="speaker_wavs"
)

class HealthResponse(BaseModel):
    status: str  # loading | ready | error
    model_loaded: bool


# ── Health endpoint (adapts ModelManager) ────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health(reload: Optional[str] = None):
    """Health check endpoint — returns model load status.

    Optional query param `?reload=1` triggers a model reload when
    status is 'error'.
    """
    if tts_model_manager is None:
        return {"status": "error", "model_loaded": False}

    # If reload is requested, attempt reload (only when error)
    if reload == "1":
        return tts_model_manager.reload()

    return tts_model_manager.get_status()

# ── Voices endpoint (adapts AudioStore) ───────────────────────────────

@app.get("/api/voices")
async def list_voices():
    """List available voices discovered from speaker_wavs/ directory."""
    if audio_store_module is None:
        return []
    return audio_store_module.list_voices()


class SynthesisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)
    language: str = Field(default="ar", pattern="^(ar|en)$")
    voice: Optional[str] = Field(
        default=None
    )  # any string accepted; validated at runtime via file existence
    speaker: Optional[str] = Field(
        default=None  # Alias for voice (any string accepted)
    )

    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    seed: Optional[int] = Field(default=None, ge=0)  # Deterministic seed (optional)
    pitch: float = Field(default=0.0, ge=-4.0, le=4.0)
@app.post("/api/generate")
async def generate_speech(request: SynthesisRequest):
    """Generate speech from text and return MP3 audio blob.
    """
    from synthesis import Synthesis
    from fastapi import HTTPException

    if tts_model_manager is None or not tts_model_manager.is_ready():
        raise HTTPException(status_code=503, detail="TTS model not ready")

    # Rebuild synthesis module with current model (may have been swapped)
    syn = Synthesis(
        tts_model=tts_model_manager.model,
        audio_dir=AUDIO_DIR,
        speaker_wav_dir=SPEAKER_WAV_DIR,
    )

    return syn.generate(
        text=request.text,
        language=request.language,
        voice=request.voice,
        speaker=request.speaker,
        speed=request.speed,
        pitch=request.pitch,
        seed=request.seed,
    )


# ── History endpoint (adapts AudioStore) ──────────────────────────────

@app.get("/api/history")
async def get_history(cleanup: Optional[str] = None):
    """Get list of previously generated audio files.

    Optional query param `?cleanup=true` triggers cleanup of files
    older than 24 hours before returning the list.
    """
    if audio_store_module is None:
        return []

    # Optional cleanup trigger
    if cleanup == "true":
        audio_store_module.cleanup_old_files(older_than_hours=24)

    return audio_store_module.list_history()


# ── Cleanup endpoint (adapts AudioStore) ──────────────────────────────

@app.post("/api/cleanup")
async def post_cleanup(older_than_hours: Optional[int] = 24):
    """Remove orphaned audio files older than N hours."""
    if audio_store_module is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=503, detail="AudioStore not initialized")

    count = audio_store_module.cleanup_old_files(
        older_than_hours=older_than_hours or 24
    )
    return {"removed": count}


# ── Progress endpoint (in-memory store) ───────────────────────────────

_progress_store: dict[str, float] = {}


@app.get("/api/progress/{lesson_id}")
async def get_progress(lesson_id: str):
    """Get progress for a lesson (in-memory store)."""
    return {"lesson_id": lesson_id, "progress": _progress_store.get(lesson_id, 0.0)}


@app.put("/api/progress/{lesson_id}")
async def put_progress(lesson_id: str, body: dict):
    """Store progress for a lesson (in-memory store)."""
    progress = body.get("progress", 0.0)
    stored_lesson = body.get("lesson_id", lesson_id)

    if not stored_lesson or len(stored_lesson.strip()) == 0:
        raise HTTPException(
            status_code=422,
            detail="lesson_id is required and cannot be empty",
        )
    if not isinstance(progress, (int, float)):
        raise HTTPException(
            status_code=422,
            detail="progress must be a number",
        )
    if progress < 0 or progress > 100:
        raise HTTPException(
            status_code=422,
            detail="progress must be between 0 and 100",
        )

    _progress_store[stored_lesson] = float(progress)
    return {"lesson_id": stored_lesson, "progress": float(progress)}
