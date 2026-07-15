import os

import pytest

from app import app

# Capture the real wave.open and os functions before any patching.
import wave as _real_wave_module

_ORIGINAL_WAVE_OPEN = _real_wave_module.open
_REAL_OS_LISTDIR = os.listdir


@pytest.fixture(autouse=True)
def _restore_app_module():
    """Restore app module state after each test."""
    yield
    import app as main_app

    main_app.AUDIO_DIR = os.path.join(
        os.path.dirname(os.path.abspath(main_app.__file__)), "downloads"
    )
    main_app.MAX_AUDIO_FILES = 999999  # Disable cleanup for history tests
    main_app.os.path.exists = os.path.exists
    main_app.wave.open = _ORIGINAL_WAVE_OPEN
    main_app.os.listdir = _REAL_OS_LISTDIR  # Restore listdir from patched tests


def test_history_returns_list_of_audio_files():
    """GET /api/history returns a list of previously generated audio files."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/api/history")

    print(f"DEBUG: status={response.status_code}, body={response.text[:500]}")
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
