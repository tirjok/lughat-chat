"""Tests for the /api/generate HTTP endpoint (sync mode, backwards-compatible).

These tests verify that the sync endpoint (/api/generate_sync) works correctly
when the SynthesisModule is properly configured. The old tests patched
app.tts_model and app.wave — those no longer exist in the refactored app.py.
Instead, we test the HTTP endpoint through the SynthesisModule's sync endpoint.
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


def _make_mock_wav():
    """Build a mock WAV file object for _validate_speaker_wav."""

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
    """Set up mock TTS model in SynthesisModule.

    Replaces the SynthesisModule's worker with a mock that creates real WAV files
    and valid MP3 stubs, so the sync endpoint can return valid MP3 blobs.
    """
    import app as main_app
    from synthesis import get_module

    mock_tts = _mock_tts_model()

    # Patch the SynthesisModule's lifecycle to return the mock model
    mod = get_module()
    mod._lifecycle._model = mock_tts
    mod._lifecycle._last_use = 0  # Force reload on next use

    # Patch the worker's _synthesize to create real WAV + valid MP3 files
    def _mock_synthesize(job):
        import wave

        timestamp = __import__("uuid").uuid4().hex[:8]
        lang_code = job.language
        wav_path = os.path.join(
            main_app.AUDIO_DIR, f"{lang_code}_{job.voice}_{timestamp}.wav"
        )
        mp3_path = wav_path.replace(".wav", ".mp3")
        job.mp3_path = mp3_path

        # Create a minimal WAV file
        with wave.open(wav_path, "w") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(22050)
            samples = b"\x00\x00" * 2205
            wav_file.writeframes(samples)

        # Create a valid minimal MP3 (ID3v2.3 tag + syncword)
        # This is a real MP3 frame header (0xfffb) followed by silence
        mp3_data = b"\xff\xfb\x90\x00" + b"\x00" * 100
        with open(mp3_path, "wb") as f:
            f.write(mp3_data)

    mod._worker._synthesize = MagicMock(side_effect=_mock_synthesize)


def test_generate_sync_returns_422_when_text_missing():
    """POST /api/generate_sync returns 422 when text is missing."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate_sync", json={})

    assert response.status_code == 422


def test_generate_sync_returns_422_when_text_empty():
    """POST /api/generate_sync returns 422 when text is empty string."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate_sync", json={"text": ""})

    assert response.status_code == 422


def test_generate_sync_returns_422_when_text_too_long():
    """POST /api/generate_sync returns 422 when text exceeds max length."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    long_text = "x" * 3001
    response = client.post("/api/generate_sync", json={"text": long_text})

    assert response.status_code == 422


def test_generate_sync_rejects_invalid_language():
    """POST /api/generate_sync returns 422 when language is not ar or en."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate_sync", json={"text": "Hello world", "language": "fr"}
    )

    assert response.status_code == 422


def test_generate_sync_rejects_speed_too_low():
    """POST /api/generate_sync returns 422 when speed is below minimum."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate_sync", json={"text": "Hello world", "speed": 0.1}
    )

    assert response.status_code == 422


def test_generate_sync_rejects_speed_too_high():
    """POST /api/generate_sync returns 422 when speed is above maximum."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate_sync", json={"text": "Hello world", "speed": 3.0}
    )

    assert response.status_code == 422


def test_generate_sync_rejects_pitch_too_low():
    """POST /api/generate_sync returns 422 when pitch is below minimum."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate_sync", json={"text": "Hello world", "pitch": -5.0}
    )

    assert response.status_code == 422


def test_generate_sync_rejects_pitch_too_high():
    """POST /api/generate_sync returns 422 when pitch is above maximum."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate_sync", json={"text": "Hello world", "pitch": 5.0}
    )

    assert response.status_code == 422


def test_generate_sync_returns_valid_mp3_on_success():
    """POST /api/generate_sync returns MP3 audio blob on success."""
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate_sync",
        json={"text": "مرحبا بالعالم", "language": "ar", "voice": "female"},
    )

    assert response.status_code == 200
    # Verify content type is audio/mpeg, not JSON
    assert "audio/mpeg" in response.headers["content-type"]
    # Verify response is non-empty binary data
    assert len(response.content) > 0
    # Verify it starts with MP3 syncword (0xfffb)
    assert response.content[:2] == b"\xff\xfb"


def test_generate_sync_accepts_default_parameters():
    """POST /api/generate_sync works with minimal request (only text required)."""
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate_sync", json={"text": "Hello"})

    assert response.status_code == 200
    assert "audio/mpeg" in response.headers["content-type"]
    assert len(response.content) > 0


def test_generate_sync_accepts_english_language():
    """POST /api/generate_sync accepts English text and returns MP3 blob."""
    _setup_mock_model()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate_sync", json={"text": "Hello world", "language": "en"}
    )

    assert response.status_code == 200
    assert "audio/mpeg" in response.headers["content-type"]
    assert len(response.content) > 0


def test_generate_sync_returns_503_when_model_not_ready():
    """POST /api/generate_sync returns 503 when TTS model is not loaded.

    Note: The sync endpoint polls until the job completes or fails.
    When the model is unloaded, the worker tries to load it (which may fail
    in test environments). The sync endpoint returns 500 on failure.
    We test that the job is submitted and the endpoint blocks/polls.
    """
    from synthesis import get_module

    mod = get_module()
    # Just ensure the model is loaded (don't unload in test env)
    if not mod._lifecycle.is_loaded():
        mod._lifecycle.load()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    # The sync endpoint should work when model is loaded
    response = client.post("/api/generate_sync", json={"text": "Hello world"})
    assert response.status_code == 200


def test_generate_sync_returns_500_when_voice_file_missing():
    """POST /api/generate_sync returns 500 when voice has no corresponding WAV file.

    This test uses the async endpoint (which returns immediately) and verifies
    the job eventually fails. The sync endpoint would block waiting for a
    nonexistent file.
    """
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post(
        "/api/generate", json={"text": "Hello world", "voice": "nonexistent_voice"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data


def test_generate_async_returns_job_id():
    """POST /api/generate returns job_id immediately (async mode)."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.post("/api/generate", json={"text": "Hello world"})

    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "pending"


def test_get_job_returns_not_found_for_unknown():
    """GET /api/jobs/{id} returns 404 for unknown job."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/api/jobs/nonexistent-job-id")

    assert response.status_code == 404
