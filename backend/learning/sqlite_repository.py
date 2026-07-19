"""Learning Module — SQLite repository implementation.

Implements ``LessonRepository`` using raw SQLite.  This is the
**concrete dependency** — all infrastructure concerns (queries,
connections, pragmas) are contained here.

Usage::

    from learning.repository import SqliteLessonRepository

    repo = SqliteLessonRepository("/path/to/lughat.db")
    summaries = repo.list_lessons()
"""

from __future__ import annotations

import json
import logging
import sqlite3
from typing import Any

from db.safety import apply_safety_pragmas
from learning.domain import (
    ActivityProgress,
    COMPLETION_THRESHOLD,
    LessonDetail,
    LessonId,
    LessonSummary,
)
from learning.repository import LessonRepository

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SQL statement templates (single source of truth for queries)
# ---------------------------------------------------------------------------

_SELECT_LESSONS = (
    "SELECT id, level, sequence, title, competency_count, "
    "section_count, activity_count "
    "FROM lessons ORDER BY level ASC, sequence ASC"
)

_SELECT_LESSON_BY_ID = (
    "SELECT id, level, sequence, title, competency_count, "
    "section_count, activity_count, competencies, sections, "
    "activities "
    "FROM lessons WHERE id = ?"
)

_SELECT_PROGRESS = "SELECT lesson_id, activity_id, status FROM user_progress"

_SELECT_PROGRESS_BY_LESSON = (
    "SELECT lesson_id, activity_id, score, status, attempts "
    "FROM user_progress WHERE lesson_id = ?"
)

_SELECT_ALL_LESSON_STATUSES = "SELECT lesson_id, activity_id, status FROM user_progress"

_SELECT_ALL_LESSONS = (
    "SELECT id, level, sequence, title, competency_count, "
    "section_count, activity_count, competencies, sections, "
    "activities "
    "FROM lessons ORDER BY level ASC, sequence ASC"
)

_SELECT_LESSON_LEVEL_SEQ = "SELECT level, sequence FROM lessons WHERE id = ?"

_SELECT_NEXT_LESSON = (
    "SELECT id, level, sequence FROM lessons ORDER BY level ASC, sequence ASC"
)

_SELECT_LESSON_PROGRESS_STATUSES = (
    "SELECT status FROM user_progress WHERE lesson_id = ?"
)

_SELECT_ALL_LESSONS_FOR_LEVEL = (
    "SELECT id, level, sequence FROM lessons ORDER BY level ASC, sequence ASC"
)

_SELECT_LEARNER_PROGRESS = (
    "SELECT activity_id, score FROM user_progress WHERE lesson_id = ?"
)

_SELECT_ACTIVITIES_JSON = "SELECT activities FROM lessons WHERE id = ?"

_UPDATE_ACTIVITY = (
    "INSERT INTO user_progress "
    "(lesson_id, activity_id, score, status, attempts) "
    "VALUES (?, ?, ?, ?, ?) "
    "ON CONFLICT(lesson_id, activity_id) "
    "DO UPDATE SET "
    "  score = MAX(user_progress.score, ?), "
    "  status = ?, "
    "  attempts = ?"
)

_MARK_COMPLETED = (
    "UPDATE user_progress "
    "SET status = 'completed', completed_at = ? "
    "WHERE lesson_id = ?"
)

_UNLOCK_LESSON = "UPDATE user_progress SET status = 'available' WHERE lesson_id = ?"


class SqliteLessonRepository(LessonRepository):
    """SQLite-backed implementation of ``LessonRepository``.

    Parameters
    ----------
    db_path : str
        Path to the SQLite database file.
    """

    def __init__(
        self,
        db_path: str | sqlite3.Connection,
        use_existing: bool = False,
    ) -> None:
        """Create a repository backed by SQLite.

        Parameters
        ----------
        db_path : str or sqlite3.Connection
            Path to the SQLite database file, or an **open connection**
            when ``use_existing=True`` (for backward-compatible callers
            that already hold a connection).
        use_existing : bool
            If ``True``, ``db_path`` is expected to be an open
            ``sqlite3.Connection`` and the repository will **not** close
            it.  Defaults to ``False`` (open and close per-request).
        """
        if use_existing:
            self._conn: sqlite3.Connection = db_path  # type: ignore[assignment]
            self._owns_connection = False
        else:
            self._db_path: str = db_path  # type: ignore[assignment]
            self._owns_connection = True

    # ------------------------------------------------------------------
    # Internal helper: obtain a connection
    # ------------------------------------------------------------------

    def _get_conn(self) -> sqlite3.Connection:
        """Return an open SQLite connection.

        When the repository was constructed with an existing connection
        (``use_existing=True``), returns it unchanged.  Otherwise opens a
        new connection and applies safety pragmas.
        """
        if self._owns_connection:
            conn = sqlite3.connect(self._db_path)
            apply_safety_pragmas(conn)
            return conn
        return self._conn  # type: ignore[return-value]

    # ------------------------------------------------------------------
    # Public interface — read operations
    # ------------------------------------------------------------------

    def list_lessons(self) -> list[LessonSummary]:
        """Return all lesson summaries with resolved status."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            rows = conn.execute(_SELECT_LESSONS).fetchall()
            if not rows:
                return []

            progress_rows = conn.execute(_SELECT_PROGRESS).fetchall()

            lesson_activity_statuses: dict[int, dict[int, str]] = {}
            for lesson_id, activity_id, status in progress_rows:
                lesson_activity_statuses.setdefault(lesson_id, {})[activity_id] = status

            sorted_rows = sorted(rows, key=lambda r: (r[1].lower(), r[2]))

            first_lesson_ids: set[int] = set()
            seen_levels: set[str] = set()
            for row in sorted_rows:
                level_key = row[1].lower()
                if level_key not in seen_levels:
                    seen_levels.add(level_key)
                    first_lesson_ids.add(row[0])

            summaries = []
            for i, row in enumerate(sorted_rows):
                (
                    lesson_id,
                    level,
                    sequence,
                    title,
                    competency_count,
                    section_count,
                    activity_count,
                ) = row

                activity_statuses = lesson_activity_statuses.get(lesson_id, {})
                all_completed = activity_statuses and all(
                    s == "completed" for s in activity_statuses.values()
                )

                status = (
                    "completed"
                    if all_completed
                    else "available"
                    if lesson_id in first_lesson_ids
                    else self._compute_status_from_prev(
                        sorted_rows, i, lesson_activity_statuses, first_lesson_ids
                    )
                )

                summaries.append(
                    LessonSummary(
                        id=LessonId(lesson_id),
                        level=level,
                        sequence=sequence,
                        title=title,
                        competency_count=competency_count,
                        section_count=section_count,
                        status=status,
                    )
                )

            return summaries
        finally:
            if self._owns_connection:
                conn.close()

    def get_lesson(self, lesson_id: int) -> LessonDetail:
        """Return full lesson detail with progress."""
        from fastapi import HTTPException

        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)

            row = conn.execute(_SELECT_LESSON_BY_ID, (lesson_id,)).fetchone()
            if not row:
                raise HTTPException(
                    status_code=404,
                    detail=f"Lesson with id {lesson_id} not found",
                )

            (
                lesson_id_val,
                level,
                sequence,
                title,
                competency_count,
                section_count,
                activity_count,
                competencies_json,
                sections_json,
                activities_json,
            ) = row

            competencies = json.loads(competencies_json) if competencies_json else []
            sections = json.loads(sections_json) if sections_json else []
            activities = json.loads(activities_json) if activities_json else []

            progress_rows = conn.execute(
                _SELECT_PROGRESS_BY_LESSON, (lesson_id_val,)
            ).fetchall()

            activity_progress: dict[str, ActivityProgress] = {}
            for p_lesson_id, activity_id, score, status, attempts in progress_rows:
                activity_progress[str(activity_id)] = ActivityProgress(
                    score=score if score is not None else 0.0,
                    status=status,
                    attempts=attempts if attempts is not None else 0,
                )

            lesson_status = self._resolve_lesson_status(
                activity_count, activity_progress
            )

            return LessonDetail(
                id=LessonId(lesson_id_val),
                level=level,
                sequence=sequence,
                title=title,
                competencies=competencies,
                sections=sections,
                activities=activities,
                progress_status=lesson_status,
                activity_progress=activity_progress,
            )
        finally:
            if self._owns_connection:
                conn.close()

    # ------------------------------------------------------------------
    # Public interface — write operations
    # ------------------------------------------------------------------

    def save_activity_result(
        self,
        lesson_id: int,
        activity_id: int,
        score: float,
        status: str,
        attempts: int,
    ) -> None:
        """Persist a single activity result."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            conn.execute(
                _UPDATE_ACTIVITY,
                (
                    lesson_id,
                    activity_id,
                    score,
                    status,
                    attempts,
                    score,
                    status,
                    attempts,
                ),
            )
            conn.commit()
        finally:
            if self._owns_connection:
                conn.close()

    # ------------------------------------------------------------------
    # Raw row access (used by service layer for complex workflows)
    # ------------------------------------------------------------------

    def get_lesson_raw(self, lesson_id: int) -> dict[str, Any] | None:
        """Return raw lesson row dict (with JSON columns as strings)."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            row = conn.execute(_SELECT_LESSON_BY_ID, (lesson_id,)).fetchone()
            if not row:
                return None
            keys = [
                "id",
                "level",
                "sequence",
                "title",
                "competency_count",
                "section_count",
                "activity_count",
                "competencies",
                "sections",
                "activities",
            ]
            return dict(zip(keys, row))
        finally:
            if self._owns_connection:
                conn.close()

    def get_activity_progress(self, lesson_id: int) -> dict[str, dict[str, Any]]:
        """Return per-activity progress for a lesson."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            rows = conn.execute(_SELECT_PROGRESS_BY_LESSON, (lesson_id,)).fetchall()
            result: dict[str, dict[str, Any]] = {}
            for p_lesson_id, activity_id, score, status, attempts in rows:
                result[str(activity_id)] = {
                    "score": score if score is not None else 0.0,
                    "status": status,
                    "attempts": attempts if attempts is not None else 0,
                }
            return result
        finally:
            if self._owns_connection:
                conn.close()

    def get_lesson_activity_count(self, lesson_id: int) -> int:
        """Return the number of activities defined for a lesson."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            row = conn.execute(_SELECT_LESSON_BY_ID, (lesson_id,)).fetchone()
            return row[6] if row else 0  # activity_count is index 6
        finally:
            if self._owns_connection:
                conn.close()

    def get_all_lesson_activity_statuses(self) -> list[tuple[int, int, str]]:
        """Return all (lesson_id, activity_id, status) rows."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            return conn.execute(_SELECT_ALL_LESSON_STATUSES).fetchall()
        finally:
            if self._owns_connection:
                conn.close()

    def get_lesson_row(self, lesson_id: int) -> dict[str, Any] | None:
        """Return a raw lesson row dict (with JSON columns as strings)."""
        return self.get_lesson_raw(lesson_id)

    def get_all_lessons(self) -> list[dict[str, Any]]:
        """Return all lesson rows (with JSON columns as strings)."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            rows = conn.execute(_SELECT_ALL_LESSONS).fetchall()
            keys = [
                "id",
                "level",
                "sequence",
                "title",
                "competency_count",
                "section_count",
                "activity_count",
                "competencies",
                "sections",
                "activities",
            ]
            return [dict(zip(keys, row)) for row in rows]
        finally:
            if self._owns_connection:
                conn.close()

    def get_lesson_ids_sorted(self) -> list[int]:
        """Return lesson IDs sorted by (level, sequence)."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            return [r[0] for r in conn.execute(_SELECT_ALL_LESSONS).fetchall()]
        finally:
            if self._owns_connection:
                conn.close()

    def get_lessons_by_level(self) -> dict[str, int]:
        """Return the first lesson ID per level."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            rows = conn.execute(_SELECT_ALL_LESSONS).fetchall()
            result: dict[str, int] = {}
            seen: set[str] = set()
            for row in rows:
                level_key = row[1].lower()
                if level_key not in seen:
                    seen.add(level_key)
                    result[level_key] = row[0]
            return result
        finally:
            if self._owns_connection:
                conn.close()

    def get_lesson_level_and_sequence(self, lesson_id: int) -> tuple[str, int] | None:
        """Return (level, sequence) for a lesson."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            row = conn.execute(_SELECT_LESSON_LEVEL_SEQ, (lesson_id,)).fetchone()
            return (row[0], row[1]) if row else None
        finally:
            if self._owns_connection:
                conn.close()

    def get_next_lesson_id(self, lesson_id: int) -> int | None:
        """Return the next lesson ID in (level, sequence) order."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            all_lessons = conn.execute(_SELECT_NEXT_LESSON).fetchall()
            for i, (lid, _, _) in enumerate(all_lessons):
                if lid == lesson_id and i < len(all_lessons) - 1:
                    return all_lessons[i + 1][0]
            return None
        finally:
            if self._owns_connection:
                conn.close()

    def mark_lesson_completed(self, lesson_id: int) -> None:
        """Mark all activities in a lesson as completed."""
        from datetime import datetime, timezone

        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(_MARK_COMPLETED, (now, lesson_id))
            conn.commit()
        finally:
            if self._owns_connection:
                conn.close()

    def unlock_lesson(self, lesson_id: int) -> None:
        """Set a lesson's status to 'available'."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            conn.execute(_UNLOCK_LESSON, (lesson_id,))
            conn.commit()
        finally:
            if self._owns_connection:
                conn.close()

    def get_lesson_progress_status(self, lesson_id: int) -> list[str]:
        """Return all status values for a lesson's activities."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            return [
                r[0]
                for r in conn.execute(
                    _SELECT_LESSON_PROGRESS_STATUSES, (lesson_id,)
                ).fetchall()
            ]
        finally:
            if self._owns_connection:
                conn.close()

    def get_next_lesson_level(self, lesson_id: int) -> tuple[str, int] | None:
        """Return (level, sequence) of the next lesson."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            all_lessons = conn.execute(_SELECT_NEXT_LESSON).fetchall()
            for i, (lid, _, _) in enumerate(all_lessons):
                if lid == lesson_id and i < len(all_lessons) - 1:
                    return (all_lessons[i + 1][1], all_lessons[i + 1][2])
            return None
        finally:
            if self._owns_connection:
                conn.close()

    def get_lessons_in_level(self, level: str) -> list[int]:
        """Return all lesson IDs in a level."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            rows = conn.execute(_SELECT_ALL_LESSONS_FOR_LEVEL).fetchall()
            return [lid for lid, lvl, _ in rows if lvl.lower() == level.lower()]
        finally:
            if self._owns_connection:
                conn.close()

    def get_lesson_progress_by_id(self, lesson_id: int) -> list[tuple[int, float]]:
        """Return (activity_id, score) for a lesson."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            return conn.execute(_SELECT_LEARNER_PROGRESS, (lesson_id,)).fetchall()
        finally:
            if self._owns_connection:
                conn.close()

    def get_lesson_activities_json(self, lesson_id: int) -> str | None:
        """Return the raw activities JSON string for a lesson."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            row = conn.execute(_SELECT_ACTIVITIES_JSON, (lesson_id,)).fetchone()
            return row[0] if row else None
        finally:
            if self._owns_connection:
                conn.close()

    def compute_competency_scores(self, lesson_id: int) -> dict[str, float]:
        """Compute weighted average per competency."""

        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)

            lesson_row = conn.execute(
                "SELECT activities FROM lessons WHERE id = ?",
                (lesson_id,),
            ).fetchone()

            if not lesson_row:
                return {}

            activities_data = json.loads(lesson_row[0]) if lesson_row[0] else []

            progress_rows = conn.execute(
                "SELECT activity_id, score FROM user_progress WHERE lesson_id = ?",
                (lesson_id,),
            ).fetchall()

            best_scores = {int(r[0]): float(r[1]) for r in progress_rows}

            competency_numerators: dict[str, float] = {}
            competency_denominators: dict[str, float] = {}

            for activity in activities_data:
                activity_id = activity.get("id") if isinstance(activity, dict) else None
                if activity_id is None:
                    continue

                score = best_scores.get(activity_id, 0.0)
                competency_map = activity.get("competency_map", {})
                if not competency_map:
                    continue

                for competency, weight in competency_map.items():
                    competency_numerators.setdefault(competency, 0.0)
                    competency_denominators.setdefault(competency, 0.0)
                    competency_numerators[competency] += score * weight
                    competency_denominators[competency] += weight

            competency_scores: dict[str, float] = {}
            for competency in competency_numerators:
                denom = competency_denominators[competency]
                if denom > 0:
                    competency_scores[competency] = round(
                        competency_numerators[competency] / denom, 4
                    )

            return competency_scores
        finally:
            if self._owns_connection:
                conn.close()

    def check_and_mark_lesson_completed(
        self,
        lesson_id: int,
        submitted_activity_id: int | None = None,
        submitted_score: float = 0.0,
        original_status: str = "",
    ) -> bool:
        """Check if all activities are completed → mark lesson completed."""
        from datetime import datetime, timezone

        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)

            rows = conn.execute(
                "SELECT activity_id, score, status FROM user_progress WHERE lesson_id = ?",
                (lesson_id,),
            ).fetchall()

            if not rows:
                return False

            max_scores: dict[int, float] = {}
            for act_id, score, status in rows:
                act_id_int = int(act_id)
                if act_id_int not in max_scores or (score or 0) > (
                    max_scores[act_id_int] or 0
                ):
                    max_scores[act_id_int] = score

            all_completed = True
            for act_id, score, status in rows:
                act_id_int = int(act_id)
                if status == "completed":
                    continue
                if (
                    submitted_activity_id is not None
                    and act_id_int == submitted_activity_id
                ):
                    if (score or 0) >= COMPLETION_THRESHOLD:
                        continue
                all_completed = False
                break

            if not all_completed:
                return False

            # Was the lesson already fully completed before this submission?
            # If the submitted activity's status was already 'completed' (or
            # anything other than 'in_progress' / empty), the lesson was
            # already fully completed — nothing to do.
            if original_status and original_status != "in_progress":
                return False  # Already fully completed — do not re-mark.

            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE user_progress "
                "SET status = 'completed', completed_at = ? "
                "WHERE lesson_id = ?",
                (now, lesson_id),
            )
            conn.commit()
            return True
        finally:
            if self._owns_connection:
                conn.close()

    def unlock_next_lesson(self, lesson_id: int) -> bool:
        """Unlock the next lesson if current is completed."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)

            lesson_row = conn.execute(_SELECT_LESSON_LEVEL_SEQ, (lesson_id,)).fetchone()

            if not lesson_row:
                return False

            current_level = lesson_row[0]

            all_lessons = conn.execute(_SELECT_NEXT_LESSON).fetchall()

            current_index = -1
            for i, (lid, lvl, seq) in enumerate(all_lessons):
                if lid == lesson_id:
                    current_index = i
                    break

            if current_index < 0 or current_index >= len(all_lessons) - 1:
                return False

            next_lesson_id, next_level, next_sequence = all_lessons[current_index + 1]

            existing = conn.execute(
                "SELECT status FROM user_progress WHERE lesson_id = ? LIMIT 1",
                (next_lesson_id,),
            ).fetchone()

            if existing and existing[0] in ("available", "completed"):
                return False

            completed_rows = conn.execute(
                "SELECT status FROM user_progress WHERE lesson_id = ?",
                (lesson_id,),
            ).fetchall()

            if not completed_rows or not all(
                r[0] == "completed" for r in completed_rows
            ):
                return False

            current_level_lower = current_level.lower()
            next_level_lower = next_level.lower()

            if next_level_lower == current_level_lower:
                conn.execute(_UNLOCK_LESSON, (next_lesson_id,))
                conn.commit()
                return True
            else:
                current_level_lessons = [
                    lid
                    for lid, lvl, seq in all_lessons
                    if lvl.lower() == current_level_lower
                ]

                all_current_level_completed = True
                for cl_id in current_level_lessons:
                    cl_rows = conn.execute(
                        "SELECT status FROM user_progress WHERE lesson_id = ?",
                        (cl_id,),
                    ).fetchall()
                    if not cl_rows or not all(r[0] == "completed" for r in cl_rows):
                        all_current_level_completed = False
                        break

                if all_current_level_completed:
                    conn.execute(_UNLOCK_LESSON, (next_lesson_id,))
                    conn.commit()
                    return True

            return False
        finally:
            if self._owns_connection:
                conn.close()

    def get_activity_by_id(
        self, lesson_id: int, activity_id: int
    ) -> dict[str, Any] | None:
        """Find an activity within a lesson by its ID."""
        conn = self._get_conn()
        try:
            apply_safety_pragmas(conn)
            row = conn.execute(_SELECT_LESSON_BY_ID, (lesson_id,)).fetchone()
            if not row:
                return None

            activities_json = row[9]  # activities column index
            if not activities_json:
                return None

            activities = json.loads(activities_json)
            for act in activities:
                if isinstance(act, dict) and act.get("id") == activity_id:
                    return act
            return None
        finally:
            if self._owns_connection:
                conn.close()

    def get_lesson_titles(self) -> list[dict[str, Any]]:
        """Return lesson rows with title and level for unlock logic."""
        return self.get_all_lessons()

    def update_activity(
        self,
        lesson_id: int,
        activity_id: int,
        score: float,
        status: str,
        attempts: int,
    ) -> None:
        """Insert or update a single activity progress row."""
        self.save_activity_result(lesson_id, activity_id, score, status, attempts)

    # ------------------------------------------------------------------
    # Internal helpers (shared by all public methods)
    # ------------------------------------------------------------------

    def _resolve_lesson_status(
        self, activity_count: int, activity_progress: dict[str, ActivityProgress]
    ) -> str:
        """Resolve the overall status for a lesson from its activity progress."""
        if activity_count == 0:
            return "available"
        if activity_progress:
            statuses = [ap.status for ap in activity_progress.values()]
            all_completed = all(s == "completed" for s in statuses)
            has_any_attempt = any(ap.attempts > 0 for ap in activity_progress.values())

            if all_completed:
                return "completed"
            if has_any_attempt:
                return "in_progress"
            return statuses[0] if statuses else "locked"
        return "locked"

    @staticmethod
    def _compute_status_from_prev(
        sorted_rows: list[tuple[Any, ...]],
        i: int,
        lesson_activity_statuses: dict[int, dict[int, str]],
        first_lesson_ids: set[int],
    ) -> str:
        """Compute status by checking the previous lesson (same level)."""
        if i > 0:
            prev_row = sorted_rows[i - 1]
            if prev_row[1].lower() == prev_row[1].lower():
                prev_id = prev_row[0]
                prev_statuses = lesson_activity_statuses.get(prev_id, {})
                if prev_statuses and all(
                    s == "completed" for s in prev_statuses.values()
                ):
                    return "available"
        return "locked"
