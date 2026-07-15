"""Tests for Slice 2: SQLite `lessons` table initialization.

Populates a SQLite `lessons` table from JSON lesson files on backend startup.
Idempotent: subsequent restarts update changed lessons and remove deleted ones.
"""

import json
import os
import sqlite3
from pathlib import Path

import pytest

from lessons_db import init_lessons_db, DB_PATH


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _setup_table(db_path: str) -> None:
    """Ensure the lessons table exists (CREATE IF NOT EXISTS)."""
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY,
            level TEXT,
            sequence INTEGER,
            title TEXT,
            competency_count INTEGER,
            section_count INTEGER,
            activity_count INTEGER,
            competencies TEXT,
            sections TEXT,
            activities TEXT
        )
    """)
    conn.commit()
    conn.close()


def _read_db(db_path: str) -> list[dict]:
    """Read all rows from the lessons table, returned as dicts,
    ordered by level then sequence."""
    _setup_table(db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM lessons ORDER BY lower(level), sequence, id"
    ).fetchall()
    result = [dict(r) for r in rows]
    conn.close()
    return result


def _write_lesson(
    tmp_dir: Path,
    level: str,
    lesson_id: int,
    title: str,
    competencies: list,
    sections: list,
    sequence: int = 1,
) -> Path:
    """Write a lesson JSON file and return its path."""
    level_dir = tmp_dir / "content" / level
    level_dir.mkdir(parents=True, exist_ok=True)
    lesson_file = level_dir / f"lesson-{lesson_id:02d}.json"
    data = {
        "id": lesson_id,
        "level": level,
        "sequence": sequence,
        "title": title,
        "competencies": competencies,
        "sections": sections,
        "activities": [],
    }
    lesson_file.write_text(json.dumps(data))
    return lesson_file


def _clean_default_db() -> None:
    """Remove the default lughat.db so tests don't interfere with each other."""
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)


# ---------------------------------------------------------------------------
# TC-01: Database file created on first startup
# ---------------------------------------------------------------------------


class TestDatabaseFileCreated:
    """The SQLite database file is created on first init_lessons_db call."""

    def setup_method(self):
        _clean_default_db()

    def test_creates_db_file_when_not_exists(self, tmp_path):
        """TC-01: init_lessons_db creates the SQLite file on first call."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = str(tmp_path / "content")
        os.makedirs(content_dir)

        assert not os.path.exists(db_path)
        init_lessons_db(content_dir, db_path)
        assert os.path.exists(db_path)

    def test_db_file_has_lessons_table(self, tmp_path):
        """TC-01: The created database contains a 'lessons' table."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = str(tmp_path / "content")
        os.makedirs(content_dir)

        init_lessons_db(content_dir, db_path)

        conn = sqlite3.connect(db_path)
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='lessons'"
        ).fetchall()
        conn.close()
        assert len(tables) == 1


# ---------------------------------------------------------------------------
# TC-02: Table schema
# ---------------------------------------------------------------------------


class TestTableSchema:
    """The lessons table has the correct columns."""

    def setup_method(self):
        _clean_default_db()

    def test_table_has_required_columns(self, tmp_path):
        """TC-02: lessons table has id, level, sequence, title, competencies, sections."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = str(tmp_path / "content")
        os.makedirs(content_dir)

        init_lessons_db(content_dir, db_path)

        conn = sqlite3.connect(db_path)
        info = conn.execute("PRAGMA table_info(lessons)").fetchall()
        # Each row: (cid, name, type, notnull, dflt_value, pk)
        col_names = [row[1] for row in info]
        conn.close()

        assert "id" in col_names
        assert "level" in col_names
        assert "sequence" in col_names
        assert "title" in col_names
        assert "competencies" in col_names
        assert "sections" in col_names

    def test_id_is_primary_key(self, tmp_path):
        """TC-02: id is the PRIMARY KEY."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = str(tmp_path / "content")
        os.makedirs(content_dir)

        init_lessons_db(content_dir, db_path)

        conn = sqlite3.connect(db_path)
        constraints = conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='lessons'"
        ).fetchone()
        conn.close()

        assert constraints is not None
        assert "id INTEGER PRIMARY KEY" in constraints[0]


# ---------------------------------------------------------------------------
# TC-02b: Populated from JSON files (existing lesson-01.json)
# ---------------------------------------------------------------------------


class TestPopulatedFromJson:
    """Lessons table is populated from JSON files during initialization."""

    def setup_method(self):
        _clean_default_db()

    @pytest.fixture
    def base_dir(self):
        return str(Path(__file__).resolve().parent.parent / "content")

    def test_populates_lesson_from_existing_json(self, base_dir, tmp_path):
        """TC-02: Existing lesson-01.json is inserted into lessons table."""
        db_path = str(tmp_path / "lughat.db")

        init_lessons_db(base_dir, db_path)

        rows = _read_db(db_path)
        assert len(rows) == 1
        lesson = rows[0]
        assert lesson["id"] == 1
        assert lesson["level"] == "A1"
        assert lesson["sequence"] == 1
        assert "Salutations" in lesson["title"]
        assert lesson["competency_count"] == 5
        assert lesson["section_count"] == 5

    def test_competencies_stored_as_json_string(self, base_dir, tmp_path):
        """TC-02: competencies is stored as a JSON string."""
        db_path = str(tmp_path / "lughat.db")
        init_lessons_db(base_dir, db_path)

        rows = _read_db(db_path)
        comp_data = json.loads(rows[0]["competencies"])
        assert isinstance(comp_data, list)
        assert len(comp_data) == 5

    def test_sections_stored_as_json_string(self, base_dir, tmp_path):
        """TC-02: sections is stored as a JSON string."""
        db_path = str(tmp_path / "lughat.db")
        init_lessons_db(base_dir, db_path)

        rows = _read_db(db_path)
        sec_data = json.loads(rows[0]["sections"])
        assert isinstance(sec_data, list)
        assert len(sec_data) == 5


# ---------------------------------------------------------------------------
# TC-04: Idempotent — subsequent restarts update changed lessons
# ---------------------------------------------------------------------------


class TestIdempotentUpdates:
    """Subsequent calls to init_lessons_db update changed lessons without duplicates."""

    def setup_method(self):
        _clean_default_db()

    def test_update_changes_title(self, tmp_path):
        """TC-04: Updating a lesson's title reflects after re-init."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(
            tmp_path,
            "a1",
            lesson_id=1,
            title="Original Title",
            competencies=["a"],
            sections=[{"type": "dialogue", "title": "D", "content": {}}],
        )

        init_lessons_db(str(content_dir), db_path)
        rows = _read_db(db_path)
        assert len(rows) == 1
        assert rows[0]["title"] == "Original Title"

        # Update the lesson file
        (content_dir / "a1" / "lesson-01.json").write_text(
            json.dumps(
                {
                    "id": 1,
                    "level": "A1",
                    "sequence": 1,
                    "title": "Updated Title",
                    "competencies": ["a", "b"],
                    "sections": [
                        {"type": "dialogue", "title": "D", "content": {}},
                        {"type": "vocabulary", "title": "V", "content": {}},
                    ],
                    "activities": [],
                }
            )
        )

        init_lessons_db(str(content_dir), db_path)
        rows = _read_db(db_path)
        assert len(rows) == 1
        assert rows[0]["title"] == "Updated Title"
        # Should still be exactly 1 row (no duplicate)
        assert len(rows) == 1

    def test_no_duplicate_rows_after_reinit(self, tmp_path):
        """TC-04: Re-initializing does not create duplicate rows."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(
            tmp_path,
            "a1",
            lesson_id=1,
            title="Stable Lesson",
            competencies=["x"],
            sections=[{"type": "grammar", "title": "G", "content": {}}],
        )

        init_lessons_db(str(content_dir), db_path)
        init_lessons_db(str(content_dir), db_path)
        init_lessons_db(str(content_dir), db_path)

        rows = _read_db(db_path)
        assert len(rows) == 1

    def test_update_lesson_count(self, tmp_path):
        """TC-04: Updating competencies count is reflected."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(
            tmp_path,
            "a1",
            lesson_id=1,
            title="Count Test",
            competencies=["a"],
            sections=[{"type": "dialogue", "title": "D", "content": {}}],
        )

        init_lessons_db(str(content_dir), db_path)
        rows = _read_db(db_path)
        assert rows[0]["competency_count"] == 1

        # Update to more competencies
        (content_dir / "a1" / "lesson-01.json").write_text(
            json.dumps(
                {
                    "id": 1,
                    "level": "A1",
                    "sequence": 1,
                    "title": "Count Test",
                    "competencies": ["a", "b", "c"],
                    "sections": [
                        {"type": "dialogue", "title": "D", "content": {}},
                        {"type": "vocabulary", "title": "V", "content": {}},
                    ],
                    "activities": [],
                }
            )
        )

        init_lessons_db(str(content_dir), db_path)
        rows = _read_db(db_path)
        assert rows[0]["competency_count"] == 3
        assert rows[0]["section_count"] == 2


# ---------------------------------------------------------------------------
# TC-05: Sync strategy — deleted JSON files remove SQLite entries
# ---------------------------------------------------------------------------


class TestSyncStrategy:
    """Deleting a JSON file results in the corresponding SQLite entry being removed."""

    def setup_method(self):
        _clean_default_db()

    def test_deleted_lesson_is_removed_from_db(self, tmp_path):
        """TC-05: Removing a JSON file causes its SQLite entry to be deleted on re-init."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(
            tmp_path,
            "a1",
            lesson_id=1,
            title="Lesson 1",
            competencies=["a"],
            sections=[{"type": "dialogue", "title": "D", "content": {}}],
        )
        _write_lesson(
            tmp_path,
            "a1",
            lesson_id=2,
            title="Lesson 2",
            competencies=["b"],
            sections=[{"type": "vocabulary", "title": "V", "content": {}}],
        )

        init_lessons_db(str(content_dir), db_path)
        rows = _read_db(db_path)
        assert len(rows) == 2
        ids = {r["id"] for r in rows}
        assert ids == {1, 2}

        # Remove lesson-02.json
        (content_dir / "a1" / "lesson-02.json").unlink()

        init_lessons_db(str(content_dir), db_path)
        rows = _read_db(db_path)
        assert len(rows) == 1
        assert rows[0]["id"] == 1

    def test_removes_stale_lessons_only(self, tmp_path):
        """TC-05: Only deleted lessons are removed; existing ones stay."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(
            tmp_path,
            "a1",
            lesson_id=1,
            title="Lesson 1",
            competencies=["a"],
            sections=[{"type": "dialogue", "title": "D", "content": {}}],
        )
        _write_lesson(
            tmp_path,
            "a1",
            lesson_id=2,
            title="Lesson 2",
            competencies=["b"],
            sections=[{"type": "vocabulary", "title": "V", "content": {}}],
        )

        init_lessons_db(str(content_dir), db_path)

        # Remove lesson-01, keep lesson-02
        (content_dir / "a1" / "lesson-01.json").unlink()

        init_lessons_db(str(content_dir), db_path)
        rows = _read_db(db_path)
        assert len(rows) == 1
        assert rows[0]["id"] == 2
        assert rows[0]["title"] == "Lesson 2"


# ---------------------------------------------------------------------------
# TC-06: Empty / missing content directory
# ---------------------------------------------------------------------------


class TestEmptyContentDir:
    """When there are no JSON files, the table is empty (no error)."""

    def setup_method(self):
        _clean_default_db()

    def test_empty_content_dir_clears_table(self, tmp_path):
        """TC-06: Empty content directory results in empty lessons table."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        # First populate with a lesson
        _write_lesson(
            tmp_path,
            "a1",
            lesson_id=1,
            title="Lesson 1",
            competencies=["a"],
            sections=[{"type": "dialogue", "title": "D", "content": {}}],
        )
        init_lessons_db(str(content_dir), db_path)
        assert len(_read_db(db_path)) == 1

        # Now remove the lesson file and the a1 directory
        (content_dir / "a1" / "lesson-01.json").unlink()
        (content_dir / "a1").rmdir()

        init_lessons_db(str(content_dir), db_path)
        rows = _read_db(db_path)
        assert len(rows) == 0

    def test_missing_content_dir_clears_table(self, tmp_path):
        """TC-06: Missing content directory results in empty lessons table."""
        db_path = str(tmp_path / "lughat.db")

        # Populate first with a lesson (using a real dir)
        real_dir = str(tmp_path / "real_content")
        real_dir_path = Path(real_dir)
        os.makedirs(real_dir_path / "a1", exist_ok=True)
        (real_dir_path / "a1" / "lesson-01.json").write_text(
            json.dumps(
                {
                    "id": 1,
                    "level": "a1",
                    "sequence": 1,
                    "title": "Lesson 1",
                    "competencies": ["a"],
                    "sections": [{"type": "dialogue", "title": "D", "content": {}}],
                    "activities": [],
                }
            )
        )
        init_lessons_db(real_dir, db_path)
        assert len(_read_db(db_path)) == 1

        # Now call with missing directory
        init_lessons_db(str(tmp_path / "nonexistent"), db_path)
        rows = _read_db(db_path)
        assert len(rows) == 0


# ---------------------------------------------------------------------------
# TC-05: Multiple lessons — sorted by level then sequence
# ---------------------------------------------------------------------------


class TestMultipleLessons:
    """Multiple lessons are inserted and ordered correctly."""

    def setup_method(self):
        _clean_default_db()

    def test_multiple_lessons_inserted(self, tmp_path):
        """TC-05: Multiple lessons are all inserted."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(
            tmp_path,
            "a1",
            1,
            "A1 L1",
            ["a"],
            [{"type": "dialogue", "title": "D", "content": {}}],
        )
        _write_lesson(
            tmp_path,
            "a1",
            2,
            "A1 L2",
            ["b"],
            [{"type": "vocabulary", "title": "V", "content": {}}],
            sequence=2,
        )
        _write_lesson(
            tmp_path,
            "a2",
            3,
            "A2 L1",
            ["c"],
            [{"type": "grammar", "title": "G", "content": {}}],
        )

        init_lessons_db(str(content_dir), db_path)
        rows = _read_db(db_path)
        assert len(rows) == 3

    def test_lessons_ordered_by_level_then_sequence(self, tmp_path):
        """TC-05: Lessons are stored in level then sequence order."""
        db_path = str(tmp_path / "lughat.db")
        content_dir = Path(tmp_path / "content")
        content_dir.mkdir()

        _write_lesson(
            tmp_path,
            "a1",
            10,
            "A1 L1",
            ["b"],
            [{"type": "vocabulary", "title": "V", "content": {}}],
            sequence=1,
        )
        _write_lesson(
            tmp_path,
            "a1",
            20,
            "A1 L2",
            ["a"],
            [{"type": "dialogue", "title": "D", "content": {}}],
            sequence=2,
        )
        _write_lesson(
            tmp_path,
            "a2",
            40,
            "A2 L1",
            ["d"],
            [{"type": "dialogue", "title": "D", "content": {}}],
        )
        _write_lesson(
            tmp_path,
            "b1",
            30,
            "B1 L1",
            ["c"],
            [{"type": "grammar", "title": "G", "content": {}}],
        )

        init_lessons_db(str(content_dir), db_path)
        rows = _read_db(db_path)
        # Expected order: A1/s1, A1/s2, A2/s1, B1/s1
        assert rows[0]["id"] == 10  # A1, seq 1
        assert rows[1]["id"] == 20  # A1, seq 2
        assert rows[2]["id"] == 40  # A2, seq 1
        assert rows[3]["id"] == 30  # B1, seq 1


# ---------------------------------------------------------------------------
# Integration: Existing lesson-01.json (5 sections, 5 activities)
# ---------------------------------------------------------------------------


class TestIntegration:
    """Integration test against the real lesson-01.json file."""

    def setup_method(self):
        _clean_default_db()

    @pytest.fixture
    def base_dir(self):
        return str(Path(__file__).resolve().parent.parent / "content")

    def test_existing_lesson_01_has_5_sections_and_5_activities(
        self, base_dir, tmp_path
    ):
        """TC-02: lesson-01.json returns 1 lesson with 5 sections and 5 activities."""
        db_path = str(tmp_path / "lughat.db")
        init_lessons_db(base_dir, db_path)

        rows = _read_db(db_path)
        assert len(rows) == 1
        lesson = rows[0]
        assert lesson["id"] == 1
        assert lesson["level"] == "A1"
        assert lesson["sequence"] == 1
        assert lesson["section_count"] == 5
        assert lesson["activity_count"] == 5

    def test_existing_lesson_has_correct_title(self, base_dir, tmp_path):
        """Existing lesson title matches lesson-01.json."""
        db_path = str(tmp_path / "lughat.db")
        init_lessons_db(base_dir, db_path)

        rows = _read_db(db_path)
        assert len(rows) == 1
        assert "Salutations" in rows[0]["title"]

    def test_existing_lesson_competency_count_matches(self, base_dir, tmp_path):
        """Existing lesson competency_count matches the actual competencies array length."""
        db_path = str(tmp_path / "lughat.db")
        init_lessons_db(base_dir, db_path)

        rows = _read_db(db_path)
        assert len(rows) == 1
        assert rows[0]["competency_count"] == 5


# ---------------------------------------------------------------------------
# Integration: Default DB path
# ---------------------------------------------------------------------------


class TestDefaultDbPath:
    """Verify the default DB_PATH constant."""

    def test_default_db_path_is_correct(self):
        """TC-01: Default DB path points to lughat.db in the backend directory."""
        # DB_PATH is relative to the backend directory
        assert DB_PATH.endswith("lughat.db")
