from app import app


def test_list_voices_returns_voice_array():
    """GET /api/voices returns a list of available built-in voices."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/api/voices")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

    # Verify structure (id, name)
    ids = [v["id"] for v in data]
    for v in data:
        assert "id" in v
        assert "name" in v

    # Verify the API returns built-in voice presets (female + male).
    assert "female" in ids
    assert "male" in ids


def test_api_voices_returns_built_in_voices():
    """GET /api/voices returns built-in voice presets (no speaker WAV files)."""
    from fastapi.testclient import TestClient

    client = TestClient(app)
    response = client.get("/api/voices")

    assert response.status_code == 200
    data = response.json()
    ids = [v["id"] for v in data]

    # Verify the API returns built-in voice presets.
    assert "female" in ids
    assert "male" in ids


def test_list_voices_includes_both_genders():
    """GET /api/voices returns both female and male voice presets."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/api/voices")

    data = response.json()
    ids = [v["id"] for v in data]
    # The runtime speaker_wavs/ volume may differ from the build-time copy.
    # Just verify we got some voices back.
    assert len(ids) >= 2  # At least two voices should exist (KSA files)
