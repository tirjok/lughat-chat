# test-history-cleanup-preserve-recent-fix

## Context

The `test_history_cleanup_preserves_recent_files` test (line 75 of `backend/tests/test_history.py`) fails with `assert 126 == 0` on `data["removed_count"]`. The cleanup endpoint correctly exists at `POST /api/cleanup` and iterates files in `AUDIO_DIR`. The test sets `AUDIO_DIR` to a fake directory via `monkeypatch.setattr(main_app, "AUDIO_DIR", str(fake_dir))`, then calls `reload(main_app)`. The `reload()` re-executes the module-level code of `app.py`, including the line `AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")`, which **overwrites the monkeypatched value**. As a result, the cleanup runs against the real `downloads/` directory (which contains 126 files) instead of the test's `fake_audio2` directory (which has 1 file).

The passing test `test_history_cleanup_endpoint_removes_old_files` (line 35) avoids this by directly assigning `main_app.AUDIO_DIR = str(fake_dir)` without reloading.

## Approach

**Single-file fix:** Edit `backend/tests/test_history.py`, lines 89-95.

1. Remove lines 92-95 (`from importlib import reload`, `import app as main_app`, `monkeypatch.setattr(...)`, `reload(main_app)`).
2. Replace with a direct assignment: `import app as main_app` followed by `main_app.AUDIO_DIR = str(fake_dir)`.
3. Remove the outdated comment (lines 89-91) that justifies the reload pattern — it is no longer needed since the test now matches the passing test's approach.

This makes the failing test structurally identical to the passing test's patching strategy, which already works.

## Critical files & anchors

- `backend/tests/test_history.py` lines 89-95: Replace the reload-based monkeypatch with direct assignment.

## Verification

Run the specific test after fix:
```
cd /Users/d504904/dev/tirjok/lughat-chat/backend
python -m pytest tests/test_history.py::test_history_cleanup_preserves_recent_files -v
```
Expected: `PASSED` (both `removed_count == 0` and `recent_file.exists()` assertions pass).

Also run the related cleanup tests to confirm no regression:
```
python -m pytest tests/test_history.py::test_history_cleanup_endpoint_removes_old_files -v
python -m pytest tests/test_history.py::test_history_cleanup_with_cleanup_true_triggers_cleanup -v
```

## Assumptions & contingencies

- Assumption: The `/api/cleanup` endpoint reads `AUDIO_DIR` at request time (not module load time). This is confirmed by the passing test's behavior.
- Contingency: If `TestClient` independently imports the module and resets globals on its own, the direct assignment needs to happen **after** `TestClient(app)` is constructed, or the test needs to patch before calling `TestClient`. In that case, move `main_app.AUDIO_DIR = str(fake_dir)` to after `client = TestClient(main_app.app)` and before `client.post("/api/cleanup")`. The passing test already uses this pattern successfully.
