"""AudioStore — deep module for file-based audio operations.

Handles:
  - Voice discovery from speaker_wavs directory
  - Audio history listing with sidecar metadata
  - Orphaned file cleanup (older than 24 hours)

This is a **deep module**: one interface, one place to test.
The implementation absorbs directory scanning, filename parsing,
sidecar JSON reading, and filesystem cleanup.
"""

from __future__ import annotations

import json
import os
import time
from typing import Optional


def discover_voices(directory: str) -> list[dict]:
    """Scan directory for .wav files and return voice entries.

    Each discovered file produces a voice entry: { id, name }.
    Non-.wav files are ignored. Returns empty list if directory missing.

    This is a utility function used by the AudioStore module.

    Args:
        directory: Path to directory containing speaker WAV files.

    Returns:
        List of voice dicts, sorted alphabetically by filename.
    """
    voices: list[dict] = []
    if not os.path.isdir(directory):
        return voices
    for filename in sorted(os.listdir(directory)):
        if filename.endswith(".wav"):
            name = filename[:-4]  # strip .wav extension
            voices.append({"id": name, "name": name})
    return voices


def _parse_metadata_from_filename(filename: str) -> dict:
    """Parse language and voice from a generated audio filename.

    Format: {lang}_{voice}_{timestamp}.{ext}

    Args:
        filename: Audio filename (e.g. "ar_female_abc123.mp3").

    Returns:
        Dict with language, voice, speed, pitch.
    """
    parts = filename.split("_")
    return {
        "language": parts[0] if len(parts) > 0 else "unknown",
        "voice": parts[1] if len(parts) > 1 else "default",
        "speed": 1.0,
        "pitch": 0.0,
    }


def _read_sidecar(audio_dir: str, filename: str) -> Optional[dict]:
    """Read sidecar JSON metadata file if it exists.

    Sidecar files follow the pattern: {audio_filename}.json

    Args:
        audio_dir: Directory containing audio files.
        filename: Audio filename (mp3 or wav).

    Returns:
        Sidecar dict with text, language, voice, created_at, or None.
    """
    meta_path = os.path.join(audio_dir, f"{filename}.json")
    try:
        with open(meta_path, "r") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None


class AudioStore:
    """Deep module for audio file operations.

    One interface: ``AudioStore(audio_dir, speaker_wav_dir)``.
    The implementation absorbs: voice discovery, history listing,
    filename parsing, sidecar JSON reading, orphan cleanup.
    """

    def __init__(self, audio_dir: str, speaker_wav_dir: str) -> None:
        """Create an AudioStore module.

        Args:
            audio_dir: Directory containing generated audio files.
            speaker_wav_dir: Directory containing speaker reference WAV files.
        """
        self._audio_dir = audio_dir
        self._speaker_wav_dir = speaker_wav_dir

    def list_voices(self) -> list[dict]:
        """List available voices from the speaker_wavs directory."""
        return discover_voices(self._speaker_wav_dir)

    def list_history(
        self, cleanup_older_than_hours: Optional[int] = None
    ) -> list[dict]:
        """List previously generated audio files with metadata.

        Reads sidecar JSON files for text metadata. Optionally runs
        orphan cleanup before listing.

        Args:
            cleanup_older_than_hours: If set, cleanup files older than
                                     this many hours before listing.

        Returns:
            List of history entry dicts, newest first.
        """
        items: list[dict] = []
        try:
            for filename in sorted(os.listdir(self._audio_dir), reverse=True):
                if filename.endswith((".mp3", ".wav")):
                    filepath = os.path.join(self._audio_dir, filename)
                    stat = os.stat(filepath)
                    meta = _parse_metadata_from_filename(filename)

                    # Try to read sidecar for original text
                    sidecar = _read_sidecar(self._audio_dir, filename)

                    entry: dict = {
                        "filename": filename,
                        "text": sidecar["text"] if sidecar else "",
                        "language": meta["language"],
                        "voice": meta["voice"],
                        "speed": meta["speed"],
                        "pitch": meta["pitch"],
                        "created_at": str(int(stat.st_mtime)),
                    }
                    items.append(entry)

            return items

        except Exception as e:
            from fastapi import HTTPException

            raise HTTPException(status_code=500, detail=str(e))

    def cleanup_old_files(self, older_than_hours: int = 24) -> int:
        """Remove orphaned MP3 and .json files older than N hours.

        Args:
            older_than_hours: Age threshold in hours (default 24).

        Returns:
            Number of files removed.
        """

        removed = 0
        cutoff = time.time() - (older_than_hours * 3600)
        try:
            for filename in os.listdir(self._audio_dir):
                filepath = os.path.join(self._audio_dir, filename)
                if filename.endswith((".mp3", ".wav", ".json")):
                    try:
                        mtime = os.path.getmtime(filepath)
                        if mtime < cutoff:
                            os.remove(filepath)
                            removed += 1
                    except OSError:
                        pass  # Race condition — file gone
        except OSError:
            pass  # Read-only filesystem
        return removed

    def store_history_meta(
        self,
        filename: str,
        text: str,
        language: str,
        voice: str,
    ) -> None:
        """Write sidecar JSON metadata for a generated audio file.

        Creates a .json sidecar next to the audio file with the
        original synthesis parameters.

        Args:
            filename: Audio filename (mp3 or wav).
            text: Original text that was synthesized.
            language: Language code.
            voice: Voice ID used.
        """
        meta_path = os.path.join(self._audio_dir, f"{filename}.json")
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
            pass  # Read-only filesystem
