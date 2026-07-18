"""TTS Module — Text-to-Speech engine wrapper.

Exports ``TtsEngine`` which encapsulates:
  - Background model loading (via ``lifespan`` module).
  - Health status reporting.
  - Speech synthesis (voice resolution, WAV validation, XTTS inference,
    ffmpeg conversion, sidecar writing, cleanup).
  - Voice discovery from the speaker_wavs directory.

Usage::

    from tts import TtsEngine

    engine = TtsEngine(model_cache_dir, speaker_wav_dir)
    status = engine.health()
    result = engine.synthesize(text="مرحبا", language="ar", voice="female")
    voices = engine.discover_voices()
"""

from __future__ import annotations

import os
import subprocess
import uuid
from dataclasses import dataclass
from typing import Optional


@dataclass
class AudioResult:
    """Return type for ``TtsEngine.synthesize()``."""

    mp3_path: str
    filename: str
    duration: float


# ---------------------------------------------------------------------------
# Constants (imported from config by the engine)
# ---------------------------------------------------------------------------

XTTS_MIN_REFERENCE_DURATION = 0.33


def _validate_speaker_wav(wav_path: str) -> None:
    """Validate that a speaker WAV file meets XTTS-v2 minimum duration requirement.

    Raises HTTPException (status 500) if the file is too short.
    """
    import wave
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
                    f"Speaker WAV file '{wav_path}' is too short ({duration:.2f}s). "
                    f"XTTS-v2 requires at least {XTTS_MIN_REFERENCE_DURATION}s of "
                    f"reference audio. "
                    f"Regenerate speaker_wavs/{os.path.basename(wav_path)} with "
                    f"longer text."
                ),
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate speaker WAV file '{wav_path}': {e}",
        )


def _ensure_torch() -> None:
    """Ensure torch is imported and patched for CPU-only environments.

    No-op if torch is not installed (e.g. in test environments).
    Silently skips if already patched.
    """
    global _torch_loaded
    if _torch_loaded:
        return
    try:
        import torch
        import transformers.pytorch_utils as _pytorch_utils

        if not hasattr(_pytorch_utils, "isin_mps_friendly"):

            def _isin_mps_friendly(elements, test_elements, **kwargs):
                return torch.isin(elements, test_elements)

            _pytorch_utils.isin_mps_friendly = _isin_mps_friendly

        global _original_load_library

        def _patched_load_library(path):
            try:
                return _original_load_library(path)
            except OSError as e:
                error_str = str(e)
                if "libnvrtc" in error_str or "libcuda" in error_str:
                    return None
                if "libtorchcodec" in path or "libtorchcodec" in error_str:
                    return None
                raise

        import torch.ops  # noqa: F401

        if hasattr(torch.ops, "load_library"):
            _original_load_library = torch.ops.load_library
            torch.ops.load_library = _patched_load_library
    except ImportError:
        pass  # torch not available — acceptable in test environments
    _torch_loaded = True


_torch_loaded = False

# Lazy import Coqui TTS (skip if torch not available).
try:
    from TTS.api import TTS as _TTSClass
except ImportError:
    _TTSClass = None  # type: ignore[misc, assignment]


class TtsEngine:
    """High-level TTS engine interface.

    Parameters
    ----------
    model_cache_dir : str
        Directory where the XTTS model is cached.
    speaker_wav_dir : str
        Directory containing speaker reference WAV files.

    Attributes
    ----------
    model : TTS | None
        The loaded Coqui TTS model (``None`` until loaded).
    status : str
        One of ``"loading"``, ``"ready"``, ``"error"``.
    """

    def __init__(self, model_cache_dir: str, speaker_wav_dir: str) -> None:
        self.model_cache_dir = model_cache_dir
        self.speaker_wav_dir = speaker_wav_dir
        self.model: Optional[_TTSClass] = None  # type: ignore[assignment]
        self.status: str = "loading"
        self._torch_loaded = False
        # Ensure torch patches are applied (lazy, safe in tests).
        _ensure_torch()

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def health(self) -> dict:
        """Return current TTS engine health status.

        Returns
        -------
        dict
            ``{"status": "ready"|"loading"|"error", "model_loaded": bool,
              "model_name": "XTTS-v2", "sub_status": str}``
        """
        return {
            "status": self.status,
            "model_loaded": self.model is not None and self.status == "ready",
            "model_name": "XTTS-v2",
            "sub_status": "initializing" if self.status == "loading" else "",
        }

    def load_model(self) -> None:
        """Load the XTTS-v2 model.

        Sets ``self.status`` to ``"ready"`` on success or ``"error"`` on
        failure.  Idempotent — calling twice when already loaded is a no-op.
        """
        if self.model is not None:
            return  # Already loaded
        if _TTSClass is None:
            self.status = "error"
            return
        try:
            os.environ["COQUI_TTS_CACHE"] = self.model_cache_dir
            self.model = _TTSClass("tts_models/multilingual/xtts_v2")
            self.status = "ready"
        except Exception as e:
            self.status = "error"
            print(f"Error loading TTS model: {e}")

    def synthesize(
        self,
        text: str,
        language: str,
        voice: str,
        speed: float,
        pitch: float,
        seed: int,
        audio_dir: str,
        max_audio_files: int,
        write_sidecar_fn=None,  # callable(audio_dir, metadata) -> str
    ) -> AudioResult:
        """Generate speech from text and return an ``AudioResult``.

        Parameters
        ----------
        text : str
            Arabic or English text to synthesize.
        language : str
            ``"ar"`` or ``"en"``.
        voice : str
            Voice ID (e.g. ``"KSA Hamed - Male"``).
        speed : float
            Playback speed (0.5–2.0).
        pitch : float
            Pitch shift (-4.0–4.0).
        seed : int
            Deterministic seed (default 42).
        audio_dir : str
            Directory where generated audio files are stored.
        max_audio_files : int
            Maximum number of audio files before cleanup kicks in.
        write_sidecar_fn : callable, optional
            Function to write sidecar metadata files.

        Returns
        -------
        AudioResult
            ``{mp3_path, filename, duration}``

        Raises
        ------
        HTTPException
            503 if model not ready, 500 if speaker WAV not found or
            generation fails.
        """
        from fastapi import HTTPException

        if self.model is None or self.status != "ready":
            raise HTTPException(status_code=503, detail="TTS model not ready")

        timestamp = uuid.uuid4().hex[:8]
        lang_code = language
        filename = f"{lang_code}_{voice}_{timestamp}.mp3"
        wav_path = os.path.join(audio_dir, f"{lang_code}_{voice}_{timestamp}.wav")
        mp3_path = os.path.join(audio_dir, filename)
        speaker_wav = os.path.join(self.speaker_wav_dir, f"{voice}.wav")

        # Locate and validate speaker WAV.
        if not os.path.exists(speaker_wav):
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Speaker WAV file not found for voice '{voice}' "
                    f"(expected at '{speaker_wav}'). Add it to speaker_wavs/."
                ),
            )
        _validate_speaker_wav(speaker_wav)

        print(f"Generating speech: {text[:50]}...")

        # Deterministic seed at PyTorch level.
        try:
            import torch

            torch.manual_seed(seed)
        except ImportError:
            pass

        self.model.tts_to_file(
            text=text,
            speaker_wav=speaker_wav,
            language=language,
            file_path=wav_path,
            temperature=0.4,
        )

        if not os.path.exists(wav_path):
            raise HTTPException(status_code=500, detail="Failed to generate audio")

        # Convert WAV → MP3 via ffmpeg.
        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    wav_path,
                    "-filter:a",
                    f"atempo={speed}",
                    "-b:a",
                    "192k",
                    mp3_path,
                ],
                check=True,
                capture_output=True,
            )
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            stderr = e.stderr if isinstance(e, subprocess.CalledProcessError) else b""
            print(f"FFmpeg error: {stderr}")
            # Fallback: return WAV.
            return AudioResult(
                mp3_path=wav_path,
                filename=f"{lang_code}_{voice}_{timestamp}.wav",
                duration=0.0,
            )

        # Clean up intermediate WAV (5–10× larger than MP3).
        try:
            os.remove(wav_path)
        except OSError:
            pass

        # Write sidecar metadata.
        if write_sidecar_fn:
            meta = {
                "text": text,
                "language": language,
                "voice": voice,
                "speed": speed,
                "pitch": pitch,
                "seed": seed,
                "created_at": timestamp,
                "mp3_filename": filename,
            }
            write_sidecar_fn(audio_dir, meta)

        # Cleanup old files beyond limit.
        from tts.audio_pipeline import _cleanup_audio_dir

        _cleanup_audio_dir(audio_dir, max_audio_files)

        return AudioResult(
            mp3_path=mp3_path,
            filename=filename,
            duration=0.0,  # Would need ffprobe for real duration
        )

    def discover_voices(self) -> list[dict]:
        """Return list of voices discovered from the speaker_wavs directory.

        Returns
        -------
        list[dict]
            ``[{id, name}, ...]`` sorted alphabetically by name.
        """
        from tts.audio_pipeline import _discover_voices

        return _discover_voices(self.speaker_wav_dir)
