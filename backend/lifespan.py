"""Application lifespan — model loading and database initialization.

Exports ``app_lifespan`` which is a FastAPI ``asynccontextmanager`` that:
  1. Initializes SQLite lessons and user_progress tables from JSON files.
  2. Starts a background thread that loads the XTTS-v2 model.

Usage::

    from lifespan import app_lifespan

    app = FastAPI(lifespan=app_lifespan)
"""

from __future__ import annotations

import os
import threading
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from fastapi import FastAPI

if TYPE_CHECKING:
    from tts import TtsEngine


def _init_databases(content_dir: str) -> None:
    """Initialize SQLite lessons and user_progress tables from JSON files."""
    try:
        from lessons_db import init_lessons_db

        init_lessons_db(content_dir)
    except Exception as e:
        print(f"Warning: Failed to initialize lessons database: {e}")

    try:
        from progress_db import init_user_progress_db

        init_user_progress_db(content_dir)
    except Exception as e:
        print(f"Warning: Failed to initialize user_progress database: {e}")


def _setup_dirs() -> None:
    """Create directories if writable (skip on read-only filesystems)."""
    from config import AUDIO_DIR, MODEL_CACHE_DIR

    for dir_path in [AUDIO_DIR, MODEL_CACHE_DIR]:
        try:
            os.makedirs(dir_path, exist_ok=True)
        except OSError:
            pass  # Read-only filesystem — acceptable in test/local environments


@asynccontextmanager
async def app_lifespan(app: FastAPI, tts_engine: "TtsEngine") -> None:  # type: ignore[name-defined]
    """Application lifespan handler.

    On startup:
      1. Creates directories if writable.
      2. Initializes SQLite tables from JSON files.
      3. Starts a background thread that loads the XTTS-v2 model.

    On shutdown: logs a shutdown message.

    Parameters
    ----------
    app : FastAPI
        The FastAPI application instance.
    tts_engine : TtsEngine
        The TTS engine instance (already constructed with paths).
    """
    _setup_dirs()

    # Import config here to avoid circular imports.
    from config import CONTENT_DIR

    _init_databases(CONTENT_DIR)

    # Start model loading in background thread.
    def load_model() -> None:
        """Load TTS model in a background thread."""
        print("Loading XTTS-v2 model...")
        try:
            if tts_engine.model is not None:
                print("TTS model already loaded — skipping")
                return
            tts_engine.load_model()
        except Exception as e:
            print(f"Error during lifespan model loading: {e}")

    load_thread = threading.Thread(target=load_model, daemon=True)
    load_thread.start()

    yield

    print("Shutting down TTS backend...")
