"""Slice 1: JSON Content Scanner.

Scans `backend/content/` recursively for `.json` lesson files,
parses them, and returns lesson data sorted by level then sequence.
"""

import json
import logging
import os
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class LessonSummary:
    """A lightweight summary of a parsed lesson file."""

    id: int
    level: str
    sequence: int
    title: str
    competency_count: int
    section_count: int
    activity_count: int
    competencies: list | None = None  # Raw JSON list (optional, for DB storage)
    sections: list | None = None  # Raw JSON list (optional, for DB storage)
    activities: list | None = None  # Raw JSON list (optional, for DB storage)


REQUIRED_FIELDS = {
    "id",
    "level",
    "sequence",
    "title",
    "competencies",
    "sections",
    "activities",
}


def _parse_lesson(filepath: str) -> "LessonSummary | None":
    """Parse a single lesson JSON file.

    Returns a LessonSummary on success, or None if the file is malformed
    or missing required fields.
    """
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Skipping malformed file '%s': %s", filepath, e)
        return None

    missing = REQUIRED_FIELDS - set(data.keys())
    if missing:
        logger.warning(
            "Skipping '%s': missing required fields: %s",
            filepath,
            ", ".join(sorted(missing)),
        )
        return None

    return LessonSummary(
        id=data["id"],
        level=data["level"],
        sequence=data["sequence"],
        title=data["title"],
        competency_count=len(data["competencies"]),
        section_count=len(data["sections"]),
        activity_count=len(data["activities"]),
        competencies=data["competencies"],
        sections=data["sections"],
        activities=data["activities"],
    )


def scan_content(content_dir: str) -> list[LessonSummary]:
    """Scan the content directory recursively for lesson JSON files.

    - Recursively finds all ``{level}/lesson-{NN}.json`` files.
    - Parses each JSON file, extracting ``id``, ``level``, ``sequence``,
      ``title``, ``competencies``, ``sections``, ``activities``.
    - Sorts results by level (A1 < A2 < B1) then by sequence number.
    - Skips malformed files (logs warning, returns valid lessons — partial failure).
    - Returns ``[]`` when the content directory is missing or empty.
    """
    if not os.path.isdir(content_dir):
        return []

    lessons: list[LessonSummary] = []

    for root, _dirs, files in os.walk(content_dir):
        for filename in files:
            if not filename.endswith(".json"):
                continue
            filepath = os.path.join(root, filename)
            lesson = _parse_lesson(filepath)
            if lesson is not None:
                lessons.append(lesson)

    # Sort by level (case-insensitive) then sequence
    lessons.sort(key=lambda lesson: (lesson.level.lower(), lesson.sequence))

    return lessons


# ---------------------------------------------------------------------------
# Slice 6: JSON Schema Validation
# ---------------------------------------------------------------------------


class SchemaLoader:
    """Loads JSON Schema files from a schemas directory.

    Schema files live in ``backend/content/schemas/`` (one per activity type
    + a common schema).  The loader is initialized once at backend startup
    and caches all schemas in memory.

    Parameters
    ----------
    schemas_dir : str
        Path to the directory containing ``.schema.json`` files.
        If the directory does not exist, ``get_all_schemas()`` returns
        an empty dict — this is not treated as an error.
    """

    def __init__(self, schemas_dir: str | None = None):
        self._schemas_dir = schemas_dir
        self._schemas: dict[str, dict] = {}
        if schemas_dir is not None and os.path.isdir(schemas_dir):
            self._load_schemas()

    def _load_schemas(self) -> None:
        """Load all .schema.json files from the schemas directory."""
        for filename in sorted(os.listdir(self._schemas_dir)):
            if not filename.endswith(".schema.json"):
                continue
            # Schema name = filename without .schema.json
            schema_name = filename[: -len(".schema.json")]
            schema_path = os.path.join(self._schemas_dir, filename)
            try:
                with open(schema_path, "r", encoding="utf-8") as f:
                    self._schemas[schema_name] = json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                logger.warning("Skipping schema file '%s': %s", schema_path, e)

    def get_all_schemas(self) -> dict[str, dict]:
        """Return all loaded schemas as a dict keyed by schema name."""
        return dict(self._schemas)

    def get_schema(self, name: str) -> dict | None:
        """Return a single schema by name, or None if not found."""
        return self._schemas.get(name)


def _resolve_all_of(schema: dict, schemas: dict[str, dict]) -> dict:
    """Resolve ``$ref`` inside ``allOf`` against loaded schemas.

    Returns a merged schema dict with allOf resolved.
    """
    if "$ref" not in schema:
        return dict(schema)

    ref_path = schema["$ref"]  # e.g. "common.schema.json" or "common"
    # Strip .schema.json suffix if present
    ref_name = ref_path
    if ref_name.endswith(".schema.json"):
        ref_name = ref_name[: -len(".schema.json")]

    ref_schema = schemas.get(ref_name)
    if ref_schema is None:
        return dict(schema)  # Can't resolve — return as-is

    # Merge: properties from ref_schema + properties from current schema
    merged = dict(ref_schema)
    if "properties" in schema:
        merged_properties = dict(merged.get("properties", {}))
        merged_properties.update(schema["properties"])
        merged["properties"] = merged_properties
    if "required" in schema:
        merged["required"] = list(set(merged.get("required", []) + schema["required"]))
    return merged


def validate_lesson(
    lesson_data: dict,
    schemas_dir: str | None = None,
) -> list[str]:
    """Validate a parsed lesson data dict against JSON Schema definitions.

    Each activity inside ``lesson_data["activities"]`` is validated against
    its type-specific schema (looked up from ``schemas_dir``).  The lesson
    is also checked for the 7 required top-level fields.

    Parameters
    ----------
    lesson_data : dict
        A parsed lesson dict (as returned by ``_parse_lesson``).
    schemas_dir : str or None
        Path to the schemas directory.  If None or the directory does not
        exist, only the basic required-fields check is performed.

    Returns
    -------
    list[str]
        A list of validation error messages.  An empty list means the
        lesson is valid.
    """
    errors: list[str] = []

    # 1. Check required top-level fields (already done by _parse_lesson,
    #    but re-check here for safety when validate_lesson is called
    #    independently).
    missing = REQUIRED_FIELDS - set(lesson_data.keys())
    if missing:
        errors.append(f"Missing required fields: {', '.join(sorted(missing))}")
        return errors  # Can't validate further without required fields

    # 2. Load schemas if available.
    loader = SchemaLoader(schemas_dir)
    schemas = loader.get_all_schemas()

    if not schemas:
        # No schemas loaded — skip activity-level validation.
        return errors

    # 3. Validate each activity against its type-specific schema.
    activities = lesson_data.get("activities", [])
    for activity in activities:
        if not isinstance(activity, dict):
            errors.append(f"Activity is not a dict: {activity}")
            continue

        activity_type = activity.get("type")
        if activity_type is None:
            errors.append(f"Activity id={activity.get('id')} missing 'type' field")
            continue

        schema_name = activity_type  # e.g. "listen-translate"
        schema = schemas.get(schema_name)
        if schema is None:
            # Unknown activity type — skip (log warning, don't fail).
            logger.warning(
                "No schema found for activity type '%s' (activity id=%s). "
                "Skipping validation.",
                activity_type,
                activity.get("id"),
            )
            continue

        # Resolve $ref in allOf.
        resolved = _resolve_all_of(schema, schemas)

        # Basic JSON Schema validation (without the jsonschema library).
        # We perform a lightweight structural check:
        #   - required fields must be present
        #   - const fields must match
        activity_errors = _validate_against_schema(activity, resolved)
        for err in activity_errors:
            errors.append(
                f"Activity id={activity.get('id')} (type={activity_type}): {err}"
            )

    return errors


def _validate_against_schema(data: dict, schema: dict) -> list[str]:
    """Lightweight JSON Schema validation for lesson activities.

    Checks:
      - ``required`` fields are present
      - ``const`` fields match
      - ``properties`` sub-schema is validated recursively

    Parameters
    ----------
    data : dict
        The activity dict to validate.
    schema : dict
        The resolved JSON Schema for the activity type.

    Returns
    -------
    list[str]
        Validation error messages.
    """
    errors: list[str] = []

    # Check required fields.
    required = schema.get("required", [])
    for field in required:
        if field not in data:
            errors.append(f"Missing required field: '{field}'")

    # Check const fields.
    properties = schema.get("properties", {})
    for prop_name, prop_schema in properties.items():
        if prop_name not in data:
            continue  # Already caught by 'required' check.
        value = data[prop_name]

        # Check const.
        if "const" in prop_schema and value != prop_schema["const"]:
            errors.append(
                f"Field '{prop_name}' must be '{prop_schema['const']}', got '{value}'"
            )

        # Check enum.
        if "enum" in prop_schema and value not in prop_schema["enum"]:
            errors.append(
                f"Field '{prop_name}' must be one of {prop_schema['enum']}, "
                f"got '{value}'"
            )

        # Recurse into object properties.
        if prop_schema.get("type") == "object" and "properties" in prop_schema:
            sub_errors = _validate_against_schema(
                value if isinstance(value, dict) else {},
                prop_schema,
            )
            for sub_err in sub_errors:
                errors.append(f"{prop_name}.{sub_err}")

        # Check array items.
        if prop_schema.get("type") == "array" and "items" in prop_schema:
            if isinstance(value, list):
                item_schema = prop_schema["items"]
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        item_errors = _validate_against_schema(item, item_schema)
                        for item_err in item_errors:
                            errors.append(f"{prop_name}[{i}].{item_err}")

    return errors
