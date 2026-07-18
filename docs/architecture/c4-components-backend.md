# C4 Component Diagram — Lughat Chat Backend (Post-Refactor)

> **System:** Lughat Chat — Arabic Text-to-Speech Studio
> **Updated:** 2026-07-18
> **Level:** 3 — Component (Internal structure of the FastAPI server)
> **Container:** FastAPI Server (Python 3.12 + FastAPI 0.115.6)
> **ADR:** ADR-014 (Modular Monolith — Deep Domain Modules)

---

## Architecture Overview

The backend is a **thin controller** (`app.py`, ~130 lines) delegating to **four deep domain modules**:

```
backend/
├── app.py              Thin FastAPI controller (8 routes, ~10 lines each)
├── config.py           Path constants (AUDIO_DIR, DB_PATH, etc.)
├── lifespan.py         Model loading + DB initialization (lifespan handler)
├── schemas.py          Request/response Pydantic models
├── tts/                TTS domain module
│   ├── engine.py       TtsEngine class (load_model, synthesize, health)
│   ├── audio_pipeline.py  _discover_voices, _cleanup_audio_dir
│   └── voice_resolver.py  resolve_voice()
├── learning/           Learning domain module
│   └── service.py      LessonService class (list_lessons, get_lesson, submit_activity)
├── storage/            Storage domain module
│   ├── service.py      StorageService class (get_history, cleanup, discover_voices)
│   └── helpers.py      write_sidecar, read_sidecar, cleanup_audio_dir
├── db/                 Data access layer
│   ├── __init__.py     get_db_connection(), get_db_connection_from_app()
│   ├── safety.py       apply_safety_pragmas()
│   ├── lessons_db.py   init_lessons_db()
│   └── progress_db.py  init_user_progress_db()
└── content/            Scoring library (unchanged)
    └── scoring.py      5 scoring algorithms
```

## Diagram

```mermaid
C4Component
  title Component Diagram - Lughat Chat Backend (Modular)

  Container(server, "FastAPI Server", "Python 3.12 + FastAPI + uvicorn", "REST API for TTS synthesis + learning")

  Component_Boundary(app, "Thin Controller (app.py ~130 lines)") {
    Component(health, "/health", "GET", "Delegates to tts_engine.health()")
    Component(voices, "/api/voices", "GET", "Delegates to store.discover_voices()")
    Component(lessons, "/api/lessons", "GET", "Delegates to lesson_service.list_lessons()")
    Component(lessonDetail, "/api/lessons/{id}", "GET", "Delegates to lesson_service.get_lesson()")
    Component(generate, "/api/generate", "POST", "Delegates to tts_engine.synthesize()")
    Component(history, "/api/history", "GET", "Delegates to store.get_history()")
    Component(submit, "/api/lessons/{lid}/activities/{aid}/submit", "POST", "Delegates to lesson_service.submit_activity()")
  }

  Component_Boundary(tts, "TTS Domain (tts/)") {
    Component(ttsEngine, "TtsEngine", "Class", "load_model(), synthesize(), health(), discover_voices()")
    Component(voiceResolver, "resolve_voice()", "Function", "speaker ?? voice ?? first_discovered ?? female")
  }

  Component_Boundary(learning, "Learning Domain (learning/)") {
    Component(lessonSvc, "LessonService", "Class", "list_lessons(), get_lesson(), submit_activity()")
    Component(statusResolver, "_resolve_lesson_status()", "Static method", "Single algorithm — was duplicated in 3 places")
  }

  Component_Boundary(storage, "Storage Domain (storage/)") {
    Component(store, "StorageService", "Class", "get_history(), cleanup(), discover_voices()")
    Component(sidecar, "write_sidecar / read_sidecar", "Functions", "Sidecar metadata file I/O")
  }

  Component_Boundary(db, "Data Access (db/)") {
    Component(dbConn, "get_db_connection()", "Function", "SQLite connection with safety pragmas")
    Component(lessonsDb, "init_lessons_db()", "Function", "Creates lessons table from JSON")
    Component(progressDb, "init_user_progress_db()", "Function", "Creates user_progress table")
  }

  Component_Boundary(content, "Scoring (content/)") {
    Component(scoring, "score_activity()", "Function", "5 scoring algorithms by activity type")
  }

  Rel(health, ttsEngine, "Calls", "health()")
  Rel(voices, store, "Calls", "discover_voices()")
  Rel(lessons, lessonSvc, "Calls", "list_lessons()")
  Rel(lessonDetail, lessonSvc, "Calls", "get_lesson()")
  Rel(generate, ttsEngine, "Calls", "synthesize()")
  Rel(history, store, "Calls", "get_history()")
  Rel(submit, lessonSvc, "Calls", "submit_activity()")

  Rel(ttsEngine, voiceResolver, "Uses", "resolve_voice()")
  Rel(ttsEngine, tts, "Uses", "audio_pipeline helpers")

  Rel(lessonSvc, statusResolver, "Uses", "_resolve_lesson_status()")
  Rel(lessonSvc, scoring, "Uses", "score_activity()")
  Rel(lessonSvc, dbConn, "Uses", "SQLite connections")

  Rel(store, sidecar, "Uses", "read_sidecar()")
  Rel(store, storage, "Uses", "cleanup_audio_dir()")

  Rel(health, lifespan, "Uses", "model status")
  Rel(lifespan, ttsEngine, "Calls", "load_model() in background thread")
  Rel(lifespan, lessonsDb, "Calls", "init_lessons_db()")
  Rel(lifespan, progressDb, "Calls", "init_user_progress_db()")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")
```

## Module Inventory

### Thin Controller (`app.py` — ~130 lines)

8 route handlers, each ~10 lines, delegating to domain modules. Backward-compatible aliases for existing tests (`app.tts_model`, `app.model_load_status`, `app.AUDIO_DIR`, `app._get_db_connection()`, `app.discover_voices()`).

### TTS Domain (`tts/`)

| Class/Function | Responsibilities |
|---------------|-----------------|
| `TtsEngine` | `load_model()`, `synthesize()`, `health()`, `discover_voices()` |
| `resolve_voice()` | Priority: speaker → voice → first_discovered → "female" |
| `_discover_voices()` | Scan `speaker_wavs/` for `.wav` files |
| `_cleanup_audio_dir()` | Remove oldest files beyond MAX limit |

### Learning Domain (`learning/`)

| Class/Function | Responsibilities |
|---------------|-----------------|
| `LessonService` | `list_lessons()`, `get_lesson()`, `submit_activity()` |
| `_resolve_lesson_status()` | Single algorithm (was duplicated in 3 endpoints) |
| `_extract_correct_answer()` | Extract correct answer from activity content |

### Storage Domain (`storage/`)

| Class/Function | Responsibilities |
|---------------|-----------------|
| `StorageService` | `get_history()`, `cleanup()`, `discover_voices()` |
| `write_sidecar()` | Write `{timestamp}.meta.json` alongside MP3 |
| `read_sidecar()` | Read sidecar metadata (returns None if not found) |
| `_cleanup_audio_dir()` | Remove oldest files beyond MAX limit |

### Data Access (`db/`)

| Function | Responsibilities |
|----------|-----------------|
| `get_db_connection(db_path)` | SQLite connection with safety pragmas |
| `get_db_connection_from_app()` | Same, but checks for test-level `app.DB_PATH` override |
| `apply_safety_pragmas(conn)` | `foreign_keys=ON`, `busy_timeout=5000`, `WAL`, `synchronous=NORMAL` |
| `init_lessons_db(content_dir, db_path)` | Create lessons table from JSON files |
| `init_user_progress_db(content_dir, db_path)` | Create user_progress table |

### Configuration (`config.py`)

| Constant | Value |
|----------|-------|
| `AUDIO_DIR` | `{backend}/downloads` |
| `MODEL_CACHE_DIR` | env `TTS_MODEL_CACHE` → `/app/.cache/tts` |
| `SPEAKER_WAV_DIR` | `{backend}/speaker_wavs` |
| `CONTENT_DIR` | `{backend}/content` |
| `DB_PATH` | `{backend}/lughat.db` |
| `MAX_AUDIO_FILES` | env `MAX_AUDIO_FILES` → 100 |

## API Endpoints

| Endpoint | Method | Module | Status Codes |
|----------|--------|--------|-------------|
| `/health` | GET | tts | 200 |
| `/api/voices` | GET | storage | 200 |
| `/api/lessons` | GET | learning | 200, 500 |
| `/api/lessons/{id}` | GET | learning | 200, 403, 404, 500 |
| `/api/generate` | POST | tts | 200, 400, 500, 503 |
| `/api/history` | GET | storage | 200, 500 |
| `/api/lessons/{lid}/activities/{aid}/submit` | POST | learning | 200, 400, 403, 404, 429, 500 |

## API Request Flow (Synthesis)

```
POST /api/generate (app.py route)
    │
    └─ tts_engine.synthesize()
         │
         ├─ 1. Check: model is not None AND status == "ready" → 503 if not
         ├─ 2. resolve_voice(voice, speaker, SPEAKER_WAV_DIR)
         ├─ 3. Generate filename: {lang}_{voice}_{uuid8}.mp3
         ├─ 4. Locate speaker WAV: speaker_wavs/{voice}.wav → 500 if not found
         ├─ 5. Validate WAV duration ≥ 0.33s → 500 if too short
         ├─ 6. Set PyTorch seed (deterministic output, default 42)
         ├─ 7. XTTS inference: tts_to_file(text, speaker_wav, language, wav_path)
         ├─ 8. ffmpeg: WAV → MP3 (192k, speed filter)
         ├─ 9. Clean up intermediate WAV file
         ├─ 10. Write sidecar metadata (optional)
         ├─ 11. Cleanup old files beyond MAX limit
         └─ 12. Return: AudioResult {mp3_path, filename, duration}
```

## API Request Flow (Activity Submission)

```
POST /api/lessons/{lid}/activities/{aid}/submit (app.py route)
    │
    └─ lesson_service.submit_activity(lesson_id, activity_id, answer)
         │
         ├─ 1. Fetch lesson from SQLite (lessons table)
         ├─ 2. Validate lesson exists → 404
         ├─ 3. Find activity by ID → 404
         ├─ 4. Check lesson unlock status → 403
         ├─ 5. Check max attempts → 429 (show correct answer)
         ├─ 6. Score answer via score_activity() (5 algorithms)
         ├─ 7. Compute competency_impact
         ├─ 8. Persist score to user_progress table
         └─ 9. Return: {score, feedback, attempts_remaining,
                      activity_complete, competency_impact,
                      [correct_answer]}
```

## Key Design Decisions

1. **Thin controller** — `app.py` is ~130 lines (from 1110). Each route handler is ~10 lines, delegating to deep domain modules.
2. **Deep domain modules** — `TtsEngine`, `LessonService`, and `StorageService` encapsulate business logic and are testable without FastAPI/HTTP.
3. **Single status resolution algorithm** — `_resolve_lesson_status()` was duplicated across 3 endpoints; now a single method in `LessonService`.
4. **Backward compatibility** — All 22 existing test files work without modification via re-exported module-level attributes.
5. **Module-level testability** — Each domain module can be unit-tested independently (no HTTP/FastAPI dependency).

## Related ADRs

- **ADR-001**: Modular Monolith (this ADR implements the mandate)
- **ADR-014**: Backend modular monolith — deep domain modules (this document)
