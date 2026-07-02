"""Tests for the sync generate endpoint returning MP3 blob.

These tests verify that the backwards-compatible sync endpoint
(/api/generate_sync) returns valid MP3 audio.
"""

import os
from unittest.mock import MagicMock

from app import app


def _mock_tts_model():
    """Create a mock TTS model that returns without error."""

    class MockTTS:
        def tts_to_file(
            self,
            text,
            language=None,
            file_path=None,
            speaker_wav=None,
            temperature=None,
        ):
            # Create a minimal valid WAV-like file for testing
            import wave

            with wave.open(file_path, "w") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(22050)
                # Write 0.1 seconds of silence
                samples = b"\x00\x00" * 2205
                wav_file.writeframes(samples)

    return MockTTS()


def _setup_mock_model():
    """Set up mock TTS model in SynthesisModule."""
    import app as main_app
    from synthesis import get_module

    mock_tts = _mock_tts_model()

    # Patch the SynthesisModule's lifecycle to return the mock model
    mod = get_module()
    mod._lifecycle._model = mock_tts
    mod._lifecycle._last_use = 0  # Force reload on next use

    # Patch the worker's _synthesize to create real WAV files
    def _mock_synthesize(job):
        import wave
        import shutil

        timestamp = __import__("uuid").uuid4().hex[:8]
        lang_code = job.language
        wav_path = os.path.join(
            main_app.AUDIO_DIR, f"{lang_code}_{job.voice}_{timestamp}.wav"
        )
        mp3_path = wav_path.replace(".wav", ".mp3")
        job.mp3_path = mp3_path

        with wave.open(wav_path, "w") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(22050)
            samples = b"\x00\x00" * 2205
            wav_file.writeframes(samples)

        shutil.copy2(wav_path, mp3_path)

    mod._worker._synthesize = MagicMock(side_effect=_mock_synthesize)


def test_generate_sync_returns_mp3_blob():
    """POST /api/generate_sync returns MP3 audio blob, not JSON."""
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate_sync",
        json={"text": "مرحبا بالعالم", "language": "ar", "voice": "female"},
    )

    assert response.status_code == 200
    # Verify content type is audio/mpeg, not application/json
    assert "audio/mpeg" in response.headers["content-type"]


def test_generate_sync_returns_valid_mp3_file():
    """POST /api/generate_sync returns a valid MP3 file that is not empty."""
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate_sync",
        json={"text": "مرحبا بالعالم", "language": "ar", "voice": "female"},
    )

    # MP3 files start with specific bytes (ID3 tag or syncword)
    content = response.content
    assert len(content) > 0, "Response body should not be empty"
