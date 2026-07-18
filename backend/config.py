"""Configuration constants for the application.

All paths and environment-derived values live here so that modules
can import them without importing ``app.py``.

Values
------
AUDIO_DIR : str
    Directory where generated audio files are stored.
MODEL_CACHE_DIR : str
    Directory where the XTTS model is cached.
SPEAKER_WAV_DIR : str
    Directory containing speaker reference WAV files.
CONTENT_DIR : str
    Directory containing lesson JSON files.
DB_PATH : str
    Path to the SQLite database file.
MAX_AUDIO_FILES : int
    Maximum number of audio files before cleanup kicks in.
"""

from __future__ import annotations

import os
from pathlib import Path

# Directories relative to this file's parent (backend/).
_BACKEND_DIR = Path(__file__).resolve().parent

AUDIO_DIR = str(_BACKEND_DIR / "downloads")
MODEL_CACHE_DIR = os.environ.get("TTS_MODEL_CACHE", "/app/.cache/tts")
SPEAKER_WAV_DIR = str(_BACKEND_DIR / "speaker_wavs")
CONTENT_DIR = str(_BACKEND_DIR / "content")
DB_PATH = str(_BACKEND_DIR / "lughat.db")
MAX_AUDIO_FILES = int(os.environ.get("MAX_AUDIO_FILES", "100"))
