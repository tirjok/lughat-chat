"""Synthesis — deep module for the TTS synthesis pipeline.

Handles the complete synthesis lifecycle:
  1. Resolve voice from request parameters
  2. Validate speaker WAV exists and meets duration requirement
  3. Run TTS inference (write intermediate WAV)
  4. Convert WAV to MP3 via FFmpeg (with fallback)
  5. Clean up intermediate files

This is a **deep module**: one interface (`Synthesis.generate()`),
one place to test. The implementation absorbs all error handling,
FFmpeg fallback logic, orphan cleanup, and seed management.
"""

from __future__ import annotations

import os
import subprocess
import uuid
from fastapi.responses import FileResponse
import wave
from fastapi import HTTPException
from typing import Optional

# Minimum reference audio duration for XTTS-v2 voice cloning (seconds)
XTTS_MIN_REFERENCE_DURATION = 0.33


def _validate_speaker_wav(wav_path: str) -> None:
    """Validate that a speaker WAV file meets XTTS-v2 minimum duration.

    Raises HTTPException with 500 status if validation fails.

    Args:
        wav_path: Absolute path to the speaker WAV file.

    Raises:
        HTTPException: If file is too short (< 0.33s) or unreadable.
    """

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
                    f"reference audio. Regenerate speaker_wavs/{os.path.basename(wav_path)} "
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


class Synthesis:
    """Deep module for speech synthesis.

    One interface: ``generate()``.
    The implementation absorbs: voice resolution, speaker validation,
    TTS inference, FFmpeg conversion, orphan file cleanup.
    """

    def __init__(
        self,
        tts_model: object,
        audio_dir: str,
        speaker_wav_dir: str,
    ) -> None:
        """Create a Synthesis module.

        Args:
            tts_model: The loaded TTS model instance.
            audio_dir: Directory for storing generated audio files.
            speaker_wav_dir: Directory containing speaker reference WAV files.
        """
        self._tts_model = tts_model
        self._audio_dir = audio_dir
        self._speaker_wav_dir = speaker_wav_dir

    def generate(
        self,
        text: str,
        language: str,
        voice: Optional[str] = None,
        speaker: Optional[str] = None,
        speed: float = 1.0,
        pitch: float = 0.0,
        seed: Optional[int] = None,
    ) -> FileResponse:
        """Execute the full synthesis pipeline and return an MP3 FileResponse.

        This is the Synthesis module's single interface. All complexity —
        voice resolution, speaker validation, TTS inference, FFmpeg
        conversion, intermediate file cleanup — lives here.

        Args:
            text: Arabic or English text to synthesize.
            language: Language code ("ar" or "en").
            voice: Voice ID (alias for speaker).
            speaker: Voice ID (preferred over voice).
            speed: Playback speed (0.5–2.0).
            pitch: Pitch adjustment (-4.0–4.0).
            seed: Deterministic seed for reproducible output.

        Returns:
            FastAPI FileResponse with audio/mpeg content.

        Raises:
            HTTPException: If speaker not found, model unavailable,
                          or synthesis fails.
        """
        from fastapi.responses import FileResponse

        # Voice resolution: speaker takes precedence, then voice, then "KSA Zariyah - Female"
        resolved_voice = speaker if speaker else (voice or "KSA Zariyah - Female")

        timestamp = uuid.uuid4().hex[:8]
        lang_code = language
        filename = f"{lang_code}_{resolved_voice}_{timestamp}.mp3"
        wav_path = os.path.join(
            self._audio_dir, f"{lang_code}_{resolved_voice}_{timestamp}.wav"
        )
        mp3_path = os.path.join(self._audio_dir, filename)

        # Track all intermediate files for cleanup on failure
        intermediate_files: list[str] = []

        try:
            print(f"Generating speech: {text[:50]}...")

            # Resolve speaker WAV path
            speaker_wav = os.path.join(self._speaker_wav_dir, f"{resolved_voice}.wav")

            if not os.path.exists(speaker_wav):
                raise HTTPException(
                    status_code=500,
                    detail=(
                        f"Speaker WAV file not found for voice "
                        f"'{resolved_voice}' (expected at '{speaker_wav}'). "
                        f"Add it to speaker_wavs/."
                    ),
                )

            # Validate speaker WAV duration
            _validate_speaker_wav(speaker_wav)

            # Set deterministic seed
            actual_seed = seed if seed is not None else 42

            # Apply PyTorch seed (Coqui TTS v0.22+ XTTS doesn't accept seed)
            try:
                import torch

                torch.manual_seed(actual_seed)
            except ImportError:
                pass  # torch not available (e.g. in tests)

            # Run TTS inference → intermediate WAV
            self._tts_model.tts_to_file(
                text=text,
                speaker_wav=speaker_wav,
                language=language,
                file_path=wav_path,
                temperature=0.4,
            )

            if not os.path.exists(wav_path):
                raise HTTPException(status_code=500, detail="Failed to generate audio")

            intermediate_files.append(wav_path)

            # Convert WAV to MP3 via FFmpeg (with fallback)
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
            except subprocess.CalledProcessError as e:
                print(f"FFmpeg error: {e.stderr}")
                # Fallback: copy WAV with .mp3 extension
                import shutil

                shutil.copy2(wav_path, mp3_path)

            # Clean up intermediate files
            for f in intermediate_files:
                try:
                    os.remove(f)
                except OSError:
                    pass  # Already gone (race condition)

            # Return MP3 file as binary response
            return FileResponse(
                path=mp3_path,
                media_type="audio/mpeg",
                filename=filename,
            )

        except HTTPException:
            # On error: clean up any intermediate files that were created
            for f in intermediate_files:
                try:
                    os.remove(f)
                except OSError:
                    pass
            raise
        except Exception as e:
            # Clean up on any failure
            for f in intermediate_files:
                try:
                    os.remove(f)
                except OSError:
                    pass
            print(f"Error generating speech: {e}")
            raise HTTPException(status_code=500, detail=str(e))
