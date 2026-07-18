"""Request/Response schemas for all API endpoints.

This module is the single source of truth for Pydantic models used by
route handlers.  It is imported by ``app.py`` and by every module that
needs to validate or construct an API payload.

Dead code removed: ``SynthesisResponse`` was defined but never used
(the ``/api/generate`` endpoint returns ``FileResponse`` directly).

RC-028: SynthesisResponse dead code.
"""

from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# TTS endpoints
# ---------------------------------------------------------------------------


class SynthesisRequest(BaseModel):
    """Request body for the speech synthesis endpoint."""

    text: str = Field(..., min_length=1, max_length=3000)
    language: str = Field(default="ar", pattern="^(ar|en)$")
    voice: Optional[str] = Field(
        default=None
    )  # any string accepted; validated at runtime via file existence
    speaker: Optional[str] = Field(
        default=None  # Alias for voice (any string accepted)
    )
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=0.0, ge=-4.0, le=4.0)
    seed: Optional[int] = Field(default=None, ge=0)  # Deterministic seed (optional)


class HealthResponse(BaseModel):
    """Response body for the health check endpoint."""

    status: str  # loading | ready | error
    model_loaded: bool
    model_name: str = "XTTS-v2"  # Name of the loaded model
    sub_status: str = ""  # Optional: "downloading" | "initializing" | ""


# ---------------------------------------------------------------------------
# Learning endpoints
# ---------------------------------------------------------------------------


class SubmitRequest(BaseModel):
    """Request body for the activity submission endpoint."""

    answer: str


class LessonSummaryResponse(BaseModel):
    """Lesson summary for /api/lessons listing."""

    id: int
    level: str
    sequence: int
    title: str
    competency_count: int
    section_count: int
    status: str  # locked | available | in_progress | completed


class ActivityProgress(BaseModel):
    """Per-activity progress data."""

    score: float = 0.0
    status: str  # locked | available | in_progress | completed
    attempts: int = 0


class LessonProgress(BaseModel):
    """Per-lesson progress with aggregated activity data."""

    status: str  # locked | available | in_progress | completed
    activities: dict[str, ActivityProgress]


class LessonDetailResponse(BaseModel):
    """Full lesson detail for /api/lessons/:id."""

    id: int
    level: str
    sequence: int
    title: str
    competencies: list[Any]
    sections: list[Any]
    activities: list[Any]
    progress: LessonProgress


class SubmissionResult(BaseModel):
    """Result body for activity submission."""

    score: float
    feedback: str
    attempts_remaining: int
    activity_complete: bool
    competency_impact: dict[str, float]
    correct_answer: Optional[str] = None


# ---------------------------------------------------------------------------
# Storage endpoints
# ---------------------------------------------------------------------------


class HistoryEntry(BaseModel):
    """One entry in the audio history listing."""

    filename: str
    text: str
    language: str
    voice: str
    speed: float
    pitch: float
    created_at: str
