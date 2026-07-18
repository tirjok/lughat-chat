"""Storage helpers — sidecar file I/O and cleanup.

These are pure utility functions used by ``StorageService``.

Functions
---------
write_sidecar(audio_dir, metadata) → str
    Write a sidecar ``{timestamp}.meta.json`` file next to the MP3.
read_sidecar(audio_dir, timestamp) → dict | None
    Read a sidecar file; returns ``None`` if not found.
cleanup_audio_dir(audio_dir, max_files) → None
    Remove oldest files beyond the limit.
discover_voices(directory) → list[dict]
    Scan directory for .wav files.
"""

from __future__ import annotations

import json
import os
from typing import Optional


def write_sidecar(audio_dir: str, metadata: dict) -> str:
    """Write a sidecar ``{timestamp}.meta.json`` file next to the MP3.

    The sidecar file stores the original text and synthesis parameters
    so that ``GET /api/history`` can return the text without parsing
    the filename.

    Parameters
    ----------
    audio_dir : str
        Directory containing the MP3 file.
    metadata : dict
        ``{text, language, voice, speed, pitch, seed, created_at,
          mp3_filename}``.

    Returns
    -------
    str
        Path to the written sidecar file.
    """
    mp3_filename = metadata.get("mp3_filename", "")
    parts = mp3_filename.split("_")
    if len(parts) >= 3:
        timestamp = parts[-1][:-4]  # strip .mp3
    else:
        timestamp = os.path.splitext(mp3_filename)[0]

    meta_filename = f"{timestamp}.meta.json"
    meta_path = os.path.join(audio_dir, meta_filename)
    with open(meta_path, "w") as f:
        json.dump(metadata, f)
    return meta_path


def read_sidecar(audio_dir: str, timestamp: str) -> Optional[dict]:
    """Read a sidecar ``{timestamp}.meta.json`` file.

    Parameters
    ----------
    audio_dir : str
        Directory containing the sidecar file.
    timestamp : str
        Timestamp extracted from the MP3 filename.

    Returns
    -------
    dict or None
        The metadata dict if found, ``None`` otherwise.
    """
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
            return None
    return None


def cleanup_audio_dir(audio_dir: str, max_files: int) -> None:
    """Delete oldest audio files beyond ``max_files`` limit.

    Removes both MP3/WAV files and their corresponding sidecar
    ``.meta.json`` files.  Silently ignores all errors.

    Parameters
    ----------
    audio_dir : str
        Directory containing audio files.
    max_files : int
        Maximum number of audio files to keep.
    """
    try:
        if not os.path.isdir(audio_dir):
            return

        all_files = os.listdir(audio_dir)
        audio_files = [
            f
            for f in all_files
            if f.endswith((".mp3", ".wav")) and "_" in f and f.count("_") >= 2
        ]

        if len(audio_files) <= max_files:
            return

        audio_files.sort(
            key=lambda f: os.path.getmtime(os.path.join(audio_dir, f)),
            reverse=True,
        )

        for old_file in audio_files[max_files:]:
            old_file_path = os.path.join(audio_dir, old_file)
            try:
                os.remove(old_file_path)
            except OSError:
                pass

            parts = old_file.split("_")
            if len(parts) >= 3:
                timestamp = parts[-1].rsplit(".", 1)[0]
                sidecar_filename = f"{timestamp}.meta.json"
                sidecar_path = os.path.join(audio_dir, sidecar_filename)
                try:
                    os.remove(sidecar_path)
                except OSError:
                    pass

    except Exception:
        pass  # Silently ignore cleanup errors


def _discover_voices(directory: str) -> list[dict]:
    """Scan directory for .wav files and return voice entries.

    Parameters
    ----------
    directory : str
        Path to the speaker_wavs directory.

    Returns
    -------
    list[dict]
        ``[{id, name}, ...]`` sorted alphabetically.
    """
    voices = []
    if not os.path.isdir(directory):
        return voices
    for filename in sorted(os.listdir(directory)):
        if filename.endswith(".wav"):
            name = filename[:-4]
            voices.append({"id": name, "name": name})
    return voices
