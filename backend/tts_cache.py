
import json
import os
import time
import hashlib


def _get_audio_dir():
    import app

    return app.AUDIO_DIR


def compute_cache_key(text: str, language: str, voice: str) -> str:
    """Compute the SHA-256 hash of the composite key."""
    composite = f"{text}|{language}|{voice}"
    return hashlib.sha256(composite.encode("utf-8")).hexdigest()


def _is_valid_mp3(data: bytes) -> bool:
    if len(data) < 3:
        return False
    return data[:3] == b"ID3" or data[:2] in (b"\xff\xfb", b"\xff\xf3")


def check_cache(cache_key: str) -> bytes | None:
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
    meta_path = os.path.join(_get_audio_dir(), f"{filename}.json")
    write_sidecar(meta_path, text, language, voice)
