"""ModelManager — deep module for TTS model lifecycle.

Exports: ModelManager interface used by the FastAPI endpoints.
Internalizes: model loading, status polling, torch patching, background threads.
"""

from __future__ import annotations

import threading
from typing import Optional

# Patch torch on import so any downstream TTS import works
_torch_loaded = False


def _ensure_torch() -> None:
    """Patch torch for MPS/CPU compatibility. Called once at module import."""
    global _torch_loaded
    if _torch_loaded:
        return
    import torch
    import transformers.pytorch_utils as _pytorch_utils

    if not hasattr(_pytorch_utils, "isin_mps_friendly"):

        def _isin_mps_friendly(
            elements, test_elements, **kwargs
        ) -> torch.Tensor:
            return torch.isin(elements, test_elements)

        _pytorch_utils.isin_mps_friendly = _isin_mps_friendly

    # Patch torch.ops.load_library to suppress missing NVIDIA library errors
    global _original_load_library

    def _patched_load_library(path: str):
        try:
            return _original_load_library(path)
        except OSError as e:
            error_str = str(e)
            if "libnvrtc" in error_str or "libcuda" in error_str:
                return None
            if "libtorchcodec" in path or "libtorchcodec" in error_str:
                return None
            raise

    import torch.ops  # noqa: F401

    if hasattr(torch.ops, "load_library"):
        _original_load_library = torch.ops.load_library
        torch.ops.load_library = _patched_load_library
    _torch_loaded = True


class ModelManager:
    """Manages the TTS model lifecycle: loading, status, reloading.

    This is a **deep module**: one interface, one place to test.
    The implementation absorbs torch patching, background threads,
    and all error handling.
    """

    def __init__(self, TTS_class=None, cache_dir: str = "/app/.cache/tts") -> None:
        """Create a ModelManager.

        Args:
            TTS_class: The TTS class to use (from `from TTS.api import TTS`).
                       If None, model loading is skipped.
            cache_dir: Directory for the TTS model cache.
        """
        self._TTS = TTS_class
        self._cache_dir = cache_dir
        self._model: object | None = None
        self._status: str = "loading"  # loading | ready | error
        self._lock = threading.Lock()

    @property
    def status(self) -> str:
        """Current model load status: 'loading', 'ready', or 'error'."""
        return self._status

    @property
    def model(self) -> object | None:
        """The loaded TTS model, or None if not loaded."""
        return self._model

    def is_ready(self) -> bool:
        """True when model is fully loaded and ready for inference."""
        return self._model is not None and self._status == "ready"

    def get_status(self) -> dict:
        """Return status info for the /health endpoint."""
        return {
            "status": self._status,
            "model_loaded": self.is_ready(),
        }

    def load_in_background(self) -> threading.Thread:
        """Start model loading in a background thread.

        Returns the thread so the caller can manage its lifecycle.
        Non-blocking: returns immediately.
        """
        with self._lock:
            # Skip if already loaded (e.g. tests pre-loaded the model)
            if self._model is not None:
                return threading.Thread(target=lambda: None, daemon=True)

            if self._TTS is None:
                self._status = "error"
                return threading.Thread(target=lambda: None, daemon=True)

            def _load() -> None:
                print("Loading XTTS-v2 model...")
                try:
                    import os

                    os.environ["COQUI_TTS_CACHE"] = self._cache_dir
                    self._model = self._TTS("tts_models/multilingual/xtts_v2")
                    self._status = "ready"
                    print("XTTS-v2 model loaded successfully!")
                except Exception as e:
                    self._status = "error"
                    print(f"Error loading TTS model: {e}")
                    self._model = None

            t = threading.Thread(target=_load, daemon=True)
            t.start()
            return t

    def reload(self) -> dict:
        """Attempt to reload the model (only if status is 'error').

        Returns status dict after reload attempt.
        """
        with self._lock:
            if self._status != "error":
                return self.get_status()
            # Reset and try loading
            self._model = None
            self._status = "loading"
            # Try synchronous load (for test/health use)
            try:
                if self._TTS is None:
                    self._status = "error"
                    return self.get_status()
                import os

                os.environ["COQUI_TTS_CACHE"] = self._cache_dir
                self._model = self._TTS("tts_models/multilingual/xtts_v2")
                self._status = "ready"
                print("XTTS-v2 model reloaded successfully!")
            except Exception as e:
                self._status = "error"
                print(f"Error reloading TTS model: {e}")
                self._model = None
            return self.get_status()

    def shutdown(self) -> None:
        """Clean shutdown — nothing to do for in-memory model."""
        self._model = None
        self._status = "error"
