"""FFmpeg fallback behavior — RF-03 (W-03).

When FFmpeg conversion fails, the endpoint must NOT silently serve a WAV file
with an .mp3 extension and audio/mpeg content type. Browsers' <audio> elements
will refuse to play PCM WAV data labeled as audio/mpeg.

The endpoint should fail with an HTTP error instead, letting the client decide
how to handle the failure.
"""

import os

import wave

from app import app

_ORIGINAL_WAVE_OPEN = wave.open
# Helpers
# ---------------------------------------------------------------------------


def _mock_tts_model():
    """Mock TTS model that writes a real PCM WAV file to disk.

    Uses the captured original wave.open (not app.wave.open) to avoid
    recursion when app.wave.open has been patched by the test.
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
            # Use the captured original — NOT 'import wave' (singleton trap)
            with _ORIGINAL_WAVE_OPEN(file_path, "w") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(22050)
                samples = b"\x00\x00" * 2205  # 0.1s silence
                wav_file.writeframes(samples)

    return MockTTS()


def _setup_mock_model(mock_subprocess_run=None):
    """Set up mock TTS model + optional subprocess.run mock.

    Mocks os.path.exists so the backend's speaker_wav file check passes,
    while letting the TTS mock write real WAV files to disk.
    Optionally mocks subprocess.run for FFmpeg failure tests.

    Returns a cleanup function that must be called in a finally block.
    """
    import app as main_app

    def _mock_path_exists(path):
        return True

    # Capture originals for cleanup
    original_exists = main_app.os.path.exists
    original_subprocess_run = main_app.subprocess.run if mock_subprocess_run else None

    main_app.os.path.exists = _mock_path_exists
    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"

    if mock_subprocess_run is not None:
        main_app.subprocess.run = mock_subprocess_run

    def _cleanup():
        """Restore all mocks to their original values."""
        main_app.os.path.exists = original_exists
        if original_subprocess_run is not None:
            main_app.subprocess.run = original_subprocess_run

    return _cleanup


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_generate_speech_ffmpeg_failure_does_not_serve_wav_as_mp3():
    """When FFmpeg conversion fails, endpoint must NOT return WAV data with
    audio/mpeg content type. Should return an HTTP error instead.

    Regression for RF-03 (W-03): the old fallback did
    shutil.copy2(wav_path, mp3_path) which produced a .wav file with a .mp3
    extension. Browsers' <audio> elements refuse to play it.
    """
    import subprocess
    from fastapi.testclient import TestClient

    # Mock subprocess.run to simulate FFmpeg failure
    def _failing_ffmpeg(*args, **kwargs):
        raise subprocess.CalledProcessError(
            returncode=1, cmd=args[0], stderr=b"ffmpeg: error"
        )

    cleanup = _setup_mock_model(mock_subprocess_run=_failing_ffmpeg)

    try:
        client = TestClient(app)

        response = client.post(
            "/api/generate",
            json={"text": "Hello world", "language": "en"},
        )

        # Must NOT succeed — the old code returned 200 with WAV bytes
        # labeled as audio/mpeg
        assert response.status_code != 200, (
            "Endpoint returned 200 when FFmpeg failed — "
            "this likely serves WAV data as MP3 (broken audio)"
        )

        # Should return a 500-level error so the client knows something went wrong
        assert response.status_code >= 500

    finally:
        cleanup()


def test_generate_speech_ffmpeg_failure_cleans_up_wav_file(tmp_path):
    """When FFmpeg conversion fails, the intermediate WAV file must be cleaned up
    so it doesn't accumulate on disk.

    Regression for RF-03 (W-03): the old fallback left the WAV file on disk
    after copying it to mp3_path, wasting 5–10× the storage of the final file.
    """
    import subprocess

    from fastapi.testclient import TestClient

    def _failing_ffmpeg(*args, **kwargs):
        raise subprocess.CalledProcessError(
            returncode=1, cmd=args[0], stderr=b"ffmpeg: error"
        )

    fake_dir = tmp_path / "fake_audio_ffmpeg"
    fake_dir.mkdir()

    import app as main_app

    original_dir = main_app.AUDIO_DIR

    try:
        main_app.AUDIO_DIR = str(fake_dir)

        cleanup = _setup_mock_model(mock_subprocess_run=_failing_ffmpeg)

        client = TestClient(app)

        response = client.post(
            "/api/generate",
            json={"text": "Hello world", "language": "en"},
        )

        # The endpoint should fail, and no WAV files should linger
        assert response.status_code >= 500

        # Check AUDIO_DIR for orphaned WAV files
        wav_files = [f for f in os.listdir(main_app.AUDIO_DIR) if f.endswith(".wav")]
        assert len(wav_files) == 0, (
            f"Orphaned WAV files found after FFmpeg failure: {wav_files}"
        )

    finally:
        main_app.AUDIO_DIR = original_dir
        cleanup()
