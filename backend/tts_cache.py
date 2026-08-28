"""Cache layer for TTS synthesis — check, store, and sidecar operations.

This module owns all caching logic: cache key computation, cache lookup,
cache storage (MP3 + sidecar JSON), and sidecar writing.
"""

import json
import os
import time
import hashlib


def _get_audio_dir():
    """Lazily import AUDIO_DIR from app to avoid circular imports."""
    import app

    return app.AUDIO_DIR


def compute_cache_key(text: str, language: str, voice: str) -> str:
    """Compute the SHA-256 hash of the composite key."""
    composite = f"{text}|{language}|{voice}"
    return hashlib.sha256(composite.encode("utf-8")).hexdigest()


def _is_valid_mp3(data: bytes) -> bool:
    """Heuristic MP3 validation: ID3 tag or MP3 frame sync."""
    if len(data) < 3:
        return False
    return data[:3] == b"ID3" or data[:2] in (b"\xff\xfb", b"\xff\xf3")


def check_cache(cache_key: str) -> bytes | None:
    """Return cached MP3 data if a valid cache entry exists."""
    path = os.path.join(_get_audio_dir(), f"{cache_key}.mp3")
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


def write_sidecar(sidecar_path: str, text: str, language: str, voice: str) -> None:
    """Write metadata sidecar JSON for an audio file."""
    try:
        with open(sidecar_path, "w") as f:
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


def store_cache(
    mp3_path: str, cache_key: str, text: str, language: str, voice: str
) -> None:
    """Store sidecar JSON for a cache-based file.

    Also copies the MP3 to the cache path {cache_key}.mp3 for future cache hits.
    """
    cache_mp3_path = os.path.join(_get_audio_dir(), f"{cache_key}.mp3")
    try:
        with open(mp3_path, "rb") as src, open(cache_mp3_path, "wb") as dst:
            dst.write(src.read())
    except OSError:
        pass
    meta_path = os.path.join(_get_audio_dir(), f"{cache_key}.json")
    write_sidecar(meta_path, text, language, voice)


def store_history_meta(filename: str, text: str, language: str, voice: str) -> None:
    """Write metadata sidecar for a historical file."""
    meta_path = os.path.join(_get_audio_dir(), f"{filename}.json")
    write_sidecar(meta_path, text, language, voice)
