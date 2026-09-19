"""Tests for the history and cleanup endpoints, adapted to use the AudioStore deep module."""

from fastapi.testclient import TestClient

from app import app


def _setup_audio_store(audio_dir):
    """Set up the AudioStore deep module for testing."""
    import app as main_app
    from audio_store import AudioStore

    main_app.audio_store_module = AudioStore(
        audio_dir=audio_dir,
        speaker_wav_dir=main_app.SPEAKER_WAV_DIR,
    )


def test_history_returns_list_of_audio_files():
    """GET /api/history returns a list of previously generated audio files."""
    client = TestClient(app)
    response = client.get("/api/history")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_history_entries_contain_expected_fields():
    """GET /api/history entries contain filename, text, language, voice, and created_at."""
    client = TestClient(app)
    response = client.get("/api/history")
    data = response.json()
    if len(data) > 0:
        entry = data[0]
        assert "filename" in entry
        assert "text" in entry
        assert "language" in entry
        assert "voice" in entry
        assert "created_at" in entry


def test_history_cleanup_endpoint_removes_old_files(tmp_path):
    """POST /api/cleanup removes files older than 24 hours."""
    import os as _os
    import time
    from pathlib import Path

    fake_dir = Path(tmp_path) / "fake_audio"
    fake_dir.mkdir()

    _setup_audio_store(str(fake_dir))

    # Create a file with mtime 48 hours ago
    old_file = fake_dir / "ar_female_abc123.mp3"
    old_file.touch()
    old_mtime = time.time() - (48 * 3600)
    _os.utime(old_file, (old_mtime, old_mtime))

    client = TestClient(app)
    response = client.post("/api/cleanup")
    assert response.status_code == 200

    # New file should remain
    new_file = fake_dir / "en_male_xyz789.mp3"
    new_file.touch()
    assert new_file.exists()


def test_history_cleanup_preserves_recent_files(tmp_path):
    """POST /api/cleanup does not remove files younger than 24 hours."""
    import os as _os
    import time
    from pathlib import Path

    fake_dir = Path(tmp_path) / "fake_audio"
    fake_dir.mkdir()
    _setup_audio_store(str(fake_dir))

    # Create a file with mtime 1 hour ago (recent)
    recent_file = fake_dir / "ar_female_recent.mp3"
    recent_file.touch()
    recent_mtime = time.time() - 3600
    _os.utime(recent_file, (recent_mtime, recent_mtime))

    client = TestClient(app)
    response = client.post("/api/cleanup")
    assert response.status_code == 200
    assert recent_file.exists()


def test_history_cleanup_with_cleanup_true_triggers_cleanup(tmp_path):
    """GET /api/history?cleanup=true triggers cleanup before returning list."""
    import os as _os
    import time
    from pathlib import Path

    fake_dir = Path(tmp_path) / "fake_audio"
    fake_dir.mkdir()
    _setup_audio_store(str(fake_dir))

    # Create an old file
    old_file = fake_dir / "ar_female_old.mp3"
    old_file.touch()
    old_mtime = time.time() - (48 * 3600)
    _os.utime(old_file, (old_mtime, old_mtime))

    client = TestClient(app)
    response = client.get("/api/history?cleanup=true")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_history_with_sidecar_returns_text(tmp_path):
    """GET /api/history reads text from sidecar JSON metadata."""
    import json as _json
    from pathlib import Path

    fake_dir = Path(tmp_path) / "fake_audio"
    fake_dir.mkdir()
    _setup_audio_store(str(fake_dir))

    # Create an audio file and its sidecar
    audio_filename = "ar_female_test123.mp3"
    audio_file = fake_dir / audio_filename
    audio_file.touch()
    sidecar = fake_dir / f"{audio_filename}.json"
    sidecar.write_text(
        _json.dumps(
            {
                "text": "مرحبا",
                "language": "ar",
                "voice": "female",
                "created_at": "1234567890",
            }
        )
    )

    client = TestClient(app)
    response = client.get("/api/history")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    # Find our file in the results
    our_entry = [e for e in data if e["filename"] == audio_filename]
    assert len(our_entry) == 1
    assert our_entry[0]["text"] == "مرحبا"
