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
    """GET /api/history entries contain filename, language, voice, and created_at."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/api/history")

    data = response.json()
    if len(data) > 0:
        entry = data[0]
        assert "filename" in entry
        assert "language" in entry
        assert "voice" in entry
        assert "created_at" in entry


def test_history_returns_files_in_reverse_order():
    """GET /api/history returns files sorted by creation time, newest first."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/api/history")

    data = response.json()
    filenames = [entry["filename"] for entry in data]
    assert filenames == sorted(filenames, reverse=True)
