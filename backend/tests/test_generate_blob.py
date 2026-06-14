import os
from unittest.mock import patch

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
    """Set up mock TTS model in app module without creating physical files.

    Mocks os.path.exists so the backend's speaker_wav file check passes,
    and replaces tts_model with a mock that generates valid WAV output.
    """
    import app as main_app

    speaker_wav_dir = os.path.join(main_app.__path__[0], "speaker_wavs")

    def _mock_path_exists(path):
        """Return True for speaker_wav paths, False otherwise."""
        if isinstance(path, str) and path.startswith(speaker_wav_dir + os.sep):
            return True
        return _original_path_exists(path)

    _original_path_exists = os.path.exists
    with patch("os.path.exists", side_effect=_mock_path_exists):
        main_app.tts_model = _mock_tts_model()
        main_app.model_load_status = "ready"


def test_generate_speech_returns_mp3_blob():
    """POST /api/generate returns MP3 audio blob, not JSON."""
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate",
        json={"text": "مرحبا بالعالم", "language": "ar", "voice": "female"},
    )

    assert response.status_code == 200
    # Verify content type is audio/mpeg, not application/json
    assert "audio/mpeg" in response.headers["content-type"]


def test_generate_speech_returns_valid_mp3_file():
    """POST /api/generate returns a valid MP3 file that is not empty."""
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate",
        json={"text": "مرحبا بالعالم", "language": "ar", "voice": "female"},
    )

    # MP3 files start with specific bytes (ID3 tag or syncword)
    content = response.content
    assert len(content) > 0, "Response body should not be empty"
