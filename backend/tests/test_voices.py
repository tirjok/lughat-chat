import os
import tempfile
from app import app, discover_voices


def test_discover_voices_returns_voice_entries_for_wav_files():
    """discover_voices() returns {id, name} objects for each .wav file in the directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create .wav files
        for name in ["alice", "bob"]:
            path = os.path.join(tmpdir, f"{name}.wav")
            with open(path, "wb") as f:
                f.write(b"")

        voices = discover_voices(tmpdir)

        assert len(voices) == 2
        ids = [v["id"] for v in voices]
        names = [v["name"] for v in voices]
        assert "alice" in ids
        assert "bob" in ids
        assert "alice" in names
        assert "bob" in names
        # Verify structure
        for v in voices:
            assert "id" in v
            assert "name" in v


def test_discover_voices_ignores_non_wav_files():
    """discover_voices() only returns entries for .wav files, ignoring other extensions."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a mix of files
        for name, ext in [
            ("alice", ".wav"),
            ("bob", ".mp3"),
            ("charlie", ".wav"),
            ("dave", ".txt"),
        ]:
            path = os.path.join(tmpdir, f"{name}{ext}")
            with open(path, "wb") as f:
                f.write(b"")

        voices = discover_voices(tmpdir)

        assert len(voices) == 2
        ids = [v["id"] for v in voices]
        assert "alice" in ids
        assert "charlie" in ids
        assert "bob" not in ids
        assert "dave" not in ids


def test_discover_voices_returns_empty_list_for_missing_directory():
    """discover_voices() returns [] when the directory does not exist."""
    voices = discover_voices("/nonexistent/path")

    assert voices == []


def test_discover_voices_returns_empty_list_for_empty_directory():
    """discover_voices() returns [] when the directory exists but has no .wav files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        voices = discover_voices(tmpdir)

        assert voices == []


def test_discover_voices_returns_sorted_by_filename():
    """discover_voices() returns voices sorted alphabetically by filename."""
    with tempfile.TemporaryDirectory() as tmpdir:
        for name in ["zara", "alice", "moe"]:
            path = os.path.join(tmpdir, f"{name}.wav")
            with open(path, "wb") as f:
                f.write(b"")

        voices = discover_voices(tmpdir)

        ids = [v["id"] for v in voices]
        assert ids == ["alice", "moe", "zara"]


def test_list_voices_returns_voice_array():
    """GET /api/voices returns a list of available voices discovered from speaker_wavs/."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/api/voices")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2

    # Verify voice structure (id + name from filename)
    ids = [v["id"] for v in data]
    assert "female" in ids
    assert "male" in ids
    for v in data:
        assert "id" in v
        assert "name" in v


def test_api_voices_uses_discover_voices():
    """GET /api/voices returns voices discovered from the speaker_wavs directory."""
    import app as main_app

    # Patch discover_voices to return controlled data
    original = main_app.discover_voices
    main_app.discover_voices = lambda d: [
        {"id": "custom_voice", "name": "custom_voice"},
        {"id": "another", "name": "another"},
    ]

    try:
        from fastapi.testclient import TestClient

        client = TestClient(app)
        response = client.get("/api/voices")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        ids = [v["id"] for v in data]
        assert "custom_voice" in ids
        assert "another" in ids
    finally:
        main_app.discover_voices = original


def test_list_voices_includes_both_genders():
    """GET /api/voices returns both male and female voice options."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/api/voices")

    data = response.json()
    ids = [v["id"] for v in data]
    assert "female" in ids
    assert "male" in ids
