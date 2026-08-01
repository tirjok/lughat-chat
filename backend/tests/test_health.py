from app import app


def test_health_returns_loading_when_model_not_loaded():
    """Health endpoint returns loading status when TTS model is not loaded."""
    import app as main_app

    main_app.tts_model = None
    main_app.model_load_status = "loading"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "loading"
    assert data["model_loaded"] is False


def test_health_returns_ready_when_model_is_loaded():
    """Health endpoint returns ready status when TTS model is loaded."""
    import app as main_app

    main_app.tts_model = "mock_model"  # any truthy value simulates loaded model
    main_app.model_load_status = "ready"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["model_loaded"] is True


def test_health_returns_error_when_model_load_failed():
    """Health endpoint returns error status when TTS model load failed."""
    import app as main_app

    main_app.tts_model = None
    main_app.model_load_status = "error"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["model_loaded"] is False


def test_health_reload_triggers_reload_when_error():
    """GET /health?reload=1 triggers a reload attempt when status is 'error'."""
    import app as main_app

    main_app.tts_model = None
    main_app.model_load_status = "error"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/health?reload=1")

    assert response.status_code == 200
    data = response.json()
    # After reload request, status should transition to 'loading'
    assert data["status"] == "loading"
    assert data["model_loaded"] is False


def test_health_reload_ignored_when_not_error():
    """GET /health?reload=1 is ignored when status is 'loading' (not 'error')."""
    import app as main_app

    main_app.tts_model = None
    main_app.model_load_status = "loading"

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/health?reload=1")

    assert response.status_code == 200
    data = response.json()
    # Reload is only triggered from 'error' state
    assert data["status"] == "loading"
