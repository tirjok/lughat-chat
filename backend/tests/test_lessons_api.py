"""Tests for Slices 4 & 5: `/api/lessons` and `/api/lessons/:id` endpoints.

Slice 4 — `GET /api/lessons` returns lesson summaries with status.
Slice 5 — `GET /api/lessons/:id` returns full lesson data with progress.
"""

import json
import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Fixtures — create a temporary database and content directory, then start
# the test client with the real FastAPI app (no TTS needed).
# ---------------------------------------------------------------------------


@pytest.fixture()
def tmp_db_and_content():
    """Create a temporary SQLite DB + content directory with lesson-01.json.

    Returns a dict with:
      - db_path: path to the SQLite database file
      - content_dir: path to the content directory containing lesson-01.json
      - db_filename: the filename of the SQLite database (for cleanup)
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        content_dir = os.path.join(tmpdir, "content", "a1")
        os.makedirs(content_dir)

        # Copy the real lesson-01.json into the temp content directory
        source_lesson = (
            Path(__file__).resolve().parent.parent / "content" / "a1" / "lesson-01.json"
        )
        if source_lesson.exists():
            import shutil

            shutil.copy2(source_lesson, os.path.join(content_dir, "lesson-01.json"))

        db_path = os.path.join(tmpdir, "lughat.db")
        db_filename = os.path.basename(db_path)

        yield {
            "db_path": db_path,
            "content_dir": os.path.join(tmpdir, "content"),
            "db_filename": db_filename,
        }


@pytest.fixture()
def app_with_db(tmp_db_and_content):
    """Configure the real app module to use the temporary DB and content dir.

    Returns the TestClient and a cleanup function.
    """
    import app as main_app

    content_dir = tmp_db_and_content["content_dir"]
    db_path = tmp_db_and_content["db_path"]

    # Initialize the lessons table and user_progress from JSON files
    from lessons_db import init_lessons_db
    from progress_db import init_user_progress_db

    try:
        init_lessons_db(content_dir, db_path=db_path)
    except Exception:
        pass  # Content might not exist — that's fine

    try:
        init_user_progress_db(content_dir, db_path=db_path)
    except Exception:
        pass

    # Patch the app to use our temp DB
    main_app.DB_PATH = db_path

    # Mock TTS so the app starts cleanly
    main_app.tts_model = None
    main_app.model_load_status = "ready"

    client = TestClient(main_app.app)

    def cleanup():
        main_app.tts_model = None
        main_app.model_load_status = "loading"
        main_app.DB_PATH = None  # Reset to default

    return client, cleanup


# ===========================================================================
# Slice 4 Tests — `GET /api/lessons` (Lesson List)
# ===========================================================================


class TestLessonsListEndpoint:
    """Tests for Slice 4: `GET /api/lessons` endpoint."""

    def test_get_api_lessons_returns_array(self, app_with_db):
        """TC-02: Returns an array of lesson summaries (currently 1 lesson)."""
        client, cleanup = app_with_db
        try:
            response = client.get("/api/lessons")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
        finally:
            cleanup()

    def test_get_api_lessons_returns_lesson_summary_fields(self, app_with_db):
        """TC-02: Each summary includes id, level, sequence, title,
        competency_count, section_count, status."""
        client, cleanup = app_with_db
        try:
            response = client.get("/api/lessons")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1

            lesson = data[0]
            assert "id" in lesson
            assert "level" in lesson
            assert "sequence" in lesson
            assert "title" in lesson
            assert "competency_count" in lesson
            assert "section_count" in lesson
            assert "status" in lesson
        finally:
            cleanup()

    def test_get_api_lessons_first_lesson_available(self, app_with_db):
        """TC-09: First lesson per level has status = 'available'."""
        client, cleanup = app_with_db
        try:
            response = client.get("/api/lessons")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["status"] == "available"
            assert data[0]["level"] == "A1"
            assert data[0]["id"] == 1
        finally:
            cleanup()

    def test_get_api_lessons_sorted_by_level_then_sequence(self, app_with_db):
        """TC-02: Returns lessons sorted by level then sequence."""
        client, cleanup = app_with_db
        try:
            response = client.get("/api/lessons")
            assert response.status_code == 200
            data = response.json()
            # With 1 lesson, just verify the structure is correct
            assert data[0]["level"] == "A1"
            assert data[0]["sequence"] == 1
        finally:
            cleanup()

    def test_get_api_lessons_empty_when_no_lessons(self):
        """TC-01: Returns [] when no lessons exist (not an error)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            content_dir = os.path.join(tmpdir, "content")
            db_path = os.path.join(tmpdir, "lughat.db")

            # No content directory — scanner returns []
            from lessons_db import init_lessons_db
            from progress_db import init_user_progress_db

            init_lessons_db(content_dir, db_path=db_path)
            init_user_progress_db(content_dir, db_path=db_path)

            import app as main_app

            main_app.DB_PATH = db_path
            main_app.tts_model = None
            main_app.model_load_status = "ready"

            client = TestClient(main_app.app)

            try:
                response = client.get("/api/lessons")
                assert response.status_code == 200
                data = response.json()
                assert data == []
            finally:
                main_app.DB_PATH = None
                main_app.model_load_status = "loading"

    def test_get_api_lessons_missing_required_fields_in_summary(self, app_with_db):
        """Verify lesson summaries do NOT include sections/activities (summary only)."""
        client, cleanup = app_with_db
        try:
            response = client.get("/api/lessons")
            assert response.status_code == 200
            data = response.json()
            lesson = data[0]
            # Summary should NOT have full sections or activities
            assert "sections" not in lesson
            assert "activities" not in lesson
        finally:
            cleanup()

    def test_get_api_lessons_500_on_sqlite_failure(self):
        """TC: Returns 500 when SQLite query fails."""
        with tempfile.TemporaryDirectory() as tmpdir:
            os.path.join(tmpdir, "lughat.db")

            import app as main_app

            # Point to a read-only path to force a query failure
            main_app.DB_PATH = "/nonexistent/path/lughat.db"
            main_app.tts_model = None
            main_app.model_load_status = "ready"

            client = TestClient(main_app.app)

            try:
                response = client.get("/api/lessons")
                # Should return 500 because SQLite can't open the DB
                assert response.status_code == 500
            finally:
                main_app.DB_PATH = None
                main_app.model_load_status = "loading"


# ===========================================================================
# Slice 5 Tests — `GET /api/lessons/:id` (Single Lesson)
# ===========================================================================


class TestSingleLessonEndpoint:
    """Tests for Slice 5: `GET /api/lessons/:id` endpoint."""

    def test_get_api_lessons_id_returns_full_lesson(self, app_with_db):
        """TC-06: Returns full lesson data (sections + activities + progress)."""
        client, cleanup = app_with_db
        try:
            response = client.get("/api/lessons/1")
            assert response.status_code == 200
            data = response.json()

            # Full lesson should have all fields
            assert "id" in data
            assert "level" in data
            assert "sequence" in data
            assert "title" in data
            assert "competencies" in data
            assert "sections" in data
            assert "activities" in data
            assert "progress" in data
        finally:
            cleanup()

    def test_get_api_lessons_id_returns_5_sections(self, app_with_db):
        """TC-06: Currently returns lesson-01.json with 5 sections."""
        client, cleanup = app_with_db
        try:
            response = client.get("/api/lessons/1")
            assert response.status_code == 200
            data = response.json()
            assert len(data["sections"]) == 5

            section_types = [s["type"] for s in data["sections"]]
            assert "dialogue" in section_types
            assert "vocabulary" in section_types
            assert "pronouns" in section_types
            assert "expressions" in section_types
            assert "grammar" in section_types
        finally:
            cleanup()

    def test_get_api_lessons_id_returns_5_activities(self, app_with_db):
        """TC-06: Currently returns lesson-01.json with 5 activities."""
        client, cleanup = app_with_db
        try:
            response = client.get("/api/lessons/1")
            assert response.status_code == 200
            data = response.json()
            assert len(data["activities"]) == 5

            activity_types = [a["type"] for a in data["activities"]]
            assert "listen-translate" in activity_types
            assert "translate-to-english" in activity_types
            assert "translate-to-arabic" in activity_types
            assert "introduce-characters" in activity_types
            assert "role-play" in activity_types
        finally:
            cleanup()

    def test_get_api_lessons_id_returns_progress_data(self, app_with_db):
        """TC-06: Returns progress data from user_progress table."""
        client, cleanup = app_with_db
        try:
            response = client.get("/api/lessons/1")
            assert response.status_code == 200
            data = response.json()
            progress = data["progress"]

            assert "status" in progress
            # First lesson should be 'available'
            assert progress["status"] == "available"
            assert "activities" in progress
            # Should have 5 activities
            assert len(progress["activities"]) == 5
        finally:
            cleanup()

    def test_get_api_lessons_id_404_for_nonexistent(self, app_with_db):
        """TC-07: Returns 404 for non-existent lesson IDs."""
        client, cleanup = app_with_db
        try:
            response = client.get("/api/lessons/999")
            assert response.status_code == 404
            error_data = response.json()
            assert "detail" in error_data
        finally:
            cleanup()

    def test_get_api_lessons_id_403_for_locked_lesson(self):
        """TC-08: Returns 403 for locked lessons with 'This lesson is locked' message."""
        with tempfile.TemporaryDirectory() as tmpdir:
            content_dir = os.path.join(tmpdir, "content", "a1")
            os.makedirs(content_dir)

            # Create lesson-01.json (A1, seq 1) and lesson-02.json (A1, seq 2)
            source_lesson = (
                Path(__file__).resolve().parent.parent
                / "content"
                / "a1"
                / "lesson-01.json"
            )
            import shutil

            shutil.copy2(source_lesson, os.path.join(content_dir, "lesson-01.json"))

            # Create a second lesson (A2, seq 1 — first in its level, so available)
            lesson_02 = {
                "id": 2,
                "level": "A1",
                "sequence": 2,
                "title": "Second Lesson",
                "competencies": ["Competency 1"],
                "sections": [{"type": "dialogue", "title": "D", "content": {}}],
                "activities": [
                    {
                        "id": 1,
                        "type": "listen-translate",
                        "title": "A",
                        "description": "D",
                        "order": 1,
                        "competency_map": {},
                        "max_attempts": 3,
                    }
                ],
            }
            with open(os.path.join(content_dir, "lesson-02.json"), "w") as f:
                json.dump(lesson_02, f)

            db_path = os.path.join(tmpdir, "lughat.db")

            from lessons_db import init_lessons_db
            from progress_db import init_user_progress_db

            init_lessons_db(content_dir, db_path=db_path)
            init_user_progress_db(content_dir, db_path=db_path)

            import app as main_app

            main_app.DB_PATH = db_path
            main_app.tts_model = None
            main_app.model_load_status = "ready"

            client = TestClient(main_app.app)

            try:
                # Lesson 2 (A1, seq 2) should be locked (not first in level)
                response = client.get("/api/lessons/2")
                assert response.status_code == 403
                error_data = response.json()
                assert "detail" in error_data
                assert "locked" in error_data["detail"].lower()
            finally:
                main_app.DB_PATH = None
                main_app.model_load_status = "loading"

    def test_get_api_lessons_id_500_on_sqlite_failure(self):
        """Returns 500 when SQLite query fails."""
        with tempfile.TemporaryDirectory() as tmpdir:
            os.path.join(tmpdir, "lughat.db")

            import app as main_app

            main_app.DB_PATH = "/nonexistent/path/lughat.db"
            main_app.tts_model = None
            main_app.model_load_status = "ready"

            client = TestClient(main_app.app)

            try:
                response = client.get("/api/lessons/1")
                assert response.status_code == 500
            finally:
                main_app.DB_PATH = None
                main_app.model_load_status = "loading"

    def test_get_api_lessons_id_progress_has_activity_details(self, app_with_db):
        """TC-06: Progress activities should include score, attempts, status per activity."""
        client, cleanup = app_with_db
        try:
            response = client.get("/api/lessons/1")
            assert response.status_code == 200
            data = response.json()
            progress = data["progress"]
            activity_progress = progress["activities"]

            # Each activity should have status
            for activity_id, activity_data in activity_progress.items():
                assert "status" in activity_data
                assert "score" in activity_data
                assert "attempts" in activity_data
        finally:
            cleanup()

    def test_get_api_lessons_id_zero_activities_is_available(self):
        """Edge case: a lesson with 0 activities should be 'available', not 'locked'.

        A lesson with activity_count == 0 has no user_progress rows.
        Without this fix, the else-branch defaults to 'locked', making
        the lesson permanently inaccessible (403).
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            content_dir = os.path.join(tmpdir, "content", "a1")
            os.makedirs(content_dir)

            # Create a lesson with 0 activities
            lesson_no_activities = {
                "id": 1,
                "level": "A1",
                "sequence": 1,
                "title": "Zero Activity Lesson",
                "competencies": ["C1"],
                "sections": [{"type": "dialogue", "title": "D", "content": {}}],
                "activities": [],
            }
            with open(os.path.join(content_dir, "lesson-01.json"), "w") as f:
                json.dump(lesson_no_activities, f)

            db_path = os.path.join(tmpdir, "lughat.db")

            from lessons_db import init_lessons_db
            from progress_db import init_user_progress_db

            init_lessons_db(content_dir, db_path=db_path)
            init_user_progress_db(content_dir, db_path=db_path)

            import app as main_app

            main_app.DB_PATH = db_path
            main_app.tts_model = None
            main_app.model_load_status = "ready"

            client = TestClient(main_app.app)

            try:
                # Zero-activity lesson should be accessible (not 403)
                response = client.get("/api/lessons/1")
                assert response.status_code == 200, (
                    f"Expected 200 for zero-activity lesson, got {response.status_code}: "
                    f"{response.text}"
                )
                data = response.json()
                assert data["progress"]["status"] == "available", (
                    f"Expected 'available' for zero-activity lesson, got "
                    f"'{data['progress']['status']}'"
                )
            finally:
                main_app.DB_PATH = None
                main_app.model_load_status = "loading"
