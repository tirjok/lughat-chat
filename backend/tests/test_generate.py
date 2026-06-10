import os

from app import app


def _mock_tts_model():
    """Create a mock TTS model that returns without error."""
    class MockTTS:
        def tts_to_file(self, text, language=None, file_path=None, speaker_wav=None, temperature=None):
            # Create a minimal valid WAV-like file for testing
            import wave
            import struct
            with wave.open(file_path, 'w') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(22050)
                # Write 0.1 seconds of silence
                samples = b'\x00\x00' * 2205
                wav_file.writeframes(samples)

    return MockTTS()


def _setup_mock_model():
    """Set up mock TTS model in app module."""
    import app as main_app
    # Create speaker_wav directory and files for the mock
    speaker_wav_dir = os.path.join(os.path.dirname(main_app.__file__), "speaker_wavs")
    os.makedirs(speaker_wav_dir, exist_ok=True)
    for voice in ["female", "male"]:
        path = os.path.join(speaker_wav_dir, f"{voice}.wav")
        import wave
        with wave.open(path, 'w') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(22050)
            # 0.5s of silence (well above XTTS minimum duration of 0.33s)
            samples = b'\x00\x00' * int(22050 * 0.5)
            wav_file.writeframes(samples)
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

    response = client.post("/api/generate", json={
        "text": "Hello world",
        "language": "fr"
    })

    assert response.status_code == 422


def test_generate_speech_rejects_missing_voice_file():
    """POST /api/generate returns 500 when voice has no corresponding WAV file."""
    _setup_mock_model()

    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.post("/api/generate", json={
        "text": "Hello world",
        "voice": "robot"
    })

    assert response.status_code == 500
    data = response.json()
    assert "robot" in data["detail"]


def test_generate_speech_rejects_speed_too_low():
    """POST /api/generate returns 422 when speed is below minimum."""
    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.post("/api/generate", json={
        "text": "Hello world",
        "speed": 0.1
    })

    assert response.status_code == 422


def test_generate_speech_rejects_speed_too_high():
    """POST /api/generate returns 422 when speed is above maximum."""
    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.post("/api/generate", json={
        "text": "Hello world",
        "speed": 3.0
    })

    assert response.status_code == 422


def test_generate_speech_rejects_pitch_too_low():
    """POST /api/generate returns 422 when pitch is below minimum."""
    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.post("/api/generate", json={
        "text": "Hello world",
        "pitch": -5.0
    })

    assert response.status_code == 422


def test_generate_speech_rejects_pitch_too_high():
    """POST /api/generate returns 422 when pitch is above maximum."""
    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.post("/api/generate", json={
        "text": "Hello world",
        "pitch": 5.0
    })

    assert response.status_code == 422


def test_generate_speech_returns_503_when_model_not_ready():
    """POST /api/generate returns 503 when TTS model is not loaded."""
    import app as main_app
    main_app.tts_model = None
    main_app.model_load_status = "loading"

    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.post("/api/generate", json={
        "text": "Hello world"
    })

    assert response.status_code == 503


def test_generate_speech_returns_valid_response_on_success():
    """POST /api/generate returns MP3 audio blob on success."""
    _setup_mock_model()

    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.post("/api/generate", json={
        "text": "مرحبا بالعالم",
        "language": "ar",
        "voice": "female"
    })

    assert response.status_code == 200
    # Verify content type is audio/mpeg, not JSON
    assert "audio/mpeg" in response.headers["content-type"]
    # Verify response is non-empty binary data
    assert len(response.content) > 0
    # Verify it starts with MP3 ID3 tag or syncword
    assert response.content[:4] in [b'ID3\x03', b'ID3\x04', b'\xff\xfb']


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
    # Create a custom voice WAV file in speaker_wavs/ (>= 0.33s for XTTS validation)
    speaker_wav_dir = os.path.join(os.path.dirname(main_app.__file__), "speaker_wavs")
    custom_wav = os.path.join(speaker_wav_dir, "custom_voice.wav")
    import wave
    with wave.open(custom_wav, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(22050)
        # 0.5s of silence (well above XTTS minimum duration)
        samples = b'\x00\x00' * int(22050 * 0.5)
        wav_file.writeframes(samples)
    try:
        _setup_mock_model()

        from fastapi.testclient import TestClient
        client = TestClient(app)

        response = client.post("/api/generate", json={
            "text": "Hello world",
            "voice": "custom_voice"
        })

        assert response.status_code == 200
        assert "audio/mpeg" in response.headers["content-type"]
    finally:
        os.remove(custom_wav)


def test_generate_speech_missing_voice_file_includes_filename():
    """POST /api/generate returns 500 with the missing filename in detail message."""
    _setup_mock_model()

    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.post("/api/generate", json={
        "text": "Hello world",
        "voice": "nonexistent_voice"
    })

    assert response.status_code == 500
    data = response.json()
    assert "nonexistent_voice" in data["detail"]


def test_generate_speech_accepts_english_language():
    """POST /api/generate accepts English text and returns MP3 blob."""
    _setup_mock_model()

    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.post("/api/generate", json={
        "text": "Hello world",
        "language": "en"
    })

    assert response.status_code == 200
    assert "audio/mpeg" in response.headers["content-type"]
    assert len(response.content) > 0
