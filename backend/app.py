from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
import os
import uuid
import json
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
MAX_AUDIO_FILES = int(os.environ.get("MAX_AUDIO_FILES", "100"))


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


# ---------------------------------------------------------------------------
# S-02: Store original text with generated audio (sidecar files)
# ---------------------------------------------------------------------------


def write_sidecar(audio_dir: str, metadata: dict) -> str:
    """Write a sidecar {timestamp}.meta.json file next to the MP3.

    The sidecar file stores the original text and synthesis parameters
    so that GET /api/history can return the text without parsing the filename.

    Returns the path to the sidecar file.
    """
    # Extract timestamp from the MP3 filename: {lang}_{voice}_{timestamp}.mp3
    # The sidecar is named {timestamp}.meta.json (without .mp3)
    mp3_filename = metadata.get("mp3_filename", "")
    parts = mp3_filename.split("_")
    if len(parts) >= 3:
        # Last segment is "{timestamp}.mp3" — strip .mp3
        timestamp = parts[-1][:-4]  # strip .mp3
    else:
        timestamp = os.path.splitext(mp3_filename)[0]

    meta_filename = f"{timestamp}.meta.json"
    meta_path = os.path.join(audio_dir, meta_filename)
    with open(meta_path, "w") as f:
        json.dump(metadata, f)
    return meta_path


def read_sidecar(audio_dir: str, timestamp: str) -> Optional[dict]:
    """Read a sidecar {timestamp}.meta.json file.

    The timestamp parameter is extracted from the MP3 filename
    (e.g., "{lang}_{voice}_{timestamp}.mp3" → timestamp = "{timestamp}.mp3").
    We strip .mp3 to get the actual timestamp for the sidecar lookup.

    Returns the metadata dict if found, None otherwise.
    """
    # Strip .mp3 or .wav extension from the last segment to get the actual timestamp
    actual_timestamp = timestamp
    if actual_timestamp.endswith(".mp3"):
        actual_timestamp = actual_timestamp[:-4]
    elif actual_timestamp.endswith(".wav"):
        actual_timestamp = actual_timestamp[:-4]
    meta_filename = f"{actual_timestamp}.meta.json"
    meta_path = os.path.join(audio_dir, meta_filename)
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r") as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError):
            return None  # File was deleted or corrupted between check and open
    return None


# ---------------------------------------------------------------------------
# S-05: Clean up old audio files (RC-007)
# ---------------------------------------------------------------------------


def cleanup_audio():
    """Delete oldest audio files beyond MAX_AUDIO_FILES limit.

    Removes both MP3/WAV files and their corresponding sidecar .meta.json files.
    """
    try:
        if not os.path.isdir(AUDIO_DIR):
            return

        # Find all audio files (MP3 or WAV) matching the expected pattern
        all_files = os.listdir(AUDIO_DIR)
        audio_files = [
            f
            for f in all_files
            if f.endswith((".mp3", ".wav")) and "_" in f and f.count("_") >= 2
        ]

        if len(audio_files) <= MAX_AUDIO_FILES:
            return  # No cleanup needed

        # Sort by modification time (newest first), so we keep the most recent files
        audio_files.sort(
            key=lambda f: os.path.getmtime(os.path.join(AUDIO_DIR, f)),
            reverse=True,
        )

        # Number of files to delete
        num_to_delete = len(audio_files) - MAX_AUDIO_FILES

        for old_file in audio_files[num_to_delete:]:  # delete the oldest files
            old_file_path = os.path.join(AUDIO_DIR, old_file)
            try:
                os.remove(old_file_path)
            except OSError:
                pass  # File may have been removed by another process

            # Also delete the corresponding sidecar file
            # The sidecar is named {timestamp}.meta.json where timestamp is the
            # last segment of the MP3/WAV filename (after the last underscore).
            parts = old_file.split("_")
            if len(parts) >= 3:
                # Last part is "{timestamp}.mp3" or "{timestamp}.wav" — strip extension
                timestamp = parts[-1].rsplit(".", 1)[0]  # strip .mp3 or .wav
                sidecar_filename = f"{timestamp}.meta.json"
                sidecar_path = os.path.join(AUDIO_DIR, sidecar_filename)
                try:
                    os.remove(sidecar_path)
                except OSError:
                    pass  # Sidecar may not exist (old files without S-02)

    except Exception:
        pass  # Silently ignore cleanup errors


# Create directories if writable (skip on read-only filesystems like Docker host mounts)
for dir_path in [AUDIO_DIR, MODEL_CACHE_DIR]:
    try:
        os.makedirs(dir_path, exist_ok=True)
    except OSError:
        pass  # Read-only filesystem — acceptable in test/local environments

# Global TTS model instance and state
tts_model = None
model_load_status = "loading"  # loading | ready | error


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load TTS model in background so server starts immediately."""
    global tts_model, model_load_status

    def load_model():
        """Load TTS model in a background thread."""
        global tts_model, model_load_status
        print("Loading XTTS-v2 model...")
        try:
            # Skip loading if already mocked (e.g. in tests)
            if tts_model is not None:
                print("TTS model already loaded — skipping")
                return
            if TTS is None:
                print(
                    "TTS library not available (torch not installed) — skipping model load"
                )
                model_load_status = "error"
                tts_model = None
                return
            os.environ["COQUI_TTS_CACHE"] = MODEL_CACHE_DIR
            tts_model = TTS("tts_models/multilingual/xtts_v2")
            model_load_status = "ready"
            print("XTTS-v2 model loaded successfully!")
        except Exception as e:
            model_load_status = "error"
            print(f"Error loading TTS model: {e}")
            tts_model = None

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
    model_name: str = "XTTS-v2"  # Name of the loaded model
    sub_status: str = ""  # Optional: "downloading" | "initializing" | ""


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint - returns model load status."""
    return {
        "status": model_load_status,
        "model_loaded": tts_model is not None and model_load_status == "ready",
        "model_name": "XTTS-v2",
        "sub_status": "initializing" if model_load_status == "loading" else "",
    }


@app.get("/api/voices")
async def list_voices():
    """List available voices discovered from speaker_wavs/ directory."""
    return discover_voices(SPEAKER_WAV_DIR)


@app.post("/api/generate")
async def generate_speech(request: SynthesisRequest):
    """Generate speech from text and return MP3 audio blob."""
    if tts_model is None or model_load_status != "ready":
        raise HTTPException(status_code=503, detail="TTS model not ready")

    try:
        # Generate unique filename
        timestamp = uuid.uuid4().hex[:8]
        lang_code = request.language

        # Resolve voice: accept both "voice" and "speaker" fields.
        # If neither is explicitly provided, use the first discovered voice
        # from speaker_wavs/ (alphabetically sorted). Falls back to "female"
        # for backwards compatibility with deployments that still use female.wav.
        voice = request.speaker if request.speaker else (request.voice or None)
        if not voice:
            discovered = discover_voices(SPEAKER_WAV_DIR)
            voice = discovered[0]["id"] if discovered else "female"

        filename = f"{lang_code}_{voice}_{timestamp}.mp3"
        wav_path = os.path.join(AUDIO_DIR, f"{lang_code}_{voice}_{timestamp}.wav")
        mp3_path = os.path.join(AUDIO_DIR, filename)

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

        tts_model.tts_to_file(
            text=request.text,
            speaker_wav=speaker_wav,
            language=request.language,
            file_path=wav_path,
            temperature=0.4,  # Low temperature for consistent, deterministic voice output
        )

        if not os.path.exists(wav_path):
            raise HTTPException(status_code=500, detail="Failed to generate audio")

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
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(
                f"FFmpeg error: {e.stderr if isinstance(e, subprocess.CalledProcessError) else e}"
            )
            # Fallback: return WAV with correct content type when MP3 conversion fails
            return FileResponse(
                path=wav_path,
                media_type="audio/wav",
                filename=f"{lang_code}_{voice}_{timestamp}.wav",
            )

        # Clean up intermediate WAV file — it's 5–10× larger than the MP3
        try:
            os.remove(wav_path)
        except OSError:
            pass  # Already gone (e.g. race condition) — ignore

        # S-02: Write sidecar metadata file next to the MP3
        # Extract timestamp from the MP3 filename: {lang}_{voice}_{timestamp}.mp3
        meta = {
            "text": request.text,
            "language": request.language,
            "voice": voice,
            "speed": request.speed,
            "pitch": request.pitch,
            "seed": seed,
            "created_at": timestamp,
            "mp3_filename": filename,
        }
        write_sidecar(AUDIO_DIR, meta)

        # S-05: Clean up old audio files if beyond the limit
        cleanup_audio()

        # Return MP3 file as binary response
        return FileResponse(path=mp3_path, media_type="audio/mpeg", filename=filename)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating speech: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
async def get_history():
    """Get list of previously generated audio files.

    Reads sidecar files to return the original text when available.
    Falls back to text: "" for old files without sidecars.
    """
    try:
        items = []
        all_files = os.listdir(AUDIO_DIR)
        for filename in sorted(all_files, reverse=True):
            if filename.endswith((".mp3", ".wav")):
                filepath = os.path.join(AUDIO_DIR, filename)
                try:
                    stat = os.stat(filepath)
                except OSError as e:
                    print(f"DEBUG get_history: os.stat({filepath}) failed: {e}")
                    continue  # Skip files that can't be stat'd (race condition)

                # Parse metadata from filename if possible
                parts = filename.split("_")
                language = parts[0] if len(parts) > 0 else "unknown"
                voice = parts[1] if len(parts) > 1 else "default"

                # Extract timestamp from filename to look up sidecar
                # Filename format: {lang}_{voice}_{timestamp}.mp3
                if len(parts) >= 3:
                    timestamp = parts[-1]
                else:
                    timestamp = None

                # Try to read sidecar for original text
                text = ""
                if timestamp:
                    sidecar = read_sidecar(AUDIO_DIR, timestamp)
                    if sidecar:
                        text = sidecar.get("text", "")
                        # Also pull additional fields from sidecar if available
                        if "speed" in sidecar:
                            speed = sidecar["speed"]
                            pitch = sidecar["pitch"]
                            created_at = sidecar.get(
                                "created_at", str(int(stat.st_mtime))
                            )
                            entry = {
                                "filename": filename,
                                "text": text,
                                "language": sidecar.get("language", language),
                                "voice": sidecar.get("voice", voice),
                                "speed": speed,
                                "pitch": pitch,
                                "created_at": created_at,
                            }
                            items.append(entry)
                            continue

                # Fallback: no sidecar found, use filename parsing
                items.append(
                    {
                        "filename": filename,
                        "text": text,  # Empty string for old files without sidecar
                        "language": language,
                        "voice": voice,
                        "speed": 1.0,
                        "pitch": 0.0,
                        "created_at": str(int(stat.st_mtime)),
                    }
                )

        return items

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
