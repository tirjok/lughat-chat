"""Tests for voice cloning removal — Chatterbox uses built-in voices, no speaker WAV needed."""

import os

from app import app


def _mock_tts_model():
    """Create a mock TTS model that writes a WAV file to the given path."""

    class MockTTS:
        def tts_to_file(
            self,
            text,
            language=None,
            file_path=None,
        ):
            import wave

            with wave.open(file_path, "w") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(22050)
                samples = b"\x00\x00" * 2205
                wav_file.writeframes(samples)

    return MockTTS()


def test_generate_speech_succeeds_without_speaker_wav_file():
    """POST /api/generate succeeds when no speaker WAV file exists.

    Chatterbox uses built-in voices — no reference audio is needed.
    This test verifies that generate_speech() does NOT require a
    speaker WAV file to exist on disk.
    """
    import app as main_app

    # Ensure no speaker_wavs directory exists — the code must work without it.
    # Restore real os.path.exists so the speaker_wavs directory check fails.
    main_app.os.path.exists = os.path.exists

    # Set up mock model (no speaker_wav or temperature params).
    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    # Send a request with a voice name that has NO corresponding WAV file.
    response = client.post(
        "/api/generate", json={"text": "مرحبا بالعالم", "voice": "nonexistent_voice"}
    )

    # Should succeed (200) — the mock model generates the WAV and returns MP3.
    # Previously this returned 500 because speaker_wavs/nonexistent_voice.wav
    # did not exist.
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert len(response.content) > 0


def test_generate_speech_works_with_default_voice_no_speaker_wav():
    """POST /api/generate with default voice succeeds without speaker WAV file."""
    import app as main_app

    main_app.os.path.exists = os.path.exists
    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    # Only text — no voice specified, defaults to "female".
    response = client.post("/api/generate", json={"text": "اختبار بدون ملف صوتي"})

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"


def test_speaker_wav_dir_constant_not_referenced_in_generate_speech():
    """_validate_speaker_wav function does not exist in app module."""
    import app as main_app

    assert not hasattr(main_app, "_validate_speaker_wav"), (
        "_validate_speaker_wav should be removed — Chatterbox uses built-in voices."
    )


def test_wave_import_not_in_app():
    """app module does not import wave — only used for speaker WAV validation."""
    import app as main_app

    assert not hasattr(main_app, "wave"), (
        "wave import should be removed — only used for _validate_speaker_wav."
    )


def test_xtts_min_reference_duration_not_in_app():
    """XTTS_MIN_REFERENCE_DURATION constant removed — XTTS-specific."""
    import app as main_app

    assert not hasattr(main_app, "XTTS_MIN_REFERENCE_DURATION"), (
        "XTTS_MIN_REFERENCE_DURATION is XTTS-specific and should be removed."
    )


def test_discover_voices_not_in_app():
    """discover_voices() is removed — Chatterbox uses built-in voices, no WAV discovery."""
    import app as main_app

    assert not hasattr(main_app, "discover_voices"), (
        "discover_voices should be removed — GET /api/voices returns hardcoded voices."
    )
