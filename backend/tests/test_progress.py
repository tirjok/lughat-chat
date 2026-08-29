from app import app


def test_get_progress_returns_zero_for_unknown_lesson():
    """GET /api/progress/{lesson_id} returns progress: 0 for unknown lessons."""
    import app as main_app

    # Clear the in-memory store
    main_app._progress_store.clear()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.get("/api/progress/a1-01")

    assert response.status_code == 200
    data = response.json()
    assert data["lesson_id"] == "a1-01"
    assert data["progress"] == 0.0


def test_put_progress_stores_then_get_returns_it():
    """PUT /api/progress/{lesson_id} stores progress then GET returns it."""
    import app as main_app

    main_app._progress_store.clear()

    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.put(
        "/api/progress/a1-01",
        json={"lesson_id": "a1-01", "progress": 75.0}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["lesson_id"] == "a1-01"
    assert data["progress"] == 75.0

    # Verify GET returns the stored value
    response = client.get("/api/progress/a1-01")
    assert response.status_code == 200
    data = response.json()
    assert data["progress"] == 75.0


def test_put_progress_with_value_above_100_returns_422():
    """PUT /api/progress with progress > 100 returns 422."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.put(
        "/api/progress/a1-01",
        json={"lesson_id": "a1-01", "progress": 101.0}
    )

    assert response.status_code == 422


def test_put_progress_with_negative_value_returns_422():
    """PUT /api/progress with progress < 0 returns 422."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.put(
        "/api/progress/a1-01",
        json={"lesson_id": "a1-01", "progress": -1.0}
    )

    assert response.status_code == 422


def test_put_progress_with_empty_lesson_id_returns_422():
    """PUT /api/progress with empty lesson_id returns 422."""
    from fastapi.testclient import TestClient

    client = TestClient(app)

    response = client.put(
        "/api/progress/a1-01",
        json={"lesson_id": "", "progress": 50.0}
    )

    assert response.status_code == 422
