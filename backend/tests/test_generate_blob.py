import os
import wave as _real_wave_module

from app import app

_ORIGINAL_WAVE_OPEN = _real_wave_module.open
_ORIGINAL_WAVE_MODULE = _real_wave_module


def _mock_tts_model():
    """Create a mock TTS model that returns without error."""

    class MockTTS:
        def tts_to_file(
            self,
            text=None,
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

    return MockTTS()


def _make_mock_wav():
    """Build a real object (not MagicMock) that looks like a valid WAV file for _validate_speaker_wav."""

    class _MockReadWav:
        """A real object that looks like a WAV file for validation."""

        def __init__(self):
            self._nframes = int(22050 * 0.5)
            self._rate = 22050
            self._nchannels = 1
            self._sampwidth = 2

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def getnframes(self):
            return self._nframes

        def getframerate(self):
            return self._rate

        def getnchannels(self):
            return self._nchannels

        def getsampwidth(self):
            return self._sampwidth

    return _MockReadWav()


def _setup_mock_model():
    """Set up mock TTS model in deep modules without creating physical files.

    Patches the deep module instances directly: tts_model_manager (ModelManager).
    Also patches module-level os.path.exists and wave.open used by synthesis.py.
    """
    import app as main_app
    from model_manager import ModelManager
    import sys

    mock_tts = _mock_tts_model()
    _mock_read_wav = _make_mock_wav()

    def _mock_path_exists(path):
        # Always return True — we control the entire filesystem via mocks.
        return True

    def _mock_wave_open(path, mode="r"):
        if mode == "w":
            # For writing (TTS mock writes real WAV files to disk), use the
            # captured real wave.open (not the patched main_app.wave.open).
            return _ORIGINAL_WAVE_OPEN(path, mode)
        # For reading (_validate_speaker_wav), return the mock
        return _mock_read_wav

    # Patch at module level so the mock persists beyond the test function scope.
    main_app.os.path.exists = _mock_path_exists
    main_app.wave.open = _mock_wave_open
    mm = ModelManager(TTS_class=None, cache_dir="/tmp/tts_cache")
    mm._model = mock_tts
    mm._status = "ready"
    main_app.tts_model_manager = mm

    # Also patch synthesis_module so it uses our mock model
    from synthesis import Synthesis
    main_app.synthesis_module = Synthesis(
        tts_model=mm._model,
        audio_dir=main_app.AUDIO_DIR,
        speaker_wav_dir=main_app.SPEAKER_WAV_DIR,
    )

    return lambda: (setattr(main_app, 'wave', _ORIGINAL_WAVE_MODULE),
                    setattr(__import__('synthesis'), 'wave', _ORIGINAL_WAVE_MODULE),
                    setattr(sys.modules['wave'], 'open', _ORIGINAL_WAVE_OPEN))

def test_generate_speech_returns_mp3_blob():
    """POST /api/generate returns MP3 audio blob, not JSON."""
    cleanup = _setup_mock_model()
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate",
        json={"text": "مرحبا بالعالم", "language": "ar", "voice": "female"},
    )

    assert response.status_code == 200
    # Verify content type is audio/mpeg, not application/json
    assert "audio/mpeg" in response.headers["content-type"]
    cleanup()


def test_generate_speech_returns_valid_mp3_file():
    """POST /api/generate returns a valid MP3 file that is not empty."""
    cleanup = _setup_mock_model()
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate",
        json={"text": "مرحبا بالعالم", "language": "ar", "voice": "female"},
    )

    content = response.content
    assert len(content) > 0, "Response body should not be empty"
    cleanup()
