"""Slice 2: SQLite `lessons` table initialization.

On each backend startup, populates a SQLite `lessons` table from JSON
lesson files discovered by the content scanner (Slice 1).

- Creates the database file on first call.
- Stores `competencies` and `sections` as JSON strings (not separate tables).
- Idempotent: subsequent calls update changed lessons (by `id`).
- Sync strategy: deletes SQLite entries whose `id` no longer has a
  corresponding JSON file (prevents stale data from deleted JSON files).

Table schema::

    CREATE TABLE lessons (
        id INTEGER PRIMARY KEY,
        level TEXT,
        sequence INTEGER,
        title TEXT,
        competency_count INTEGER,
        section_count INTEGER,
        activity_count INTEGER,
        competencies TEXT,   -- JSON string
        sections TEXT,       -- JSON string
        activities TEXT      -- JSON string
    );
"""

import json
import logging
import sqlite3
from pathlib import Path

from content_scanner import scan_content
from sqlite_safety import apply_safety_pragmas

logger = logging.getLogger(__name__)

# Default database path (relative to the backend directory)
DB_PATH = str(Path(__file__).resolve().parent / "lughat.db")


def init_lessons_db(content_dir: str = "content", db_path: str | None = None) -> None:
    """Initialize (or re-initialize) the SQLite ``lessons`` table from JSON files.

    Parameters
    ----------
    content_dir : str
        Path to the content directory containing ``{level}/lesson-NN.json`` files.
    db_path : str or None
        Path to the SQLite database file. Defaults to ``lughat.db`` in the
        backend directory.

    Side effects
    ------------
    - Creates the database file and ``lessons`` table if they do not exist.
    - Deletes all existing rows (idempotent re-sync).
    - Inserts or updates lessons from JSON files.
    """
    if db_path is None:
        db_path = DB_PATH

    conn = sqlite3.connect(db_path)
    apply_safety_pragmas(conn)

    try:
        # 1. Create the table (if not exists).
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

        # 2. Clear existing data (idempotent re-sync).
        conn.execute("DELETE FROM lessons")
        conn.commit()

        # 3. Scan JSON files and populate.
        lessons = scan_content(content_dir)
        inserted = 0
        for lesson in lessons:
            conn.execute(
                """
                INSERT INTO lessons
                    (id, level, sequence, title, competency_count,
                     section_count, activity_count, competencies, sections, activities)
                VALUES (:id, :level, :sequence, :title, :competency_count,
                        :section_count, :activity_count, :competencies,
                        :sections, :activities)
                """,
                {
                    "id": lesson.id,
                    "level": lesson.level,
                    "sequence": lesson.sequence,
                    "title": lesson.title,
                    "competency_count": lesson.competency_count,
                    "section_count": lesson.section_count,
                    "activity_count": lesson.activity_count,
                    "competencies": json.dumps(lesson.competencies)
                    if lesson.competencies
                    else "[]",
                    "sections": json.dumps(lesson.sections)
                    if lesson.sections
                    else "[]",
                    "activities": json.dumps(lesson.activities)
                    if lesson.activities
                    else "[]",
                },
            )
            inserted += 1

        conn.commit()
        logger.info(
            "lessons table initialized with %d lessons from '%s'", inserted, content_dir
        )

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
