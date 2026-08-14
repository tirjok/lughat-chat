"""Cache lookup tests — ISSUE-003 Vertical Slice 1.

Verifies that when a cached MP3 exists with the correct SHA-256 hash
(filename = hash of text|language|voice), the backend returns the
cached file WITHOUT running Chatterbox inference.
"""

import hashlib
import json
import os
import time

from app import app


def _compute_cache_key(text: str, language: str, voice: str) -> str:
    """Compute the SHA-256 hash of the composite key."""
    composite = f"{text}|{language}|{voice}"
    return hashlib.sha256(composite.encode("utf-8")).hexdigest()


def test_cache_hit_returns_cached_mp3_without_inference(tmp_path):
    """A pre-existing {hash}.mp3 in downloads/ is returned without calling the TTS model."""
    import app as main_app

    fake_dir = str(tmp_path / "downloads")
    os.makedirs(fake_dir, exist_ok=True)

    original_dir = main_app.AUDIO_DIR
    main_app.AUDIO_DIR = fake_dir

    try:
        text = "مرحبا بالعالم"
        language = "ar"
        voice = "female"

        cache_key = _compute_cache_key(text, language, voice)
        cached_mp3_path = os.path.join(fake_dir, f"{cache_key}.mp3")

        # Create a valid MP3 file at the cache key path
        mp3_content = b"\xff\xfb\x90\x00" + b"\x00" * 100
        with open(cached_mp3_path, "wb") as f:
            f.write(mp3_content)

        # Write a sidecar JSON for realism
        sidecar_path = os.path.join(fake_dir, f"{cache_key}.json")
        with open(sidecar_path, "w") as f:
            json.dump(
                {
                    "text": text,
                    "language": language,
                    "voice": voice,
                    "created_at": str(int(time.time())),
                },
                f,
            )

        # Verify file exists before making the request
        assert os.path.exists(cached_mp3_path), (
            f"Cache file should exist at {cached_mp3_path}, AUDIO_DIR={fake_dir}"
        )

        # Set up mock model — but it should NOT be called on cache hit
        mock_tts_call_count = {"count": 0}

        class MockTTS:
            def tts_to_file(self, **kwargs):
                mock_tts_call_count["count"] += 1

        main_app.tts_model = MockTTS()
        main_app.model_load_status = "ready"

        from fastapi.testclient import TestClient

        client = TestClient(app)

        response = client.post(
            "/api/generate",
            json={"text": text, "language": language, "voice": voice},
        )

        assert response.status_code == 200
        assert response.content == mp3_content
        assert "audio/mpeg" in response.headers["content-type"]
        # Verify the TTS model was NOT called (cache hit)
        assert mock_tts_call_count["count"] == 0, ()
        # Verify the response filename matches the cache key
        disposition = response.headers.get("content-disposition", "")
        assert f'filename="{cache_key}.mp3"' in disposition, (
            f"Expected content-disposition to contain '{cache_key}.mp3', got: {disposition}"
        )

    finally:
        main_app.AUDIO_DIR = original_dir


def test_cache_miss_proceeds_to_inference(tmp_path):
    """When no cached file exists, the backend proceeds to full synthesis."""
    import app as main_app

    fake_dir = str(tmp_path / "downloads")
    os.makedirs(fake_dir, exist_ok=True)

    original_dir = main_app.AUDIO_DIR
    main_app.AUDIO_DIR = fake_dir

    try:
        text = "Hello world"
        language = "en"
        voice = "male"

        # Do NOT create a cache file — this is a cache miss

        # Track whether the mock model was called
        model_called = {"called": False}

        class MockTTS:
            def tts_to_file(self, text, language=None, file_path=None, **kwargs):
                model_called["called"] = True
                # Create a minimal valid WAV file
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

    finally:
        main_app.AUDIO_DIR = original_dir


def test_cache_key_uses_pipe_delimiter_to_avoid_collisions():
    """Different composite inputs must produce different hashes even without delimiter awareness."""
    key1 = _compute_cache_key("ab", "female", "cd")
    key2 = _compute_cache_key("a", "bfemale", "cd")
    key3 = _compute_cache_key("ab", "fema", "lecd")

    assert key1 != key2, "Pipe-delimited composite key must avoid ordering collisions"
    assert key1 != key3, "Pipe-delimited composite key must avoid ordering collisions"
    assert key2 != key3, "Pipe-delimited composite key must avoid ordering collisions"
