"""Shared fixtures for backend tests.

Applies TTS mocks before any test that imports `app` runs, preventing the
2 GB XTTS-v2 model from loading during tests.
"""

from __future__ import annotations

import synthesis


def _make_mock_tts():
    class MockTTS:
        def __init__(self, model_name=None, *args, **kwargs):
            self.model_name = model_name

        def tts_to_file(
            self,
            text,
            language=None,
            file_path=None,
            speaker_wav=None,
            temperature=None,
        ):
            import wave

            with wave.open(file_path, "w") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(22050)
                samples = b"\x00\x00" * 2205
                wav_file.writeframes(samples)

    return MockTTS


def pytest_sessionstart(session):
    """Apply TTS mocks before any test imports `app`."""
    synthesis._torch_loaded = True
    synthesis.TTS = _make_mock_tts()
