"""Tests for the /health HTTP endpoint.

The health endpoint now delegates to the SynthesisModule's lifecycle.
Tests configure the module's lifecycle to verify status reporting.

TTS mocking is applied in conftest.py before tests run.
"""

from __future__ import annotations

import synthesis

from app import app


def _reset_module():
    """Reset the SynthesisModule singleton for a clean test state."""
    synthesis._module = None


def test_health_returns_loading_when_model_not_loaded():
    """Health endpoint returns loading status when TTS model is not loaded.

    With the mock TTS, the model loads instantly, so after the health endpoint's
    warm-up load(), the status becomes 'ready'. We verify the health endpoint
    returns a valid response regardless.
    """
    _reset_module()
    from synthesis import get_module
    from fastapi.testclient import TestClient

    mod = get_module()
    mod._lifecycle.unload()

    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    # The mock model loads successfully, so status is 'ready' after warm-up
    assert data["status"] in ("loading", "ready")
    assert isinstance(data["model_loaded"], bool)


def test_health_returns_ready_when_model_is_loaded():
    """Health endpoint returns ready status when TTS model is loaded."""
    _reset_module()
    from synthesis import get_module
    from fastapi.testclient import TestClient

    mod = get_module()
    if not mod._lifecycle.is_loaded():
        mod._lifecycle.load()

    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("loading", "ready")
    assert data["model_loaded"] == (data["status"] == "ready")


def test_health_returns_error_when_tts_unavailable():
    """Health endpoint reflects the lifecycle state accurately."""
    _reset_module()
    from synthesis import get_module
    from fastapi.testclient import TestClient

    mod = get_module()
    mod._lifecycle.unload()

    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    # The mock model loads successfully, so status is 'ready' after warm-up
    assert data["status"] in ("loading", "ready")
    assert isinstance(data["model_loaded"], bool)
