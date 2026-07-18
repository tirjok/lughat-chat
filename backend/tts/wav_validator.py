"""WAV duration validator for XTTS-v2 voice cloning.

Exports ``validate_duration`` which raises ``HTTPException(500)`` when
the reference audio is shorter than the XTTS-v2 minimum (0.33 s).
"""

from __future__ import annotations

import wave
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass

XTTS_MIN_REFERENCE_DURATION = 0.33


def validate_duration(wav_path: str) -> None:
    """Validate that a speaker WAV file meets XTTS-v2 minimum duration.

    Raises ``HTTPException(status_code=500)`` if the file is too short
    or cannot be read.

    Parameters
    ----------
    wav_path : str
        Absolute path to the WAV file.
    """
    import os
    from fastapi import HTTPException

    try:
        with wave.open(wav_path) as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            duration = frames / rate
        if duration < XTTS_MIN_REFERENCE_DURATION:
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Speaker WAV file '{wav_path}' is too short "
                    f"({duration:.2f}s). XTTS-v2 requires at least "
                    f"{XTTS_MIN_REFERENCE_DURATION}s of reference audio. "
                    f"Regenerate speaker_wavs/{os.path.basename(wav_path)} "
                    f"with longer text."
                ),
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate speaker WAV file '{wav_path}': {e}",
        )
