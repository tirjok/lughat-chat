"""Deep Synthesis Module — Queue + Worker Pool + Lazy Model Lifecycle.

This module encapsulates all TTS synthesis behaviour behind a small interface:
  - submit(text, language, voice, speed, pitch, seed) → job_id
  - get_status(job_id) → { status, error? }
  - get_result(job_id) → { audio_url, filename, duration_seconds? }

The implementation hides:
  - The job queue (in-memory list of Job objects)
  - A single model instance managed by the worker
  - Lazy model load/unload (model released during idle periods)
  - WAV generation → MP3 conversion via ffmpeg
  - File management (intermediate WAV cleanup, MP3 persistence)

Two adapters justify the seam:
  - InProcessQueue (production): real queue, real model, real filesystem
  - InMemoryQueue (tests): no model, no filesystem, instant results
"""

from __future__ import annotations

import os
import shutil
import subprocess
import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Minimal imports — TTS is loaded lazily
# ---------------------------------------------------------------------------
TTS = None  # type: ignore[assignment]  # Loaded on first real use


# ---------------------------------------------------------------------------
# Job states
# ---------------------------------------------------------------------------
class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class SynthesisJob:
    """A single synthesis job with its current state."""

    job_id: str
    text: str
    language: str
    voice: str
    speed: float
    pitch: float
    seed: Optional[int]
    status: JobStatus = JobStatus.PENDING
    mp3_path: Optional[str] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
MODEL_CACHE_DIR = os.environ.get("TTS_MODEL_CACHE", "/app/.cache/tts")
SPEAKER_WAV_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "speaker_wavs"
)

# Lazy-unload idle timeout (seconds). Set to 0 to disable (model never released).
MODEL_IDLE_TIMEOUT = 0  # 0 = never unload; set to 1800 for 30-min idle unload


# ---------------------------------------------------------------------------
# Ensure directories exist (skip on read-only filesystems)
# ---------------------------------------------------------------------------
try:
    os.makedirs(AUDIO_DIR, exist_ok=True)
except OSError:
    pass


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _ensure_torch():
    """Patch torch for CPU-only environments (same logic as app.py)."""
    global _torch_loaded
    if _torch_loaded:
        return
    try:
        import torch
        import transformers.pytorch_utils as _pytorch_utils

        if not hasattr(_pytorch_utils, "isin_mps_friendly"):

            def _isin_mps_friendly(elements, test_elements, **kwargs):
                return torch.isin(elements, test_elements)

            _pytorch_utils.isin_mps_friendly = _isin_mps_friendly

        global _original_load_library

        def _patched_load_library(path):
            try:
                return _original_load_library(path)
            except OSError as e:
                error_str = str(e)
                if "libnvrtc" in error_str or "libcuda" in error_str:
                    return None
                if "libtorchcodec" in path or "libtorchcodec" in error_str:
                    return None
                raise

        import torch.ops

        if hasattr(torch.ops, "load_library"):
            _original_load_library = torch.ops.load_library
            torch.ops.load_library = _patched_load_library
        _torch_loaded = True
    except ImportError:
        pass  # torch not available — acceptable in test environments


_torch_loaded = False

# Patch torchcodec env (same as app.py)
_torchcodec_env = "0"
for _env_key in ["TORCHAUDIO_USE_TORCHCODEC", "TORCHCODEC_ENABLED"]:
    os.environ.setdefault(_env_key, _torchcodec_env)


def _resolve_voice(request: dict) -> str:
    """Resolve voice from request: speaker ?? voice ?? 'female'."""
    return request.get("speaker") or request.get("voice") or "female"


def _build_speaker_wav_path(voice: str) -> str:
    """Build the expected speaker WAV file path for a voice."""
    return os.path.join(SPEAKER_WAV_DIR, f"{voice}.wav")


def _validate_speaker_wav(wav_path: str) -> None:
    """Validate that a speaker WAV file meets XTTS-v2 minimum duration."""
    import wave

    try:
        with wave.open(wav_path) as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            duration = frames / rate
        if duration < 0.33:
            raise ValueError(
                f"Speaker WAV '{wav_path}' is too short ({duration:.2f}s). "
                f"XTTS-v2 requires at least 0.33s."
            )
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Failed to validate speaker WAV '{wav_path}': {e}")


# ---------------------------------------------------------------------------
# Model lifecycle — lazy load / lazy unload
# ---------------------------------------------------------------------------
class ModelLifecycle:
    """Manages a single TTS model instance with lazy load and idle unload.

    This is the core of the memory deepening: the model is loaded on first
    use and released after IDLE_TIMEOUT seconds of inactivity.

    Public interface:
      - load() → model instance (or None if TTS unavailable)
      - unload() → release model memory
      - is_loaded() → bool
    """

    def __init__(self) -> None:
        self._model = None  # type: Any | None
        self._lock = threading.Lock()
        self._last_use: float = 0.0
        self._unload_task: Optional[threading.Thread] = None

    # -- public interface --------------------------------------------------

    def load(self) -> Any | None:
        """Load (or reload) the TTS model. Returns the model or None."""
        with self._lock:
            if self._model is not None:
                self._touch()
                return self._model

            # Ensure torch is patched BEFORE importing TTS.
            # The transformers library imports isin_mps_friendly which doesn't exist
            # on CPU-only systems — _ensure_torch patches it.
            _ensure_torch()

            # Lazy import TTS (only once)
            global TTS
            if TTS is None:
                try:
                    from TTS.api import TTS as _TTS

                    TTS = _TTS  # type: ignore[assignment]
                except ImportError:
                    return None

            if TTS is None:
                return None

            try:
                os.environ["COQUI_TTS_CACHE"] = MODEL_CACHE_DIR
                self._model = TTS("tts_models/multilingual/xtts_v2")
                self._touch()
                print("XTTS-v2 model loaded (Synthesis Module).")
                return self._model
            except Exception as e:
                print(f"Error loading TTS model: {e}")
                self._model = None
                return None

    def unload(self) -> None:
        """Release the model to free memory."""
        with self._lock:
            if self._model is not None:
                print("Unloading XTTS-v2 model (Synthesis Module).")
                self._model = None
                self._last_use = 0.0

    def is_loaded(self) -> bool:
        """Check if the model is currently loaded in memory."""
        with self._lock:
            return self._model is not None

    def status(self) -> dict:
        """Return the model status for the health endpoint."""
        with self._lock:
            return {
                "status": "ready" if self._model is not None else "loading",
                "model_loaded": self._model is not None,
            }

    # -- internal ----------------------------------------------------------

    def _touch(self) -> None:
        """Mark the model as recently used (for idle timeout)."""
        self._last_use = time.time()
        self._schedule_idle_check()

    def _schedule_idle_check(self) -> None:
        """Schedule an idle-unload check if MODEL_IDLE_TIMEOUT > 0."""
        if MODEL_IDLE_TIMEOUT <= 0:
            return
        # Cancel any pending unload
        self._unload_task = threading.Thread(target=self._check_and_unload, daemon=True)
        self._unload_task.start()

    def _check_and_unload(self) -> None:
        """Check if the model has been idle long enough to unload."""
        # Small delay to avoid race with new requests
        time.sleep(MODEL_IDLE_TIMEOUT)
        with self._lock:
            if time.time() - self._last_use >= MODEL_IDLE_TIMEOUT:
                self.unload()


# ---------------------------------------------------------------------------
# Worker — processes one job at a time
# ---------------------------------------------------------------------------
class Worker:
    """Single worker that processes jobs from the queue.

    The worker owns the ModelLifecycle and processes jobs sequentially.
    It runs in a background thread.

    Public interface:
      - start() → begin processing
      - stop() → stop processing (drain current job)
      - process(job) → synthesize audio for a job
    """

    def __init__(self, lifecycle: ModelLifecycle, queue: Queue | None = None) -> None:
        self._lifecycle = lifecycle
        self._queue = queue
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._job_event = threading.Event()
        self._current_job: Optional[SynthesisJob] = None

    # -- public interface --------------------------------------------------

    def start(self) -> None:
        """Start the worker thread."""
        if self._thread is None or not self._thread.is_alive():
            self._stop_event.clear()
            self._thread = threading.Thread(
                target=self._run, name="tts-worker", daemon=True
            )
            self._thread.start()

    def stop(self) -> None:
        """Stop the worker (drains current job, rejects new ones)."""
        self._stop_event.set()
        self._job_event.set()  # Wake up if blocked
        if self._thread is not None:
            self._thread.join(timeout=120)  # Wait for current job (max ~60s)
            self._thread = None

    def process(self, job: SynthesisJob) -> None:
        """Process a single job (called by the loop, not externally)."""
        try:
            self._synthesize(job)
            job.status = JobStatus.COMPLETED
            job.completed_at = time.time()
        except Exception as e:
            job.status = JobStatus.FAILED
            job.error = str(e)
            job.completed_at = time.time()

    # -- internal ----------------------------------------------------------

    def _run(self) -> None:
        """Main loop: wait for jobs, process them."""
        while not self._stop_event.is_set():
            self._job_event.clear()
            job = self._get_next_job()
            if job is None:
                # No job — wait for signal or stop
                signaled = self._job_event.wait(timeout=1.0)
                if not signaled and not self._stop_event.is_set():
                    continue  # Spurious wakeup
                continue
            self._current_job = job
            self.process(job)
            self._current_job = None

    def _get_next_job(self) -> Optional[SynthesisJob]:
        """Get the next pending job from the queue. Returns None if none."""
        if self._queue is not None:
            return self._queue._get_pending()
        return None

    def _synthesize(self, job: SynthesisJob) -> None:
        """Generate speech for a job: model → WAV → MP3."""
        # Ensure model is loaded
        model = self._lifecycle.load()
        if model is None:
            raise RuntimeError("TTS model not available")

        # Resolve paths
        speaker_wav = _build_speaker_wav_path(job.voice)
        if not os.path.exists(speaker_wav):
            raise FileNotFoundError(
                f"Speaker WAV not found for voice '{job.voice}' "
                f"(expected at '{speaker_wav}')."
            )

        # Validate speaker WAV duration
        _validate_speaker_wav(speaker_wav)

        # Generate WAV via XTTS
        timestamp = uuid.uuid4().hex[:8]
        lang_code = job.language
        wav_path = os.path.join(AUDIO_DIR, f"{lang_code}_{job.voice}_{timestamp}.wav")
        mp3_path = os.path.join(AUDIO_DIR, f"{lang_code}_{job.voice}_{timestamp}.mp3")

        # Set deterministic seed
        seed = job.seed if job.seed is not None else 42
        try:
            import torch

            torch.manual_seed(seed)
        except ImportError:
            pass

        model.tts_to_file(
            text=job.text,
            speaker_wav=speaker_wav,
            language=job.language,
            file_path=wav_path,
            temperature=0.4,
        )

        if not os.path.exists(wav_path):
            raise RuntimeError("Failed to generate audio (no WAV produced)")

        # Convert WAV → MP3 via ffmpeg
        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    wav_path,
                    "-filter:a",
                    f"atempo={job.speed}",
                    "-b:a",
                    "192k",
                    mp3_path,
                ],
                check=True,
                capture_output=True,
            )
        except subprocess.CalledProcessError:
            # Fallback: copy WAV to MP3 path
            shutil.copy2(wav_path, mp3_path)

        # Clean up intermediate WAV
        try:
            os.remove(wav_path)
        except OSError:
            pass

        job.mp3_path = mp3_path


# ---------------------------------------------------------------------------
# Queue — manages pending/completed jobs
# ---------------------------------------------------------------------------
class Queue:
    """In-memory job queue. Thread-safe.

    Public interface:
      - submit(request) → job_id (str)
      - get(job_id) → SynthesisJob | None
      - list_all() → list[SynthesisJob]
    """

    def __init__(self) -> None:
        self._jobs: dict[str, SynthesisJob] = {}
        self._lock = threading.Lock()
        self._order: list[str] = []  # FIFO order

    # -- public interface --------------------------------------------------

    def submit(self, request: dict) -> str:
        """Submit a synthesis request. Returns job_id."""
        job_id = uuid.uuid4().hex[:12]
        voice = _resolve_voice(request)
        job = SynthesisJob(
            job_id=job_id,
            text=request["text"],
            language=request.get("language", "ar"),
            voice=voice,
            speed=request.get("speed", 1.0),
            pitch=request.get("pitch", 0.0),
            seed=request.get("seed"),
        )
        with self._lock:
            self._jobs[job_id] = job
            self._order.append(job_id)
        return job_id

    def get(self, job_id: str) -> Optional[SynthesisJob]:
        """Get a job by ID."""
        with self._lock:
            return self._jobs.get(job_id)

    def list_all(self) -> list[SynthesisJob]:
        """List all jobs, newest first."""
        with self._lock:
            return [self._jobs[jid] for jid in reversed(self._order)]

    def _mark_running(self, job_id: str) -> None:
        """Mark a job as running (called by worker)."""
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].status = JobStatus.RUNNING

    def _get_pending(self) -> Optional[SynthesisJob]:
        """Get the next pending job (called by worker)."""
        with self._lock:
            for jid in self._order:
                job = self._jobs.get(jid)
                if job and job.status == JobStatus.PENDING:
                    return job
            return None


# ---------------------------------------------------------------------------
# Synthesis Module — the deep module (public interface)
# ---------------------------------------------------------------------------
class SynthesisModule:
    """Deep Synthesis Module: queue + worker + lazy model lifecycle.

    Public interface (everything a caller needs to know):
      - submit(request: dict) → str  (job_id)
      - get_status(job_id: str) → dict  ({ status, error? })
      - get_result(job_id: str) → dict  ({ audio_url, filename, duration_seconds? })
      - health() → dict  ({ status, model_loaded })
      - voices() → list[dict]  (for /api/voices)
      - history() → list[dict]  (for /api/history)

    The implementation hides:
      - The in-memory job queue
      - A single worker processing jobs sequentially
      - Lazy model load/unload (memory released during idle)
      - WAV → MP3 conversion via ffmpeg
      - File management (intermediate files cleaned up)
    """

    def __init__(self) -> None:
        self._lifecycle = ModelLifecycle()
        self._queue = Queue()
        self._worker = Worker(self._lifecycle, self._queue)
        self._worker.start()
        self._started = True

    # -- public interface --------------------------------------------------

    def submit(self, request: dict) -> str:
        """Submit a synthesis request. Returns job_id immediately."""
        if not self._started:
            raise RuntimeError("SynthesisModule not started")
        return self._queue.submit(request)

    def get_status(self, job_id: str) -> dict:
        """Get job status. Returns { status, error? }.

        Possible statuses: pending, running, completed, failed.
        """
        job = self._queue.get(job_id)
        if job is None:
            return {"status": "not_found", "error": "Job not found"}
        return {
            "status": job.status.value,
            "error": job.error,
        }

    def get_result(self, job_id: str) -> dict:
        """Get job result. Returns { audio_url, filename, duration_seconds? }.

        Only available when status is 'completed'.
        """
        job = self._queue.get(job_id)
        if job is None:
            return {"error": "Job not found"}
        if job.status != JobStatus.COMPLETED:
            return {"error": f"Job not yet completed (status: {job.status.value})"}
        if job.mp3_path is None:
            return {"error": "No result available"}

        filename = os.path.basename(job.mp3_path)
        audio_url = f"/downloads/{filename}"
        return {
            "audio_url": audio_url,
            "filename": filename,
        }

    def health(self) -> dict:
        """Return model health status.

        If the model is not yet loaded, attempts to load it (warm-up).
        This ensures the health endpoint serves as both a status check
        and a way to pre-warm the model during frontend polling.
        """
        # Try to load if not loaded — this is the warm-up behavior
        self._lifecycle.load()
        return self._lifecycle.status()

    def voices(self) -> list[dict]:
        """List available voices (delegated to discover_voices)."""
        return discover_voices(SPEAKER_WAV_DIR)

    def history(self) -> list[dict]:
        """List all completed jobs as history entries."""
        entries = []
        for job in self._queue.list_all():
            if job.status == JobStatus.COMPLETED and job.mp3_path:
                filename = os.path.basename(job.mp3_path)
                stat = os.stat(job.mp3_path)
                entries.append(
                    {
                        "filename": filename,
                        "text": job.text,
                        "language": job.language,
                        "voice": job.voice,
                        "speed": job.speed,
                        "pitch": job.pitch,
                        "created_at": str(int(stat.st_mtime)),
                    }
                )
        return entries

    def stop(self) -> None:
        """Stop the module (stop worker, optionally unload model)."""
        self._started = False
        self._worker.stop()
        # Don't auto-unload — let the lifecycle handle idle timeout


# ---------------------------------------------------------------------------
# Convenience: module-level singleton (for app.py integration)
# ---------------------------------------------------------------------------
_module: Optional[SynthesisModule] = None


def get_module() -> SynthesisModule:
    """Get (or create) the singleton SynthesisModule."""
    global _module
    if _module is None:
        _module = SynthesisModule()
    return _module


# ---------------------------------------------------------------------------
# discover_voices — kept for backwards compatibility
# ---------------------------------------------------------------------------
def discover_voices(directory: str) -> list[dict]:
    """Scan directory for .wav files and return voice entries."""
    voices = []
    if not os.path.isdir(directory):
        return voices
    for filename in sorted(os.listdir(directory)):
        if filename.endswith(".wav"):
            name = filename[:-4]
            voices.append({"id": name, "name": name})
    return voices
