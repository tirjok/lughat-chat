"""Tests for default voice resolution (RC-003).

Verifies the backend's voice resolution logic:
- When no voice/speaker is provided, uses the first discovered voice.
- When no WAV files exist, falls back to "female" (backwards compatibility).
- When both speaker and voice are provided, speaker takes priority.
"""

import os
import tempfile
from urllib.parse import unquote

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers — capture the real wave.open and os functions before any patching.
# ---------------------------------------------------------------------------
import wave as _real_wave_module

_ORIGINAL_WAVE_OPEN = _real_wave_module.open
# Save the real os.listdir so mocks can delegate to it without recursion.
_REAL_OS_LISTDIR = os.listdir
_REAL_OS_PATH_EXISTS = os.path.exists


def _mock_tts_model():
    """Create a mock TTS model that writes both WAV and MP3 files.

    The backend's /api/generate endpoint:
    1. Writes a WAV file via tts_to_file
    2. Converts WAV → MP3 via ffmpeg
    3. Deletes the WAV
    4. Returns FileResponse for the MP3

    Since FileResponse calls os.stat() (not mocked), we must write the
    MP3 file directly so the real os.stat succeeds.
    """

    class MockTTS:
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

            # Also write a minimal valid MP3 so FileResponse's os.stat succeeds.

            mp3_path = (
                file_path[:-4] + ".mp3" if file_path.endswith(".wav") else file_path
            )
            with open(mp3_path, "wb") as f:
                # Minimal valid MP3 frame header (ISO/IEC 11172-3).
                f.write(b"\xff\xfb\x90\x00\x00")

    return MockTTS()


def _make_mock_wav():
    """A real object that looks like a WAV file for validation."""

    class _MockWavFile:
        def __init__(self):
            self._nframes = int(22050 * 0.5)
            self._rate = 22050

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def getnframes(self):
            return self._nframes

        def getframerate(self):
            return self._rate

    return _MockWavFile()


@pytest.fixture(autouse=True)
def _restore_app_module():
    """Restore the real app module functions after each test.

    Our tests patch app.os.listdir and app.os.path.exists at the module
    level.  This fixture ensures those patches are removed so that
    subsequent tests (e.g. test_voices.py) see the real functions.
    """
    yield
    import app as main_app

    main_app.os.listdir = _REAL_OS_LISTDIR
    main_app.os.path.exists = _REAL_OS_PATH_EXISTS
    main_app.tts_model = None
    main_app.model_load_status = "loading"
    main_app.SPEAKER_WAV_DIR = os.path.join(
        os.path.dirname(os.path.abspath(main_app.__file__)), "speaker_wavs"
    )
    main_app.AUDIO_DIR = os.path.join(
        os.path.dirname(os.path.abspath(main_app.__file__)), "downloads"
    )
    main_app.MAX_AUDIO_FILES = 100  # Default


def _setup_mock_model(
    listdir_override=None,
    path_exists_override=None,
    speaker_wav_dir=None,
):
    """Set up mock TTS in the app module.

    Parameters
    ----------
    listdir_override : callable or None
        Replacement for os.listdir.  If None, real os.listdir is used.
    path_exists_override : callable or None
        Replacement for os.path.exists.  If None, real os.path.exists is used.
    speaker_wav_dir : str or None
        Override SPEAKER_WAV_DIR to a temp directory.  If None, real dir is used.
    """
    import app as main_app

    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"

    if speaker_wav_dir is not None:
        main_app.SPEAKER_WAV_DIR = speaker_wav_dir

    # Use a temporary directory for AUDIO_DIR so that cleanup_audio() does not
    # interfere with the real backend/downloads/ directory (which may contain
    # hundreds of files from prior testing).
    main_app.AUDIO_DIR = tempfile.mkdtemp()

    if listdir_override is not None:
        main_app.os.listdir = listdir_override
    else:
        main_app.os.listdir = _REAL_OS_LISTDIR

    if path_exists_override is not None:
        main_app.os.path.exists = path_exists_override
    else:
        main_app.os.path.exists = _REAL_OS_PATH_EXISTS

    # Patch wave.open so that:
    #   - mode == "w"  → real wave.open (TTS mock writes real WAV files)
    #   - mode == "r"  → mock WAV object (validation passes without reading real files)
    # We MUST call _ORIGINAL_WAVE_OPEN, NOT main_app.wave.open, to avoid
    # infinite recursion (the module-level 'wave' import has been replaced
    # by this lambda).
    def _patched_wave_open(path, mode="r"):
        if mode == "w":
            return _ORIGINAL_WAVE_OPEN(path, mode)
        return _make_mock_wav()

    main_app.wave.open = _patched_wave_open


def _client():
    from app import app

    return TestClient(app)


# ---------------------------------------------------------------------------
# Test 1: Default voice falls back to "female" when no WAV files exist
# ---------------------------------------------------------------------------


def test_default_voice_falls_back_to_female_when_no_wavs():
    """When no WAV files exist and no voice is selected, the backend falls back to 'female'.

    This is the backwards-compatibility fallback: if a deployment has no
    speaker_wavs/ at all (or it's empty), the backend should default to
    "female" rather than crashing with a confusing 500.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create an empty speaker_wavs directory
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        # Mock: listdir returns empty for speaker_wavs
        def _listdir(path):
            if path.endswith("speaker_wavs") or path == speaker_dir:
                return []
            return _REAL_OS_LISTDIR(path)

        # Mock: speaker_wav file doesn't exist for "female"
        def _path_exists(path):
            return False

        _setup_mock_model(
            listdir_override=_listdir,
            path_exists_override=_path_exists,
            speaker_wav_dir=speaker_dir,
        )

        client = _client()

        # No voice or speaker field — should resolve to "female" and fail
        # because female.wav doesn't exist (path_exists returns False).
        response = client.post("/api/generate", json={"text": "Hello world"})

        # The resolution should pick "female" as the fallback, then look for
        # speaker_wavs/female.wav which doesn't exist → 500.
        assert response.status_code == 500
        data = response.json()
        assert (
            "female" in data["detail"].lower() or "not found" in data["detail"].lower()
        )


# ---------------------------------------------------------------------------
# Test 2: When both speaker and voice are provided, speaker takes priority
# ---------------------------------------------------------------------------


def test_speaker_field_takes_priority_over_voice():
    """When both 'speaker' and 'voice' are provided, 'speaker' wins."""
    with tempfile.TemporaryDirectory() as tmpdir:
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        # Create a WAV file for the speaker we want to use
        speaker_wav = os.path.join(speaker_dir, "PriorityVoice.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        def _listdir(path):
            if path.endswith("speaker_wavs") or path == speaker_dir:
                return ["PriorityVoice.wav"]
            return _REAL_OS_LISTDIR(path)

        def _path_exists(path):
            # The backend checks speaker_wav existence and MP3 output path.
            # Return True for any .wav or .mp3 path (output files),
            # or for the specific speaker WAV file.
            return (
                path.endswith("PriorityVoice.wav")
                or path.endswith("speaker_wavs")
                or path.endswith((".wav", ".mp3"))
            )

        _setup_mock_model(
            listdir_override=_listdir,
            path_exists_override=_path_exists,
            speaker_wav_dir=speaker_dir,
        )

        client = _client()

        # Provide BOTH speaker and voice — speaker should win
        response = client.post(
            "/api/generate",
            json={
                "text": "Hello world",
                "speaker": "PriorityVoice",
                "voice": "OtherVoice",
            },
        )

        assert response.status_code == 200
        assert "audio/mpeg" in response.headers["content-type"]
        # Verify the response filename contains the speaker, not the voice
        content_disp = response.headers.get("content-disposition", "")
        decoded = unquote(content_disp)
        assert "PriorityVoice" in decoded, (
            f"Expected 'PriorityVoice' in response filename, got: {decoded}"
        )


# ---------------------------------------------------------------------------
# Test 3: Explicit speaker uses speaker_wav directly
# ---------------------------------------------------------------------------


def test_explicit_speaker_uses_speaker_wav():
    """When 'speaker' is explicitly provided, the backend looks up speaker_wavs/{speaker}.wav."""
    with tempfile.TemporaryDirectory() as tmpdir:
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        # Create the speaker WAV file
        speaker_wav = os.path.join(speaker_dir, "KSA Zariyah - Female.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        def _listdir(path):
            if path.endswith("speaker_wavs") or path == speaker_dir:
                return ["KSA Hamed - Male.wav", "KSA Zariyah - Female.wav"]
            return _REAL_OS_LISTDIR(path)

        def _path_exists(path):
            # Return True for any .wav or .mp3 path (output files)
            # or for the speaker_wavs directory itself.
            return path.endswith((".wav", ".mp3")) or path.endswith("speaker_wavs")

        _setup_mock_model(
            listdir_override=_listdir,
            path_exists_override=_path_exists,
            speaker_wav_dir=speaker_dir,
        )

        client = _client()

        # Explicit speaker — should use KSA Zariyah - Female.wav
        response = client.post(
            "/api/generate",
            json={"text": "Hello world", "speaker": "KSA Zariyah - Female"},
        )

        assert response.status_code == 200
        assert "audio/mpeg" in response.headers["content-type"]
        content_disp = response.headers.get("content-disposition", "")
        decoded = unquote(content_disp)
        assert "KSA Zariyah - Female" in decoded, (
            f"Expected 'KSA Zariyah - Female' in response filename, got: {decoded}"
        )


# ---------------------------------------------------------------------------
# Test 4: Default resolution uses first discovered voice (not hardcoded)
# ---------------------------------------------------------------------------


def test_default_resolution_uses_first_discovered_voice():
    """When no voice/speaker is provided, the backend uses the first discovered voice from speaker_wavs/.

    The first voice is determined by alphabetical sorting of filenames in
    the speaker_wavs/ directory.  This test verifies that path returns valid
    MP3 audio with the correct voice name in the response filename.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        # Create multiple WAV files — the first alphabetically should be used
        for name in ["KSA Hamed - Male", "KSA Zariyah - Female"]:
            path = os.path.join(speaker_dir, f"{name}.wav")
            with open(path, "wb") as f:
                f.write(b"")

        def _listdir(path):
            if path.endswith("speaker_wavs") or path == speaker_dir:
                return ["KSA Hamed - Male.wav", "KSA Zariyah - Female.wav"]
            return _REAL_OS_LISTDIR(path)

        def _path_exists(path):
            # Return True for any .wav or .mp3 path (output files)
            # or for the speaker_wavs directory itself.
            return path.endswith((".wav", ".mp3")) or path.endswith("speaker_wavs")

        _setup_mock_model(
            listdir_override=_listdir,
            path_exists_override=_path_exists,
            speaker_wav_dir=speaker_dir,
        )

        client = _client()

        # No voice or speaker field — should use first discovered voice
        response = client.post("/api/generate", json={"text": "Hello world"})

        assert response.status_code == 200
        assert "audio/mpeg" in response.headers["content-type"]
        content_disp = response.headers.get("content-disposition", "")
        decoded = unquote(content_disp)
        assert "KSA Hamed - Male" in decoded, (
            f"Expected first voice 'KSA Hamed - Male' in response filename, got: {decoded}"
        )


# ---------------------------------------------------------------------------
# Test 5: Spaces in voice filenames are preserved
# ---------------------------------------------------------------------------


def test_spaces_in_voice_filenames_are_preserved():
    """Voice names with spaces (e.g., 'KSA Hamed - Male') resolve to the correct WAV file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        # Create WAV files with spaces in names
        for name in ["KSA Hamed - Male", "KSA Zariyah - Female"]:
            path = os.path.join(speaker_dir, f"{name}.wav")
            with open(path, "wb") as f:
                f.write(b"")

        def _listdir(path):
            if path.endswith("speaker_wavs") or path == speaker_dir:
                return ["KSA Hamed - Male.wav", "KSA Zariyah - Female.wav"]
            return _REAL_OS_LISTDIR(path)

        def _path_exists(path):
            # Return True for any .wav or .mp3 path (output files)
            # or for the speaker_wavs directory itself.
            return path.endswith((".wav", ".mp3")) or path.endswith("speaker_wavs")

        _setup_mock_model(
            listdir_override=_listdir,
            path_exists_override=_path_exists,
            speaker_wav_dir=speaker_dir,
        )

        client = _client()

        # Select the voice with spaces — should resolve correctly
        response = client.post(
            "/api/generate",
            json={"text": "مرحبا", "speaker": "KSA Hamed - Male"},
        )

        assert response.status_code == 200
        assert "audio/mpeg" in response.headers["content-type"]
        content_disp = response.headers.get("content-disposition", "")
        decoded = unquote(content_disp)
        assert "KSA Hamed - Male" in decoded, (
            f"Expected 'KSA Hamed - Male' in response filename, got: {decoded}"
        )


# ---------------------------------------------------------------------------
# Test 6: No voices + no voice field → 500 with clear error message
# ---------------------------------------------------------------------------


def test_no_voices_and_no_voice_field_returns_500_with_fallback():
    """When no WAV files exist and no voice is selected, the backend falls back to 'female' and returns 500."""
    with tempfile.TemporaryDirectory() as tmpdir:
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        # Empty directory — no WAV files
        def _listdir(path):
            if path.endswith("speaker_wavs") or path == speaker_dir:
                return []
            return _REAL_OS_LISTDIR(path)

        def _path_exists(path):
            return False

        _setup_mock_model(
            listdir_override=_listdir,
            path_exists_override=_path_exists,
            speaker_wav_dir=speaker_dir,
        )

        client = _client()

        response = client.post("/api/generate", json={"text": "Hello world"})

        assert response.status_code == 500
        data = response.json()
        # The error should mention 'female' (the fallback) and that the file was not found
        assert (
            "female" in data["detail"].lower() or "not found" in data["detail"].lower()
        )
