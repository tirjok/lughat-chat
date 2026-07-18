"""Voice resolution helper.

Resolves the effective voice ID from a ``SynthesisRequest``:
``speaker ?? voice ?? first_discovered ?? "female"``.
"""

from __future__ import annotations


def resolve_voice(
    voice: str | None,
    speaker: str | None,
    speaker_wav_dir: str,
) -> str:
    """Resolve the effective voice ID for synthesis.

    Priority:
      1. ``speaker`` field (explicit override).
      2. ``voice`` field.
      3. First discovered voice from ``speaker_wavs/`` (alphabetically).
      4. Fallback to ``"female"`` for backwards compatibility.

    Parameters
    ----------
    voice : str or None
        The ``voice`` field from ``SynthesisRequest``.
    speaker : str or None
        The ``speaker`` field (alias for ``voice``).
    speaker_wav_dir : str
        Directory containing speaker reference WAV files.

    Returns
    -------
    str
        The resolved voice ID string.
    """
    from tts.audio_pipeline import _discover_voices

    effective = speaker if speaker else (voice or None)
    if effective:
        return effective
    discovered = _discover_voices(speaker_wav_dir)
    return discovered[0]["id"] if discovered else "female"
