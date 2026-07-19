"""Learning Module — exports the LessonService class and SOLID components.

Usage::

    from learning import LessonService
    from learning.service import (
        LessonListService,
        LessonDetailService,
        ActivitySubmissionService,
        ScoringDispatcher,
    )
    from learning.repository import LessonRepository, SqliteLessonRepository
    from learning.domain import (
        LessonId,
        ActivityId,
        LessonSummary,
        ActivityProgress,
        LessonDetail,
        SubmissionResult,
    )
"""

from learning.service import (
    ActivitySubmissionService,
    LessonDetailService,
    LessonListService,
    LessonService,
    ScoringDispatcher,
    ScoringStrategy,
    _ListenTranslateStrategy,
    _TranslateToEnglishStrategy,
    _TranslateToArabicStrategy,
    _IntroduceCharactersStrategy,
    _RolePlayStrategy,
)
from learning.repository import LessonRepository
from learning.sqlite_repository import SqliteLessonRepository
from learning.domain import (
    ActivityId,
    ActivityProgress,
    COMPLETION_THRESHOLD,
    LessonDetail,
    LessonId,
    LessonSummary,
    Score,
    SubmissionResult,
)

__all__ = [
    # Legacy (backward-compatible)
    "LessonService",
    # SOLID services
    "LessonListService",
    "LessonDetailService",
    "ActivitySubmissionService",
    "ScoringDispatcher",
    "ScoringStrategy",
    # Built-in strategies (for app.py wiring)
    "_ListenTranslateStrategy",
    "_TranslateToEnglishStrategy",
    "_TranslateToArabicStrategy",
    "_IntroduceCharactersStrategy",
    "_RolePlayStrategy",
    # Repository (DIP)
    "LessonRepository",
    "SqliteLessonRepository",
    # Domain (value objects + data classes)
    "LessonId",
    "ActivityId",
    "Score",
    "COMPLETION_THRESHOLD",
    "LessonSummary",
    "ActivityProgress",
    "LessonDetail",
    "SubmissionResult",
]
