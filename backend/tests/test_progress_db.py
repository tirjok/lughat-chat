"""Tests for Slice 3: `user_progress` table.

Tracks learner progress per lesson and per activity in SQLite.
Handles sequential unlocking: first lesson per level is 'available',
subsequent lessons are 'locked' until prerequisites are met.
"""

import json
import os
import sqlite3
from pathlib import Path

from progress_db import init_user_progress_db

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _write_lesson(
    tmp_dir: Path,
    level: str,
    lesson_id: int,
    title: str,
    sequence: int,
    num_activities: int,
) -> Path:
    """Write a lesson JSON file with the given number of activities."""
    level_dir = tmp_dir / "content" / level
    level_dir.mkdir(parents=True, exist_ok=True)
    lesson_file = level_dir / f"lesson-{lesson_id:02d}.json"
    data = {
        "id": lesson_id,
        "level": level,
        "sequence": sequence,
        "title": title,
        "competencies": [],
        "sections": [],
        "activities": [
            {
                "id": i + 1,
                "type": "listen-translate",
                "title": f"Activity {i + 1}",
                "order": i + 1,
            }
            for i in range(num_activities)
        ],
    }
    lesson_file.write_text(json.dumps(data))
    return lesson_file


def _read_progress(db_path: str) -> list[dict]:
    """Read all rows from user_progress table, ordered by lesson_id then activity_id."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM user_progress ORDER BY lesson_id, activity_id"
    ).fetchall()
    result = [dict(r) for r in rows]
    conn.close()
    return result


def _table_exists(db_path: str) -> bool:
    """Check if user_progress table exists."""
    conn = sqlite3.connect(db_path)
    tables = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user_progress'"
    ).fetchall()
    conn.close()
    return len(tables) == 1


# ---------------------------------------------------------------------------
# Cycle 1: Tracer bullet — table creation with correct schema
# ---------------------------------------------------------------------------


class TestTableCreation:
    """user_progress table is created on first init with correct schema."""

    def test_creates_user_progress_table(self, tmp_path):
        """TC-09: user_progress table is created on first init_user_progress_db call."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = str(tmp_path / "content")
        os.makedirs(content_dir)

        assert not _table_exists(db_path)
        init_user_progress_db(content_dir, db_path)
        assert _table_exists(db_path)

    def test_table_has_correct_columns(self, tmp_path):
        """user_progress table has lesson_id, activity_id, score, status, attempts."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = str(tmp_path / "content")
        os.makedirs(content_dir)

        init_user_progress_db(content_dir, db_path)

        conn = sqlite3.connect(db_path)
        info = conn.execute("PRAGMA table_info(user_progress)").fetchall()
        col_names = [row[1] for row in info]
        conn.close()

        assert "lesson_id" in col_names
        assert "activity_id" in col_names
        assert "score" in col_names
        assert "status" in col_names
        assert "attempts" in col_names

    def test_composite_primary_key(self, tmp_path):
        """user_progress uses (lesson_id, activity_id) as composite primary key."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = str(tmp_path / "content")
        os.makedirs(content_dir)

        init_user_progress_db(content_dir, db_path)

        conn = sqlite3.connect(db_path)
        constraints = conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='user_progress'"
        ).fetchone()
        conn.close()

        assert constraints is not None
        assert "PRIMARY KEY (lesson_id, activity_id)" in constraints[0]


# ---------------------------------------------------------------------------
# Cycle 2: First lesson per level is 'available'
# ---------------------------------------------------------------------------


class TestFirstLessonAvailable:
    """First lesson in each level is initialized as 'available'."""

    def test_first_lesson_activities_are_available(self, tmp_path):
        """TC-09: First lesson per level has all activities with status='available'."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(tmp_path, "a1", 1, "A1 Lesson 1", 1, 3)

        init_user_progress_db(str(content_dir), db_path)

        rows = _read_progress(db_path)
        assert len(rows) == 3  # 3 activities for lesson 1
        for row in rows:
            assert row["lesson_id"] == 1
            assert row["status"] == "available"
            assert row["score"] == 0
            assert row["attempts"] == 0

    def test_first_lesson_each_level_is_available(self, tmp_path):
        """TC-09: First lesson in each of multiple levels is 'available'."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(tmp_path, "a1", 1, "A1 L1", 1, 2)
        _write_lesson(tmp_path, "a2", 2, "A2 L1", 1, 1)
        _write_lesson(tmp_path, "b1", 3, "B1 L1", 1, 1)

        init_user_progress_db(str(content_dir), db_path)

        rows = _read_progress(db_path)
        # Map by (lesson_id, activity_id)
        by_key = {(r["lesson_id"], r["activity_id"]): r for r in rows}

        # All first lessons should be 'available'
        assert by_key[(1, 1)]["status"] == "available"
        assert by_key[(1, 2)]["status"] == "available"
        assert by_key[(2, 1)]["status"] == "available"
        assert by_key[(3, 1)]["status"] == "available"


# ---------------------------------------------------------------------------
# Cycle 3: Subsequent lessons are 'locked'
# ---------------------------------------------------------------------------


class TestSubsequentLessonsLocked:
    """Lessons after the first in each level are initialized as 'locked'."""

    def test_second_lesson_in_level_is_locked(self, tmp_path):
        """TC-10: Second lesson in same level has status='locked'."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(tmp_path, "a1", 1, "A1 L1", 1, 2)
        _write_lesson(tmp_path, "a1", 2, "A1 L2", 2, 1)

        init_user_progress_db(str(content_dir), db_path)

        rows = _read_progress(db_path)
        by_key = {(r["lesson_id"], r["activity_id"]): r for r in rows}

        # Lesson 1 activities are 'available'
        assert by_key[(1, 1)]["status"] == "available"
        assert by_key[(1, 2)]["status"] == "available"
        # Lesson 2 activities are 'locked'
        assert by_key[(2, 1)]["status"] == "locked"


# ---------------------------------------------------------------------------
# Cycle 4: All (lesson_id, activity_id) combos populated from lesson-01.json
# ---------------------------------------------------------------------------


class TestPopulatedFromExistingLesson:
    """All (lesson_id, activity_id) combinations are populated from JSON files."""

    def test_existing_lesson_01_creates_5_activity_rows(self, tmp_path):
        """TC-02: lesson-01.json creates 5 user_progress rows (one per activity)."""
        base_dir = str(Path(__file__).resolve().parent.parent / "content")
        db_path = str(tmp_path / "lughat.db")

        init_user_progress_db(base_dir, db_path)

        rows = _read_progress(db_path)
        assert len(rows) == 5  # 5 activities in lesson-01.json

        # All belong to lesson 1
        for row in rows:
            assert row["lesson_id"] == 1

        # Activity IDs match the JSON file (1, 2, 3, 4, 5)
        activity_ids = [r["activity_id"] for r in rows]
        assert activity_ids == [1, 2, 3, 4, 5]

        # All are 'available' (first lesson in level)
        for row in rows:
            assert row["status"] == "available"


# ---------------------------------------------------------------------------
# Cycle 5: Subsequent restarts preserve existing progress data
# ---------------------------------------------------------------------------


class TestPreservesProgress:
    """Subsequent calls to init_user_progress_db preserve existing progress data."""

    def test_preserves_completed_status_on_reinit(self, tmp_path):
        """TC-09: If an activity was marked 'completed', re-init preserves it."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(tmp_path, "a1", 1, "A1 L1", 1, 2)

        # First init — all 'available'
        init_user_progress_db(str(content_dir), db_path)
        rows = _read_progress(db_path)
        assert all(r["status"] == "available" for r in rows)

        # Simulate user completing activity 1
        conn = sqlite3.connect(db_path)
        conn.execute(
            "UPDATE user_progress SET status = 'completed', score = 1.0, attempts = 2 "
            "WHERE lesson_id = 1 AND activity_id = 1"
        )
        conn.commit()
        conn.close()

        # Re-init
        init_user_progress_db(str(content_dir), db_path)

        rows = _read_progress(db_path)
        by_key = {(r["lesson_id"], r["activity_id"]): r for r in rows}
        assert by_key[(1, 1)]["status"] == "completed"
        assert by_key[(1, 1)]["score"] == 1.0
        assert by_key[(1, 1)]["attempts"] == 2
        # Activity 2 is still 'available' (not touched)
        assert by_key[(1, 2)]["status"] == "available"

    def test_preserves_in_progress_status_on_reinit(self, tmp_path):
        """TC-09: If an activity was marked 'in_progress', re-init preserves it."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(tmp_path, "a1", 1, "A1 L1", 1, 2)

        # First init
        init_user_progress_db(str(content_dir), db_path)

        # Simulate user starting activity 1
        conn = sqlite3.connect(db_path)
        conn.execute(
            "UPDATE user_progress SET status = 'in_progress', attempts = 1 "
            "WHERE lesson_id = 1 AND activity_id = 1"
        )
        conn.commit()
        conn.close()

        # Re-init
        init_user_progress_db(str(content_dir), db_path)

        rows = _read_progress(db_path)
        by_key = {(r["lesson_id"], r["activity_id"]): r for r in rows}
        assert by_key[(1, 1)]["status"] == "in_progress"
        assert by_key[(1, 1)]["attempts"] == 1


# ---------------------------------------------------------------------------
# Cycle 6: Sequential unlock — completing lesson unlocks next
# ---------------------------------------------------------------------------


class TestSequentialUnlock:
    """Sequential unlock: completing all activities in lesson N unlocks lesson N+1."""

    def test_completing_lesson_unlocks_next(self, tmp_path):
        """TC-05: When all activities in lesson 1 are 'completed', lesson 2 becomes 'available'."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(tmp_path, "a1", 1, "A1 L1", 1, 2)
        _write_lesson(tmp_path, "a1", 2, "A1 L2", 2, 1)

        # First init — L1 available, L2 locked
        init_user_progress_db(str(content_dir), db_path)

        # Simulate completing all activities in lesson 1
        conn = sqlite3.connect(db_path)
        conn.execute(
            "UPDATE user_progress SET status = 'completed', score = 1.0, attempts = 1 "
            "WHERE lesson_id = 1"
        )
        conn.commit()
        conn.close()

        # Re-init — should resolve sequential unlock
        init_user_progress_db(str(content_dir), db_path)

        rows = _read_progress(db_path)
        by_key = {(r["lesson_id"], r["activity_id"]): r for r in rows}

        # Lesson 1 stays completed
        assert by_key[(1, 1)]["status"] == "completed"
        assert by_key[(1, 2)]["status"] == "completed"
        # Lesson 2 becomes available
        assert by_key[(2, 1)]["status"] == "available"

    def test_partial_completion_does_not_unlock_next(self, tmp_path):
        """TC-05: If only some activities in lesson 1 are completed, lesson 2 stays 'locked'."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(tmp_path, "a1", 1, "A1 L1", 1, 2)
        _write_lesson(tmp_path, "a1", 2, "A1 L2", 2, 1)

        init_user_progress_db(str(content_dir), db_path)

        # Complete only activity 1 of lesson 1 (activity 2 still available)
        conn = sqlite3.connect(db_path)
        conn.execute(
            "UPDATE user_progress SET status = 'completed', score = 1.0, attempts = 1 "
            "WHERE lesson_id = 1 AND activity_id = 1"
        )
        conn.commit()
        conn.close()

        # Re-init — lesson 2 should stay locked
        init_user_progress_db(str(content_dir), db_path)

        rows = _read_progress(db_path)
        by_key = {(r["lesson_id"], r["activity_id"]): r for r in rows}

        assert by_key[(1, 1)]["status"] == "completed"
        assert by_key[(1, 2)]["status"] == "available"  # not completed yet
        assert by_key[(2, 1)]["status"] == "locked"  # stays locked
