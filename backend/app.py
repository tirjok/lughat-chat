from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
import os
import uuid
import subprocess
import threading
import wave
from typing import Optional

# Disable torchcodec in torchaudio so it doesn't try to load libtorchcodec
# This is the cleanest fix for CPU-only servers — torchaudio falls back to soundfile
import os as _os

_torchcodec_env = "0"
for _env_key in ["TORCHAUDIO_USE_TORCHCODEC", "TORCHCODEC_ENABLED"]:
    _os.environ.setdefault(_env_key, _torchcodec_env)

# Minimum reference audio duration for XTTS-v2 voice cloning (seconds)
XTTS_MIN_REFERENCE_DURATION = 0.33


def _validate_speaker_wav(wav_path: str) -> None:
    """Validate that a speaker WAV file meets XTTS-v2 minimum duration requirement."""
    try:
        with wave.open(wav_path) as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            duration = frames / rate
        if duration < XTTS_MIN_REFERENCE_DURATION:
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Speaker WAV file '{wav_path}' is too short ({duration:.2f}s). "
                    f"XTTS-v2 requires at least {XTTS_MIN_REFERENCE_DURATION}s of reference audio. "
                    f"Regenerate speaker_wavs/{os.path.basename(wav_path)} with longer text."
                ),
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate speaker WAV file '{wav_path}': {e}",
        )


# Compatibility shim: isin_mps_friendly was removed in newer transformers
# Lazy import so tests can run without torch installed.
_torch_loaded = False


def _ensure_torch():
    """Ensure torch is imported and patched. Called lazily on first use."""
    global _torch_loaded
    if _torch_loaded:
        return
    import torch
    import transformers.pytorch_utils as _pytorch_utils

    if not hasattr(_pytorch_utils, "isin_mps_friendly"):

        def _isin_mps_friendly(elements, test_elements, **kwargs):
            return torch.isin(elements, test_elements)

        _pytorch_utils.isin_mps_friendly = _isin_mps_friendly

    # Patch torch.ops.load_library to suppress missing NVIDIA library errors
    global _original_load_library

    def _patched_load_library(path):
        try:
            return _original_load_library(path)
        except OSError as e:
            error_str = str(e)
            if "libnvrtc" in error_str or "libcuda" in error_str:
                return None
            if "libtorchcodec" in path or "libtorchcodec" in error_str:
                return None
            raise

    import torch.ops  # noqa: F401

    if hasattr(torch.ops, "load_library"):
        _original_load_library = torch.ops.load_library
        torch.ops.load_library = _patched_load_library
    _torch_loaded = True


# Ensure torch is loaded and patched (lazy import for test compatibility)
# Silently skip if torch isn't installed (e.g., in CI test environments).
try:
    _ensure_torch()
except ImportError:
    pass  # torch not available — acceptable in test environments

# Coqui TTS imports (lazy — skip if torch not available, e.g. in CI tests)
try:
    from TTS.api import TTS
except ImportError:
    TTS = None  # type: ignore[misc, assignment]

# Configuration
AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
MODEL_CACHE_DIR = os.environ.get("TTS_MODEL_CACHE", "/app/.cache/tts")
SPEAKER_WAV_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "speaker_wavs"
)


def discover_voices(directory: str) -> list[dict]:
    """Scan directory for .wav files and return voice entries.

    Each discovered file produces a voice entry: { id: filename_without_extension, name: filename_without_extension }.
    Non-.wav files are ignored. Returns empty list if directory doesn't exist.
    """
    voices = []
    if not os.path.isdir(directory):
        return voices
    for filename in sorted(os.listdir(directory)):
        if filename.endswith(".wav"):
            name = filename[:-4]  # strip .wav extension
            voices.append({"id": name, "name": name})
    return voices


# Create directories if writable (skip on read-only filesystems like Docker host mounts)
for dir_path in [AUDIO_DIR, MODEL_CACHE_DIR]:
    try:
        os.makedirs(dir_path, exist_ok=True)
    except OSError:
        pass  # Read-only filesystem — acceptable in test/local environments

# Global TTS model instance and state (protected by _model_lock for atomicity)
_model_lock = threading.Lock()
tts_model = None
model_load_status = "loading"  # loading | ready | error


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load TTS model in background so server starts immediately."""
    global tts_model, model_load_status
    import time as _time

    load_start_time = _time.monotonic()

    MAX_LOAD_RETRIES = 3
    LOAD_RETRY_DELAYS = [2.0, 4.0, 8.0]  # exponential backoff
    LOAD_HARD_TIMEOUT = 300  # 5 minutes hard timeout

    def load_model():
        """Load TTS model with retry logic, exponential backoff, and hard timeout."""
        global tts_model, model_load_status
        print("Loading XTTS-v2 model...")

        for attempt in range(MAX_LOAD_RETRIES):
            # Check hard timeout
            if _time.monotonic() - load_start_time >= LOAD_HARD_TIMEOUT:
                with _model_lock:
                    model_load_status = "error"
                print(
                    f"Model loading abandoned: hard timeout ({LOAD_HARD_TIMEOUT}s) exceeded"
                )
                return

            try:
                # Skip loading if already mocked (e.g. in tests)
                with _model_lock:
                    if tts_model is not None:
                        print("TTS model already loaded — skipping")
                        return
                if TTS is None:
                    print(
                        "TTS library not available (torch not installed) — skipping model load"
                    )
                    with _model_lock:
                        model_load_status = "error"
                        tts_model = None
                    return
                os.environ["COQUI_TTS_CACHE"] = MODEL_CACHE_DIR
                loaded_model = TTS("tts_models/multilingual/xtts_v2")
                with _model_lock:
                    tts_model = loaded_model
                    model_load_status = "ready"
                print("XTTS-v2 model loaded successfully!")
                return
            except Exception as e:
                with _model_lock:
                    model_load_status = "error"
                    tts_model = None
                print(
                    f"Error loading TTS model (attempt {attempt + 1}/{MAX_LOAD_RETRIES}): {e}"
                )
                if attempt < MAX_LOAD_RETRIES - 1:
                    delay = LOAD_RETRY_DELAYS[attempt]
                    print(f"Retrying in {delay}s...")
                    _time.sleep(delay)

        # All retries exhausted
        print(f"Model loading failed after {MAX_LOAD_RETRIES} attempts")

    # Start model loading in background thread
    load_thread = threading.Thread(target=load_model, daemon=True)
    load_thread.start()

    yield

    print("Shutting down TTS backend...")


app = FastAPI(
    title="Lughat Chat TTS API",
    description="Text-to-Speech API with XTTS-v2 (Arabic & English)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware - allow frontend container to call API
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
app.mount("/speaker_wavs", StaticFiles(directory=SPEAKER_WAV_DIR), name="speaker_wavs")


# Request/Response models
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
    pitch: float = Field(default=0.0, ge=-4.0, le=4.0)
    seed: Optional[int] = Field(default=None, ge=0)  # Deterministic seed (optional)


class SynthesisResponse(BaseModel):
    audio_url: str
    filename: str
    duration_seconds: float


class HealthResponse(BaseModel):
    status: str  # loading | ready | error
    model_loaded: bool


@app.get("/health", response_model=HealthResponse)
async def health(reload: Optional[str] = Query(None)):
    """Health check endpoint - returns model load status.

    Accepts ?reload=1 to trigger a model reload attempt (when status is 'error').
    """
    global tts_model, model_load_status

    if reload == "1":
        with _model_lock:
            if model_load_status == "error":
                model_load_status = "loading"
                tts_model = None
            else:
                return {
                    "status": model_load_status,
                    "model_loaded": tts_model is not None
                    and model_load_status == "ready",
                }
        # Start a new background thread to reload
        import time as _reload_time

        _reload_start = _reload_time.monotonic()
        print("Model reload requested via ?reload=1")

        def reload_model():
            global tts_model, model_load_status
            print("Reloading XTTS-v2 model...")
            try:
                if TTS is None:
                    print(
                        "TTS library not available (torch not installed) — skipping model load"
                    )
                    with _model_lock:
                        model_load_status = "error"
                    return
                os.environ["COQUI_TTS_CACHE"] = MODEL_CACHE_DIR
                loaded_model = TTS("tts_models/multilingual/xtts_v2")
                with _model_lock:
                    tts_model = loaded_model
                    model_load_status = "ready"
                print("XTTS-v2 model reloaded successfully!")
            except Exception as e:
                with _model_lock:
                    model_load_status = "error"
                    tts_model = None
                print(f"Error reloading TTS model: {e}")

        reload_thread = threading.Thread(target=reload_model, daemon=True)
        reload_thread.start()
        # Brief pause to let the thread start before responding
        _reload_time.sleep(0.1)

    with _model_lock:
        return {
            "status": model_load_status,
            "model_loaded": tts_model is not None and model_load_status == "ready",
        }


@app.get("/api/voices")
async def list_voices():
    """List available voices discovered from speaker_wavs/ directory."""
    return discover_voices(SPEAKER_WAV_DIR)


@app.post("/api/generate")
async def generate_speech(request: SynthesisRequest):
    """Generate speech from text and return MP3 audio blob."""
    with _model_lock:
        model = tts_model
        status = model_load_status
    if model is None or status != "ready":
        raise HTTPException(status_code=503, detail="TTS model not ready")

    try:
        # Generate unique filename
        timestamp = uuid.uuid4().hex[:8]
        lang_code = request.language

        # Resolve voice: accept both "voice" and "speaker" fields; default to "female"
        voice = request.speaker if request.speaker else (request.voice or "female")

        filename = f"{lang_code}_{voice}_{timestamp}.mp3"
        wav_path = os.path.join(AUDIO_DIR, f"{lang_code}_{voice}_{timestamp}.wav")
        mp3_path = os.path.join(AUDIO_DIR, filename)

        # Track files created for cleanup on failure (intermediate files only)
        intermediate_files: list[str] = []

        try:
            # Generate WAV first (XTTS native format)
            print(f"Generating speech: {request.text[:50]}...")

            # Use the voice ID directly as the WAV filename
            speaker_wav = os.path.join(SPEAKER_WAV_DIR, f"{voice}.wav")

            if not os.path.exists(speaker_wav):
                raise HTTPException(
                    status_code=500,
                    detail=f"Speaker WAV file not found for voice '{voice}' (expected at '{speaker_wav}'). Add it to speaker_wavs/.",
                )

            # Validate speaker WAV duration (XTTS-v2 requires >= 0.33s reference audio)
            _validate_speaker_wav(speaker_wav)

            # Generate audio with speaker reference for voice cloning
            # Use deterministic seed if provided
            seed = request.seed if request.seed is not None else 42

            # Set PyTorch random seed for deterministic XTTS generation.
            # Coqui TTS v0.22+ XTTS does not accept a `seed` kwarg directly;
            # seeding must be done at the PyTorch level before inference.
            try:
                import torch

                torch.manual_seed(seed)
            except ImportError:
                pass  # torch not available (e.g. in tests) — skip seeding

            model.tts_to_file(
                text=request.text,
                speaker_wav=speaker_wav,
                language=request.language,
                file_path=wav_path,
                temperature=0.4,  # Low temperature for consistent, deterministic voice output
            )

            if not os.path.exists(wav_path):
                raise HTTPException(status_code=500, detail="Failed to generate audio")

            intermediate_files.append(wav_path)

            # Convert WAV to MP3 using ffmpeg
            try:
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-i",
                        wav_path,
                        "-filter:a",
                        f"atempo={request.speed}",
                        "-b:a",
                        "192k",
                        mp3_path,
                    ],
                    check=True,
                    capture_output=True,
                )
            except subprocess.CalledProcessError as e:
                # Do NOT fall back to serving WAV as MP3 — browsers' <audio>
                # elements refuse to play PCM WAV data labeled as audio/mpeg.
                # Fail the request so the client knows something went wrong.
                print(f"FFmpeg error: {e.stderr}")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to encode audio — FFmpeg conversion error",
                )

            # Clean up intermediate WAV file — it's 5–10× larger than the MP3
            try:
                os.remove(wav_path)
            except OSError:
                pass  # Already gone (e.g. race condition) — ignore

            # Return MP3 file as binary response
            return FileResponse(
                path=mp3_path, media_type="audio/mpeg", filename=filename
            )

        finally:
            # Rollback: clean up any intermediate files that weren't successfully consumed
            for fpath in intermediate_files:
                try:
                    if os.path.exists(fpath):
                        os.remove(fpath)
                        print(f"Cleaned up intermediate file: {fpath}")
                except OSError:
                    pass  # Best effort cleanup

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating speech: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
async def get_history(cleanup: Optional[str] = Query(None)):
    """Get list of previously generated audio files.

    Accepts ?cleanup=true to trigger cleanup of files older than 24 hours.
    Cleanup errors are logged but don't affect the response.
    """
    try:
        items = []
        for filename in sorted(os.listdir(AUDIO_DIR), reverse=True):
            if filename.endswith((".mp3", ".wav")):
                filepath = os.path.join(AUDIO_DIR, filename)
                stat = os.stat(filepath)

                # Parse metadata from filename if possible
                parts = filename.split("_")
                language = parts[0] if len(parts) > 0 else "unknown"
                voice = parts[1] if len(parts) > 1 else "default"

                items.append(
                    {
                        "filename": filename,
                        "text": "",  # We don't store the original text in this simple version
                        "language": language,
                        "voice": voice,
                        "speed": 1.0,
                        "pitch": 0.0,
                        "created_at": str(int(stat.st_mtime)),
                    }
                )

        # Trigger cleanup if requested (non-blocking, errors don't affect response)
        if cleanup == "true":
            import time as _hist_time

            now = _hist_time.time()
            twenty_four_hours = 24 * 60 * 60
            try:
                for filename in os.listdir(AUDIO_DIR):
                    if filename.endswith((".mp3", ".wav")):
                        filepath = os.path.join(AUDIO_DIR, filename)
                        try:
                            stat = os.stat(filepath)
                            if now - stat.st_mtime > twenty_four_hours:
                                os.remove(filepath)
                                print(
                                    f"Cleanup (history): removed old file: {filename}"
                                )
                        except OSError:
                            pass
            except Exception as e:
                print(f"Cleanup (history) error: {e}")

        return items

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cleanup")
async def cleanup_old_files():
    """Remove generated audio files older than 24 hours.

    Cleans up both .mp3 (generated) and .wav (orphaned intermediate) files.
    Errors during cleanup are logged but don't fail the endpoint.
    """
    import time as _cleanup_time

    now = _cleanup_time.time()
    twenty_four_hours = 24 * 60 * 60  # 86400 seconds
    removed_count = 0

    try:
        for filename in os.listdir(AUDIO_DIR):
            if filename.endswith((".mp3", ".wav")):
                filepath = os.path.join(AUDIO_DIR, filename)
                try:
                    stat = os.stat(filepath)
                    age = now - stat.st_mtime
                    if age > twenty_four_hours:
                        os.remove(filepath)
                        removed_count += 1
                        print(
                            f"Cleaned up old file: {filename} (age: {age / 3600:.1f}h)"
                        )
                except OSError:
                    pass  # File was removed by another process — ignore
    except Exception as e:
        print(f"Error during cleanup: {e}")

    return {"removed_count": removed_count}
