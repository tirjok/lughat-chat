"""FFmpeg fallback behavior — RF-03 (W-03).

When FFmpeg conversion fails, the endpoint must NOT silently serve a WAV file
with an .mp3 extension and audio/mpeg content type. Browsers' <audio> elements
will refuse to play PCM WAV data labeled as audio/mpeg.

The endpoint should fail with an HTTP error instead, letting the client decide
how to handle the failure.
"""

import os
import wave as _real_wave

from app import app

# Capture the real wave.open BEFORE importing app (which may patch it).
# Python modules are singletons — after app imports wave, any 'import wave'
# everywhere gets the SAME module object. If we patch app.wave.open and then
# a mock does 'import wave; wave.open(...)', it calls our own mock -> recursion.
_ORIGINAL_WAVE_OPEN = _real_wave.open


# ---------------------------------------------------------------------------
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


def _make_mock_wav():
    """Mock a valid speaker WAV for _validate_speaker_wav."""

    class _MockWavFile:
        def __init__(self):
            self._nframes = int(22050 * 0.5)
            self._rate = 22050

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def getnframes(self):
            return self._nframes

        def getframerate(self):
            return self._rate

    return _MockWavFile()


def _setup_mock_model(mock_subprocess_run=None):
    """Set up mock TTS model + optional subprocess.run mock.

    Always mocks os.path.exists (speaker_wav check) and wave.open (validation
    reads). Optionally mocks subprocess.run for FFmpeg failure tests.

    Uses the captured _ORIGINAL_WAVE_OPEN for write-mode to avoid the Python
    module singleton recursion trap (re-importing wave after patching gets
    the patched version).

    Returns a cleanup function that must be called in a finally block.
    """
    import app as main_app

    _mock_wav = _make_mock_wav()

    def _mock_path_exists(path):
        return True

    def _mock_wave_open(path, mode="r"):
        if mode == "w":
            # Use the captured original — NOT 'import wave' (singleton trap)
            return _ORIGINAL_WAVE_OPEN(path, mode)
        return _mock_wav

    # Capture originals for cleanup
    original_exists = main_app.os.path.exists
    original_wave_open = main_app.wave.open
    original_subprocess_run = main_app.subprocess.run if mock_subprocess_run else None

    main_app.os.path.exists = _mock_path_exists
    main_app.wave.open = _mock_wave_open
    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"

    if mock_subprocess_run is not None:
        main_app.subprocess.run = mock_subprocess_run

    def _cleanup():
        """Restore all mocks to their original values."""
        main_app.os.path.exists = original_exists
        main_app.wave.open = original_wave_open
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
