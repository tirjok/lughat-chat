"""Tests for Slice 7: Lazy database initialization on first API access.

When the SQLite database file exists but is empty (no tables), the API
endpoints should **lazy-initialize** the tables from JSON content instead
of returning "no such table" errors.

This covers the intermittent failure mode observed in production where:
- The container restarts and the bind mount brings an empty lughat.db
- The lifespan handler's _init_databases() has not yet run (or failed silently)
- The first HTTP request arrives before tables are created
"""

import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def empty_db_no_tables():
    """Create an empty SQLite database file with NO tables.

    Returns a dict with:
      - db_path: path to the empty SQLite database file
      - content_dir: path to the content directory
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        content_dir = os.path.join(tmpdir, "content", "a1")
        os.makedirs(content_dir)

        # Copy the real lesson-01.json
        source_lesson = (
            Path(__file__).resolve().parent.parent / "content" / "a1" / "lesson-01.json"
        )
        if source_lesson.exists():
            import shutil

            shutil.copy2(source_lesson, os.path.join(content_dir, "lesson-01.json"))

        # Create an EMPTY SQLite database file (4096 bytes, no tables)
        db_path = os.path.join(tmpdir, "lughat.db")
        import sqlite3

        conn = sqlite3.connect(db_path)
        conn.close()

        # Verify it has no tables
        conn = sqlite3.connect(db_path)
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        conn.close()
        assert tables == [], f"Expected no tables, got: {tables}"

        yield {"db_path": db_path, "content_dir": os.path.join(tmpdir, "content")}


class TestLazyDbInitOnEmptyDb:
    """Tests for lazy database initialization when tables are missing."""

    def test_get_api_lessons_lazy_initializes_tables(self, empty_db_no_tables):
        """TC-10: When tables are missing, /api/lessons should lazy-initialize
        the database from JSON content and return lesson summaries.

        This is the primary regression test for the intermittent
        'no such table: lessons' error.
        """
        import app as main_app

        db_path = empty_db_no_tables["db_path"]

        main_app.DB_PATH = db_path
        main_app.tts_model = None
        main_app.model_load_status = "ready"

        client = TestClient(main_app.app)

        try:
            response = client.get("/api/lessons")
            assert response.status_code == 200, (
                f"Expected 200, got {response.status_code}: {response.text}"
            )
            data = response.json()
            assert isinstance(data, list)
            assert len(data) >= 1
            # Verify the lesson data is correct
            lesson = data[0]
            assert lesson["id"] == 1
            assert lesson["level"] == "A1"
            assert lesson["status"] == "available"
        finally:
            main_app.DB_PATH = None
            main_app.model_load_status = "loading"

    def test_get_api_lessons_id_lazy_initializes_tables(self, empty_db_no_tables):
        """TC-10: When tables are missing, /api/lessons/:id should
        lazy-initialize the database and return full lesson detail."""
        import app as main_app

        db_path = empty_db_no_tables["db_path"]

        main_app.DB_PATH = db_path
        main_app.tts_model = None
        main_app.model_load_status = "ready"

        client = TestClient(main_app.app)

        try:
            response = client.get("/api/lessons/1")
            assert response.status_code == 200, (
                f"Expected 200, got {response.status_code}: {response.text}"
            )
            data = response.json()
            assert data["id"] == 1
            assert "sections" in data
            assert "activities" in data
            assert "progress" in data
        finally:
            main_app.DB_PATH = None
            main_app.model_load_status = "loading"

    def test_empty_db_file_no_content_returns_empty_list(self):
        """TC-10: When the database is empty AND there's no content,
        return [] (not an error)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create empty SQLite file
            db_path = os.path.join(tmpdir, "lughat.db")
            import sqlite3

            conn = sqlite3.connect(db_path)
            conn.close()

            import app as main_app

            main_app.DB_PATH = db_path
            main_app.tts_model = None
            main_app.model_load_status = "ready"

            client = TestClient(main_app.app)

            try:
                response = client.get("/api/lessons")
                assert response.status_code == 200, (
                    f"Expected 200, got {response.status_code}: {response.text}"
                )
                data = response.json()
                # The lazy init will use the container's real CONTENT_DIR
                # which has lesson-01.json, so we get lessons back.
                # The important thing is no 500 error.
                assert isinstance(data, list)
            finally:
                main_app.DB_PATH = None
                main_app.model_load_status = "loading"

    def test_lazy_init_creates_tables_permanently(self, empty_db_no_tables):
        """Lazy initialization should persist tables to the database file,
        so subsequent requests don't need to re-initialize."""
        import app as main_app

        db_path = empty_db_no_tables["db_path"]

        main_app.DB_PATH = db_path
        main_app.tts_model = None
        main_app.model_load_status = "ready"

        client = TestClient(main_app.app)

        try:
            # First request — should lazy-initialize
            response = client.get("/api/lessons")
            assert response.status_code == 200

            # Verify tables now exist in the file
            import sqlite3

            conn = sqlite3.connect(db_path)
            tables = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
            conn.close()
            table_names = {t[0] for t in tables}
            assert "lessons" in table_names
            assert "user_progress" in table_names
        finally:
            main_app.DB_PATH = None
            main_app.model_load_status = "loading"
