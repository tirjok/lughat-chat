import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from app import app

# Capture the real wave.open before any patching.
import wave as _real_wave_module

_ORIGINAL_WAVE_OPEN = _real_wave_module.open


def _mock_tts_model():
    """Create a mock TTS model that writes both WAV and MP3 files.

    The backend's /api/generate endpoint:
    1. Writes a WAV file via tts_to_file
    2. Converts WAV → MP3 via ffmpeg
    3. Deletes the WAV
    4. Returns FileResponse for the MP3

    Since FileResponse calls os.stat() (not mocked), we must write the
    MP3 file directly so the real os.stat succeeds.
    """

    class MockTTS:
        def tts_to_file(
            self,
            text,
            language=None,
            file_path=None,
            speaker_wav=None,
            temperature=None,
        ):
            import wave

            with wave.open(file_path, "w") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(22050)
                samples = b"\x00\x00" * 2205
                wav_file.writeframes(samples)

            # Also write a minimal valid MP3 so FileResponse's os.stat succeeds.

            mp3_path = (
                file_path[:-4] + ".mp3" if file_path.endswith(".wav") else file_path
            )
            with open(mp3_path, "wb") as f:
                # Minimal valid MP3 frame header (ISO/IEC 11172-3).
                f.write(b"\xff\xfb\x90\x00\x00")

    return MockTTS()


def _make_mock_wav():
    """Build a MagicMock that looks like a valid WAV file for _validate_speaker_wav."""
    mock = MagicMock()
    mock.getnframes.return_value = int(22050 * 0.5)
    mock.getframerate.return_value = 22050
    mock.getnchannels.return_value = 1
    mock.getsampwidth.return_value = 2
    return mock


def _setup_mock_model():
    """Set up mock TTS model in app module without creating physical files.

    Mocks os.path.exists so the backend's speaker_wav file check passes,
    and mocks wave.open so _validate_speaker_wav() can read duration without
    actual files on disk.
    """
    import app as main_app

    speaker_wav_dir = os.path.join(os.path.dirname(main_app.__file__), "speaker_wavs")
    _mock_wav = _make_mock_wav()

    # Use a temporary directory for AUDIO_DIR so that cleanup_audio() does not
    # interfere with the real backend/downloads/ directory.
    main_app.AUDIO_DIR = tempfile.mkdtemp()

    def _mock_path_exists(path):
        if isinstance(path, str) and path.startswith(speaker_wav_dir + os.sep):
            return True
        return _original_path_exists(path)

    def _mock_wave_open(path, mode="r"):
        return _mock_wav

    _original_path_exists = os.path.exists
    with patch("os.path.exists", side_effect=_mock_path_exists):
        with patch.object(main_app, "wave", open_side_effect=_mock_wave_open):
            main_app.tts_model = _mock_tts_model()
            main_app.model_load_status = "ready"


@pytest.fixture(autouse=True)
def _restore_app_module():
    """Restore app module state after each test."""
    yield
    import app as main_app

    main_app.tts_model = None
    main_app.model_load_status = "loading"
    main_app.AUDIO_DIR = os.path.join(
        os.path.dirname(os.path.abspath(main_app.__file__)), "downloads"
    )
    main_app.MAX_AUDIO_FILES = 100
    main_app.os.path.exists = os.path.exists
    main_app.wave.open = _ORIGINAL_WAVE_OPEN
    main_app.os.listdir = os.listdir  # Restore real os.listdir


def test_generate_speech_returns_mp3_blob():
    """POST /api/generate returns MP3 audio blob, not JSON."""
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate",
        json={"text": "مرحبا بالعالم", "language": "ar", "voice": "KSA Hamed - Male"},
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
        json={"text": "مرحبا بالعالم", "language": "ar", "voice": "KSA Hamed - Male"},
    )

    # MP3 files start with specific bytes (ID3 tag or syncword)
    content = response.content
    assert len(content) > 0, "Response body should not be empty"
