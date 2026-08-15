from app import app

import hashlib
import json
import os


def _compute_cache_key(text: str, language: str, voice: str) -> str:
    """Compute the SHA-256 hash of the composite key."""
    composite = f"{text}|{language}|{voice}"
    return hashlib.sha256(composite.encode("utf-8")).hexdigest()


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


def test_history_cleanup_removes_json_sidecars(tmp_path):
    """POST /api/cleanup removes .json sidecars alongside old .mp3 files.

    When an old .mp3 is cleaned up, its associated .json sidecar
    must also be removed, leaving no orphaned metadata files.
    """
    import json as _json
    import os as _os
    import time as _time

    from fastapi.testclient import TestClient

    fake_dir = tmp_path / "fake_audio_sidecar_cleanup"
    fake_dir.mkdir()
    import app as main_app

    original_dir = main_app.AUDIO_DIR

    try:
        main_app.AUDIO_DIR = str(fake_dir)

        # Create an old .mp3 file (48 hours)
        old_mp3 = fake_dir / "ar_female_abc123.mp3"
        old_mp3.touch()
        old_time = _time.time() - 48 * 3600  # 48 hours ago
        _os.utime(old_mp3, (old_time, old_time))

        # Create its sidecar .json (also 48 hours old)
        old_meta = fake_dir / "ar_female_abc123.mp3.json"
        _json.dump(
            {
                "text": "مرحبا",
                "language": "ar",
                "voice": "female",
                "created_at": "1234567890",
            },
            open(old_meta, "w"),
        )

        # Create a recent .mp3 + .json pair (should NOT be removed)
        recent_mp3 = fake_dir / "en_male_xyz789.mp3"
        recent_mp3.touch()
        recent_meta = fake_dir / "en_male_xyz789.mp3.json"
        _json.dump(
            {
                "text": "Hello",
                "language": "en",
                "voice": "male",
                "created_at": "1700000000",
            },
            open(recent_meta, "w"),
        )

        client = TestClient(app)
        response = client.post("/api/cleanup")

        assert response.status_code == 200
        data = response.json()
        # Only one old .mp3 was removed (the .json is not counted separately)
        assert data["removed_count"] == 1
        # Both old files must be gone
        assert not old_mp3.exists()
        assert not old_meta.exists()
        # Recent files must remain
        assert recent_mp3.exists()
        assert recent_meta.exists()
    finally:
        main_app.AUDIO_DIR = original_dir


def test_history_cleanup_with_cleanup_true_removes_json_sidecars(tmp_path):
    """GET /api/history?cleanup=true removes .json sidecars alongside .mp3 files.

    The cleanup triggered within get_history() must also remove .json
    sidecars, not just audio files.
    """
    import json as _json
    import os as _os
    import time as _time
    import asyncio

    fake_dir = tmp_path / "fake_audio_history_cleanup"
    fake_dir.mkdir()
    import app as main_app

    original_dir = main_app.AUDIO_DIR

    try:
        main_app.AUDIO_DIR = str(fake_dir)

        # Create an old .mp3 + .json pair (48 hours)
        old_mp3 = str(fake_dir / "ar_male_old456.mp3")
        open(old_mp3, "w").close()
        old_time = _time.time() - 48 * 3600  # 48 hours ago
        _os.utime(old_mp3, (old_time, old_time))

        old_meta = str(fake_dir / "ar_male_old456.mp3.json")
        _json.dump(
            {
                "text": "قراءة اختبار",
                "language": "ar",
                "voice": "male",
                "created_at": "1234567890",
            },
            open(old_meta, "w"),
        )

        # Call get_history with cleanup=true
        result = asyncio.get_event_loop().run_until_complete(
            main_app.get_history(cleanup="true")
        )

        assert isinstance(result, list)
        files_after = _os.listdir(str(fake_dir))
        # Both old .mp3 and its .json sidecar must be gone
        assert "ar_male_old456.mp3" not in files_after
        assert "ar_male_old456.mp3.json" not in files_after
    finally:
        main_app.AUDIO_DIR = original_dir


def test_history_cleanup_preserves_orphaned_json_sidecars(tmp_path):
    """Cleanup does NOT remove .json sidecars without a matching .mp3/.wav.

       The cleanup endpoint only targets files ending in .mp3 or .wav.
       Orphaned .json sidecars (leftover from manual deletion of the audio file)
    must remain untouched.
    """
    import json as _json

    from fastapi.testclient import TestClient

    fake_dir = tmp_path / "fake_audio_orphaned"
    fake_dir.mkdir()
    import app as main_app

    original_dir = main_app.AUDIO_DIR

    try:
        main_app.AUDIO_DIR = str(fake_dir)

        # Create an orphaned .json without a matching .mp3/.wav
        orphaned_meta = fake_dir / "orphaned_abc123.mp3.json"
        _json.dump(
            {
                "text": "orphaned metadata",
                "language": "en",
                "voice": "female",
                "created_at": "1000000000",
            },
            open(orphaned_meta, "w"),
        )

        # Also place a recent .mp3 that should NOT be cleaned up
        recent_mp3 = fake_dir / "en_female_recent789.mp3"
        recent_mp3.touch()

        client = TestClient(app)
        response = client.post("/api/cleanup")

        assert response.status_code == 200
        data = response.json()
        assert data["removed_count"] == 0
        # Orphaned .json must still exist
        assert orphaned_meta.exists()
        # Recent .mp3 must still exist
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


def test_history_cache_based_filename_without_sidecar_uses_fallback(tmp_path):
    """GET /api/history handles cache-based {hash}.mp3 without sidecar JSON.

    Cache-based filenames are 64-character hex hashes with no _ separators.
    When no sidecar JSON exists, the fallback filename parsing breaks:
    splitting 'abc123def456...789.mp3' on '_' yields no useful parts.
    The endpoint must handle this gracefully: language='unknown',
    voice='default', text=''.
    """
    from fastapi.testclient import TestClient

    fake_dir = str(tmp_path / "fake_audio_no_sidecar")
    os.makedirs(fake_dir, exist_ok=True)
    import app as main_app

    original_dir = main_app.AUDIO_DIR
    try:
        main_app.AUDIO_DIR = fake_dir

        text = "مرحبا بالعالم"
        language = "ar"
        voice = "female"
        cache_key = _compute_cache_key(text, language, voice)

        # Create a cache-based MP3 file WITHOUT sidecar JSON
        mp3_file = os.path.join(fake_dir, f"{cache_key}.mp3")
        with open(mp3_file, "wb") as f:
            f.write(b"\x00" * 100)  # dummy MP3 data

        client = TestClient(app)
        response = client.get("/api/history")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

        entry = data[0]
        # Filename is the cache-based hash
        assert entry["filename"] == f"{cache_key}.mp3"
        # Fallback: no sidecar, no parsing possible for hash-based names
        assert entry["text"] == ""
        assert entry["language"] == "unknown"
        assert entry["voice"] == "default"
    finally:
        main_app.AUDIO_DIR = original_dir


def test_history_cache_based_filename_with_sidecar_returns_metadata(tmp_path):
    """GET /api/history reads metadata from {hash}.json sidecar for cache-based filenames.

    When a sidecar JSON exists alongside a cache-based {hash}.mp3,
    the endpoint reads text, language, voice, and created_at from the sidecar.
    """
    from fastapi.testclient import TestClient

    fake_dir = str(tmp_path / "fake_audio_cache_with_sidecar")
    os.makedirs(fake_dir, exist_ok=True)
    import app as main_app

    original_dir = main_app.AUDIO_DIR
    try:
        main_app.AUDIO_DIR = fake_dir

        text = "مرحبا بالعالم"
        language = "ar"
        voice = "female"
        cache_key = _compute_cache_key(text, language, voice)

        # Create a cache-based MP3 file
        mp3_file = os.path.join(fake_dir, f"{cache_key}.mp3")
        with open(mp3_file, "wb") as f:
            f.write(b"\x00" * 100)  # dummy MP3 data

        # Create sidecar JSON with metadata
        meta_file = os.path.join(fake_dir, f"{cache_key}.mp3.json")
        with open(meta_file, "w") as f:
            json.dump(
                {
                    "text": text,
                    "language": language,
                    "voice": voice,
                    "created_at": "1700000000",
                },
                f,
            )

        client = TestClient(app)
        response = client.get("/api/history")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

        entry = data[0]
        assert entry["filename"] == f"{cache_key}.mp3"
        assert entry["text"] == text
        assert entry["language"] == language
        assert entry["voice"] == voice
        assert entry["created_at"] == "1700000000"
    finally:
        main_app.AUDIO_DIR = original_dir


def test_history_mixed_directory_old_and_cache_based_coexist(tmp_path):
    """GET /api/history lists both old XTTS-v2 and cache-based files correctly.

    Old XTTS-v2 files ({lang}_{voice}_{timestamp}.mp3) and cache-based
    files ({hash}.mp3) coexist in the same downloads directory.
    Old files use filename parsing; cache-based files use sidecar or fallback.
    """
    from fastapi.testclient import TestClient

    fake_dir = str(tmp_path / "fake_audio_mixed")
    os.makedirs(fake_dir, exist_ok=True)
    import app as main_app

    original_dir = main_app.AUDIO_DIR
    try:
        main_app.AUDIO_DIR = fake_dir

        # Old XTTS-v2 file with sidecar
        old_mp3 = os.path.join(fake_dir, "ar_female_old123.mp3")
        with open(old_mp3, "wb") as f:
            f.write(b"\x00" * 50)
        old_meta = os.path.join(fake_dir, "ar_female_old123.mp3.json")
        with open(old_meta, "w") as f:
            json.dump(
                {
                    "text": "مرحبا بك في لغات",
                    "language": "ar",
                    "voice": "female",
                    "created_at": "1600000000",
                },
                f,
            )

        # Cache-based file with sidecar
        text = "Hello world"
        language = "en"
        voice = "male"
        cache_key = _compute_cache_key(text, language, voice)
        cache_mp3 = os.path.join(fake_dir, f"{cache_key}.mp3")
        with open(cache_mp3, "wb") as f:
            f.write(b"\x00" * 80)
        cache_meta = os.path.join(fake_dir, f"{cache_key}.mp3.json")
        with open(cache_meta, "w") as f:
            json.dump(
                {
                    "text": text,
                    "language": language,
                    "voice": voice,
                    "created_at": "1700000000",
                },
                f,
            )

        client = TestClient(app)
        response = client.get("/api/history")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        # Find entries by filename pattern
        old_entries = [e for e in data if "ar_female" in e["filename"]]
        cache_entries = [
            e
            for e in data
            if e["filename"].endswith(".mp3")
            and len(e["filename"].rsplit(".", 1)[0]) == 64
        ]

        assert len(old_entries) == 1
        assert old_entries[0]["text"] == "مرحبا بك في لغات"
        assert old_entries[0]["language"] == "ar"
        assert old_entries[0]["voice"] == "female"

        assert len(cache_entries) == 1
        assert cache_entries[0]["text"] == text
        assert cache_entries[0]["language"] == language
        assert cache_entries[0]["voice"] == voice
    finally:
        main_app.AUDIO_DIR = original_dir


def test_history_old_xtts_sidecar_with_unknown_fields_handled_gracefully(tmp_path):
    """GET /api/history handles old XTTS-v2 sidecar JSON with unknown fields.

    Old XTTS-v2 sidecar files may contain fields like 'pitch', 'seed', 'speed'
    that are no longer relevant. The endpoint should ignore unknown fields
    and use only the known ones (text, language, voice, created_at).
    """
    from fastapi.testclient import TestClient

    fake_dir = str(tmp_path / "fake_audio_old_sidecar")
    os.makedirs(fake_dir, exist_ok=True)
    import app as main_app

    original_dir = main_app.AUDIO_DIR
    try:
        main_app.AUDIO_DIR = fake_dir

        # Old XTTS-v2 style file with sidecar containing unknown fields
        mp3_file = os.path.join(fake_dir, "ar_female_xtts_old.mp3")
        with open(mp3_file, "wb") as f:
            f.write(b"\x00" * 60)

        meta_file = os.path.join(fake_dir, "ar_female_xtts_old.mp3.json")
        with open(meta_file, "w") as f:
            json.dump(
                {
                    "text": "Testing old sidecar",
                    "language": "ar",
                    "voice": "female",
                    "created_at": "1500000000",
                    # Unknown XTTS-v2 fields — should be ignored
                    "pitch": 0,
                    "seed": 42,
                    "speed": 1.0,
                },
                f,
            )

        client = TestClient(app)
        response = client.get("/api/history")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

        entry = data[0]
        assert entry["text"] == "Testing old sidecar"
        assert entry["language"] == "ar"
        assert entry["voice"] == "female"
        assert entry["created_at"] == "1500000000"
        # Unknown fields should not appear in the output
        assert "pitch" not in entry
        assert "seed" not in entry
        assert "speed" not in entry
    finally:
        main_app.AUDIO_DIR = original_dir
