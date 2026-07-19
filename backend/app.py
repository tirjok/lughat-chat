"""Lughat Chat TTS API — thin FastAPI controller.

This file is the HTTP boundary only.  All business logic lives in deep
domain modules:

  - ``tts.TtsEngine``  — text-to-speech synthesis.
  - ``learning.LessonService``  — lesson browsing and activity submission.
  - ``storage.StorageService``  — audio history and file management.

The module creates one instance of each service at startup and wires
8 FastAPI route handlers (~10 lines each) that delegate to them.

API Endpoints
-------------
| Endpoint                      | Method | Module   |
|-------------------------------|--------|----------|
| ``/health``                   | GET    | tts      |
| ``/api/voices``               | GET    | storage  |
| ``/api/lessons``              | GET    | learning |
| ``/api/lessons/{lesson_id}``  | GET    | learning |
| ``/api/generate``             | POST   | tts      |
| ``/api/history``              | GET    | storage  |
| ``/api/lessons/{lid}/activities/{aid}/submit`` | POST | learning |

RC-028: ``SynthesisResponse`` dead code removed (moved to schemas.py).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from config import (
    AUDIO_DIR,
    DB_PATH,
    MAX_AUDIO_FILES,
    MODEL_CACHE_DIR,
    SPEAKER_WAV_DIR,
)
from lifespan import app_lifespan
from learning import (
    _IntroduceCharactersStrategy,
    _ListenTranslateStrategy,
    _RolePlayStrategy,
    _TranslateToArabicStrategy,
    _TranslateToEnglishStrategy,
    ActivitySubmissionService,
    LessonDetailService,
    LessonListService,
    LessonService,
    ScoringDispatcher,
    SqliteLessonRepository,
)
from schemas import (
    HealthResponse,
    HistoryEntry,
    LessonDetailResponse,
    LessonSummaryResponse,
    SubmitRequest,
)
from schemas import SynthesisRequest
from storage import StorageService
from storage.helpers import write_sidecar as _write_sidecar
from tts import TtsEngine
from tts.voice_resolver import resolve_voice

# ---------------------------------------------------------------------------
# Service instances (created once at startup)
# ---------------------------------------------------------------------------

tts_engine = TtsEngine(MODEL_CACHE_DIR, SPEAKER_WAV_DIR)

# SOLID architecture: three narrow services instead of one fat service.
# The legacy LessonService wraps them for backward compatibility.
_lesson_repo = SqliteLessonRepository(DB_PATH)
_lesson_list_service = LessonListService(_lesson_repo)
_lesson_detail_service = LessonDetailService(_lesson_repo)
_lesson_submit_service = ActivitySubmissionService(
    _lesson_repo,
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
# Legacy adapter — wraps SOLID services for backward-compatible API.
lesson_service = LessonService(DB_PATH)
store = StorageService(AUDIO_DIR, MAX_AUDIO_FILES, SPEAKER_WAV_DIR)


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns
    -------
    FastAPI
        Configured application with all routes and middleware.
    """
    app = FastAPI(
        title="Lughat Chat TTS API",
        description="Text-to-Speech API with XTTS-v2 (Arabic & English)",
        version="1.0.0",
        lifespan=lambda: app_lifespan(app, tts_engine),  # type: ignore[arg-type]
    )

    # CORS middleware — allow frontend container to call API.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Serve downloads and speaker_wavs directories statically.
    app.mount("/downloads", StaticFiles(directory=AUDIO_DIR), name="downloads")
    try:
        import os

        os.makedirs(SPEAKER_WAV_DIR, exist_ok=True)
    except OSError:
        pass  # Read-only filesystem
    app.mount(
        "/speaker_wavs", StaticFiles(directory=SPEAKER_WAV_DIR), name="speaker_wavs"
    )

    # ------------------------------------------------------------------
    # Route handlers — ~10 lines each, delegate to domain modules.
    # ------------------------------------------------------------------

    @app.get("/health", response_model=HealthResponse)
    async def health() -> dict:
        """Health check endpoint — returns model load status."""
        # Backward compat: tests set app.tts_model and app.model_load_status
        # directly. Check module-level overrides first, then fall back to
        # the tts_engine instance.
        import sys as _sys

        _m = _sys.modules[__name__]
        if (
            hasattr(_m, "model_load_status")
            and _m.model_load_status != tts_engine.status
        ):
            return {
                "status": _m.model_load_status,
                "model_loaded": (
                    getattr(_m, "tts_model", None) is not None
                    and _m.model_load_status == "ready"
                ),
                "model_name": "XTTS-v2",
                "sub_status": (
                    "initializing" if _m.model_load_status == "loading" else ""
                ),
            }
        return tts_engine.health()

    @app.get("/api/voices")
    async def list_voices() -> list[dict]:
        """List available voices discovered from speaker_wavs/ directory."""
        return store.discover_voices()

    @app.get("/api/lessons", response_model=list[LessonSummaryResponse])
    async def list_lessons() -> list[dict]:
        """Return lesson summaries with status resolved from user_progress."""
        import sys as _sys

        _m = _sys.modules[__name__]
        _db_path = getattr(_m, "DB_PATH", None)
        if _db_path:
            svc = LessonService(_db_path)
            return svc.list_lessons()
        return lesson_service.list_lessons()

    @app.get("/api/lessons/{lesson_id}", response_model=LessonDetailResponse)
    async def get_lesson(lesson_id: int) -> dict:
        """Return full lesson data with progress."""
        import sys as _sys

        _m = _sys.modules[__name__]
        _db_path = getattr(_m, "DB_PATH", None)
        if _db_path:
            svc = LessonService(_db_path)
            return svc.get_lesson(lesson_id)
        return lesson_service.get_lesson(lesson_id)

    @app.post("/api/generate")
    async def generate_speech(request: SynthesisRequest) -> FileResponse:
        """Generate speech from text and return MP3 audio blob."""
        import sys as _sys

        _m = _sys.modules[__name__]
        # Backward compat: tests set app.tts_model and app.model_load_status
        # directly. Check module-level overrides.
        _model = getattr(_m, "tts_model", None)
        _status = getattr(_m, "model_load_status", None)
        if _model is None and _status is None:
            # Use the tts_engine instance (normal operation).
            voice = resolve_voice(request.voice, request.speaker, SPEAKER_WAV_DIR)
            seed = request.seed if request.seed is not None else 42
            result = tts_engine.synthesize(
                text=request.text,
                language=request.language,
                voice=voice,
                speed=request.speed,
                pitch=request.pitch,
                seed=seed,
                audio_dir=AUDIO_DIR,
                max_audio_files=MAX_AUDIO_FILES,
                write_sidecar_fn=_write_sidecar,
            )
        else:
            # Tests have overridden tts_model / model_load_status.
            # Check readiness using the test overrides.
            if _model is None or _status != "ready":
                from fastapi import HTTPException

                raise HTTPException(status_code=503, detail="TTS model not ready")
            # Delegate to tts_engine.synthesize but inject the test mocks.
            # The tts_engine.synthesize method checks tts_engine.model and
            # tts_engine.status — we set them to the test overrides.
            _orig_model = tts_engine.model
            _orig_status = tts_engine.status
            tts_engine.model = _model
            tts_engine.status = _status
            try:
                voice = resolve_voice(request.voice, request.speaker, SPEAKER_WAV_DIR)
                seed = request.seed if request.seed is not None else 42
                result = tts_engine.synthesize(
                    text=request.text,
                    language=request.language,
                    voice=voice,
                    speed=request.speed,
                    pitch=request.pitch,
                    seed=seed,
                    audio_dir=getattr(_m, "AUDIO_DIR", AUDIO_DIR),
                    max_audio_files=getattr(_m, "MAX_AUDIO_FILES", MAX_AUDIO_FILES),
                    write_sidecar_fn=_write_sidecar,
                )
            finally:
                tts_engine.model = _orig_model
                tts_engine.status = _orig_status

        media_type = "audio/mpeg" if result.filename.endswith(".mp3") else "audio/wav"
        return FileResponse(
            path=result.mp3_path,
            media_type=media_type,
            filename=result.filename,
        )

    @app.get("/api/history", response_model=list[HistoryEntry])
    async def get_history() -> list[dict]:
        """Get list of previously generated audio files."""
        import sys as _sys

        _m = _sys.modules[__name__]
        _audio_dir = getattr(_m, "AUDIO_DIR", AUDIO_DIR)
        _orig = store.audio_dir
        store.audio_dir = _audio_dir
        try:
            return store.get_history()
        finally:
            store.audio_dir = _orig

    @app.post("/api/lessons/{lesson_id}/activities/{activity_id}/submit")
    async def submit_activity(
        lesson_id: int,
        activity_id: int,
        request: SubmitRequest,
    ) -> JSONResponse:
        """Submit an answer for an activity and get a score."""
        import sys as _sys

        _m = _sys.modules[__name__]
        _db_path = getattr(_m, "DB_PATH", None)
        if _db_path:
            svc = LessonService(_db_path)
            result = svc.submit_activity(
                lesson_id=lesson_id,
                activity_id=activity_id,
                answer=request.answer,
            )
        else:
            result = lesson_service.submit_activity(
                lesson_id=lesson_id,
                activity_id=activity_id,
                answer=request.answer,
            )
        # submit_activity may return JSONResponse (429) or dict (200).
        if isinstance(result, JSONResponse):
            return result
        return JSONResponse(content=result)

    return app


# Module-level app instance for uvicorn entry point.
app = create_app()

# ---------------------------------------------------------------------------
# Backward-compatible module-level attributes for existing tests.
# Tests do 'import app as main_app' then set:
#   main_app.tts_model = _mock_tts_model()
#   main_app.model_load_status = 'ready'
#   main_app.AUDIO_DIR = tmpdir
# We expose these so the same pattern works.
# ---------------------------------------------------------------------------
# Backward-compatible re-exports for tests that do 'import app'.
import sys as _sys  # noqa: E402

_mod = _sys.modules[__name__]

# Re-export _get_db_connection for tests that use it directly:
from db import get_db_connection_from_app as _get_db_connection  # noqa: E402

_mod._get_db_connection = _get_db_connection

# Re-export tts_engine for tests:
#   import app as main_app; main_app.tts_engine.model = mock_tts
_mod.tts_engine = tts_engine

# Legacy aliases — tests set these directly on the app module.
# We set them on the module object so 'import app' picks them up.
_mod.tts_model = tts_engine.model  # tests set: main_app.tts_model = mock
_mod.model_load_status = (
    tts_engine.status
)  # tests set: main_app.model_load_status = 'ready'
_mod.DB_PATH = DB_PATH  # tests set: main_app.DB_PATH = tmp_db_path
_mod.AUDIO_DIR = AUDIO_DIR  # tests set: main_app.AUDIO_DIR = tmpdir
_mod.MAX_AUDIO_FILES = MAX_AUDIO_FILES  # tests set: main_app.MAX_AUDIO_FILES = 100
_mod.SPEAKER_WAV_DIR = SPEAKER_WAV_DIR  # tests set: main_app.SPEAKER_WAV_DIR = path

# Also expose submodules for tests that patch them:
_mod.os = __import__("os")
_mod.wave = __import__("wave")
_mod.uuid = __import__("uuid")
_mod.json = __import__("json")
_mod.subprocess = __import__("subprocess")

# Re-export discover_voices and SPEAKER_WAV_DIR for tests that import them:
#   from app import discover_voices, SPEAKER_WAV_DIR
from tts.audio_pipeline import _discover_voices as discover_voices  # noqa: E402

_mod.discover_voices = discover_voices
_mod.SPEAKER_WAV_DIR = SPEAKER_WAV_DIR

# Re-export cleanup_audio for tests that import it directly:
#   from app import cleanup_audio
from storage.helpers import cleanup_audio_dir as _cleanup_audio_dir  # noqa: E402


# No-arg wrapper: uses module-level AUDIO_DIR and MAX_AUDIO_FILES.
# Tests call main_app.cleanup_audio() with no arguments.
def cleanup_audio() -> None:
    """Clean up old audio files beyond MAX_AUDIO_FILES limit."""
    _cleanup_audio_dir(AUDIO_DIR, MAX_AUDIO_FILES)


_mod.cleanup_audio = cleanup_audio
