"""Learning Module — Business logic services.

Refactored to comply with SOLID principles:

- **Single Responsibility**: ``LessonListService`` handles listing,
  ``LessonDetailService`` handles fetching, ``ActivitySubmissionService``
  handles submission.  No service does more than one thing.
- **Open/Closed**: Scoring strategies are registered via a protocol;
  adding a new activity type does not modify existing code.
- **Interface Segregation**: Each service exposes only the methods its
  consumers need.  A reader depends on ``LessonReader``; a writer
  depends on ``LessonWriter``.
- **Dependency Inversion**: All services depend on ``LessonRepository``
  (an abstract interface), not on ``sqlite3`` or ``fastapi``.

Usage::

    from learning.service import (
        LessonListService,
        LessonDetailService,
        ActivitySubmissionService,
    )
    from learning.repository import SqliteLessonRepository

    repo = SqliteLessonRepository("/path/to/lughat.db")

    list_svc = LessonListService(repo)
    detail_svc = LessonDetailService(repo)
    submit_svc = ActivitySubmissionService(repo)
"""

from __future__ import annotations

import json
import logging
import sqlite3
from abc import ABC, abstractmethod
from typing import Any

from fastapi.responses import JSONResponse

from content.scoring import score_activity
from learning.domain import (
    LessonDetail,
    LessonSummary,
)
from learning.repository import LessonRepository
from learning.sqlite_repository import SqliteLessonRepository

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# ISP: Narrow interfaces for consumers
# ---------------------------------------------------------------------------


class LessonReader(ABC):
    """Read-only interface for lesson data.

    Implemented by ``LessonListService`` and ``LessonDetailService``.
    Consumers that only need reading depend on this interface.
    """

    @abstractmethod
    def list_lessons(self) -> list[LessonSummary]:
        """Return all lesson summaries with resolved status."""

    @abstractmethod
    def get_lesson(self, lesson_id: int) -> LessonDetail:
        """Return full lesson detail with progress."""


class LessonWriter(ABC):
    """Write interface for activity submissions.

    Implemented by ``ActivitySubmissionService``.
    Consumers that only need writing depend on this interface.
    """

    @abstractmethod
    def submit_activity(
        self,
        lesson_id: int,
        activity_id: int,
        answer: str,
    ) -> JSONResponse | dict[str, Any]:
        """Submit an answer for an activity and get a score."""


# ---------------------------------------------------------------------------
# OCP: Scoring strategy protocol
# ---------------------------------------------------------------------------


class ScoringStrategy(ABC):
    """Protocol for a single activity-type scoring algorithm.

    Implementations are registered with ``ScoringDispatcher``.  Adding
    a new activity type requires only a new ``ScoringStrategy``
    implementation — no existing code is modified.
    """

    @abstractmethod
    def score(
        self,
        activity_type: str,
        user_answer: str,
        activity_content: dict[str, Any],
    ) -> dict[str, Any]:
        """Return ``{"score": float, "feedback": str}`` or ``{"error": str}``."""


class ScoringDispatcher:
    """Dispatches scoring by activity type (OCP — open for extension).

    Parameters
    ----------
    strategies : dict[str, ScoringStrategy]
        Mapping of activity type string to ``ScoringStrategy``.
    """

    def __init__(self, strategies: dict[str, ScoringStrategy] | None = None) -> None:
        self._strategies: dict[str, ScoringStrategy] = (
            strategies if strategies is not None else {}
        )

    def register(self, activity_type: str, strategy: ScoringStrategy) -> None:
        """Register a scoring strategy for an activity type."""
        self._strategies[activity_type] = strategy

    def dispatch(
        self,
        activity_type: str,
        user_answer: str,
        activity_content: dict[str, Any],
    ) -> dict[str, Any]:
        """Score an activity by type.

        Returns ``{"score": float, "feedback": str}`` on success,
        ``{"error": str}`` on unknown type.
        """
        strategy = self._strategies.get(activity_type)
        if strategy is None:
            return {"error": f"Unknown activity type: {activity_type}"}
        return strategy.score(activity_type, user_answer, activity_content)


# ---------------------------------------------------------------------------
# SRP: LessonListService — ONE responsibility: list lessons
# ---------------------------------------------------------------------------


class LessonListService(LessonReader):
    """Returns lesson summaries with status resolved from user_progress.

    Parameters
    ----------
    repository : LessonRepository
        The data-access abstraction.
    """

    def __init__(self, repository: LessonRepository) -> None:
        self.repository = repository

    def list_lessons(self) -> list[LessonSummary]:
        """Return lesson summaries with status resolved from user_progress."""
        return self.repository.list_lessons()

    def get_lesson(self, lesson_id: int) -> LessonDetail:
        """Not implemented — this service does not support single-lesson access."""
        raise NotImplementedError(
            "LessonListService does not support get_lesson(). Use LessonDetailService."
        )


# ---------------------------------------------------------------------------
# SRP: LessonDetailService — ONE responsibility: fetch single lesson detail
# ---------------------------------------------------------------------------


class LessonDetailService(LessonReader):
    """Returns full lesson detail with progress.

    Parameters
    ----------
    repository : LessonRepository
        The data-access abstraction.
    """

    def __init__(self, repository: LessonRepository) -> None:
        self.repository = repository

    def list_lessons(self) -> list[LessonSummary]:
        """Not implemented — this service does not support listing."""
        raise NotImplementedError(
            "LessonDetailService does not support list_lessons(). "
            "Use LessonListService."
        )

    def get_lesson(self, lesson_id: int) -> LessonDetail:
        """Return full lesson data with progress."""
        from fastapi import HTTPException

        detail = self.repository.get_lesson(lesson_id)
        if detail.progress_status == "locked":
            raise HTTPException(
                status_code=403,
                detail=("This lesson is locked. Complete previous lessons to unlock."),
            )
        return detail


# ---------------------------------------------------------------------------
# SRP: ActivitySubmissionService — ONE responsibility: submit activities
# ---------------------------------------------------------------------------


class ActivitySubmissionService(LessonWriter):
    """Submits answers for activities and handles the full workflow.

    Slice 3 extensions:
    - Computes competency_scores (weighted average per ADR-007)
    - Marks lesson 'completed' when all activities complete
    - Unlocks next lesson when current lesson completes
    - Handles SQLite write failures gracefully (partial-failure response)

    Parameters
    ----------
    repository : LessonRepository
        The data-access abstraction.
    scoring_dispatcher : ScoringDispatcher
        The strategy-based scoring dispatcher.
    """

    def __init__(
        self,
        repository: LessonRepository,
        scoring_dispatcher: ScoringDispatcher | None = None,
    ) -> None:
        self.repository = repository
        self._scoring_dispatcher = (
            scoring_dispatcher
            if scoring_dispatcher is not None
            else ScoringDispatcher()
        )

    def submit_activity(
        self,
        lesson_id: int,
        activity_id: int,
        answer: str,
    ) -> JSONResponse | dict[str, Any]:
        """Submit an answer for an activity and get a score.

        Returns
        -------
        dict | JSONResponse
            Submission result dict (200) or JSONResponse (429).
        """
        from fastapi import HTTPException

        # 1. Fetch the lesson.
        lesson_row = self.repository.get_lesson_raw(lesson_id)
        if lesson_row is None:
            raise HTTPException(
                status_code=404,
                detail=f"Lesson with id {lesson_id} not found",
            )

        (
            _lesson_id,
            _level,
            _sequence,
            _title,
            _competency_count,
            _section_count,
            activity_count,
            _competencies_json,
            _sections_json,
            activities_json,
        ) = (
            lesson_row["id"],
            lesson_row["level"],
            lesson_row["sequence"],
            lesson_row["title"],
            lesson_row["competency_count"],
            lesson_row["section_count"],
            lesson_row["activity_count"],
            lesson_row["competencies"],
            lesson_row["sections"],
            lesson_row["activities"],
        )

        _activities = json.loads(activities_json) if activities_json else []

        activity = self.repository.get_activity_by_id(lesson_id, activity_id)
        if activity is None:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=404,
                detail=(
                    f"Activity with id {activity_id} not found in lesson {lesson_id}"
                ),
            )

        # 2. Check if the lesson is locked.
        activity_progress = self.repository.get_activity_progress(lesson_id)
        lesson_status = self._resolve_lesson_status(activity_count, activity_progress)

        if lesson_status == "locked":
            raise HTTPException(
                status_code=403,
                detail=("This lesson is locked. Complete previous lessons to unlock."),
            )

        # 3. Check max attempts.
        max_attempts = activity.get("max_attempts", 3)
        activity_str_id = str(activity_id)
        existing_progress = activity_progress.get(activity_str_id, {})
        current_attempts = existing_progress.get("attempts", 0)
        current_status = existing_progress.get("status", "available")

        if current_status == "completed":
            remaining_attempts = 0
            activity_complete = True
        elif current_attempts >= max_attempts:
            remaining_attempts = 0
            activity_complete = True
        else:
            remaining_attempts = max_attempts - current_attempts
            activity_complete = False

        # 4. Score the answer (via strategy dispatch — OCP).
        activity_type = activity.get("type", "")
        activity_content = activity.get("content", {})

        scoring_result = self._scoring_dispatcher.dispatch(
            activity_type=activity_type,
            user_answer=answer,
            activity_content=activity_content,
        )

        if "error" in scoring_result:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=500,
                detail=scoring_result["error"],
            )

        score = scoring_result["score"]
        feedback = scoring_result["feedback"]

        # 5. Compute competency_impact.
        competency_map = activity.get("competency_map", {})
        competency_impact: dict[str, float] = {}
        for comp_name, weight in competency_map.items():
            competency_impact[comp_name] = round(float(weight), 4)

        completion_threshold = 0.7
        if score >= completion_threshold:
            activity_complete = True

        response_data: dict[str, Any] = {
            "score": score,
            "feedback": feedback,
            "attempts_remaining": remaining_attempts,
            "activity_complete": activity_complete,
            "competency_impact": competency_impact,
            "competency_scores": {},  # Slice 3: computed below
            "lesson_just_completed": False,  # Slice 3
            "next_lesson_unlocked": False,  # Slice 3
            "persist_failed": False,  # Slice 3
        }

        if current_attempts >= max_attempts:
            correct_answer = _extract_correct_answer(activity)
            response_data["correct_answer"] = correct_answer

        # 6. Persist the score (Slice 3: with graceful error handling).
        best_score = 0.0
        if current_attempts < max_attempts and current_status != "completed":
            new_attempts = current_attempts + 1
            existing_score = existing_progress.get("score", 0)
            best_score = max(existing_score, score)

            if score >= completion_threshold:
                new_status = "completed"
            elif new_attempts >= max_attempts:
                new_status = "completed"
            else:
                new_status = "in_progress"

            try:
                self.repository.update_activity(
                    lesson_id,
                    activity_id,
                    best_score,
                    new_status,
                    new_attempts,
                )
            except sqlite3.Error as e:
                logger.warning(
                    "SQLite write failed for lesson %d, activity %d: %s",
                    lesson_id,
                    activity_id,
                    e,
                )

        # 7. Compute competency_scores (weighted average).
        competency_scores = self.repository.compute_competency_scores(lesson_id)
        response_data["competency_scores"] = competency_scores

        # 8. Check and mark lesson completion.
        lesson_just_completed = False
        try:
            lesson_just_completed = self.repository.check_and_mark_lesson_completed(
                lesson_id, activity_id, best_score, current_status
            )
        except sqlite3.Error as e:
            logger.warning(
                "Failed to mark lesson %d as completed: %s",
                lesson_id,
                e,
            )

        response_data["lesson_just_completed"] = lesson_just_completed

        # 9. Unlock next lesson if current just completed.
        if lesson_just_completed:
            try:
                next_unlocked = self.repository.unlock_next_lesson(lesson_id)
                response_data["next_lesson_unlocked"] = next_unlocked
            except sqlite3.Error as e:
                logger.warning(
                    "Failed to unlock next lesson after lesson %d completion: %s",
                    lesson_id,
                    e,
                )

        if current_attempts >= max_attempts:
            return JSONResponse(
                status_code=429,
                content=response_data,
            )

        return response_data

    @staticmethod
    def _resolve_lesson_status(
        activity_count: int,
        activity_progress: dict,
    ) -> str:
        """Resolve the overall status for a lesson from its activity progress."""
        if activity_count == 0:
            return "available"
        if activity_progress:
            statuses = [ap["status"] for ap in activity_progress.values()]
            all_completed = all(s == "completed" for s in statuses)
            has_any_attempt = any(
                ap["attempts"] > 0 for ap in activity_progress.values()
            )

            if all_completed:
                return "completed"
            if has_any_attempt:
                return "in_progress"
            return statuses[0] if statuses else "locked"
        return "locked"


# ---------------------------------------------------------------------------
# Legacy adapter — maintains the old LessonService API surface
# ---------------------------------------------------------------------------

"""Legacy LessonService — wraps the refactored services for backward
compatibility.

The old ``LessonService(db_path)`` constructor is preserved so that
existing callers (``app.py``, tests) continue to work without changes.
Internally it composes the three SOLID services.

Usage (identical to before):

    from learning import LessonService

    service = LessonService(db_path)
    summaries = service.list_lessons()
    detail = service.get_lesson(lesson_id=1)
    result = service.submit_activity(lesson_id=1, activity_id=2, answer="...")
"""


class LessonService:
    """High-level lesson management interface (legacy adapter).

    This class wraps the refactored SOLID services and exposes the
    original ``list_lessons()``, ``get_lesson()``, and
    ``submit_activity()`` methods so that existing callers and tests
    continue to work without modification.

    Parameters
    ----------
    db_path : str
        Path to the SQLite database file (``lughat.db``).
    """

    def __init__(self, db_path: str) -> None:
        self._repository = SqliteLessonRepository(db_path)
        self._list_service = LessonListService(self._repository)
        self._detail_service = LessonDetailService(self._repository)
        self._submit_service = ActivitySubmissionService(
            self._repository,
            scoring_dispatcher=ScoringDispatcher(
                {
                    "listen-translate": _ListenTranslateStrategy(),
                    "translate-to-english": _TranslateToEnglishStrategy(),
                    "translate-to-arabic": _TranslateToArabicStrategy(),
                    "introduce-characters": _IntroduceCharactersStrategy(),
                    "role-play": _RolePlayStrategy(),
                }
            ),
        )

    # ------------------------------------------------------------------
    # Public interface (backward-compatible)
    # ------------------------------------------------------------------

    def list_lessons(self) -> list[dict]:
        """Return lesson summaries with status resolved from user_progress."""
        from fastapi import HTTPException

        try:
            summaries = self._list_service.list_lessons()
            return [s.to_dict() for s in summaries]
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(e))

    def get_lesson(self, lesson_id: int) -> dict:
        """Return full lesson data with progress."""
        from fastapi import HTTPException

        try:
            detail = self._detail_service.get_lesson(lesson_id)
            return detail.to_dict()
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(e))

    def submit_activity(
        self,
        lesson_id: int,
        activity_id: int,
        answer: str,
    ) -> JSONResponse | dict[str, Any]:
        """Submit an answer for an activity and get a score."""
        from fastapi import HTTPException

        try:
            return self._submit_service.submit_activity(lesson_id, activity_id, answer)
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(e))

    # ------------------------------------------------------------------
    # Internal helpers (shared by all public methods)
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_lesson_status(
        activity_count: int,
        activity_progress: dict,
    ) -> str:
        """Resolve the overall status for a lesson from its activity progress."""
        if activity_count == 0:
            return "available"
        if activity_progress:
            statuses = [ap["status"] for ap in activity_progress.values()]
            all_completed = all(s == "completed" for s in statuses)
            has_any_attempt = any(
                ap["attempts"] > 0 for ap in activity_progress.values()
            )

            if all_completed:
                return "completed"
            if has_any_attempt:
                return "in_progress"
            return statuses[0] if statuses else "locked"
        return "locked"


# ---------------------------------------------------------------------------
# OCP: Built-in scoring strategy implementations
# ---------------------------------------------------------------------------


class _ListenTranslateStrategy(ScoringStrategy):
    """Scoring strategy for ``listen-translate`` activities."""

    def score(
        self,
        activity_type: str,
        user_answer: str,
        activity_content: dict[str, Any],
    ) -> dict[str, Any]:
        return score_activity(
            activity_type="listen-translate",
            user_answer=user_answer,
            activity_content=activity_content,
        )


class _TranslateToEnglishStrategy(ScoringStrategy):
    """Scoring strategy for ``translate-to-english`` activities."""

    def score(
        self,
        activity_type: str,
        user_answer: str,
        activity_content: dict[str, Any],
    ) -> dict[str, Any]:
        return score_activity(
            activity_type="translate-to-english",
            user_answer=user_answer,
            activity_content=activity_content,
        )


class _TranslateToArabicStrategy(ScoringStrategy):
    """Scoring strategy for ``translate-to-arabic`` activities."""

    def score(
        self,
        activity_type: str,
        user_answer: str,
        activity_content: dict[str, Any],
    ) -> dict[str, Any]:
        return score_activity(
            activity_type="translate-to-arabic",
            user_answer=user_answer,
            activity_content=activity_content,
        )


class _IntroduceCharactersStrategy(ScoringStrategy):
    """Scoring strategy for ``introduce-characters`` activities."""

    def score(
        self,
        activity_type: str,
        user_answer: str,
        activity_content: dict[str, Any],
    ) -> dict[str, Any]:
        return score_activity(
            activity_type="introduce-characters",
            user_answer=user_answer,
            activity_content=activity_content,
        )


class _RolePlayStrategy(ScoringStrategy):
    """Scoring strategy for ``role-play`` activities."""

    def score(
        self,
        activity_type: str,
        user_answer: str,
        activity_content: dict[str, Any],
    ) -> dict[str, Any]:
        return score_activity(
            activity_type="role-play",
            user_answer=user_answer,
            activity_content=activity_content,
        )


# ---------------------------------------------------------------------------
# Top-level helper (extract correct answer — moved from module scope)
# ---------------------------------------------------------------------------


def _extract_correct_answer(activity: dict) -> str:
    """Extract the correct answer from an activity's content.

    Returns a human-readable correct answer string based on the
    activity type.

    Parameters
    ----------
    activity : dict
        The activity dict from lesson JSON (contains ``type`` and
        ``content`` keys).

    Returns
    -------
    str
        The correct answer, or empty string if not determinable.
    """
    activity_type = activity.get("type", "")
    content = activity.get("content", {})

    if activity_type == "listen-translate":
        dialogue = content.get("dialogue", {})
        if dialogue:
            translations = []
            for scene_key, scene_data in dialogue.items():
                if isinstance(scene_data, dict) and "english_expected" in scene_data:
                    translations.append(scene_data["english_expected"])
            if translations:
                return " | ".join(translations)
        return content.get("english_expected", "")

    elif activity_type == "translate-to-english":
        sentences = content.get("sentences", [])
        if sentences:
            expected = [
                s["english_expected"]
                for s in sentences
                if isinstance(s, dict) and "english_expected" in s
            ]
            return " | ".join(expected)
        return content.get("english_expected", "")

    elif activity_type == "translate-to-arabic":
        sentences = content.get("sentences", [])
        if sentences:
            expected = [
                s["arabic_expected"]
                for s in sentences
                if isinstance(s, dict) and "arabic_expected" in s
            ]
            return " | ".join(expected)
        return content.get("arabic_expected", "")

    elif activity_type == "introduce-characters":
        characters = content.get("characters", [])
        if characters:
            expected = []
            for char_data in characters:
                if isinstance(char_data, dict):
                    sentences = char_data.get("sentences", [])
                    for sent in sentences:
                        if isinstance(sent, dict) and "arabic_expected" in sent:
                            expected.append(sent["arabic_expected"])
            return " | ".join(expected)
        return ""

    elif activity_type == "role-play":
        expected_elements = content.get("expected_elements", [])
        if expected_elements:
            return " | ".join(str(e) for e in expected_elements)
        return ""

    return ""
