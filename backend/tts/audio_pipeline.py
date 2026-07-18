"""Audio pipeline helpers — file I/O for TTS output.

Contains pure utility functions used by ``TtsEngine.synthesize()``:
  - ``_discover_voices``: scan speaker_wavs/ for .wav files.
  - ``_cleanup_audio_dir``: remove oldest files beyond MAX limit.
"""

from __future__ import annotations

import os


def _discover_voices(directory: str) -> list[dict]:
    """Scan directory for .wav files and return voice entries.

    Each discovered file produces a voice entry:
    ``{ id: filename_without_extension, name: filename_without_extension }``.
    Non-.wav files are ignored. Returns empty list if directory doesn't exist.

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
            name = filename[:-4]  # strip .wav extension
            voices.append({"id": name, "name": name})
    return voices


def _cleanup_audio_dir(audio_dir: str, max_files: int) -> None:
    """Delete oldest audio files beyond ``max_files`` limit.

    Removes both MP3/WAV files and their corresponding sidecar
    ``.meta.json`` files.

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
