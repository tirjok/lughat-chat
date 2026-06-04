from app import app


def test_list_voices_returns_voice_array():
    """GET /api/voices returns a list of available voices."""
    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.get("/api/voices")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2

    # Verify voice structure
    female = data[0]
    assert "id" in female
    assert "name" in female
    assert "language" in female
    assert female["id"] == "female"
    assert female["name"] == "Female Voice"


def test_list_voices_includes_both_genders():
    """GET /api/voices returns both male and female voice options."""
    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.get("/api/voices")

    data = response.json()
    ids = [v["id"] for v in data]
    assert "female" in ids
    assert "male" in ids
