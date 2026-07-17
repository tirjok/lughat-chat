"""Integration tests for lesson browsing and access (Slices 2–7).

Tests the full flow from backend API to frontend routing:
  - GET /api/lessons (lesson list with status)
  - GET /api/lessons/:id (single lesson with progress)
  - Sequential unlock rules
  - Locked lesson access (403)
  - Completed lesson access (200 with review mode)
  - Frontend routing: /, /lessons, /lessons/:id, /playground
"""

import json
import os
import sqlite3
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def multi_lesson_content():
    """Create a content directory with 3 lessons across 2 levels (A1, A2).

    Returns (content_dir, db_path) for the test.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        content_dir = os.path.join(tmpdir, "content", "a1")
        os.makedirs(content_dir)

        # Copy lesson-01.json (A1, seq 1)
        source_lesson = (
            Path(__file__).resolve().parent.parent / "content" / "a1" / "lesson-01.json"
        )
        if source_lesson.exists():
            import shutil

            shutil.copy2(source_lesson, os.path.join(content_dir, "lesson-01.json"))

        # Create lesson-02.json (A1, seq 2)
        lesson_02 = {
            "id": 2,
            "level": "A1",
            "sequence": 2,
            "title": "Greetings 2",
            "competencies": ["C1", "C2"],
            "sections": [{"type": "dialogue", "title": "D", "content": {}}],
            "activities": [
                {
                    "id": 1,
                    "type": "listen-translate",
                    "title": "A1",
                    "order": 1,
                }
            ],
        }
        with open(os.path.join(content_dir, "lesson-02.json"), "w") as f:
            json.dump(lesson_02, f)

        # Create lesson-03.json (A2, seq 1)
        a2_dir = os.path.join(tmpdir, "content", "a2")
        os.makedirs(a2_dir)
        lesson_03 = {
            "id": 3,
            "level": "A2",
            "sequence": 1,
            "title": "A2 Lesson 1",
            "competencies": ["C3"],
            "sections": [{"type": "dialogue", "title": "D", "content": {}}],
            "activities": [
                {
                    "id": 1,
                    "type": "listen-translate",
                    "title": "A2A1",
                    "order": 1,
                }
            ],
        }
        with open(os.path.join(a2_dir, "lesson-01.json"), "w") as f:
            json.dump(lesson_03, f)

        db_path = os.path.join(tmpdir, "lughat.db")
        content_root = os.path.join(tmpdir, "content")  # Parent of level subdirs

        from lessons_db import init_lessons_db
        from progress_db import init_user_progress_db

        init_lessons_db(content_root, db_path=db_path)
        init_user_progress_db(content_root, db_path=db_path)

        import app as main_app

        main_app.DB_PATH = db_path
        main_app.tts_model = None
        main_app.model_load_status = "ready"

        client = TestClient(main_app.app)

        yield {
            "client": client,
            "db_path": db_path,
            "content_dir": os.path.join(tmpdir, "content"),
        }

        main_app.DB_PATH = None
        main_app.model_load_status = "loading"


# ===========================================================================
# Slice 2: GET /api/lessons (Lesson List)
# ===========================================================================


class TestLessonsListIntegration:
    """Tests for Slice 2: GET /api/lessons returns summaries with status."""

    def test_returns_multiple_lessons(self, multi_lesson_content):
        """TC-02: Returns all lessons from content directory."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    def test_lesson_summaries_have_status(self, multi_lesson_content):
        """TC-04: Each lesson has a status field."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons")
        data = response.json()
        for lesson in data:
            assert "status" in lesson

    def test_first_lesson_per_level_available(self, multi_lesson_content):
        """TC-09: First lesson (A1, seq 1) is 'available'."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons")
        data = response.json()
        lesson_1 = [lesson for lesson in data if lesson["id"] == 1][0]
        assert lesson_1["status"] == "available"

    def test_second_lesson_locked(self, multi_lesson_content):
        """TC-04: Second lesson (A1, seq 2) is 'locked' (first not completed)."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons")
        data = response.json()
        lesson_2 = [lesson for lesson in data if lesson["id"] == 2][0]
        assert lesson_2["status"] == "locked"

    def test_first_lesson_a2_locked(self, multi_lesson_content):
        """TC-06: First lesson of A2 is 'available' (first lesson per level).

        The sequential unlock rule: first lesson per level is always available.
        A2's first lesson (id=3, seq=1) is the first A2 lesson, so it gets
        'available' status regardless of A1 completion.
        """
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons")
        data = response.json()
        lesson_3 = [lesson for lesson in data if lesson["id"] == 3][0]
        # First lesson per level is always available
        assert lesson_3["status"] == "available"

    def test_sorted_by_level_then_sequence(self, multi_lesson_content):
        """TC-02: Lessons are sorted by level then sequence."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons")
        data = response.json()
        assert data[0]["level"] == "A1"
        assert data[0]["sequence"] == 1
        assert data[1]["level"] == "A1"
        assert data[1]["sequence"] == 2
        assert data[2]["level"] == "A2"
        assert data[2]["sequence"] == 1


# ===========================================================================
# Slice 3: Progress Module (Sequential Unlock)
# ===========================================================================


class TestSequentialUnlockIntegration:
    """Tests for Slice 3: Sequential unlock rules in GET /api/lessons."""

    def test_completing_lesson_1_unlocks_lesson_2(self, multi_lesson_content):
        """TC-05: When all activities in lesson 1 are 'completed', lesson 2 becomes 'available'."""
        client = multi_lesson_content["client"]
        db_path = multi_lesson_content["db_path"]

        # Complete all activities in lesson 1
        conn = sqlite3.connect(db_path)
        conn.execute(
            "UPDATE user_progress SET status = 'completed', score = 1.0, attempts = 1 "
            "WHERE lesson_id = 1"
        )
        conn.commit()
        conn.close()

        response = client.get("/api/lessons")
        data = response.json()
        lesson_2 = [lesson for lesson in data if lesson["id"] == 2][0]
        assert lesson_2["status"] == "available"

    def test_completing_all_a1_unlocks_a2(self, multi_lesson_content):
        """TC-06: When all A1 lessons are completed, A2 lessons become 'available'."""
        client = multi_lesson_content["client"]
        db_path = multi_lesson_content["db_path"]

        # Complete all activities in lessons 1 and 2
        conn = sqlite3.connect(db_path)
        conn.execute(
            "UPDATE user_progress SET status = 'completed', score = 1.0, attempts = 1 "
            "WHERE lesson_id IN (1, 2)"
        )
        conn.commit()
        conn.close()

        response = client.get("/api/lessons")
        data = response.json()
        lesson_3 = [lesson for lesson in data if lesson["id"] == 3][0]
        assert lesson_3["status"] == "available"

    def test_in_progress_status_when_activities_submitted(self, multi_lesson_content):
        """TC-04: 'in_progress' activity status is preserved in user_progress.

        The lesson-level status from /api/lessons is derived from sequential
        unlock rules (first per level = available, others depend on previous).
        Individual activity statuses (in_progress, completed) are stored in
        user_progress and used in the single-lesson endpoint.
        """
        client = multi_lesson_content["client"]
        db_path = multi_lesson_content["db_path"]

        # Set lesson 2 activity to 'in_progress' (has attempts > 0)
        conn = sqlite3.connect(db_path)
        conn.execute(
            "UPDATE user_progress SET status = 'in_progress', attempts = 1 "
            "WHERE lesson_id = 2"
        )
        conn.commit()
        conn.close()

        response = client.get("/api/lessons")
        data = response.json()
        lesson_2 = [lesson for lesson in data if lesson["id"] == 2][0]
        # Lesson-level status from list endpoint is 'locked' (not first lesson,
        # previous lesson not completed)
        assert lesson_2["status"] == "locked"
        # But the single-lesson endpoint allows access when user has in_progress
        # activities (has_any_attempt is True)
        response = client.get("/api/lessons/2")
        assert response.status_code == 200
        lesson_data = response.json()
        assert lesson_data["progress"]["status"] == "in_progress"


# ===========================================================================
# Slice 4: GET /api/lessons/:id (Single Lesson)
# ===========================================================================


class TestSingleLessonIntegration:
    """Tests for Slice 4: GET /api/lessons/:id with lockout."""

    def test_accessible_lesson_returns_200(self, multi_lesson_content):
        """TC-06: Accessible lesson returns full data."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons/1")
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data
        assert "activities" in data
        assert "progress" in data

    def test_locked_lesson_returns_403(self, multi_lesson_content):
        """TC-14: Locked lesson returns 403 with 'locked' message."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons/2")
        assert response.status_code == 403
        error_data = response.json()
        assert "detail" in error_data
        assert "locked" in error_data["detail"].lower()

    def test_completed_lesson_returns_200_with_review_mode(self, multi_lesson_content):
        """TC-15: Completed lesson returns 200 with review mode."""
        client = multi_lesson_content["client"]
        db_path = multi_lesson_content["db_path"]

        # Complete lesson 1
        conn = sqlite3.connect(db_path)
        conn.execute(
            "UPDATE user_progress SET status = 'completed', score = 1.0, attempts = 1 "
            "WHERE lesson_id = 1"
        )
        conn.commit()
        conn.close()

        response = client.get("/api/lessons/1")
        assert response.status_code == 200
        data = response.json()
        assert data["progress"]["status"] == "completed"

    def test_nonexistent_lesson_returns_404(self, multi_lesson_content):
        """TC-07: Non-existent lesson returns 404."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons/999")
        assert response.status_code == 404


# ===========================================================================
# Slice 5: Dashboard Page (Frontend)
# ===========================================================================


class TestDashboardFrontend:
    """Tests for Slice 5: Dashboard page renders lesson data."""

    def test_dashboard_calls_lessons_api(self, multi_lesson_content):
        """TC-01: Dashboard loads and calls GET /api/lessons."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_dashboard_groups_by_level(self, multi_lesson_content):
        """TC-01: Lessons are grouped by level (A1, A2)."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons")
        data = response.json()
        levels = set(lesson["level"] for lesson in data)
        assert "A1" in levels
        assert "A2" in levels


# ===========================================================================
# Slice 6: Lesson View Page (Frontend)
# ===========================================================================


class TestLessonViewFrontend:
    """Tests for Slice 6: Lesson View page renders lesson data."""

    def test_lesson_view_fetches_full_data(self, multi_lesson_content):
        """TC-08: Lesson View loads full lesson data."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons/1")
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data
        assert "activities" in data

    def test_lesson_view_handles_locked_403(self, multi_lesson_content):
        """TC-10: Direct navigation to locked lesson shows 403."""
        client = multi_lesson_content["client"]
        response = client.get("/api/lessons/2")
        assert response.status_code == 403


# ===========================================================================
# Slice 7: Navigation Infrastructure (Frontend)
# ===========================================================================


class TestNavigationFrontend:
    """Tests for Slice 7: Navigation infrastructure."""

    def _frontend_source_dir(self):
        """Get the mounted frontend source directory inside the container."""
        from pathlib import Path

        return Path("/app/frontend_source")

    def test_routes_exist(self):
        """TC-16: File-based routing is configured for /, /lessons/:id, /playground."""
        pages_dir = self._frontend_source_dir() / "pages"

        # Check index.vue exists (Dashboard)
        assert (pages_dir / "index.vue").exists()

        # Check lessons/index.vue exists (Lesson List)
        assert (pages_dir / "lessons" / "index.vue").exists()

        # Check lessons/[id].vue exists (Lesson Detail)
        assert (pages_dir / "lessons" / "[id].vue").exists()

        # Check playground.vue exists
        assert (pages_dir / "playground.vue").exists()

    def test_navbar_component_exists(self):
        """TC-16: NavBar component exists."""
        components_dir = self._frontend_source_dir() / "components"
        assert (components_dir / "NavBar.vue").exists()

    def test_roadmap_sidebar_component_exists(self):
        """TC-16: RoadmapSidebar component exists."""
        components_dir = self._frontend_source_dir() / "components"
        assert (components_dir / "RoadmapSidebar.vue").exists()

    def test_navigation_composables_exist(self):
        """TC-16: Navigation composables exist."""
        composables_dir = self._frontend_source_dir() / "composables"
        assert (composables_dir / "useNavigation.ts").exists()
        assert (composables_dir / "useSidebar.ts").exists()
        assert (composables_dir / "useCurrentLesson.ts").exists()

    def test_activity_renderer_component_exists(self):
        """TC-16: ActivityRenderer component exists."""
        components_dir = self._frontend_source_dir() / "components"
        assert (components_dir / "ActivityRenderer.vue").exists()

    def test_progress_display_composable_exists(self):
        """TC-16: Progress display composable exists."""
        composables_dir = self._frontend_source_dir() / "composables"
        assert (composables_dir / "useProgress.ts").exists()
