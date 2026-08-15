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


AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
MODEL_CACHE_DIR = os.environ.get("TTS_MODEL_CACHE", "/app/.cache/tts")

for dir_path in [AUDIO_DIR, MODEL_CACHE_DIR]:
    try:
        os.makedirs(dir_path, exist_ok=True)
    except OSError:
        pass


tts_model = None
model_load_status: str = "loading"


def _load_chatterbox() -> object | None:
    """Attempt to load the Chatterbox model. Returns the model or None."""
    try:
        from chatterbox import Chatterbox
    except ImportError:
        return None
    return Chatterbox("multilingual")


def load_model() -> None:
    """Load Chatterbox model in a background thread."""
    global tts_model, model_load_status
    print("Loading Chatterbox multilingual model...")
    if tts_model is not None:
        print("Chatterbox model already loaded — skipping")
        return
    loaded = _load_chatterbox()
    if loaded is None:
        print(
            "Chatterbox library not available (torch not installed) — skipping model load"
        )
        model_load_status = "error"
        return
    tts_model = loaded
    model_load_status = "ready"
    print("Chatterbox model loaded successfully!")


def shutdown() -> None:
    print("Shutting down TTS backend...")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load TTS model in background so server starts immediately."""
    load_thread = threading.Thread(target=load_model, daemon=True)
    load_thread.start()
    yield
    shutdown()


def _compute_cache_key(text: str, language: str, voice: str) -> str:
    composite = f"{text}|{language}|{voice}"
    return hashlib.sha256(composite.encode("utf-8")).hexdigest()


def _is_valid_mp3(data: bytes) -> bool:
    if len(data) < 3:
        return False
    return data[:3] == b"ID3" or data[:2] in (b"\xff\xfb", b"\xff\xf3")


def check_cache(cache_key: str) -> bytes | None:
    path = os.path.join(AUDIO_DIR, f"{cache_key}.mp3")
    if not os.path.exists(path):
        return None
    try:
        with open(path, "rb") as f:
            data = f.read()
        if _is_valid_mp3(data):
            return data
    except OSError:
        pass
    return None


def store_cache(
    cache_key: str, mp3_data: bytes, text: str, language: str, voice: str
) -> None:
    """Store synthesized MP3 and sidecar JSON."""
    mp3_path = os.path.join(AUDIO_DIR, f"{cache_key}.mp3")
    try:
        with open(mp3_path, "wb") as f:
            f.write(mp3_data)
    except OSError:
        return
    meta_path = os.path.join(AUDIO_DIR, f"{cache_key}.json")
    try:
        with open(meta_path, "w") as f:
            json.dump(
                {
                    "text": text,
                    "language": language,
                    "voice": voice,
                    "created_at": str(int(time.time())),
                },
                f,
            )
    except OSError:
        pass


def store_history_meta(filename: str, text: str, language: str, voice: str) -> None:
    """Write metadata sidecar for a historical file."""
    meta_path = os.path.join(AUDIO_DIR, f"{filename}.json")
    try:
        with open(meta_path, "w") as f:
            json.dump(
                {
                    "text": text,
                    "language": language,
                    "voice": voice,
                    "created_at": str(int(time.time())),
                },
                f,
            )
    except OSError:
        pass


def _convert_to_mp3(wav_path: str, mp3_path: str) -> None:
    """Convert WAV to MP3 via ffmpeg."""
    subprocess.run(
        ["ffmpeg", "-y", "-i", wav_path, "-b:a", "192k", mp3_path],
        check=True,
        capture_output=True,
    )


def generate_speech(request: "SynthesisRequest") -> FileResponse:
    """Generate speech from text and return MP3 file response.

    Cache lookup → synthesis → ffmpeg → cache store → return.
    """
    if tts_model is None or model_load_status != "ready":
        raise HTTPException(status_code=503, detail="Chatterbox model not ready")

    voice = request.voice or "female"

    cache_key = _compute_cache_key(request.text, request.language, voice)
    cache_mp3_path = os.path.join(AUDIO_DIR, f"{cache_key}.mp3")

    # Cache hit — return immediately
    cached = check_cache(cache_key)
    if cached is not None:
        return FileResponse(
            path=cache_mp3_path, media_type="audio/mpeg", filename=f"{cache_key}.mp3"
        )

    print(f"Cache MISS for {cache_key}.mp3")

    # Synthesis pipeline
    timestamp = uuid.uuid4().hex[:8]
    lang_code = request.language
    filename = f"{lang_code}_{voice}_{timestamp}.mp3"
    wav_path = os.path.join(AUDIO_DIR, f"{lang_code}_{voice}_{timestamp}.wav")
    mp3_path = os.path.join(AUDIO_DIR, filename)

    print(f"Generating speech: {request.text[:50]}...")

    tts_model.tts_to_file(
        text=request.text, language=request.language, file_path=wav_path
    )
    if not os.path.exists(wav_path):
        raise HTTPException(status_code=500, detail="Failed to generate audio")

    try:
        _convert_to_mp3(wav_path, mp3_path)
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e.stderr}")
        try:
            os.remove(wav_path)
        except OSError:
            pass
        raise HTTPException(
            status_code=500, detail="Failed to encode audio — FFmpeg conversion error"
        )

    try:
        os.remove(wav_path)
    except OSError:
        pass

    # Store in cache (non-fatal)
    try:
        with open(mp3_path, "rb") as f:
            mp3_data = f.read()
        store_cache(cache_key, mp3_data, request.text, request.language, voice)
    except OSError:
        pass

    store_history_meta(filename, request.text, request.language, voice)
    return FileResponse(path=mp3_path, media_type="audio/mpeg", filename=filename)


def _parse_meta_from_sidecar(filename: str) -> dict | None:
    """Try to read metadata from a sidecar JSON file."""
    meta_path = os.path.join(AUDIO_DIR, f"{filename}.json")
    if not os.path.exists(meta_path):
        return None
    try:
        with open(meta_path) as f:
            meta = json.load(f)
        return {
            "filename": filename,
            "text": meta.get("text", ""),
            "language": meta.get("language", "unknown"),
            "voice": meta.get("voice", "default"),
            "created_at": meta.get("created_at", str(int(os.stat(meta_path).st_mtime))),
        }
    except (json.JSONDecodeError, OSError):
        return None


def _parse_filename(filename: str) -> dict:
    """Extract language/voice from filename, handling cache-based hashes."""
    base = filename.rsplit(".", 1)[0]
    if len(base) == 64 and all(c in "0123456789abcdef" for c in base.lower()):
        return {"language": "unknown", "voice": "default"}
    parts = filename.split("_")
    return {
        "language": parts[0] if len(parts) > 0 else "unknown",
        "voice": parts[1] if len(parts) > 1 else "default",
    }


def list_history() -> list[dict]:
    """Return list of previously generated audio files."""
    items = []
    for filename in sorted(os.listdir(AUDIO_DIR), reverse=True):
        if not filename.endswith((".mp3", ".wav")):
            continue
        filepath = os.path.join(AUDIO_DIR, filename)
        stat = os.stat(filepath)

        meta = _parse_meta_from_sidecar(filename)
        if meta:
            items.append(meta)
            continue

        name_info = _parse_filename(filename)
        items.append(
            {
                "filename": filename,
                "text": "",
                "language": name_info["language"],
                "voice": name_info["voice"],
                "created_at": str(int(stat.st_mtime)),
            }
        )
    return items


def cleanup_old_files() -> int:
    """Remove audio files older than 24 hours. Returns count removed."""
    now = time.time()
    cutoff = now - 24 * 60 * 60
    removed = 0

    for filename in os.listdir(AUDIO_DIR):
        if not filename.endswith((".mp3", ".wav")):
            continue
        filepath = os.path.join(AUDIO_DIR, filename)
        try:
            if os.stat(filepath).st_mtime < cutoff:
                os.remove(filepath)
                removed += 1
                meta_path = os.path.join(AUDIO_DIR, f"{filename}.json")
                if os.path.exists(meta_path):
                    os.remove(meta_path)
        except OSError:
            pass

    return removed


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
    status: str
    model_loaded: bool


app = FastAPI(
    description="Text-to-Speech API with Chatterbox Multilingual TTS (Arabic & English)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health(reload: Optional[str] = Query(None)):
    if reload == "1" and model_load_status == "error":
        print("Reloading model on request...")
        load_thread = threading.Thread(target=load_model, daemon=True)
        load_thread.start()
        return {
            "status": "loading",
            "model_loaded": False,
        }
    return {
        "status": model_load_status,
        "model_loaded": tts_model is not None and model_load_status == "ready",
    }


@app.get("/api/voices")
async def list_voices():
    return [
        {"id": "female", "name": "female"},
        {"id": "male", "name": "male"},
    ]


@app.post("/api/generate")
async def generate_speech_endpoint(request: SynthesisRequest):
    try:
        return generate_speech(request)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating speech: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
async def get_history(cleanup: Optional[str] = Query(None)):
    try:
        items = list_history()
        if cleanup == "true":
            cleanup_old_files()
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cleanup")
async def cleanup_endpoint():
    return {"removed_count": cleanup_old_files()}
