"""FFmpeg fallback behavior — RF-03 (W-03).

When FFmpeg conversion fails, the endpoint must NOT silently serve a WAV file
with an .mp3 extension and audio/mpeg content type. Browsers' <audio> elements
will refuse to play PCM WAV data labeled as audio/mpeg.

The endpoint should fail with an HTTP error instead, letting the client decide
how to handle the failure.
"""

from unittest.mock import patch

from app import app

# Capture the real wave.open BEFORE importing app (which may patch it).
# Python modules are singletons — after app imports wave, any 'import wave'
# everywhere gets the SAME module object. If we patch app.wave.open and then
# a mock does 'import wave; wave.open(...)', it calls our own mock -> recursion.
_ORIGINAL_WAVE_OPEN = __import__('wave').open
_ORIGINAL_WAVE_MODULE = __import__('wave')


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
    """Set up mock TTS + optional subprocess.run mock.

    Replaces the old version which patched app.tts_model and
    app.model_load_status. Now patches the deep module instances directly.
    """
    import app as main_app
    from model_manager import ModelManager
    from synthesis import Synthesis

    # Build mock TTS that creates a valid WAV
    class MockTTS:
        def tts_to_file(
            self, text=None, language=None, file_path=None, speaker_wav=None, temperature=None
        ):
            import wave
            with wave.open(file_path, "w") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(22050)
                samples = b"\x00\x00" * 2205  # 0.1s of silence
                wav_file.writeframes(samples)

    mock_tts = MockTTS()
    mock_wav = _make_mock_wav()

    def _mock_path_exists(path):
        return True  # Speaker WAV always "exists"

    def _mock_wave_open(path, mode="r"):
        if mode == "w":
            return _ORIGINAL_WAVE_OPEN(path, mode)
        return mock_wav

    # Set up deep module instances
    mm = ModelManager(TTS_class=None, cache_dir="/tmp/tts_cache")
    mm._model = mock_tts
    mm._status = "ready"
    main_app.tts_model_manager = mm

    syn = Synthesis(
        tts_model=mm._model,
        audio_dir=main_app.AUDIO_DIR,
        speaker_wav_dir=main_app.SPEAKER_WAV_DIR,
    )
    main_app.synthesis_module = syn

    main_app.wave.open = _mock_wave_open

    # Optionally mock subprocess.run (e.g. for FFmpeg failure tests)
    p = None
    if mock_subprocess_run is not None:
        from unittest import mock
        p = mock.patch("subprocess.run", side_effect=mock_subprocess_run)
        p.start()
    return lambda: (p.stop() if p else None, setattr(main_app, 'wave', _ORIGINAL_WAVE_MODULE), setattr(__import__('synthesis'), 'wave', _ORIGINAL_WAVE_MODULE), setattr(__import__('sys').modules['wave'], 'open', _ORIGINAL_WAVE_OPEN))
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
            json={"text": "Hello world", "language": "en", "voice": "robot"},
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


def test_generate_speech_ffmpeg_failure_cleans_up_wav_file():
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

    cleanup = _setup_mock_model(mock_subprocess_run=_failing_ffmpeg)

    try:
        client = TestClient(app)

        response = client.post(
            "/api/generate",
            json={"text": "Hello world", "language": "en", "voice": "robot"},
        )

        # The endpoint should fail, and no WAV files should linger
        assert response.status_code >= 500

        # Check AUDIO_DIR for orphaned WAV files
        import app as main_app
        import os
        wav_files = [f for f in os.listdir(main_app.AUDIO_DIR) if f.endswith(".wav")]
        assert len(wav_files) == 0, (
            f"Orphaned WAV files found after FFmpeg failure: {wav_files}"
        )

    finally:
        cleanup()
