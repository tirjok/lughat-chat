"""Tests for Slice 2: Activity Submission Endpoint.

Tests the `POST /api/lessons/:lessonId/activities/:activityId/submit` endpoint:

  - Scores all 5 activity types
  - Returns 403 for locked lessons
  - Returns 404 for non-existent activity IDs
  - Returns 429 when max attempts are exhausted
  - Returns 500 for unknown activity types or scoring errors
  - Response includes: score, feedback, attempts_remaining,
    activity_complete, competency_impact

Uses the real FastAPI app through TestClient (same pattern as
`test_lessons_api.py` and `test_integration.py`).
"""

import json
import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


# ===========================================================================
# Fixtures — temporary DB + content directory (mirrors test_lessons_api.py)
# ===========================================================================


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
# Slice 2 Tests — `POST /api/lessons/:lessonId/activities/:activityId/submit`
# ===========================================================================


class TestSubmitActivityEndpoint:
    """Tests for Slice 2: `POST /api/lessons/:lessonId/activities/:activityId/submit`."""

    # -----------------------------------------------------------------------
    # Happy path — each of the 5 activity types
    # -----------------------------------------------------------------------

    def test_submit_listen_translate_returns_score(self, app_with_db):
        """TC-01: Submit a listen-translate answer and get a valid score."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/1/submit",
                json={"answer": "Peace be upon you and Allah's mercy"},
            )
            assert response.status_code == 200
            data = response.json()

            assert "score" in data
            assert "feedback" in data
            assert "attempts_remaining" in data
            assert "activity_complete" in data
            assert "competency_impact" in data
            assert 0.0 <= data["score"] <= 1.0
        finally:
            cleanup()

    def test_submit_translate_to_english_returns_score(self, app_with_db):
        """TC-01: Submit a translate-to-english answer and get a valid score."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/2/submit",
                json={"answer": "I am a Muslim"},
            )
            assert response.status_code == 200
            data = response.json()

            assert "score" in data
            assert 0.0 <= data["score"] <= 1.0
        finally:
            cleanup()

    def test_submit_translate_to_arabic_returns_score(self, app_with_db):
        """TC-01: Submit a translate-to-arabic answer and get a valid score."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/3/submit",
                json={"answer": "أَنَا مُسْلِم"},
            )
            assert response.status_code == 200
            data = response.json()

            assert "score" in data
            assert 0.0 <= data["score"] <= 1.0
        finally:
            cleanup()

    def test_submit_introduce_characters_returns_score(self, app_with_db):
        """TC-01: Submit an introduce-characters answer and get a valid score."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/4/submit",
                json={"answer": "هُوَ مُحَمَّد. هُمَا مُحَمَّدٌ وَعَائِشَةُ. هُمْ مُسْلِمُونَ"},
            )
            assert response.status_code == 200
            data = response.json()

            assert "score" in data
            assert 0.0 <= data["score"] <= 1.0
        finally:
            cleanup()

    def test_submit_role_play_returns_score(self, app_with_db):
        """TC-01: Submit a role-play answer and get a valid score."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/5/submit",
                json={"answer": "السَّلَامُ عَلَيْكُمْ. أَنَا أحمد. كَيْفَ حَالُكَ؟"},
            )
            assert response.status_code == 200
            data = response.json()

            assert "score" in data
            assert 0.0 <= data["score"] <= 1.0
        finally:
            cleanup()

    # -----------------------------------------------------------------------
    # Response shape
    # -----------------------------------------------------------------------

    def test_submit_response_includes_all_fields(self, app_with_db):
        """TC: Response includes score, feedback, attempts_remaining,
        activity_complete, and competency_impact."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/1/submit",
                json={"answer": "Peace be upon you"},
            )
            assert response.status_code == 200
            data = response.json()

            required_fields = [
                "score",
                "feedback",
                "attempts_remaining",
                "activity_complete",
                "competency_impact",
            ]
            for field in required_fields:
                assert field in data, f"Missing field: {field}"

            assert isinstance(data["score"], float)
            assert isinstance(data["feedback"], str)
            assert isinstance(data["attempts_remaining"], int)
            assert isinstance(data["activity_complete"], bool)
            assert isinstance(data["competency_impact"], dict)
        finally:
            cleanup()

    def test_submit_response_first_attempt_has_3_remaining(self, app_with_db):
        """TC: First attempt should show 3 remaining (max_attempts = 3)."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/1/submit",
                json={"answer": "test answer"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["attempts_remaining"] == 3
        finally:
            cleanup()

    def test_submit_response_activity_complete_false_first_attempt(self, app_with_db):
        """TC: activity_complete should be False on first attempt (unless max score)."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/1/submit",
                json={"answer": ""},  # empty answer → low score
            )
            assert response.status_code == 200
            data = response.json()
            assert data["activity_complete"] is False
        finally:
            cleanup()

    # -----------------------------------------------------------------------
    # 403 — Locked lesson
    # -----------------------------------------------------------------------

    def test_submit_403_for_locked_lesson(self):
        """TC: Returns 403 for locked lessons."""
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

            lesson_02 = {
                "id": 2,
                "level": "A1",
                "sequence": 2,
                "title": "Second Lesson",
                "competencies": ["C1"],
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
                response = client.post(
                    "/api/lessons/2/activities/1/submit",
                    json={"answer": "test"},
                )
                assert response.status_code == 403
                error_data = response.json()
                assert "detail" in error_data
                assert "locked" in error_data["detail"].lower()
            finally:
                main_app.DB_PATH = None
                main_app.model_load_status = "loading"

    # -----------------------------------------------------------------------
    # 404 — Non-existent lesson or activity
    # -----------------------------------------------------------------------

    def test_submit_404_for_nonexistent_lesson(self, app_with_db):
        """TC: Returns 404 for non-existent lesson IDs."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/999/activities/1/submit",
                json={"answer": "test"},
            )
            assert response.status_code == 404
        finally:
            cleanup()

    def test_submit_404_for_nonexistent_activity(self, app_with_db):
        """TC: Returns 404 for non-existent activity IDs within an existing lesson."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/999/submit",
                json={"answer": "test"},
            )
            assert response.status_code == 404
        finally:
            cleanup()

    # -----------------------------------------------------------------------
    # 429 — Max attempts exhausted
    # -----------------------------------------------------------------------

    def test_submit_429_when_max_attempts_exhausted(self, tmp_db_and_content):
        """TC: Returns 429 when max attempts are exhausted."""
        content_dir = tmp_db_and_content["content_dir"]
        db_path = tmp_db_and_content["db_path"]

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
            # Pre-populate user_progress with 3 attempts for activity 1
            conn = main_app._get_db_connection()
            try:
                conn.execute(
                    "UPDATE user_progress SET score = 0.1, status = 'in_progress', "
                    "attempts = 3 WHERE lesson_id = 1 AND activity_id = 1",
                )
                conn.commit()
            finally:
                conn.close()

            response = client.post(
                "/api/lessons/1/activities/1/submit",
                json={"answer": "test answer"},
            )
            assert response.status_code == 429
            data = response.json()
            assert "correct_answer" in data
        finally:
            main_app.DB_PATH = None
            main_app.model_load_status = "loading"

    # -----------------------------------------------------------------------
    # 500 — Scoring errors
    # -----------------------------------------------------------------------

    def test_submit_500_for_unknown_activity_type(self, tmp_db_and_content):
        """TC: Returns 500 for unknown activity types or scoring errors."""

        content_dir = tmp_db_and_content["content_dir"]
        db_path = tmp_db_and_content["db_path"]

        # Create a lesson with an unknown activity type (id=2, A2 level so it's available)
        lesson = {
            "id": 2,
            "level": "A2",
            "sequence": 1,
            "title": "Test Lesson",
            "competencies": ["C1"],
            "sections": [],
            "activities": [
                {
                    "id": 1,
                    "type": "unknown-type",
                    "title": "A",
                    "description": "D",
                    "order": 1,
                    "competency_map": {},
                    "max_attempts": 3,
                }
            ],
        }
        with open(os.path.join(content_dir, "lesson-02.json"), "w") as f:
            json.dump(lesson, f)

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
            response = client.post(
                "/api/lessons/2/activities/1/submit",
                json={"answer": "test"},
            )
            assert response.status_code == 500
        finally:
            main_app.DB_PATH = None
            main_app.model_load_status = "loading"

    # -----------------------------------------------------------------------
    # Empty / missing answer
    # -----------------------------------------------------------------------

    def test_submit_empty_answer_returns_low_score(self, app_with_db):
        """TC: Empty answer returns score 0.0."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/1/submit",
                json={"answer": ""},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["score"] == 0.0
        finally:
            cleanup()

    def test_submit_missing_answer_field_returns_400(self, app_with_db):
        """TC: Missing 'answer' field should return 400 (or 422 from FastAPI validation)."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/1/submit",
                json={},
            )
            # FastAPI returns 422 for missing required fields (validation error)
            assert response.status_code in (400, 422)
        finally:
            cleanup()

    # -----------------------------------------------------------------------
    # Correct answer shown after max attempts
    # -----------------------------------------------------------------------

    def test_submit_after_max_attempts_shows_correct_answer(self, tmp_db_and_content):
        """TC-04: After max attempts, response includes correct_answer."""
        content_dir = tmp_db_and_content["content_dir"]
        db_path = tmp_db_and_content["db_path"]

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
            # Pre-populate: 3 attempts already made
            conn = main_app._get_db_connection()
            try:
                conn.execute(
                    "UPDATE user_progress SET score = 0.1, status = 'in_progress', "
                    "attempts = 3 WHERE lesson_id = 1 AND activity_id = 1",
                )
                conn.commit()
            finally:
                conn.close()

            response = client.post(
                "/api/lessons/1/activities/1/submit",
                json={"answer": ""},
            )
            assert response.status_code == 429
            data = response.json()
            assert "correct_answer" in data
        finally:
            main_app.DB_PATH = None
            main_app.model_load_status = "loading"

    # -----------------------------------------------------------------------
    # Attempt counting — attempts increment correctly
    # -----------------------------------------------------------------------

    def test_submit_increments_attempts(self, app_with_db):
        """TC: Each submission increments the attempt count in user_progress."""
        client, cleanup = app_with_db
        try:
            response1 = client.post(
                "/api/lessons/1/activities/1/submit",
                json={"answer": "test answer 1"},
            )
            assert response1.status_code == 200

            response2 = client.post(
                "/api/lessons/1/activities/1/submit",
                json={"answer": "test answer 2"},
            )
            assert response2.status_code == 200

            data2 = response2.json()
            # Second attempt → 2 remaining (started from 3)
            assert data2["attempts_remaining"] == 2
        finally:
            cleanup()

    # -----------------------------------------------------------------------
    # Competency impact
    # -----------------------------------------------------------------------

    def test_submit_response_has_competency_impact(self, app_with_db):
        """TC: Response includes competency_impact as a dict of competency → weight."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/1/submit",
                json={"answer": "test answer"},
            )
            assert response.status_code == 200
            data = response.json()

            competency_impact = data["competency_impact"]
            assert isinstance(competency_impact, dict)
            # Activity 1 maps to 2 competencies
            assert len(competency_impact) >= 1
            for weight in competency_impact.values():
                assert isinstance(weight, float)
        finally:
            cleanup()

    # -----------------------------------------------------------------------
    # Unknown lesson ID
    # -----------------------------------------------------------------------

    def test_submit_404_for_unknown_lesson_id(self, app_with_db):
        """TC: Returns 404 for a lesson ID that doesn't exist in the database."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/999/activities/1/submit",
                json={"answer": "test"},
            )
            assert response.status_code == 404
        finally:
            cleanup()

    # -----------------------------------------------------------------------
    # Unknown activity ID
    # -----------------------------------------------------------------------

    def test_submit_404_for_unknown_activity_id(self, app_with_db):
        """TC: Returns 404 for an activity ID that doesn't exist in the lesson."""
        client, cleanup = app_with_db
        try:
            response = client.post(
                "/api/lessons/1/activities/999/submit",
                json={"answer": "test"},
            )
            assert response.status_code == 404
        finally:
            cleanup()
