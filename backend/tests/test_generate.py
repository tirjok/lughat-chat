import os

from app import app

# Capture the real wave.open before any patching.  app.py does 'import wave'
# so app.wave and the local import are the SAME module object — patching
# main_app.wave.open would also clobber the local reference.  We save the
# original function here so the mocks can always call the real one.
import wave as _real_wave_module

_ORIGINAL_WAVE_OPEN = _real_wave_module.open


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


def _make_mock_wav():
    """Build a mock WAV file object for _validate_speaker_wav.

    Uses a real class (not MagicMock) to avoid recursion issues when
    used as a context manager with `with wave.open(...)`.
    """

    class _MockWavFile:
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

    return _MockWavFile()


def _setup_mock_model():
    """Set up mock TTS model in app module without creating physical files.

    Mocks os.path.exists so the backend's speaker_wav file check passes,
    and mocks wave.open for reading (used by _validate_speaker_wav) while
    letting the TTS mock write real WAV files to disk.
    """
    import app as main_app

    _mock_wav = _make_mock_wav()

    def _mock_path_exists(path):
        # Always return True — we control the entire filesystem via mocks.
        return True

    def _mock_wave_open(path, mode="r"):
        if mode == "w":
            # For writing (TTS mock writes real WAV files to disk), use the
            # captured real wave.open (not the patched main_app.wave.open).
            return _ORIGINAL_WAVE_OPEN(path, mode)
        # For reading (_validate_speaker_wav), return the mock
        return _mock_wav

    # Patch at module level so the mock persists beyond the test function scope.
    main_app.os.path.exists = _mock_path_exists
    main_app.wave.open = _mock_wave_open
    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"


def test_generate_speech_requires_text():
    """POST /api/generate returns 422 when text is missing."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate", json={})

    assert response.status_code == 422


def test_generate_speech_rejects_empty_text():
    """POST /api/generate returns 422 when text is empty string."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate", json={"text": ""})

    assert response.status_code == 422


def test_generate_speech_rejects_text_too_long():
    """POST /api/generate returns 422 when text exceeds max length."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    long_text = "x" * 3001
    response = client.post("/api/generate", json={"text": long_text})

    assert response.status_code == 422


def test_generate_speech_rejects_invalid_language():
    """POST /api/generate returns 422 when language is not ar or en."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate", json={"text": "Hello world", "language": "fr"}
    )

    assert response.status_code == 422


def test_generate_speech_rejects_missing_voice_file():
    """POST /api/generate returns 500 when voice has no corresponding WAV file."""
    import app as main_app

    # Restore the real os.path.exists (previous tests may have patched it).
    main_app.os.path.exists = os.path.exists
    # The Docker container does not have a 'robot.wav' in speaker_wavs/.
    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate", json={"text": "Hello world", "voice": "robot"}
    )

    assert response.status_code == 500
    data = response.json()
    assert "robot" in data["detail"]


def test_generate_speech_rejects_speed_too_low():
    """POST /api/generate returns 422 when speed is below minimum."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate", json={"text": "Hello world", "speed": 0.1})

    assert response.status_code == 422


def test_generate_speech_rejects_speed_too_high():
    """POST /api/generate returns 422 when speed is above maximum."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate", json={"text": "Hello world", "speed": 3.0})

    assert response.status_code == 422


def test_generate_speech_rejects_pitch_too_low():
    """POST /api/generate returns 422 when pitch is below minimum."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate", json={"text": "Hello world", "pitch": -5.0})

    assert response.status_code == 422


def test_generate_speech_rejects_pitch_too_high():
    """POST /api/generate returns 422 when pitch is above maximum."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate", json={"text": "Hello world", "pitch": 5.0})

    assert response.status_code == 422


def test_generate_speech_returns_503_when_model_not_ready():
    """POST /api/generate returns 503 when TTS model is not loaded."""
    import app as main_app

    main_app.tts_model = None
    main_app.model_load_status = "loading"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate", json={"text": "Hello world"})

    assert response.status_code == 503


def test_generate_speech_returns_valid_response_on_success():
    """POST /api/generate returns MP3 audio blob on success."""
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate",
        json={"text": "مرحبا بالعالم", "language": "ar", "voice": "female"},
    )

    assert response.status_code == 200
    # Verify content type is audio/mpeg, not JSON
    assert "audio/mpeg" in response.headers["content-type"]
    # Verify response is non-empty binary data
    assert len(response.content) > 0
    # Verify it starts with MP3 ID3 tag or syncword
    assert response.content[:4] in [b"ID3\x03", b"ID3\x04", b"\xff\xfb"]


def test_generate_speech_accepts_default_parameters():
    """POST /api/generate works with minimal request (only text required) and returns MP3 blob."""
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate", json={"text": "Hello"})

    assert response.status_code == 200
    assert "audio/mpeg" in response.headers["content-type"]
    assert len(response.content) > 0


def test_generate_speech_with_custom_voice_works():
    """POST /api/generate accepts a custom voice name and generates speech when the WAV file exists."""
    import app as main_app
    from fastapi.testclient import TestClient

    _mock_wav = _make_mock_wav()

    def _mock_path_exists(path):
        # Always return True — we control the entire filesystem via mocks.
        return True

    def _mock_wave_open(path, mode="r"):
        if mode == "w":
            return _ORIGINAL_WAVE_OPEN(path, mode)
        return _mock_wav

    # Patch at module level so the mock persists beyond the 'with' block.
    main_app.os.path.exists = _mock_path_exists
    main_app.wave.open = _mock_wave_open
    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"

    client = TestClient(app)

    response = client.post(
        "/api/generate", json={"text": "Hello world", "voice": "custom_voice"}
    )

    assert response.status_code == 200
    assert "audio/mpeg" in response.headers["content-type"]


def test_generate_speech_missing_voice_file_includes_filename():
    """POST /api/generate returns 500 with the missing filename in detail message."""
    import app as main_app

    # Restore the real os.path.exists and wave.open (previous tests may have
    # patched them).  The patched wave.open returns a mock that passes
    # _validate_speaker_wav even for non-existent files, so we must restore
    # the real one to properly test the missing-voice error path.
    main_app.os.path.exists = os.path.exists
    main_app.wave.open = _ORIGINAL_WAVE_OPEN
    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate", json={"text": "Hello world", "voice": "nonexistent_voice"}
    )

    assert response.status_code == 500
    data = response.json()
    assert "nonexistent_voice" in data["detail"]


def test_generate_speech_accepts_english_language():
    """POST /api/generate accepts English text and returns MP3 blob."""
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate", json={"text": "Hello world", "language": "en"}
    )

    assert response.status_code == 200
    assert "audio/mpeg" in response.headers["content-type"]
    assert len(response.content) > 0
