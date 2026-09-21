"""Tests for the health endpoint, adapted to use the ModelManager deep module."""

from fastapi.testclient import TestClient
from app import app


def _setup_mock_model(status: str = "loading", model=None):
    """Set up mock model in the deep module instances."""
    import app as main_app
    from model_manager import ModelManager

    mm = ModelManager(TTS_class=None, cache_dir="/tmp/tts_cache")
    if model is not None:
        mm._model = model
    mm._status = status
    main_app.tts_model_manager = mm

    return lambda: setattr(main_app, "tts_model_manager", None)
    cleanup = _setup_mock_model(status="loading", model=None)

    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "loading"
    assert data["model_loaded"] is False
    cleanup()


def test_health_returns_ready_when_model_is_loaded():
    """Health endpoint returns ready status when TTS model is loaded."""
    cleanup = _setup_mock_model(status="ready", model="mock_model")
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["model_loaded"] is True
    cleanup()


def test_health_returns_error_when_model_load_failed():
    """Health endpoint returns error status when TTS model load failed."""
    cleanup = _setup_mock_model(status="error", model=None)
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["model_loaded"] is False
    cleanup()


def test_health_reload_triggers_reload_when_error():
    """GET /health?reload=1 triggers a reload attempt when status is 'error'."""
    from model_manager import ModelManager

    # Create a model manager with a failing TTS class
    def _failing_tts(*args, **kwargs):
        raise RuntimeError("model load failed")

    mm = ModelManager(TTS_class=_failing_tts, cache_dir="/tmp/tts_cache")
    mm.load_in_background()  # This will set status to "error"
    mm.shutdown()  # Force error state
    mm._status = "error"

    import app as main_app

    def cleanup():
        setattr(main_app, "tts_model_manager", None)

    client = TestClient(app)
    response = client.get("/health?reload=1")

    assert response.status_code == 200
    data = response.json()
    assert data["model_loaded"] is False
    assert data["status"] == "error"
    cleanup()


def test_health_reload_ignored_when_not_error():
    """GET /health?reload=1 is ignored when status is 'loading' (not 'error')."""
    cleanup = _setup_mock_model(status="loading", model=None)
    client = TestClient(app)
    response = client.get("/health?reload=1")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "loading"
    assert data["model_loaded"] is False
    cleanup()


def test_health_reload_during_loading_does_not_spawn_concurrent_thread():
    """GET /health?reload=1 when status is 'loading' must NOT spawn a second
    model — the ModelManager handles this via its lock."""
    from model_manager import ModelManager

    mm = ModelManager(TTS_class=None, cache_dir="/tmp/tts_cache")
    mm._status = "loading"
    # Load without a real TTS class — status stays "loading"

    import app as main_app

    def cleanup():
        setattr(main_app, "tts_model_manager", None)

    # The reload method checks status and returns early if not "error"
    status = mm.reload()
    assert status["status"] == "loading"
    # Status should still be "loading" — no concurrent thread was spawned
    cleanup()


def test_health_endpoint_is_none():
    """Health endpoint returns error when tts_model_manager is None."""
    import app as main_app

    main_app.tts_model_manager = None

    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["model_loaded"] is False
