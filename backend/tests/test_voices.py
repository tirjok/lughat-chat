"""Tests for the voice discovery endpoint, adapted to use the AudioStore deep module."""

import os
import tempfile
from pathlib import Path

from app import app, SPEAKER_WAV_DIR
from audio_store import discover_voices


def test_discover_voices_returns_voice_entries_for_wav_files():
    """discover_voices() returns {id, name} objects for each .wav file in the directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        for name in ["alice", "bob"]:
            Path(tmpdir, f"{name}.wav").touch()

        voices = discover_voices(tmpdir)

        assert len(voices) == 2
        ids = {v["id"] for v in voices}
        assert ids == {"alice", "bob"}
        for v in voices:
            assert "id" in v
            assert "name" in v


def test_discover_voices_ignores_non_wav_files():
    """discover_voices() only returns entries for .wav files, ignoring other extensions."""
    with tempfile.TemporaryDirectory() as tmpdir:
        for name, ext in [
            ("alice", ".wav"),
            ("bob", ".wav"),
            ("charlie", ".mp3"),
            ("dave", ".txt"),
        ]:
            Path(tmpdir, f"{name}{ext}").touch()

        voices = discover_voices(tmpdir)

        ids = {v["id"] for v in voices}
        assert ids == {"alice", "bob"}
        assert "charlie" not in ids
        assert "dave" not in ids


def test_discover_voices_returns_empty_list_for_missing_directory():
    """discover_voices() returns [] when the directory does not exist."""
    voices = discover_voices("/nonexistent/path")

    assert voices == []


def test_discover_voices_returns_empty_list_for_empty_directory():
    """discover_voices() returns [] when the directory exists but has no .wav files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        Path(tmpdir, "not_a_wav.txt").touch()
        voices = discover_voices(tmpdir)

    assert voices == []


def test_discover_voices_returns_sorted_by_filename():
    """discover_voices() returns voices sorted alphabetically by filename."""
    with tempfile.TemporaryDirectory() as tmpdir:
        for name in ["zara", "alice", "moe"]:
            Path(tmpdir, f"{name}.wav").touch()

        voices = discover_voices(tmpdir)
        ids = [v["id"] for v in voices]
        assert ids == ["alice", "moe", "zara"]


def test_list_voices_returns_voice_array():
    """GET /api/voices returns a list of available voices discovered from speaker_wavs/."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    # Ensure speaker_wavs/ exists
    if not os.path.isdir(SPEAKER_WAV_DIR):
        os.makedirs(SPEAKER_WAV_DIR)

    # Create a test voice file
    fake_voice_path = os.path.join(SPEAKER_WAV_DIR, "test_voice.wav")
    try:
        with open(fake_voice_path, "w") as f:
            f.write("")  # create empty file

        response = client.get("/api/voices")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        voice_ids = [v["id"] for v in data]
        assert "test_voice" in voice_ids
    finally:
        # Clean up
        if os.path.exists(fake_voice_path):
            os.remove(fake_voice_path)


def test_api_voices_uses_discover_voices():
    """GET /api/voices returns the discovered voices from speaker_wavs/."""
    from audio_store import AudioStore
    from fastapi.testclient import TestClient

    with tempfile.TemporaryDirectory() as tmpdir:
        # Create test voice files
        for name in ["alice", "bob"]:
            Path(tmpdir, f"{name}.wav").touch()

        # Create a real AudioStore with the temp dir
        import app as main_app

        store = AudioStore(
            audio_dir=main_app.AUDIO_DIR,
            speaker_wav_dir=tmpdir,
        )
        main_app.audio_store_module = store

        client = TestClient(app)
        response = client.get("/api/voices")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        ids = [v["id"] for v in data]
        assert "alice" in ids
        assert "bob" in ids


def test_list_voices_includes_both_genders():
    """GET /api/voices returns both female and male voice presets."""
    from audio_store import AudioStore
    from fastapi.testclient import TestClient

    # Set up audio_store_module so the endpoint is not None
    import app as main_app

    main_app.audio_store_module = AudioStore(
        audio_dir=main_app.AUDIO_DIR,
        speaker_wav_dir=main_app.SPEAKER_WAV_DIR,
    )

    # Ensure speaker_wavs/ exists and create voice files
    if not os.path.isdir(SPEAKER_WAV_DIR):
        os.makedirs(SPEAKER_WAV_DIR)

    female_path = os.path.join(SPEAKER_WAV_DIR, "female.wav")
    male_path = os.path.join(SPEAKER_WAV_DIR, "male.wav")
    try:
        for path_ in [female_path, male_path]:
            with open(path_, "w") as f:
                f.write("")

        client = TestClient(app)
        response = client.get("/api/voices")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        ids = [v["id"] for v in data]
        # Both gender voice presets should exist
        assert len(ids) >= 2
        assert "female" in ids
        assert "male" in ids
    finally:
        for path_ in [female_path, male_path]:
            if os.path.exists(path_):
                os.remove(path_)
