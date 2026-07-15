"""Tests for Slice 1: JSON Content Scanner.

Scans `backend/content/` recursively for `.json` lesson files,
parses them, and returns lesson data sorted by level then sequence.
"""

import json
from pathlib import Path

import pytest

# Import the content scanner module we are about to build
from content_scanner import scan_content, LessonSummary


# ---------------------------------------------------------------------------
# TC-01: No content files → returns [] (empty array, not an error)
# ---------------------------------------------------------------------------


class TestNoContentFiles:
    """When the content directory is missing or empty, return []."""

    def test_missing_content_directory_returns_empty_list(self, tmp_path):
        """TC-01: Missing content directory returns []."""
        missing_dir = tmp_path / "nonexistent"
        result = scan_content(str(missing_dir))
        assert result == []

    def test_empty_content_directory_returns_empty_list(self, tmp_path):
        """TC-01: Empty content directory returns []."""
        empty_dir = tmp_path / "content"
        empty_dir.mkdir()
        result = scan_content(str(empty_dir))
        assert result == []

    def test_content_directory_with_non_json_files(self, tmp_path):
        """Non-JSON files are ignored."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        (content_dir / "readme.txt").write_text("hello")
        (content_dir / "notes.md").write_text("# notes")
        result = scan_content(str(content_dir))
        assert result == []


# ---------------------------------------------------------------------------
# TC-02: One valid lesson → returns 1 lesson summary
# ---------------------------------------------------------------------------


class TestOneValidLesson:
    """A single valid lesson JSON file is parsed and returned."""

    def test_single_lesson_parsed_and_returned(self, tmp_path):
        """TC-02: One valid lesson file produces one summary."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()

        lesson_data = {
            "id": 1,
            "level": "A1",
            "sequence": 1,
            "title": "The Salutations",
            "competencies": ["Can read fluently"],
            "sections": [{"type": "dialogue", "title": "Main Text", "content": {}}],
            "activities": [
                {"id": 1, "type": "listen-translate", "title": "Read", "order": 1}
            ],
        }
        (lesson_dir / "lesson-01.json").write_text(json.dumps(lesson_data))

        result = scan_content(str(content_dir))

        assert len(result) == 1
        lesson = result[0]
        assert isinstance(lesson, LessonSummary)
        assert lesson.id == 1
        assert lesson.level == "A1"
        assert lesson.sequence == 1
        assert lesson.title == "The Salutations"
        assert lesson.competency_count == 1
        assert lesson.section_count == 1
        assert lesson.activity_count == 1

    def test_returns_sections_and_activities_count(self, tmp_path):
        """Verify section_count and activity_count are correct."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()

        lesson_data = {
            "id": 5,
            "level": "A1",
            "sequence": 3,
            "title": "Lesson Five",
            "competencies": ["a", "b", "c"],
            "sections": [
                {"type": "dialogue", "title": "D", "content": {}},
                {"type": "vocabulary", "title": "V", "content": {}},
                {"type": "grammar", "title": "G", "content": {}},
            ],
            "activities": [
                {"id": 1, "type": "listen-translate", "title": "L1", "order": 1},
                {"id": 2, "type": "translate-to-english", "title": "L2", "order": 2},
            ],
        }
        (lesson_dir / "lesson-05.json").write_text(json.dumps(lesson_data))

        result = scan_content(str(content_dir))

        assert len(result) == 1
        assert result[0].section_count == 3
        assert result[0].activity_count == 2


# ---------------------------------------------------------------------------
# TC-03: Malformed JSON → skipped, valid lessons still returned (partial failure)
# ---------------------------------------------------------------------------


class TestMalformedJson:
    """Malformed JSON files are skipped with a log warning; valid lessons are returned."""

    def test_malformed_json_is_skipped(self, tmp_path):
        """TC-03: A file with invalid JSON is skipped, valid lessons are still returned."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()

        good_data = {
            "id": 1,
            "level": "A1",
            "sequence": 1,
            "title": "Good Lesson",
            "competencies": [],
            "sections": [],
            "activities": [],
        }
        (lesson_dir / "lesson-01.json").write_text(json.dumps(good_data))

        # Malformed JSON file
        (lesson_dir / "lesson-02.json").write_text("{ this is not valid json }")

        result = scan_content(str(content_dir))

        assert len(result) == 1
        assert result[0].id == 1

    def test_malformed_json_does_not_raise_exception(self, tmp_path):
        """TC-03: Malformed JSON does not raise an exception."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()
        (lesson_dir / "lesson-01.json").write_text("not json at all!!!")

        # Should not raise
        result = scan_content(str(content_dir))
        assert result == []


# ---------------------------------------------------------------------------
# TC-05: Multiple lessons → sorted by level then sequence
# ---------------------------------------------------------------------------


class TestSorting:
    """Lessons are sorted by level (A1, A2, B1) then by sequence number."""

    def test_sorted_by_level_then_sequence(self, tmp_path):
        """TC-05: Multiple lessons sorted by level then sequence."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()

        lessons = [
            {
                "id": 2,
                "level": "A1",
                "sequence": 2,
                "title": "A1 Lesson 2",
                "competencies": [],
                "sections": [],
                "activities": [],
            },
            {
                "id": 1,
                "level": "A1",
                "sequence": 1,
                "title": "A1 Lesson 1",
                "competencies": [],
                "sections": [],
                "activities": [],
            },
            {
                "id": 3,
                "level": "B1",
                "sequence": 1,
                "title": "B1 Lesson 1",
                "competencies": [],
                "sections": [],
                "activities": [],
            },
            {
                "id": 4,
                "level": "A2",
                "sequence": 1,
                "title": "A2 Lesson 1",
                "competencies": [],
                "sections": [],
                "activities": [],
            },
            {
                "id": 5,
                "level": "A2",
                "sequence": 2,
                "title": "A2 Lesson 2",
                "competencies": [],
                "sections": [],
                "activities": [],
            },
        ]

        for lesson in lessons:
            level_dir = content_dir / lesson["level"].lower()
            level_dir.mkdir(parents=True, exist_ok=True)
            (level_dir / f"lesson-{lesson['id']:02d}.json").write_text(
                json.dumps(lesson)
            )

        result = scan_content(str(content_dir))

        assert len(result) == 5
        # Expected order: A1/s1, A1/s2, A2/s1, A2/s2, B1/s1
        assert result[0].id == 1  # A1, sequence 1
        assert result[1].id == 2  # A1, sequence 2
        assert result[2].id == 4  # A2, sequence 1
        assert result[3].id == 5  # A2, sequence 2
        assert result[4].id == 3  # B1, sequence 1

    def test_level_sorting_is_case_insensitive(self, tmp_path):
        """Levels are sorted case-insensitively (a1, A1, A2, b1)."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()

        lessons = [
            {
                "id": 1,
                "level": "a1",
                "sequence": 1,
                "title": "lowercase a1",
                "competencies": [],
                "sections": [],
                "activities": [],
            },
            {
                "id": 2,
                "level": "B1",
                "sequence": 1,
                "title": "B1",
                "competencies": [],
                "sections": [],
                "activities": [],
            },
        ]

        (content_dir / "a1").mkdir(parents=True)
        (content_dir / "b1").mkdir(parents=True)
        (content_dir / "a1" / "lesson-01.json").write_text(json.dumps(lessons[0]))
        (content_dir / "b1" / "lesson-02.json").write_text(json.dumps(lessons[1]))

        result = scan_content(str(content_dir))

        assert len(result) == 2
        assert result[0].level == "a1"
        assert result[1].level == "B1"


# ---------------------------------------------------------------------------
# TC-03b: Missing required fields → skipped (partial failure)
# ---------------------------------------------------------------------------


class TestMissingRequiredFields:
    """Lessons missing required fields are skipped."""

    def test_missing_id_field_is_skipped(self, tmp_path):
        """TC-04: A lesson missing 'id' is skipped."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()

        no_id = {
            "level": "A1",
            "sequence": 1,
            "title": "No ID",
            "competencies": [],
            "sections": [],
            "activities": [],
        }
        (lesson_dir / "lesson-01.json").write_text(json.dumps(no_id))

        result = scan_content(str(content_dir))
        assert result == []

    def test_missing_level_field_is_skipped(self, tmp_path):
        """TC-04: A lesson missing 'level' is skipped."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()

        no_level = {
            "id": 1,
            "sequence": 1,
            "title": "No Level",
            "competencies": [],
            "sections": [],
            "activities": [],
        }
        (lesson_dir / "lesson-01.json").write_text(json.dumps(no_level))

        result = scan_content(str(content_dir))
        assert result == []

    def test_missing_sequence_field_is_skipped(self, tmp_path):
        """TC-04: A lesson missing 'sequence' is skipped."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()

        no_seq = {
            "id": 1,
            "level": "A1",
            "title": "No Sequence",
            "competencies": [],
            "sections": [],
            "activities": [],
        }
        (lesson_dir / "lesson-01.json").write_text(json.dumps(no_seq))

        result = scan_content(str(content_dir))
        assert result == []

    def test_missing_title_field_is_skipped(self, tmp_path):
        """TC-04: A lesson missing 'title' is skipped."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()

        no_title = {
            "id": 1,
            "level": "A1",
            "sequence": 1,
            "competencies": [],
            "sections": [],
            "activities": [],
        }
        (lesson_dir / "lesson-01.json").write_text(json.dumps(no_title))

        result = scan_content(str(content_dir))
        assert result == []

    def test_missing_competencies_field_is_skipped(self, tmp_path):
        """TC-04: A lesson missing 'competencies' is skipped."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()

        no_comp = {
            "id": 1,
            "level": "A1",
            "sequence": 1,
            "title": "No Competencies",
            "sections": [],
            "activities": [],
        }
        (lesson_dir / "lesson-01.json").write_text(json.dumps(no_comp))

        result = scan_content(str(content_dir))
        assert result == []

    def test_missing_sections_field_is_skipped(self, tmp_path):
        """TC-04: A lesson missing 'sections' is skipped."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()

        no_sec = {
            "id": 1,
            "level": "A1",
            "sequence": 1,
            "title": "No Sections",
            "competencies": [],
            "activities": [],
        }
        (lesson_dir / "lesson-01.json").write_text(json.dumps(no_sec))

        result = scan_content(str(content_dir))
        assert result == []

    def test_missing_activities_field_is_skipped(self, tmp_path):
        """TC-04: A lesson missing 'activities' is skipped."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()

        no_act = {
            "id": 1,
            "level": "A1",
            "sequence": 1,
            "title": "No Activities",
            "competencies": [],
            "sections": [],
        }
        (lesson_dir / "lesson-01.json").write_text(json.dumps(no_act))

        result = scan_content(str(content_dir))
        assert result == []

    def test_mixed_valid_and_invalid_lessons(self, tmp_path):
        """TC-03 + TC-04: Valid lessons are returned even when some are invalid."""
        content_dir = tmp_path / "content"
        content_dir.mkdir()
        lesson_dir = content_dir / "a1"
        lesson_dir.mkdir()

        good = {
            "id": 1,
            "level": "A1",
            "sequence": 1,
            "title": "Good Lesson",
            "competencies": [],
            "sections": [],
            "activities": [],
        }
        (lesson_dir / "lesson-01.json").write_text(json.dumps(good))

        bad_no_id = {
            "level": "A1",
            "sequence": 2,
            "title": "No ID",
            "competencies": [],
            "sections": [],
            "activities": [],
        }
        (lesson_dir / "lesson-02.json").write_text(json.dumps(bad_no_id))

        bad_malformed = "{ not json }"
        (lesson_dir / "lesson-03.json").write_text(bad_malformed)

        result = scan_content(str(content_dir))

        assert len(result) == 1
        assert result[0].id == 1


# ---------------------------------------------------------------------------
# Integration: Existing lesson-01.json (5 sections, 5 activities)
# ---------------------------------------------------------------------------


class TestExistingLessonIntegration:
    """Integration test against the real lesson-01.json file."""

    @pytest.fixture
    def base_dir(self):
        return str(Path(__file__).resolve().parent.parent / "content")

    def test_existing_lesson_01_has_5_sections_and_5_activities(self, base_dir):
        """TC-02: lesson-01.json returns 1 lesson with 5 sections and 5 activities."""
        result = scan_content(base_dir)
        assert len(result) == 1
        lesson = result[0]
        assert lesson.id == 1
        assert lesson.level == "A1"
        assert lesson.sequence == 1
        assert lesson.section_count == 5
        assert lesson.activity_count == 5

    def test_existing_lesson_has_correct_title(self, base_dir):
        """Existing lesson title matches lesson-01.json."""
        result = scan_content(base_dir)
        assert len(result) == 1
        assert "Salutations" in result[0].title

    def test_existing_lesson_competency_count_matches(self, base_dir):
        """Existing lesson competency_count matches the actual competencies array length."""
        result = scan_content(base_dir)
        assert len(result) == 1
        assert result[0].competency_count == 5
