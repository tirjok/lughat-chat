from app import app


def test_history_returns_list_of_audio_files():
    """GET /api/history returns a list of previously generated audio files."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/api/history")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_history_entries_contain_expected_fields():
    """GET /api/history entries contain filename, text, language, voice, and created_at."""
    from fastapi.testclient import TestClient

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
    import time as _time

    from fastapi.testclient import TestClient

    # Create a fake audio directory with a file older than 24h
    fake_dir = tmp_path / "fake_audio"
    fake_dir.mkdir()
    import app as main_app

    original_dir = main_app.AUDIO_DIR

    # Temporarily redirect AUDIO_DIR to our test directory
    main_app.AUDIO_DIR = str(fake_dir)

    try:
        # Create a file with mtime 48 hours ago
        old_file = fake_dir / "ar_female_abc123.mp3"
        old_file.touch()
        old_time = _time.time() - 48 * 3600  # 48 hours ago
        _os.utime(old_file, (old_time, old_time))

        # Create a file with mtime 1 hour ago (should NOT be removed)
        new_file = fake_dir / "en_male_def456.mp3"
        new_file.touch()

        client = TestClient(app)
        response = client.post("/api/cleanup")

        assert response.status_code == 200
        data = response.json()
        assert data["removed_count"] == 1
        assert not old_file.exists()  # Old file should be removed
        assert new_file.exists()  # New file should remain
    finally:
        main_app.AUDIO_DIR = original_dir


def test_history_cleanup_preserves_recent_files(tmp_path):
    """POST /api/cleanup does not remove files younger than 24 hours."""
    import os as _os
    import time as _time

    from fastapi.testclient import TestClient

    fake_dir = tmp_path / "fake_audio2"
    fake_dir.mkdir()
    import app as main_app

    original_dir = main_app.AUDIO_DIR

    try:
        # Create a file with mtime 12 hours ago
        recent_file = fake_dir / "ar_male_ghi789.wav"
        recent_file.touch()
        recent_time = _time.time() - 12 * 3600  # 12 hours ago
        _os.utime(recent_file, (recent_time, recent_time))

        client = TestClient(app)
        response = client.post("/api/cleanup")

        assert response.status_code == 200
        data = response.json()
        assert data["removed_count"] == 0
        assert recent_file.exists()  # Recent file should remain
    finally:
        main_app.AUDIO_DIR = original_dir


def test_history_cleanup_with_cleanup_true_triggers_cleanup(tmp_path):
    """GET /api/history?cleanup=true triggers cleanup before returning list."""
    import os as _os
    import time as _time
    import asyncio

    fake_dir = tmp_path / "fake_audio3"
    fake_dir.mkdir()
    import app as main_app

    original_dir = main_app.AUDIO_DIR

    try:
        # Create an old file
        old_file = str(fake_dir / "en_female_jkl012.mp3")
        open(old_file, "w").close()
        old_time = _time.time() - 48 * 3600  # 48 hours ago
        _os.utime(old_file, (old_time, old_time))

        # Redirect AUDIO_DIR to test directory
        main_app.AUDIO_DIR = str(fake_dir)

        # Call the get_history function directly with cleanup=true
        result = asyncio.get_event_loop().run_until_complete(
            main_app.get_history(cleanup="true")
        )

        assert isinstance(result, list)
        # Old file should be removed during cleanup — use os.listdir to check (not mocked os.path.exists)
        files_after = _os.listdir(str(fake_dir))
        assert "en_female_jkl012.mp3" not in files_after
    finally:
        main_app.AUDIO_DIR = original_dir


def test_history_with_sidecar_returns_text(tmp_path):
    """GET /api/history reads text from sidecar JSON metadata."""
    import json as _json

    from fastapi.testclient import TestClient

    fake_dir = tmp_path / "fake_audio_text"
    fake_dir.mkdir()
    import app as main_app

    original_dir = main_app.AUDIO_DIR

    try:
        main_app.AUDIO_DIR = str(fake_dir)

        # Create an MP3 file
        mp3_file = fake_dir / "ar_female_test123.mp3"
        mp3_file.touch()

        # Create sidecar JSON with metadata
        meta_file = fake_dir / "ar_female_test123.mp3.json"
        _json.dump(
            {
                "text": "مرحبا بك في لغات",
                "language": "ar",
                "voice": "female",
                "created_at": "1234567890",
            },
            open(meta_file, "w"),
        )

        client = TestClient(app)
        response = client.get("/api/history")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        entry = data[0]
        assert entry["text"] == "مرحبا بك في لغات"
        assert entry["language"] == "ar"
        assert entry["voice"] == "female"
    finally:
        main_app.AUDIO_DIR = original_dir
