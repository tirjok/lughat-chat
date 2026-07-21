"""Regression test for M-06 health endpoint stale-data bug.

Verifies that the /health endpoint correctly reflects the live state of
TtsEngine when the model loads in the background — without relying on
the backward-compat module-level overrides.

This test simulates what happens in a real running server: the background
thread updates tts_engine.status from "loading" to "ready". The health
endpoint must follow, not return stale data.
"""

import sys
from fastapi.testclient import TestClient
import app as main_app
from app import tts_engine


def _reset_all():
    """Reset engine and module-level state to initial values."""
    tts_engine.status = "loading"
    tts_engine.model = None
    _m = sys.modules["app"]
    # Remove any test-set backward-compat overrides so hasattr() returns False
    for attr in ("tts_model", "model_load_status"):
        if hasattr(_m, attr):
            delattr(_m, attr)


def test_health_follows_live_engine_status_when_model_loads():
    """Health endpoint returns 'ready' after background thread loads the model.

    This is the core regression test for the bug where /health always
    returned {\"status\": \"loading\", \"model_loaded\": false} because the
    backward-compat module-level aliases (tts_model, model_load_status) were
    set at module-load time as frozen snapshots, and the health endpoint's
    hasattr() check could not distinguish "set by tests" from "set at module
    load".

    The fix: remove the module-level aliases so hasattr() returns False,
    causing the endpoint to fall through to tts_engine.health().
    """
    _reset_all()

    client = TestClient(main_app.app)

    # Before model loads — should report loading
    resp = client.get("/health")
    data = resp.json()
    assert data["status"] == "loading"
    assert data["model_loaded"] is False
    assert data["model_name"] == "XTTS-v2"
    assert data["sub_status"] == "initializing"

    # Simulate background thread loading the model
    class MockModel:
        pass

    tts_engine.model = MockModel()
    tts_engine.status = "ready"

    # After model loads — should report ready (NOT stale "loading")
    resp = client.get("/health")
    data = resp.json()
    assert data["status"] == "ready"
    assert data["model_loaded"] is True
    assert data["model_name"] == "XTTS-v2"
    assert data["sub_status"] == ""

    # Restore initial state for any subsequent tests
    _reset_all()


def test_health_follows_live_engine_status_when_model_fails():
    """Health endpoint returns 'error' after background thread fails to load."""
    _reset_all()

    client = TestClient(main_app.app)

    # Simulate model load failure
    tts_engine.status = "error"
    tts_engine.model = None

    resp = client.get("/health")
    data = resp.json()
    assert data["status"] == "error"
    assert data["model_loaded"] is False
    assert data["model_name"] == "XTTS-v2"
    assert data["sub_status"] == ""
