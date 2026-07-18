"""Storage Module — audio file management.

Exports ``StorageService`` which encapsulates:
  - ``get_history()`` — list previously generated audio files with metadata.
  - ``cleanup()`` — remove oldest files beyond MAX limit.
  - ``discover_voices()`` — list voices from the speaker_wavs directory.

Sidecar read/write functions are internal helpers.

Usage::

    from storage import StorageService

    store = StorageService(audio_dir)
    history = store.get_history()
    store.cleanup()
    voices = store.discover_voices()
"""

from __future__ import annotations

import sys as _sys


def _get_os() -> object:
    """Get the 'os' module, checking for test-level overrides first."""
    _m = _sys.modules.get("app")
    if _m is not None and hasattr(_m, "os"):
        return _m.os
    return __import__("os")


def _get_path() -> object:
    """Get the 'os.path' submodule, checking for test-level overrides."""
    _os = _get_os()
    return _os.path


class StorageService:
    """High-level audio storage interface.

    Parameters
    ----------
    audio_dir : str
        Directory where generated audio files are stored.
    max_audio_files : int
        Maximum number of audio files before cleanup kicks in.
    speaker_wav_dir : str
        Directory containing speaker reference WAV files.
    """

    def __init__(
        self,
        audio_dir: str,
        max_audio_files: int = 100,
        speaker_wav_dir: str | None = None,
    ) -> None:
        self.audio_dir = audio_dir
        self.max_audio_files = max_audio_files
        self.speaker_wav_dir = speaker_wav_dir or ""

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def get_history(self) -> list[dict]:
        """Get list of previously generated audio files.

        Reads sidecar files to return the original text when available.
        Falls back to ``text: ""`` for old files without sidecars.

        Returns
        -------
        list[dict]
            ``[{filename, text, language, voice, speed, pitch,
               created_at}, ...]`` sorted by newest first.

        Raises
        ------
        HTTPException
            500 when directory listing fails.
        """
        from fastapi import HTTPException

        try:
            items = []
            _os = _get_os()
            _path = _get_path()
            all_files = _os.listdir(self.audio_dir)
            for filename in sorted(all_files, reverse=True):
                if filename.endswith((".mp3", ".wav")):
                    filepath = _path.join(self.audio_dir, filename)
                    try:
                        stat = _os.stat(filepath)
                    except OSError:
                        continue  # Skip files that can't be stat'd

                    parts = filename.split("_")
                    language = parts[0] if len(parts) > 0 else "unknown"
                    voice = parts[1] if len(parts) > 1 else "default"

                    if len(parts) >= 3:
                        timestamp = parts[-1]
                    else:
                        timestamp = None

                    text = ""
                    if timestamp:
                        from storage.helpers import read_sidecar as _read_sidecar

                        sidecar = _read_sidecar(self.audio_dir, timestamp)
                        if sidecar:
                            text = sidecar.get("text", "")
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

                    items.append(
                        {
                            "filename": filename,
                            "text": text,
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

    def cleanup(self) -> None:
        """Delete oldest audio files beyond ``max_audio_files`` limit.

        Removes both MP3/WAV files and their corresponding sidecar
        ``.meta.json`` files.  Silently ignores errors.
        """
        from storage.helpers import cleanup_audio_dir as _cleanup_audio_dir

        _cleanup_audio_dir(self.audio_dir, self.max_audio_files)

    def discover_voices(self) -> list[dict]:
        """Return list of voices discovered from the speaker_wavs directory.

        Returns
        -------
        list[dict]
            ``[{id, name}, ...]`` sorted alphabetically.
        """
        from tts.audio_pipeline import _discover_voices

        return _discover_voices(self.speaker_wav_dir)


# Re-export for backward compat (tests import from storage module):
def _get_discover_voices():
    from tts.audio_pipeline import _discover_voices as _dv

    return _dv


discover_voices = _get_discover_voices()
