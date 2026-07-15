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
