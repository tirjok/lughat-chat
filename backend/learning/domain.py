"""Learning Module — Domain model and value objects.

Provides immutable value objects for typed identifiers and data classes
that carry lesson / activity / progress information without leaking
infrastructure concerns (SQLite, JSON, HTTP).

Usage::

    from learning.domain import LessonId, ActivityId, LessonSummary

    lid = LessonId(1)
    summary = LessonSummary(
        id=lid,
        level="A1",
        sequence=1,
        title="Greetings",
        competency_count=2,
        section_count=5,
        status="available",
    )
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# ---------------------------------------------------------------------------
# Value Objects — immutable, equality-based identity
# ---------------------------------------------------------------------------


class LessonId:
    """Immutable wrapper around a lesson identifier.

    Guarantees that lesson IDs are never passed as raw ``int`` — they
    must be wrapped in this value object, preventing the common bug
    of swapping lesson and activity IDs.

    Parameters
    ----------
    value : int
        The numeric lesson identifier.
    """

    __slots__ = ("value",)

    def __init__(self, value: int) -> None:
        if not isinstance(value, int) or value < 0:
            raise ValueError(f"LessonId must be a non-negative integer, got {value!r}")
        self.value = value

    def __eq__(self, other: object) -> bool:
        if isinstance(other, LessonId):
            return self.value == other.value
        return NotImplemented

    def __hash__(self) -> int:
        return hash(self.value)

    def __repr__(self) -> str:
        return f"LessonId({self.value})"

    def __lt__(self, other: object) -> bool:
        if isinstance(other, LessonId):
            return self.value < other.value
        return NotImplemented

    def __int__(self) -> int:
        return self.value


class ActivityId:
    """Immutable wrapper around an activity identifier.

    Parameters
    ----------
    value : int
        The numeric activity identifier.
    """

    __slots__ = ("value",)

    def __init__(self, value: int) -> None:
        if not isinstance(value, int) or value < 0:
            raise ValueError(
                f"ActivityId must be a non-negative integer, got {value!r}"
            )
        self.value = value

    def __eq__(self, other: object) -> bool:
        if isinstance(other, ActivityId):
            return self.value == other.value
        return NotImplemented

    def __hash__(self) -> int:
        return hash(self.value)

    def __repr__(self) -> str:
        return f"ActivityId({self.value})"

    def __int__(self) -> int:
        return self.value


class Score:
    """Immutable wrapper around a numeric score (0.0–1.0).

    Parameters
    ----------
    value : float
        The score value, clamped to [0.0, 1.0].
    """

    __slots__ = ("value",)

    def __init__(self, value: float) -> None:
        self.value = max(0.0, min(1.0, float(value)))

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Score):
            return abs(self.value - other.value) < 1e-9
        if isinstance(other, (int, float)):
            return abs(self.value - float(other)) < 1e-9
        return NotImplemented

    def __hash__(self) -> int:
        return hash(self.value)

    def __repr__(self) -> str:
        return f"Score({self.value!r})"

    def __float__(self) -> float:
        return self.value


# ---------------------------------------------------------------------------
# Domain constants
# ---------------------------------------------------------------------------

COMPLETION_THRESHOLD = 0.7
"""Score threshold (0.0–1.0) above which an activity is considered
completed.  Used by scoring strategies and lesson-completion logic."""


# ---------------------------------------------------------------------------
# Domain Data Classes
# ---------------------------------------------------------------------------
@dataclass(frozen=True, slots=True)
class LessonSummary:
    """A lightweight read-model for listing lessons.

    Parameters
    ----------
    id : LessonId
        Unique lesson identifier.
    level : str
        Level label (e.g. ``"A1"``).
    sequence : int
        Ordering within the level.
    title : str
        Human-readable title.
    competency_count : int
        Number of competencies covered.
    section_count : int
        Number of sections.
    status : str
        One of ``"locked"``, ``"available"``, ``"in_progress"``,
        ``"completed"``.
    """

    id: LessonId
    level: str
    sequence: int
    title: str
    competency_count: int
    section_count: int
    status: str

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a plain dict (for API responses)."""
        return {
            "id": self.id.value,
            "level": self.level,
            "sequence": self.sequence,
            "title": self.title,
            "competency_count": self.competency_count,
            "section_count": self.section_count,
            "status": self.status,
        }


@dataclass(frozen=True, slots=True)
class ActivityProgress:
    """Per-activity progress snapshot.

    Parameters
    ----------
    score : float
        Best score achieved (0.0–1.0).
    status : str
        One of ``"locked"``, ``"available"``, ``"in_progress"``,
        ``"completed"``.
    attempts : int
        Number of attempts made.
    """

    score: float = 0.0
    status: str = "locked"
    attempts: int = 0


@dataclass(frozen=True, slots=True)
class LessonDetail:
    """Full lesson data with nested progress.

    Parameters
    ----------
    id : LessonId
    level : str
    sequence : int
    title : str
    competencies : list[dict]
        Competency definitions from lesson JSON.
    sections : list[dict]
        Section definitions.
    activities : list[dict]
        Activity definitions.
    progress_status : str
        Overall lesson status.
    activity_progress : dict[str, ActivityProgress]
        Per-activity progress keyed by activity ID string.
    """

    id: LessonId
    level: str
    sequence: int
    title: str
    competencies: list[dict[str, Any]] = field(default_factory=list)
    sections: list[dict[str, Any]] = field(default_factory=list)
    activities: list[dict[str, Any]] = field(default_factory=list)
    progress_status: str = "locked"
    activity_progress: dict[str, ActivityProgress] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a plain dict (for API responses)."""
        return {
            "id": self.id.value,
            "level": self.level,
            "sequence": self.sequence,
            "title": self.title,
            "competencies": self.competencies,
            "sections": self.sections,
            "activities": self.activities,
            "progress": {
                "status": self.progress_status,
                "activities": {
                    k: {"score": v.score, "status": v.status, "attempts": v.attempts}
                    for k, v in self.activity_progress.items()
                },
            },
        }


@dataclass(frozen=True, slots=True)
class SubmissionResult:
    """Result of submitting an activity answer.

    Parameters
    ----------
    score : float
        Computed score (0.0–1.0).
    feedback : str
        Human-readable feedback.
    attempts_remaining : int
        Remaining attempts.
    activity_complete : bool
        Whether the activity is now marked complete.
    competency_impact : dict[str, float]
        Per-competency weight impact.
    competency_scores : dict[str, float]
        Overall competency scores (Slice 3).
    lesson_just_completed : bool
        Whether this submission just completed the lesson.
    next_lesson_unlocked : bool
        Whether the next lesson was just unlocked.
    persist_failed : bool
        Whether persistence to the database failed.
    correct_answer : str | None
        The correct answer (shown when max attempts exhausted).
    """

    score: float
    feedback: str
    attempts_remaining: int
    activity_complete: bool
    competency_impact: dict[str, float]
    competency_scores: dict[str, float] = field(default_factory=dict)
    lesson_just_completed: bool = False
    next_lesson_unlocked: bool = False
    persist_failed: bool = False
    correct_answer: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a plain dict (for API responses)."""
        result: dict[str, Any] = {
            "score": self.score,
            "feedback": self.feedback,
            "attempts_remaining": self.attempts_remaining,
            "activity_complete": self.activity_complete,
            "competency_impact": self.competency_impact,
            "competency_scores": self.competency_scores,
            "lesson_just_completed": self.lesson_just_completed,
            "next_lesson_unlocked": self.next_lesson_unlocked,
            "persist_failed": self.persist_failed,
        }
        if self.correct_answer is not None:
            result["correct_answer"] = self.correct_answer
        return result


__all__ = [
    "LessonId",
    "ActivityId",
    "Score",
    "COMPLETION_THRESHOLD",
    "LessonSummary",
    "ActivityProgress",
    "LessonDetail",
    "SubmissionResult",
]
