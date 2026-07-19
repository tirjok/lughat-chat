"""Learning Module — Repository pattern (DIP).

Defines the ``LessonRepository`` abstract interface that decouples
high-level business logic from the SQLite storage mechanism.

Usage::

    from learning.repository import LessonRepository

    repo: LessonRepository = SqliteLessonRepository(db_path)
    summaries = repo.list_lessons()
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from learning.domain import LessonDetail, LessonSummary

__all__ = ["LessonRepository"]


class LessonRepository(ABC):
    """Abstract interface for lesson data access.

    This is the **abstraction** that high-level services depend on
    (DIP).  Concrete implementations (SQLite, in-memory for tests,
    future Postgres) implement this interface.
    """

    @abstractmethod
    def list_lessons(self) -> list[LessonSummary]:
        """Return all lesson summaries ordered by level, sequence.

        Returns
        -------
        list[LessonSummary]
            ``[{id, level, sequence, title, competency_count,
               section_count, status}, ...]`` sorted by level then
            sequence.  Returns ``[]`` when no lessons exist.
        """

    @abstractmethod
    def get_lesson(self, lesson_id: int) -> LessonDetail:
        """Return full lesson detail with progress.

        Parameters
        ----------
        lesson_id : int
            The lesson identifier.

        Returns
        -------
        LessonDetail
            Full lesson data with nested progress.

        Raises
        ------
        ValueError
            When ``lesson_id`` does not exist.
        """

    @abstractmethod
    def get_lesson_raw(self, lesson_id: int) -> dict[str, Any] | None:
        """Return raw lesson row (for internal use by services).

        Parameters
        ----------
        lesson_id : int

        Returns
        -------
        dict | None
            Raw row dict or ``None`` when not found.
        """

    @abstractmethod
    def get_activity_progress(self, lesson_id: int) -> dict[str, dict[str, Any]]:
        """Return per-activity progress for a lesson.

        Parameters
        ----------
        lesson_id : int

        Returns
        -------
        dict[str, dict]
            ``{activityId: {score, status, attempts}, ...}``
        """

    @abstractmethod
    def save_activity_result(
        self,
        lesson_id: int,
        activity_id: int,
        score: float,
        status: str,
        attempts: int,
    ) -> None:
        """Persist a single activity result.

        Parameters
        ----------
        lesson_id : int
        activity_id : int
        score : float
        status : str
        attempts : int
        """

    @abstractmethod
    def get_lesson_activity_count(self, lesson_id: int) -> int:
        """Return the number of activities defined for a lesson.

        Parameters
        ----------
        lesson_id : int

        Returns
        -------
        int
        """

    @abstractmethod
    def get_all_lesson_activity_statuses(self) -> list[tuple[int, int, str]]:
        """Return all ``(lesson_id, activity_id, status)`` rows.

        Returns
        -------
        list[tuple[int, int, str]]
        """

    @abstractmethod
    def get_lesson_row(self, lesson_id: int) -> dict[str, Any] | None:
        """Return a raw lesson row dict (with JSON columns as strings).

        Parameters
        ----------
        lesson_id : int

        Returns
        -------
        dict | None
        """

    @abstractmethod
    def get_all_lessons(self) -> list[dict[str, Any]]:
        """Return all lesson rows (with JSON columns as strings).

        Returns
        -------
        list[dict]
        """

    @abstractmethod
    def get_lesson_ids_sorted(self) -> list[int]:
        """Return lesson IDs sorted by (level, sequence).

        Returns
        -------
        list[int]
        """

    @abstractmethod
    def get_lessons_by_level(self) -> dict[str, int]:
        """Return the first lesson ID per level.

        Returns
        -------
        dict[str, int]
            ``{level_lower: first_lesson_id}``
        """

    @abstractmethod
    def get_lesson_level_and_sequence(self, lesson_id: int) -> tuple[str, int] | None:
        """Return (level, sequence) for a lesson.

        Parameters
        ----------
        lesson_id : int

        Returns
        -------
        tuple[str, int] | None
        """

    @abstractmethod
    def get_next_lesson_id(self, lesson_id: int) -> int | None:
        """Return the next lesson ID in (level, sequence) order.

        Parameters
        ----------
        lesson_id : int

        Returns
        -------
        int | None
        """

    @abstractmethod
    def mark_lesson_completed(self, lesson_id: int) -> None:
        """Mark all activities in a lesson as completed.

        Parameters
        ----------
        lesson_id : int
        """

    @abstractmethod
    def unlock_lesson(self, lesson_id: int) -> None:
        """Set a lesson's status to 'available'.

        Parameters
        ----------
        lesson_id : int
        """

    @abstractmethod
    def get_lesson_progress_status(self, lesson_id: int) -> list[str]:
        """Return all status values for a lesson's activities.

        Parameters
        ----------
        lesson_id : int

        Returns
        -------
        list[str]
        """

    @abstractmethod
    def get_next_lesson_level(self, lesson_id: int) -> tuple[str, int] | None:
        """Return (level, sequence) of the next lesson.

        Parameters
        ----------
        lesson_id : int

        Returns
        -------
        tuple[str, int] | None
        """

    @abstractmethod
    def get_lessons_in_level(self, level: str) -> list[int]:
        """Return all lesson IDs in a level.

        Parameters
        ----------
        level : str

        Returns
        -------
        list[int]
        """

    @abstractmethod
    def get_lesson_progress_by_id(self, lesson_id: int) -> list[tuple[int, float]]:
        """Return (activity_id, score) for a lesson.

        Parameters
        ----------
        lesson_id : int

        Returns
        -------
        list[tuple[int, float]]
        """

    @abstractmethod
    def get_lesson_activities_json(self, lesson_id: int) -> str | None:
        """Return the raw activities JSON string for a lesson.

        Parameters
        ----------
        lesson_id : int

        Returns
        -------
        str | None
        """

    @abstractmethod
    def compute_competency_scores(self, lesson_id: int) -> dict[str, float]:
        """Compute weighted average per competency.

        Parameters
        ----------
        lesson_id : int

        Returns
        -------
        dict[str, float]
        """

    @abstractmethod
    def check_and_mark_lesson_completed(
        self,
        lesson_id: int,
        submitted_activity_id: int | None = None,
        submitted_score: float = 0.0,
        original_status: str = "",
    ) -> bool:
        """Check if all activities are completed → mark lesson completed.

        Returns True if the lesson was just completed (not already).
        """

    @abstractmethod
    def unlock_next_lesson(self, lesson_id: int) -> bool:
        """Unlock the next lesson if current is completed.

        Returns True if a lesson was unlocked.
        """

    @abstractmethod
    def get_activity_by_id(
        self, lesson_id: int, activity_id: int
    ) -> dict[str, Any] | None:
        """Find an activity within a lesson by its ID.

        Parameters
        ----------
        lesson_id : int
        activity_id : int

        Returns
        -------
        dict | None
        """

    @abstractmethod
    def get_lesson_titles(self) -> list[dict[str, Any]]:
        """Return lesson rows with title and level for unlock logic.

        Returns
        -------
        list[dict]
        """

    @abstractmethod
    def update_activity(
        self,
        lesson_id: int,
        activity_id: int,
        score: float,
        status: str,
        attempts: int,
    ) -> None:
        """Insert or update a single activity progress row.

        Parameters
        ----------
        lesson_id : int
        activity_id : int
        score : float
        status : str
        attempts : int
        """
