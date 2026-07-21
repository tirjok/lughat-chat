"""Tests for the extended /health response fields (M-06).

Verifies that TtsEngine.health() returns model_name and sub_status
in all three status states, and that the FastAPI endpoint correctly
returns these fields to the frontend.
"""

import tempfile

from app import app
from tts.engine import TtsEngine


def _make_engine(cache_dir: str, speaker_wav_dir: str) -> TtsEngine:
    """Create a TtsEngine without loading the real model."""
    return TtsEngine(cache_dir, speaker_wav_dir)


# ---------------------------------------------------------------------------
# TtsEngine.health() — direct method tests
# ---------------------------------------------------------------------------


def test_health_returns_model_name_in_loading_state():
    """TtsEngine.health() includes model_name 'XTTS-v2' when status is loading."""
    with (
        tempfile.TemporaryDirectory() as cache_dir,
        tempfile.TemporaryDirectory() as wav_dir,
    ):
        engine = _make_engine(cache_dir, wav_dir)
        engine.status = "loading"
        engine.model = None

        result = engine.health()

        assert result["model_name"] == "XTTS-v2"
        assert result["sub_status"] == "initializing"
        assert result["status"] == "loading"
        assert result["model_loaded"] is False


def test_health_returns_model_name_in_ready_state():
    """TtsEngine.health() includes model_name 'XTTS-v2' when status is ready."""
    with (
        tempfile.TemporaryDirectory() as cache_dir,
        tempfile.TemporaryDirectory() as wav_dir,
    ):
        engine = _make_engine(cache_dir, wav_dir)
        engine.status = "ready"
        engine.model = "mock_model"

        result = engine.health()

        assert result["model_name"] == "XTTS-v2"
        assert result["sub_status"] == ""
        assert result["status"] == "ready"
        assert result["model_loaded"] is True


def test_health_returns_model_name_in_error_state():
    """TtsEngine.health() includes model_name 'XTTS-v2' when status is error."""
    with (
        tempfile.TemporaryDirectory() as cache_dir,
        tempfile.TemporaryDirectory() as wav_dir,
    ):
        engine = _make_engine(cache_dir, wav_dir)
        engine.status = "error"
        engine.model = None

        result = engine.health()

        assert result["model_name"] == "XTTS-v2"
        assert result["sub_status"] == ""
        assert result["status"] == "error"
        assert result["model_loaded"] is False


def test_health_sub_status_is_initializing_only_when_loading():
    """sub_status is 'initializing' ONLY when status is 'loading', empty otherwise."""
    with (
        tempfile.TemporaryDirectory() as cache_dir,
        tempfile.TemporaryDirectory() as wav_dir,
    ):
        engine = _make_engine(cache_dir, wav_dir)

        # Loading → initializing
        engine.status = "loading"
        engine.model = None
        assert engine.health()["sub_status"] == "initializing"

        # Ready → empty
        engine.status = "ready"
        engine.model = "mock"
        assert engine.health()["sub_status"] == ""

        # Error → empty
        engine.status = "error"
        engine.model = None
        assert engine.health()["sub_status"] == ""


# ---------------------------------------------------------------------------
# FastAPI /health endpoint — integration with new fields
# ---------------------------------------------------------------------------


def test_health_endpoint_returns_model_name_field():
    """The /health endpoint returns model_name in the response JSON."""
    import app as main_app

    main_app.tts_model = None
    main_app.model_load_status = "loading"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert "model_name" in data
    assert data["model_name"] == "XTTS-v2"


def test_health_endpoint_returns_sub_status_field():
    """The /health endpoint returns sub_status in the response JSON."""
    import app as main_app

    main_app.tts_model = None
    main_app.model_load_status = "loading"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert "sub_status" in data
    assert data["sub_status"] == "initializing"


def test_health_endpoint_all_fields_present_in_loading():
    """All four fields (status, model_loaded, model_name, sub_status) present when loading."""
    import app as main_app

    main_app.tts_model = None
    main_app.model_load_status = "loading"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/health")
    data = response.json()

    assert set(data.keys()) == {"status", "model_loaded", "model_name", "sub_status"}
    assert data == {
        "status": "loading",
        "model_loaded": False,
        "model_name": "XTTS-v2",
        "sub_status": "initializing",
    }


def test_health_endpoint_all_fields_present_in_ready():
    """All four fields present when model is ready."""
    import app as main_app

    main_app.tts_model = "mock"
    main_app.model_load_status = "ready"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/health")
    data = response.json()

    assert set(data.keys()) == {"status", "model_loaded", "model_name", "sub_status"}
    assert data == {
        "status": "ready",
        "model_loaded": True,
        "model_name": "XTTS-v2",
        "sub_status": "",
    }


def test_health_endpoint_all_fields_present_in_error():
    """All four fields present when model load failed."""
    import app as main_app

    main_app.tts_model = None
    main_app.model_load_status = "error"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/health")
    data = response.json()

    assert set(data.keys()) == {"status", "model_loaded", "model_name", "sub_status"}
    assert data == {
        "status": "error",
        "model_loaded": False,
        "model_name": "XTTS-v2",
        "sub_status": "",
    }
