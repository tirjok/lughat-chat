from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from contextlib import asynccontextmanager
import json
import os
import time
import uuid
import hashlib
import subprocess
import threading
from typing import Optional

# Disable torchcodec in torchaudio so it doesn't try to load libtorchcodec
# This is the cleanest fix for CPU-only servers — torchaudio falls back to soundfile
import os as _os

_torchcodec_env = "0"
for _env_key in ["TORCHAUDIO_USE_TORCHCODEC", "TORCHCODEC_ENABLED"]:
    _os.environ.setdefault(_env_key, _torchcodec_env)


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

# Chatterbox TTS import (lazy — skip if torch not available, e.g. in CI tests)
try:
    from chatterbox import Chatterbox
except ImportError:
    Chatterbox = None  # type: ignore[misc, assignment]

# Configuration
AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
MODEL_CACHE_DIR = os.environ.get("TTS_MODEL_CACHE", "/app/.cache/tts")


# Create directories if writable (skip on read-only filesystems like Docker host mounts)
for dir_path in [AUDIO_DIR, MODEL_CACHE_DIR]:
    try:
        os.makedirs(dir_path, exist_ok=True)
    except OSError:
        pass  # Read-only filesystem — acceptable in test/local environments

# Global TTS model instance and state (protected by _model_lock for atomicity)
_model_lock = threading.Lock()
tts_model = None
model_load_thread: Optional[threading.Thread] = (
    None  # Track initial load thread for reload safety
)
model_load_status: str = "loading"  # tracking initial load state


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load TTS model in background so server starts immediately."""
    global tts_model, model_load_status, model_load_thread
    import time as _time

    load_start_time = _time.monotonic()

    MAX_LOAD_RETRIES = 3
    LOAD_RETRY_DELAYS = [2.0, 4.0, 8.0]  # exponential backoff
    LOAD_HARD_TIMEOUT = 300  # 5 minutes hard timeout

    def load_model():
        """Load Chatterbox model with retry logic, exponential backoff, and hard timeout."""
        global tts_model, model_load_status
        print("Loading Chatterbox multilingual model...")

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
                        print("Chatterbox model already loaded — skipping")
                        return
                if Chatterbox is None:
                    print(
                        "Chatterbox library not available (torch not installed) — skipping model load"
                    )
                    with _model_lock:
                        model_load_status = "error"
                        tts_model = None
                    return
                loaded_model = Chatterbox("multilingual")
                with _model_lock:
                    tts_model = loaded_model
                    model_load_status = "ready"
                print("Chatterbox model loaded successfully!")
                return
            except Exception as e:
                with _model_lock:
                    model_load_status = "error"
                    tts_model = None
                print(
                    f"Error loading Chatterbox model (attempt {attempt + 1}/{MAX_LOAD_RETRIES}): {e}"
                )
                if attempt < MAX_LOAD_RETRIES - 1:
                    delay = LOAD_RETRY_DELAYS[attempt]
                    print(f"Retrying in {delay}s...")
                    _time.sleep(delay)

        # All retries exhausted
        print(f"Model loading failed after {MAX_LOAD_RETRIES} attempts")

    # Start model loading in background thread
    global model_load_thread
    load_thread = threading.Thread(target=load_model, daemon=True)
    model_load_thread = load_thread
    load_thread.start()

    yield

    print("Shutting down TTS backend...")


app = FastAPI(
    description="Text-to-Speech API with Chatterbox Multilingual TTS (Arabic & English)",
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


# Request/Response models
class SynthesisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(..., min_length=1, max_length=3000)
    language: str = Field(default="ar", pattern="^(ar|en)$")
    voice: str = Field(default="female")


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
    global tts_model, model_load_status, model_load_thread

    if reload == "1":
        with _model_lock:
            if model_load_status == "error":
                model_load_status = "loading"
                tts_model = None
                # Thread finished (or never existed) — fall through to spawn a new one.
            else:
                # An existing load thread is still running — don't spawn another.
                # model_load_thread is None when no reload has ever been triggered,
                # or when the previous thread has finished (status is "ready" or "error").
                if model_load_thread is not None and model_load_thread.is_alive():
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
            print("Reloading Chatterbox multilingual model...")
            global tts_model, model_load_status
            try:
                if Chatterbox is None:
                    print(
                        "Chatterbox library not available (torch not installed) — skipping model load"
                    )
                    with _model_lock:
                        model_load_status = "error"
                    return
                loaded_model = Chatterbox("multilingual")
                with _model_lock:
                    tts_model = loaded_model
                    model_load_status = "ready"
                print("Chatterbox model reloaded successfully!")
            except Exception as e:
                with _model_lock:
                    model_load_status = "error"
                    tts_model = None
                print(f"Error reloading Chatterbox model: {e}")

        model_load_thread = threading.Thread(target=reload_model, daemon=True)
        # Brief pause to let the thread start before responding
        _reload_time.sleep(0.1)

    with _model_lock:
        return {
            "status": model_load_status,
            "model_loaded": tts_model is not None and model_load_status == "ready",
        }


@app.get("/api/voices")
async def list_voices():
    """List available built-in voices.

    Chatterbox uses built-in voices — no speaker WAV files needed.
    Returns a hardcoded list of available voice presets.
    """
    return [
        {"id": "female", "name": "female"},
        {"id": "male", "name": "male"},
    ]


def _compute_cache_key(text: str, language: str, voice: str) -> str:
    """Compute the SHA-256 hash of the composite input key.

    Uses pipe-delimited concatenation to avoid hash collisions from
    different input orderings (e.g., "ab|voice=c" vs "a|voice=bc").

    Args:
        text: The text to synthesize.
        language: The language code (ar/en).
        voice: The voice name.

    Returns:
        Hex digest of the SHA-256 hash.
    """
    composite = f"{text}|{language}|{voice}"
    return hashlib.sha256(composite.encode("utf-8")).hexdigest()


def _check_cache(cache_key: str) -> Optional[bytes]:
    """Check if a cached MP3 exists for the given cache key.

    Validates that the cached file contains valid MP3 data (ID3 tag or
    syncword) before returning it. Corrupted or truncated files are
    treated as cache misses.

    Args:
        cache_key: The SHA-256 hash of the composite input.

    Returns:
        MP3 data if cache hit, None if cache miss.
    """
    cache_mp3_path = os.path.join(AUDIO_DIR, f"{cache_key}.mp3")

    try:
        if os.path.exists(cache_mp3_path):
            with open(cache_mp3_path, "rb") as f:
                data = f.read()
            # Validate MP3 format: must start with ID3 tag (b"ID3") or
            # MPEG syncword (b"\\xff\\xfb" or b"\\xff\\xf3")
            if data and len(data) > 0:
                if data[:3] == b"ID3" or data[:2] in (b"\xff\xfb", b"\xff\xf3"):
                    print(f"Cache HIT for {cache_key}.mp3")
                    return data
                else:
                    print(f"Cache hit but file unreadable: {cache_mp3_path}")
    except OSError as e:
        print(f"Error reading cache file: {e}")

    return None


def _store_cache(
    cache_key: str, mp3_data: bytes, text: str, language: str, voice: str
) -> None:
    """Store synthesized MP3 and sidecar JSON in downloads/.

    Args:
        cache_key: The SHA-256 hash of the composite input.
        mp3_data: The MP3 binary data.
        text: The original text.
        language: The language code.
        voice: The voice name.
    """
    try:
        cache_mp3_path = os.path.join(AUDIO_DIR, f"{cache_key}.mp3")
        with open(cache_mp3_path, "wb") as f:
            f.write(mp3_data)

        # Write sidecar metadata for history browsing
        cache_meta_path = os.path.join(AUDIO_DIR, f"{cache_key}.json")
        with open(cache_meta_path, "w") as f:
            json.dump(
                {
                    "text": text,
                    "language": language,
                    "voice": voice,
                    "created_at": str(int(time.time())),
                },
                f,
            )

        print(f"Cached synthesis: {cache_key}.mp3 (size={len(mp3_data)} bytes)")
    except OSError as e:
        print(f"Warning: could not write cache to {AUDIO_DIR}: {e}")


@app.post("/api/generate")
async def generate_speech(request: SynthesisRequest):
    """Generate speech from text and return MP3 audio blob."""
    with _model_lock:
        model = tts_model
        status = model_load_status
    if model is None or status != "ready":
        raise HTTPException(status_code=503, detail="Chatterbox model not ready")

    # Use voice directly (no speaker alias resolution)
    voice = request.voice or "female"

    try:
        # Compute cache key from composite input (pipe-delimited)
        cache_key = _compute_cache_key(request.text, request.language, voice)
        cache_mp3_path = os.path.join(AUDIO_DIR, f"{cache_key}.mp3")

        # ── Cache Lookup ──
        cached_data = _check_cache(cache_key)
        if cached_data is not None:
            print(f"Cache HIT for {cache_key}.mp3")
            return FileResponse(
                path=cache_mp3_path,
                media_type="audio/mpeg",
                filename=f"{cache_key}.mp3",
            )

        print(f"Cache MISS for {cache_key}.mp3")

        # ── Cache Miss: Full Synthesis ──
        timestamp = uuid.uuid4().hex[:8]
        lang_code = request.language

        filename = f"{lang_code}_{voice}_{timestamp}.mp3"
        wav_path = os.path.join(AUDIO_DIR, f"{lang_code}_{voice}_{timestamp}.wav")
        mp3_path = os.path.join(AUDIO_DIR, filename)

        # Track files created for cleanup on failure (intermediate files + final output)
        intermediate_files: list[str] = []
        _response_delivered = False

        try:
            # Generate audio (Chatterbox outputs WAV; ffmpeg converts to MP3).
            print(f"Generating speech: {request.text[:50]}...")

            # Generate audio using Chatterbox built-in voice (no reference audio needed).
            model.tts_to_file(
                text=request.text,
                language=request.language,
                file_path=wav_path,
            )
            if not os.path.exists(wav_path):
                raise HTTPException(status_code=500, detail="Failed to generate audio")

            intermediate_files.append(wav_path)

            # Convert WAV to MP3 using ffmpeg (default speed, no speed control)
            try:
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-i",
                        wav_path,
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

            # ── Cache Store ──
            # Store the synthesized MP3 under the cache key for future lookups.
            # If caching fails (read-only filesystem), synthesis still succeeds.
            try:
                with open(mp3_path, "rb") as f:
                    mp3_data = f.read()
                _store_cache(cache_key, mp3_data, request.text, request.language, voice)
            except OSError:
                pass  # Non-fatal: synthesis succeeded, caching just failed

            # Write metadata sidecar for history browsing
            meta_path = os.path.join(AUDIO_DIR, f"{filename}.json")
            try:
                with open(meta_path, "w") as f:
                    json.dump(
                        {
                            "text": request.text,
                            "language": request.language,
                            "voice": voice,
                            "created_at": str(int(time.time())),
                        },
                        f,
                    )
            except OSError:
                pass  # Non-fatal: history will still work with filename parsing

            # Track final output files for cleanup on client disconnect.
            # If the FileResponse is never delivered (e.g. client disconnects
            # during streaming), these files become orphans — clean them up.
            intermediate_files.append(mp3_path)
            intermediate_files.append(meta_path)

            # Return MP3 file as binary response
            # Mark that the response was successfully delivered. The finally
            # block will skip cleaning up MP3 and .json when this is True.
            _response_delivered = True
            return FileResponse(
                path=mp3_path, media_type="audio/mpeg", filename=filename
            )

        finally:
            # Rollback: clean up any intermediate files that weren't successfully consumed
            for fpath in intermediate_files:
                # Only clean up MP3 and .json if the response was never delivered
                # (e.g. client disconnected during streaming). Successful responses
                # should leave the final output files on disk.
                if fpath.endswith((".mp3", ".json")) and not _response_delivered:
                    try:
                        if os.path.exists(fpath):
                            os.remove(fpath)
                            print(f"Cleaned up orphaned file: {fpath}")
                    except OSError:
                        pass  # Best effort cleanup
                    continue
                # Skip MP3 and .json on successful responses — they are the final output
                if fpath.endswith((".mp3", ".json")):
                    continue
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

                # Try to read metadata from sidecar JSON first
                meta_path = os.path.join(AUDIO_DIR, f"{filename}.json")
                if os.path.exists(meta_path):
                    try:
                        with open(meta_path) as f:
                            meta = json.load(f)
                        items.append(
                            {
                                "filename": filename,
                                "text": meta.get("text", ""),
                                "language": meta.get("language", "unknown"),
                                "voice": meta.get("voice", "default"),
                                "created_at": meta.get(
                                    "created_at", str(int(stat.st_mtime))
                                ),
                            }
                        )
                        continue
                    except (json.JSONDecodeError, OSError):
                        pass  # Fall through to filename parsing

                # Fallback: parse metadata from filename
                # Cache-based filenames ({hash}.mp3) have no _ separators.
                # Detect 64-char hex hashes and skip broken filename parsing.
                base = filename.rsplit(".", 1)[0]  # strip .mp3/.wav extension
                if len(base) == 64 and all(
                    c in "0123456789abcdef" for c in base.lower()
                ):
                    language = "unknown"
                    voice = "default"
                else:
                    parts = filename.split("_")
                    language = parts[0] if len(parts) > 0 else "unknown"
                    voice = parts[1] if len(parts) > 1 else "default"

                items.append(
                    {
                        "filename": filename,
                        "text": "",
                        "language": language,
                        "voice": voice,
                        "created_at": str(int(stat.st_mtime)),
                    }
                )

        # Trigger cleanup if requested (non-blocking, errors don't affect response)
        if cleanup == "true":
            now = time.time()
            twenty_four_hours = 24 * 60 * 60
            try:
                for filename in os.listdir(AUDIO_DIR):
                    if filename.endswith((".mp3", ".wav")):
                        filepath = os.path.join(AUDIO_DIR, filename)
                        try:
                            stat = os.stat(filepath)
                            if now - stat.st_mtime > twenty_four_hours:
                                os.remove(filepath)
                                # Also remove the sidecar JSON if it exists
                                meta_path = os.path.join(AUDIO_DIR, f"{filename}.json")
                                if os.path.exists(meta_path):
                                    os.remove(meta_path)
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

    Cleans up both .mp3 (generated) and .wav (orphaned intermediate) files,
    plus any associated .json metadata sidecars.
    Errors during cleanup are logged but don't fail the endpoint.
    """
    now = time.time()
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
                        # Also remove the sidecar JSON if it exists
                        meta_path = os.path.join(AUDIO_DIR, f"{filename}.json")
                        if os.path.exists(meta_path):
                            os.remove(meta_path)
                        print(
                            f"Cleaned up old file: {filename} (age: {age / 3600:.1f}h)"
                        )
                except OSError:
                    pass  # File was removed by another process — ignore
    except Exception as e:
        print(f"Error during cleanup: {e}")

    return {"removed_count": removed_count}
