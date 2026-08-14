"""Cache store tests — ISSUE-003 Vertical Slice 2.

Verifies that after a successful cache-miss synthesis, the backend saves
both the cached MP3 file and its sidecar JSON metadata.
"""

import hashlib
import json
import os

from app import app


def _compute_cache_key(text: str, language: str, voice: str) -> str:
    """Compute the SHA-256 hash of the composite key."""
    composite = f"{text}|{language}|{voice}"
    return hashlib.sha256(composite.encode("utf-8")).hexdigest()


def test_cache_store_saves_mp3_and_sidecar_on_cache_miss(tmp_path):
    """A cache-miss synthesis saves {hash}.mp3 and {hash}.json in downloads/."""
    import app as main_app

    fake_dir = str(tmp_path / "downloads")
    os.makedirs(fake_dir, exist_ok=True)

    original_dir = main_app.AUDIO_DIR
    main_app.AUDIO_DIR = fake_dir

    try:
        text = "مرحبا بالعالم"
        language = "ar"
        voice = "female"

        # Ensure no cache file exists — this is a cache miss
        cache_key = _compute_cache_key(text, language, voice)
        cached_mp3_path = os.path.join(fake_dir, f"{cache_key}.mp3")
        assert not os.path.exists(cached_mp3_path), (
            "Cache file should not pre-exist for this test"
        )

        # Track whether the mock model was called
        model_called = {"called": False}

        class MockTTS:
            def tts_to_file(self, text, language=None, file_path=None, **kwargs):
                model_called["called"] = True
                import wave

                with wave.open(file_path, "w") as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2)
                    wav_file.setframerate(22050)
                    samples = b"\x00\x00" * 2205
                    wav_file.writeframes(samples)

        main_app.tts_model = MockTTS()
        main_app.model_load_status = "ready"

        from fastapi.testclient import TestClient

        client = TestClient(app)

        response = client.post(
            "/api/generate",
            json={"text": text, "language": language, "voice": voice},
        )

        assert response.status_code == 200
        assert model_called["called"], "TTS model should be called on cache miss"

        # Verify the cached MP3 file was saved
        assert os.path.exists(cached_mp3_path), (
            f"Cache MP3 should exist at {cached_mp3_path}"
        )

        # Verify the sidecar JSON was saved with correct fields
        sidecar_path = os.path.join(fake_dir, f"{cache_key}.json")
        assert os.path.exists(sidecar_path), (
            f"Sidecar JSON should exist at {sidecar_path}"
        )

        with open(sidecar_path, "r") as f:
            sidecar = json.load(f)

        assert sidecar["text"] == text
        assert sidecar["language"] == language
        assert sidecar["voice"] == voice
        assert "created_at" in sidecar
        # created_at should be a valid Unix timestamp
        assert float(sidecar["created_at"]) > 0

    finally:
        main_app.AUDIO_DIR = original_dir


def test_cache_store_rejects_old_speed_field(tmp_path):
    """Sending 'speed' as an extra field is rejected with 422.

    The old API contract accepted 'speed'; the new simplified contract
    rejects it entirely (extra="forbid").  This is tested from the
    cache-store path because the old test lived here.
    """
    import app as main_app

    fake_dir = str(tmp_path / "downloads")
    os.makedirs(fake_dir, exist_ok=True)

    original_dir = main_app.AUDIO_DIR
    main_app.AUDIO_DIR = fake_dir

    try:
        text = "Hello world"
        language = "en"
        voice = "male"

        class MockTTS:
            def tts_to_file(self, text, language=None, file_path=None, **kwargs):
                import wave

                with wave.open(file_path, "w") as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2)
                    wav_file.setframerate(22050)
                    samples = b"\x00\x00" * 2205
                    wav_file.writeframes(samples)

        main_app.tts_model = MockTTS()
        main_app.model_load_status = "ready"

        from fastapi.testclient import TestClient

        client = TestClient(app)

        response = client.post(
            "/api/generate",
            json={
                "text": text,
                "language": language,
                "voice": voice,
                "speed": 1.5,
            },
        )

        assert response.status_code == 422

    finally:
        main_app.AUDIO_DIR = original_dir
