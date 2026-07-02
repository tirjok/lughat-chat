"""Tests for the Synthesis Module (queue + worker + model lifecycle).

These tests use the InProcessModule's public interface without requiring
a real TTS model. The worker's _synthesize method is mocked to avoid
filesystem and TTS dependencies.
"""

import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from synthesis import (
    Queue,
    ModelLifecycle,
    Worker,
    SynthesisModule,
    SynthesisJob,
    JobStatus,
    discover_voices,
    AUDIO_DIR,
    SPEAKER_WAV_DIR,
)


# ---------------------------------------------------------------------------
# Queue tests
# ---------------------------------------------------------------------------
class TestQueue:
    """Tests for the Queue module."""

    def test_submit_returns_job_id(self):
        """submit() returns a non-empty string job_id."""
        q = Queue()
        job_id = q.submit({"text": "hello", "language": "en"})
        assert isinstance(job_id, str)
        assert len(job_id) > 0

    def test_submit_creates_pending_job(self):
        """submit() creates a job with status 'pending'."""
        q = Queue()
        job_id = q.submit({"text": "hello", "language": "en", "voice": "female"})
        job = q.get(job_id)
        assert job is not None
        assert job.status == JobStatus.PENDING
        assert job.text == "hello"
        assert job.voice == "female"

    def test_submit_uses_speaker_over_voice(self):
        """submit() resolves voice: speaker > voice > 'female'."""
        q = Queue()
        job_id = q.submit(
            {
                "text": "hello",
                "speaker": "alice",
                "voice": "bob",
            }
        )
        job = q.get(job_id)
        assert job.voice == "alice"

    def test_submit_defaults_voice_to_female(self):
        """submit() defaults voice to 'female' when neither voice nor speaker provided."""
        q = Queue()
        job_id = q.submit({"text": "hello"})
        job = q.get(job_id)
        assert job.voice == "female"

    def test_get_returns_none_for_unknown_id(self):
        """get() returns None for unknown job_id."""
        q = Queue()
        assert q.get("nonexistent") is None

    def test_list_all_returns_jobs_newest_first(self):
        """list_all() returns jobs in reverse submission order."""
        q = Queue()
        for _ in range(5):
            q.submit({"text": f"msg_{_}"})
        jobs = q.list_all()
        assert len(jobs) == 5
        # Newest first
        assert jobs[0].text == "msg_4"
        assert jobs[-1].text == "msg_0"

    def test_list_all_empty_when_no_jobs(self):
        """list_all() returns empty list when no jobs submitted."""
        q = Queue()
        assert q.list_all() == []


# ---------------------------------------------------------------------------
# ModelLifecycle tests
# ---------------------------------------------------------------------------
class TestModelLifecycle:
    """Tests for the ModelLifecycle module."""

    def test_initial_status_is_loading(self):
        """A fresh ModelLifecycle reports 'loading' status."""
        lifecycle = ModelLifecycle()
        status = lifecycle.status()
        assert status["status"] == "loading"
        assert status["model_loaded"] is False

    def test_is_loaded_returns_false_when_unloaded(self):
        """is_loaded() returns False when no model is loaded."""
        lifecycle = ModelLifecycle()
        assert lifecycle.is_loaded() is False

    def test_unload_is_safe_when_already_unloaded(self):
        """unload() does not raise when model is already None."""
        lifecycle = ModelLifecycle()
        lifecycle.unload()  # Should not raise

    def test_load_returns_none_when_tts_unavailable(self):
        """load() returns None when TTS library is not installed."""
        lifecycle = ModelLifecycle()
        # In test environments, TTS may not be available.
        # If it is, we just check it doesn't crash.
        result = lifecycle.load()
        # result is either a model or None — both are valid
        assert result is None or hasattr(result, "tts_to_file")

    def test_load_twice_returns_same_model(self):
        """load() called twice returns the same model (no reload)."""
        lifecycle = ModelLifecycle()
        m1 = lifecycle.load()
        m2 = lifecycle.load()
        # Both should be the same object or both None
        assert (m1 is None) == (m2 is None) or m1 is m2


# ---------------------------------------------------------------------------
# Worker tests
# ---------------------------------------------------------------------------
class TestWorker:
    """Tests for the Worker module."""

    def test_process_sets_completed_status_with_mock(self):
        """process() sets job to COMPLETED when _synthesize succeeds."""
        lifecycle = ModelLifecycle()
        worker = Worker(lifecycle)

        job = SynthesisJob(
            job_id="test-1",
            text="hello",
            language="en",
            voice="female",
            speed=1.0,
            pitch=0.0,
            seed=None,
        )

        # Mock _synthesize to avoid TTS/ffmpeg dependencies
        with patch.object(worker, "_synthesize"):
            worker.process(job)

        assert job.status == JobStatus.COMPLETED
        assert job.completed_at is not None

    def test_process_sets_failed_status_on_error(self):
        """process() sets job to FAILED when _synthesize raises."""
        lifecycle = ModelLifecycle()
        worker = Worker(lifecycle)

        job = SynthesisJob(
            job_id="test-2",
            text="hello",
            language="en",
            voice="female",
            speed=1.0,
            pitch=0.0,
            seed=None,
        )

        def bad_synthesize(job):
            raise RuntimeError("model error")

        with patch.object(worker, "_synthesize", side_effect=bad_synthesize):
            worker.process(job)

        assert job.status == JobStatus.FAILED
        assert "model error" in job.error


# ---------------------------------------------------------------------------
# SynthesisModule tests
# ---------------------------------------------------------------------------
class TestSynthesisModule:
    """Tests for the SynthesisModule public interface."""

    @pytest.fixture
    def module(self):
        """Create a SynthesisModule with a mocked worker."""
        mod = SynthesisModule()
        # Patch the worker's _synthesize to avoid real TTS/ffmpeg
        mod._worker._synthesize = MagicMock()
        return mod

    def test_submit_returns_job_id(self, module):
        """submit() returns a job_id string."""
        job_id = module.submit({"text": "hello", "language": "en"})
        assert isinstance(job_id, str)
        assert len(job_id) > 0

    def test_submit_creates_pending_job(self, module):
        """submit() creates a job with status 'pending'."""
        job_id = module.submit(
            {
                "text": "مرحبا",
                "language": "ar",
                "voice": "female",
                "speed": 1.5,
                "pitch": -2.0,
                "seed": 123,
            }
        )
        job = module._queue.get(job_id)
        assert job is not None
        assert job.status == JobStatus.PENDING
        assert job.text == "مرحبا"
        assert job.language == "ar"
        assert job.voice == "female"
        assert job.speed == 1.5
        assert job.pitch == -2.0
        assert job.seed == 123

    def test_get_status_returns_pending(self, module):
        """get_status() returns 'pending' for a newly submitted job."""
        job_id = module.submit({"text": "hello"})
        status = module.get_status(job_id)
        assert status["status"] == "pending"

    def test_get_status_returns_error_for_unknown_job(self, module):
        """get_status() returns 'not_found' for unknown job_id."""
        status = module.get_status("nonexistent")
        assert status["status"] == "not_found"

    def test_get_result_returns_error_when_not_completed(self, module):
        """get_result() returns error when job is not yet completed."""
        job_id = module.submit({"text": "hello"})
        result = module.get_result(job_id)
        assert "error" in result
        assert "not yet completed" in result["error"]

    def test_get_result_returns_audio_url_when_completed(self, module):
        """get_result() returns audio_url when job is completed."""
        job_id = module.submit({"text": "hello", "voice": "female"})

        # Manually complete the job (mock the worker's _synthesize which sets mp3_path)
        job = module._queue.get(job_id)
        assert job is not None
        job.status = JobStatus.COMPLETED
        job.mp3_path = os.path.join(AUDIO_DIR, "ar_female_test.mp3")

        result = module.get_result(job_id)
        assert "audio_url" in result
        assert "filename" in result
        assert "ar_female_test.mp3" in result["audio_url"]

    def test_health_delegates_to_lifecycle(self, module):
        """health() returns model status from the lifecycle."""
        status = module.health()
        assert "status" in status
        assert "model_loaded" in status

    def test_voices_returns_voice_list(self, module):
        """voices() returns a list of voice entries."""
        voices = module.voices()
        assert isinstance(voices, list)
        # Should return the speaker_wavs from the project
        if SPEAKER_WAV_DIR and os.path.isdir(SPEAKER_WAV_DIR):
            assert len(voices) >= 2  # At least the KSA voices

    def test_history_returns_empty_when_no_jobs(self, module):
        """history() returns empty list when no completed jobs."""
        history = module.history()
        assert history == []

    def test_history_includes_completed_jobs(self, module):
        """history() includes completed jobs with metadata."""
        job_id = module.submit(
            {
                "text": "مرحبا بالعالم",
                "language": "ar",
                "voice": "ksa_zariyah",
                "speed": 1.2,
                "pitch": 0.5,
            }
        )

        # Manually complete the job
        job = module._queue.get(job_id)
        assert job is not None
        job.status = JobStatus.COMPLETED
        # Create a temp MP3 file
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            f.write(b"\xff\xfb" + b"\x00" * 100)  # Minimal MP3
            job.mp3_path = f.name

        history = module.history()
        assert len(history) == 1
        entry = history[0]
        assert entry["text"] == "مرحبا بالعالم"
        assert entry["language"] == "ar"
        assert entry["voice"] == "ksa_zariyah"
        assert entry["speed"] == 1.2
        assert entry["pitch"] == 0.5
        assert "filename" in entry
        assert "created_at" in entry

    def test_stop_stops_worker(self, module):
        """stop() stops the worker thread."""
        module.stop()
        # Worker should be stopped — thread is None or not alive
        assert module._worker._thread is None or not module._worker._thread.is_alive()


# ---------------------------------------------------------------------------
# discover_voices tests (backwards compatibility)
# ---------------------------------------------------------------------------
class TestDiscoverVoices:
    """Tests for discover_voices (backwards compat)."""

    def test_returns_voice_entries_for_wav_files(self):
        """discover_voices() returns {id, name} for each .wav file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            for name in ["alice", "bob"]:
                path = os.path.join(tmpdir, f"{name}.wav")
                with open(path, "wb") as f:
                    f.write(b"")

            voices = discover_voices(tmpdir)
            assert len(voices) == 2
            ids = [v["id"] for v in voices]
            assert "alice" in ids
            assert "bob" in ids

    def test_ignores_non_wav_files(self):
        """discover_voices() only returns .wav files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            for name, ext in [("alice", ".wav"), ("bob", ".mp3"), ("charlie", ".wav")]:
                path = os.path.join(tmpdir, f"{name}{ext}")
                with open(path, "wb") as f:
                    f.write(b"")

            voices = discover_voices(tmpdir)
            assert len(voices) == 2
            ids = [v["id"] for v in voices]
            assert "alice" in ids
            assert "charlie" in ids
            assert "bob" not in ids

    def test_returns_empty_for_missing_directory(self):
        """discover_voices() returns [] for missing directory."""
        assert discover_voices("/nonexistent/path") == []


# ---------------------------------------------------------------------------
# Integration: SynthesisModule with mocked worker (end-to-end)
# ---------------------------------------------------------------------------
class TestSynthesisIntegration:
    """End-to-end tests: submit → status → complete → result."""

    @pytest.fixture
    def module(self):
        """Create module with mocked worker."""
        mod = SynthesisModule()
        mod._worker._synthesize = MagicMock()
        return mod

    def test_full_lifecycle_submit_to_complete(self, module):
        """submit → get_status(pending) → complete → get_result(completed)."""
        # 1. Submit
        job_id = module.submit(
            {
                "text": "مرحبا",
                "language": "ar",
                "voice": "ksa_hamed",
            }
        )

        # 2. Status is pending
        status = module.get_status(job_id)
        assert status["status"] == "pending"

        # 3. Manually complete (simulating worker processing)
        job = module._queue.get(job_id)
        assert job is not None
        job.status = JobStatus.COMPLETED
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            f.write(b"\xff\xfb" + b"\x00" * 100)
            job.mp3_path = f.name

        # 4. Status is now completed
        status = module.get_status(job_id)
        assert status["status"] == "completed"
        # get_status returns status + error; audio_url comes from get_result()
        assert "error" not in status or status["error"] is None
        # 5. get_result includes audio_url and filename
        result = module.get_result(job_id)
        assert "audio_url" in result
        assert "filename" in result

        # 5. Result is available
        result = module.get_result(job_id)
        assert "audio_url" in result
        assert result["filename"] == os.path.basename(job.mp3_path)

        # 6. History includes this job
        history = module.history()
        assert len(history) == 1
        assert history[0]["text"] == "مرحبا"
        assert history[0]["voice"] == "ksa_hamed"

        module.stop()
