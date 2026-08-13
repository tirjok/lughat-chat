"""Cache volume path verification — ISSUE-001 Acceptance Criterion 5.

Verifies that the model cache volume path `/app/.cache/tts` is still
configured in app.py, docker-compose.yml, and the Dockerfile.
"""

import os


def _get_project_root():
    """Get project root from the test file location."""
    test_dir = os.path.dirname(os.path.abspath(__file__))
    parts = test_dir.split(os.sep)
    if "backend" in parts:
        idx = parts.index("backend")
        return os.sep.join(parts[:idx])
    elif "/app" in parts and "tests" in parts:
        return "/app"
    return os.path.dirname(test_dir)


def test_app_py_uses_cache_volume_path():
    """app.py must reference /app/.cache/tts as the model cache directory."""
    project_root = _get_project_root()
    app_path = os.path.join(project_root, "backend", "app.py")
    with open(app_path) as f:
        source = f.read()

    assert "/app/.cache/tts" in source, (
        "app.py must reference '/app/.cache/tts' as the model cache directory."
    )


def test_docker_compose_mounts_cache_volume_path():
    """docker-compose.yml must mount tts-model-cache to /app/.cache/tts."""
    project_root = _get_project_root()
    compose_path = os.path.join(project_root, "docker-compose.yml")
    with open(compose_path) as f:
        source = f.read()

    assert "tts-model-cache:/app/.cache/tts" in source, (
        "docker-compose.yml must mount 'tts-model-cache' volume to '/app/.cache/tts'."
    )


def test_dockerfile_creates_cache_directory():
    """Dockerfile must create /app/.cache/tts directory."""
    project_root = _get_project_root()
    dockerfile_path = os.path.join(project_root, "backend", "Dockerfile")
    with open(dockerfile_path) as f:
        source = f.read()

    assert "/app/.cache/tts" in source, (
        "Dockerfile must create '/app/.cache/tts' directory."
    )
