"""Slice 3: `user_progress` table.

Tracks learner progress per lesson and per activity in SQLite.
Handles sequential unlocking: first lesson per level is 'available',
subsequent lessons are 'locked' until prerequisites are met.

Table schema::

    CREATE TABLE user_progress (
        lesson_id INTEGER,
        activity_id INTEGER,
        score REAL DEFAULT 0,
        status TEXT DEFAULT 'locked',  -- 'locked' | 'available' | 'in_progress' | 'completed'
        attempts INTEGER DEFAULT 0,
        completed_at TEXT,              -- ISO 8601 timestamp when lesson completed
        PRIMARY KEY (lesson_id, activity_id)
    );
"""

import logging
import sqlite3
from pathlib import Path

from content_scanner import scan_content
from learning.domain import COMPLETION_THRESHOLD  # noqa: F401
from learning.sqlite_repository import (
    SqliteLessonRepository,
)
from sqlite_safety import apply_safety_pragmas

logger = logging.getLogger(__name__)

# Default database path — same file as lessons_db
DB_PATH = str(Path(__file__).resolve().parent / "lughat.db")


def init_user_progress_db(content_dir: str, db_path: str | None = None) -> None:
    """Initialize the ``user_progress`` table from JSON lesson files.

    On first run, creates the table and populates all (lesson_id, activity_id)
    combinations. The first lesson in each level gets ``status = 'available'``,
    all others get ``status = 'locked'``.

    On subsequent runs, preserves existing progress data. Adds new rows for
    newly discovered lessons/activities. Removes rows for deleted lessons.

    Parameters
    ----------
    content_dir : str
        Path to the content directory containing lesson JSON files.
    db_path : str or None
        Path to the SQLite database file. Defaults to ``lughat.db`` in the
        backend directory (same file as the ``lessons`` table).
    """
    if db_path is None:
        db_path = DB_PATH

    conn = sqlite3.connect(db_path)
    apply_safety_pragmas(conn)

    try:
        # 1. Create the table (if not exists).
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_progress (
                lesson_id INTEGER,
                activity_id INTEGER,
                score REAL DEFAULT 0,
                status TEXT DEFAULT 'locked',
                attempts INTEGER DEFAULT 0,
                completed_at TEXT,
                PRIMARY KEY (lesson_id, activity_id)
            )
        """)
        conn.commit()

        # 2. Scan JSON files to discover all lessons and activities.
        lessons = scan_content(content_dir)

        # Determine which lessons are first-in-level (get 'available' status).
        level_first_seen = {}
        for lesson in lessons:
            level_key = lesson.level.lower()
            if level_key not in level_first_seen:
                level_first_seen[level_key] = lesson.id

        first_lesson_ids = set(level_first_seen.values())

        # Build set of all expected (lesson_id, activity_id) pairs.
        expected_pairs = set()
        for lesson in lessons:
            for activity in lesson.activities or []:
                activity_id = (
                    activity.get("id") if isinstance(activity, dict) else activity.id
                )
                expected_pairs.add((lesson.id, activity_id))

        # Read existing rows.
        existing_rows = conn.execute(
            "SELECT lesson_id, activity_id, score, status, attempts FROM user_progress"
        ).fetchall()
        existing_pairs = {(r[0], r[1]) for r in existing_rows}

        # 3. Add new rows for newly discovered (lesson_id, activity_id) pairs.
        new_pairs = expected_pairs - existing_pairs
        for lesson_id, activity_id in new_pairs:
            is_first = lesson_id in first_lesson_ids
            status = "available" if is_first else "locked"
            conn.execute(
                """
                INSERT INTO user_progress (lesson_id, activity_id, score, status, attempts)
                VALUES (?, ?, 0, ?, 0)
                """,
                (lesson_id, activity_id, status),
            )

        # 4. Remove rows for deleted lessons/activities.
        deleted_pairs = existing_pairs - expected_pairs
        for lesson_id, activity_id in deleted_pairs:
            conn.execute(
                "DELETE FROM user_progress WHERE lesson_id = ? AND activity_id = ?",
                (lesson_id, activity_id),
            )

        conn.commit()

        # 5. Resolve sequential unlock status for all lessons.
        _resolve_sequential_unlock(conn, lessons, first_lesson_ids)

        conn.commit()

        logger.info(
            "user_progress table initialized: %d new, %d deleted, %d total pairs",
            len(new_pairs),
            len(deleted_pairs),
            len(expected_pairs),
        )

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _resolve_sequential_unlock(
    conn: sqlite3.Connection,
    lessons: list,
    first_lesson_ids: set,
) -> None:
    """Resolve sequential unlock status for all lessons.

    Rules:
    - First lesson per level: always 'available' (unless all activities completed).
    - Subsequent lessons: 'available' only if ALL activities in the previous
      lesson (same level, sequence - 1) have status = 'completed'.
    - Otherwise: 'locked'.
    - If any activity has attempts > 0: 'in_progress'.
    - If all activities have status = 'completed': 'completed'.
    """
    # Build a map of lesson_id -> lesson object for quick lookup.
    lesson_map = {lesson.id: lesson for lesson in lessons}

    # Pre-fetch all activity statuses from DB, keyed by (lesson_id, activity_id).
    all_rows = conn.execute(
        "SELECT lesson_id, activity_id, status, attempts FROM user_progress"
    ).fetchall()
    all_statuses = {}
    all_attempts = {}
    for lesson_id, activity_id, status, attempts in all_rows:
        all_statuses[(lesson_id, activity_id)] = status
        all_attempts[(lesson_id, activity_id)] = attempts

    # Sort lessons by level then sequence.
    sorted_lessons = sorted(
        lessons, key=lambda lesson: (lesson.level.lower(), lesson.sequence)
    )

    for i, lesson in enumerate(sorted_lessons):
        lesson_id = lesson.id
        activities = lesson.activities or []

        # Get current statuses for this lesson's activities from the pre-fetched map.
        activity_statuses = {}
        activity_attempts = {}
        for activity in activities:
            aid = activity.get("id") if isinstance(activity, dict) else activity.id
            key = (lesson_id, aid)
            activity_statuses[aid] = all_statuses.get(key, "locked")
            activity_attempts[aid] = all_attempts.get(key, 0)

        # Determine the resolved status for this lesson.
        resolved_status = _resolve_lesson_status(
            conn,
            lesson_id,
            first_lesson_ids,
            i,
            sorted_lessons,
            lesson_map,
            activity_statuses,
            all_statuses,
        )

        # Update all activities for this lesson.
        for activity in activities:
            activity_id = (
                activity.get("id") if isinstance(activity, dict) else activity.id
            )

            # Preserve existing score and attempts.
            current = activity_statuses.get(activity_id, "locked")
            current_attempts = activity_attempts.get(activity_id, 0)

            # Never downgrade 'completed' — once an activity is completed, it stays.
            if current == "completed":
                continue

            # Determine the resolved status for this activity.
            final_status = resolved_status

            # If the activity has attempts > 0 and isn't completed, mark 'in_progress'.
            if current_attempts > 0:
                final_status = "in_progress"

            # Only update if status changed.
            if current != final_status:
                conn.execute(
                    "UPDATE user_progress SET status = ? WHERE lesson_id = ? AND activity_id = ?",
                    (final_status, lesson_id, activity_id),
                )


def _resolve_lesson_status(
    conn: sqlite3.Connection,
    lesson_id: int,
    first_lesson_ids: set,
    index: int,
    sorted_lessons: list,
    lesson_map: dict,
    activity_statuses: dict,
    all_statuses: dict,
) -> str:
    """Resolve the base status for a lesson (before in_progress check).

    Returns 'locked', 'available', or 'completed'.
    """
    # Check if all activities are completed.
    if activity_statuses and all(s == "completed" for s in activity_statuses.values()):
        return "completed"

    # First lesson per level is always available.
    if lesson_id in first_lesson_ids:
        return "available"

    # Check if previous lesson (same level, sequence - 1) is fully completed.
    if index > 0:
        prev_lesson = sorted_lessons[index - 1]
        # Only check previous lesson if it's in the same level.
        if prev_lesson.level.lower() == sorted_lessons[index].level.lower():
            prev_id = prev_lesson.id
            prev_activities = prev_lesson.activities or []
            # Check if all activities in previous lesson are completed
            # using the global all_statuses map (keyed by lesson_id, activity_id).
            prev_completed = all(
                all_statuses.get(
                    (prev_id, a.get("id") if isinstance(a, dict) else a.id), "locked"
                )
                == "completed"
                for a in prev_activities
            )
            if prev_completed and len(prev_activities) > 0:
                return "available"

    return "locked"


# ===========================================================================
# Slice 3: Competency Score Computation & Lesson Completion
# ===========================================================================

# The core logic for Slice 3 (competency scores, lesson completion, sequential
# unlock) lives in ``learning.sqlite_repository`` and is imported here for
# backward compatibility with existing callers that import from progress_db.


def compute_competency_scores(
    conn: sqlite3.Connection,
    lesson_id: int,
) -> dict[str, float]:
    """Compute weighted average per competency from all best activity scores.

    This is a thin wrapper around ``SqliteLessonRepository.compute_competency_scores``
    for backward compatibility.
    """
    repo = SqliteLessonRepository(conn, use_existing=True)
    return repo.compute_competency_scores(lesson_id)


def _check_and_mark_lesson_completed(
    conn: sqlite3.Connection,
    lesson_id: int,
    submitted_activity_id: int | None = None,
    submitted_score: float = 0.0,
    original_status: str = "",
) -> bool:
    """Check if all activities are completed → mark lesson completed.

    This is a thin wrapper around ``SqliteLessonRepository.check_and_mark_lesson_completed``
    for backward compatibility.
    """
    repo = SqliteLessonRepository(conn, use_existing=True)
    return repo.check_and_mark_lesson_completed(
        lesson_id, submitted_activity_id, submitted_score, original_status
    )


def _unlock_next_lesson(
    conn: sqlite3.Connection,
    lesson_id: int,
) -> bool:
    """If this lesson just completed, unlock the next lesson (same level or next level).

    This is a thin wrapper around ``SqliteLessonRepository.unlock_next_lesson``
    for backward compatibility.
    """
    repo = SqliteLessonRepository(conn, use_existing=True)
    return repo.unlock_next_lesson(lesson_id)
