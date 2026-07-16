"""Tests for Slice 6: JSON Schema Validation Integration.

Validates lesson JSON files against JSON Schema definitions:
  - common.schema.json — shared properties (id, type, title, order, max_attempts)
  - listen-translate.schema.json
  - translate-to-english.schema.json
  - translate-to-arabic.schema.json
  - introduce-characters.schema.json
  - role-play.schema.json

Schema files live in `backend/content/schemas/`.
"""

import json
import os
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def schemas_dir(tmp_path):
    """Create a temporary schemas directory with all schema files."""
    schema_dir = tmp_path / "schemas"
    schema_dir.mkdir()

    # common.schema.json
    common_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": ["id", "type", "title", "order", "max_attempts"],
        "properties": {
            "id": {"type": "integer"},
            "type": {"type": "string"},
            "title": {"type": "string"},
            "description": {"type": "string"},
            "order": {"type": "integer"},
            "competency_map": {"type": "object"},
            "max_attempts": {"type": "integer"},
        },
    }
    (schema_dir / "common.schema.json").write_text(json.dumps(common_schema))

    # listen-translate.schema.json
    listen_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "allOf": [{"$ref": "common.schema.json"}],
        "required": ["content"],
        "properties": {
            "type": {"const": "listen-translate"},
            "content": {
                "type": "object",
                "required": ["dialogue"],
                "properties": {
                    "dialogue": {
                        "type": "object",
                        "properties": {
                            "scene1": {
                                "type": "object",
                                "required": ["arabic", "english_expected"],
                            },
                            "scene2": {
                                "type": "object",
                                "required": ["arabic", "english_expected"],
                            },
                        },
                    },
                },
            },
        },
    }
    (schema_dir / "listen-translate.schema.json").write_text(json.dumps(listen_schema))

    # translate-to-english.schema.json
    translate_en_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "allOf": [{"$ref": "common.schema.json"}],
        "properties": {
            "type": {"const": "translate-to-english"},
            "content": {
                "type": "object",
                "required": ["sentences"],
                "properties": {
                    "sentences": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["arabic", "english_expected"],
                            "properties": {
                                "arabic": {"type": "string"},
                                "english_expected": {"type": "string"},
                            },
                        },
                    },
                },
            },
        },
    }
    (schema_dir / "translate-to-english.schema.json").write_text(
        json.dumps(translate_en_schema)
    )

    # translate-to-arabic.schema.json
    translate_ar_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "allOf": [{"$ref": "common.schema.json"}],
        "properties": {
            "type": {"const": "translate-to-arabic"},
            "content": {
                "type": "object",
                "required": ["sentences"],
                "properties": {
                    "sentences": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["english", "arabic_expected"],
                            "properties": {
                                "english": {"type": "string"},
                                "arabic_expected": {"type": "string"},
                            },
                        },
                    },
                },
            },
        },
    }
    (schema_dir / "translate-to-arabic.schema.json").write_text(
        json.dumps(translate_ar_schema)
    )

    # introduce-characters.schema.json
    chars_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "allOf": [{"$ref": "common.schema.json"}],
        "properties": {
            "type": {"const": "introduce-characters"},
            "content": {
                "type": "object",
                "required": ["characters"],
                "properties": {
                    "characters": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["name", "arabic", "gender", "sentences"],
                            "properties": {
                                "name": {"type": "string"},
                                "arabic": {"type": "string"},
                                "gender": {
                                    "type": "string",
                                    "enum": ["male", "female"],
                                },
                                "sentences": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "required": ["english", "arabic_expected"],
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    }
    (schema_dir / "introduce-characters.schema.json").write_text(
        json.dumps(chars_schema)
    )

    # role-play.schema.json
    role_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "allOf": [{"$ref": "common.schema.json"}],
        "properties": {
            "type": {"const": "role-play"},
            "content": {
                "type": "object",
                "required": ["scenario", "expected_elements"],
                "properties": {
                    "scenario": {"type": "string"},
                    "expected_elements": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
    }
    (schema_dir / "role-play.schema.json").write_text(json.dumps(role_schema))

    return schema_dir


# ---------------------------------------------------------------------------
# TC-12: Schema validation passes existing lesson
# ---------------------------------------------------------------------------


class TestSchemaValidationExistingLesson:
    """TC-12: lesson-01.json passes all schema validations."""

    @pytest.fixture
    def base_dir(self):
        return str(Path(__file__).resolve().parent.parent / "content")

    def test_existing_lesson_01_passes_schema_validation(self, base_dir, schemas_dir):
        """TC-12: lesson-01.json passes all schema validations."""
        # The validation module should exist and be integrated
        try:
            from content_scanner import validate_lesson  # type: ignore[attr-defined]
        except ImportError:
            pytest.fail("validate_lesson not yet implemented in content_scanner")

        lesson_path = os.path.join(base_dir, "a1", "lesson-01.json")
        assert os.path.exists(lesson_path), f"lesson-01.json not found at {lesson_path}"

        with open(lesson_path, "r") as f:
            lesson_data = json.load(f)

        # Validate the lesson against its schema
        errors = validate_lesson(lesson_data, str(schemas_dir))
        assert errors == [], (
            f"lesson-01.json should pass schema validation, got: {errors}"
        )

    def test_existing_lesson_has_all_5_activity_types(self, base_dir):
        """Verify lesson-01.json has all 5 activity types."""
        lesson_path = os.path.join(base_dir, "a1", "lesson-01.json")
        with open(lesson_path, "r") as f:
            lesson_data = json.load(f)

        activity_types = {a["type"] for a in lesson_data["activities"]}
        expected_types = {
            "listen-translate",
            "translate-to-english",
            "translate-to-arabic",
            "introduce-characters",
            "role-play",
        }
        assert activity_types == expected_types


# ---------------------------------------------------------------------------
# TC-04: Missing required fields → skipped (partial failure)
# ---------------------------------------------------------------------------


class TestSchemaValidationSkipsInvalid:
    """TC-04: Invalid lessons are skipped with a log warning (partial failure)."""

    def test_activity_missing_required_field_is_skipped(self, tmp_path, schemas_dir):
        """TC-04: An activity missing a required field is flagged as invalid."""
        try:
            from content_scanner import validate_lesson  # type: ignore[attr-defined]
        except ImportError:
            pytest.fail("validate_lesson not yet implemented in content_scanner")

        lesson_data = {
            "id": 1,
            "level": "A1",
            "sequence": 1,
            "title": "Test Lesson",
            "competencies": [],
            "sections": [],
            "activities": [
                {
                    "id": 1,
                    "type": "listen-translate",
                    "title": "Test",
                    "order": 1,
                    "max_attempts": 3,
                    # Missing 'content' — should fail validation
                }
            ],
        }

        errors = validate_lesson(lesson_data, str(schemas_dir))
        assert len(errors) > 0, "Should report validation errors for missing content"


# ---------------------------------------------------------------------------
# Schema loader initialization
# ---------------------------------------------------------------------------


class TestSchemaLoader:
    """Tests for schema loader initialization at startup."""

    def test_schema_loader_loads_all_schema_files(self, schemas_dir):
        """Schema loader initializes at startup and loads all schema files."""
        try:
            from content_scanner import SchemaLoader  # type: ignore[attr-defined]
        except ImportError:
            pytest.fail("SchemaLoader not yet implemented in content_scanner")

        loader = SchemaLoader(str(schemas_dir))
        schemas = loader.get_all_schemas()
        assert len(schemas) > 0, "Should load at least one schema file"

        # Should have common schema + 5 activity schemas
        schema_names = set(schemas.keys())
        assert "common" in schema_names
        assert "listen-translate" in schema_names
        assert "translate-to-english" in schema_names
        assert "translate-to-arabic" in schema_names
        assert "introduce-characters" in schema_names
        assert "role-play" in schema_names

    def test_schema_loader_returns_empty_when_no_schemas_dir(self, tmp_path):
        """Schema loader returns empty dict when schemas directory doesn't exist."""
        try:
            from content_scanner import SchemaLoader  # type: ignore[attr-defined]
        except ImportError:
            pytest.fail("SchemaLoader not yet implemented in content_scanner")

        loader = SchemaLoader(str(tmp_path / "nonexistent"))
        schemas = loader.get_all_schemas()
        assert schemas == {}
