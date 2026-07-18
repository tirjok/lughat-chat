"""Tests for S-02: Store original text with generated audio (RC-005).

Verifies that:
- POST /api/generate writes a sidecar {timestamp}.meta.json file next to the MP3.
- Sidecar contains: text, language, voice, speed, pitch, seed, created_at.
- GET /api/history reads sidecar files and returns the text field (not empty).
- Old MP3 files (without sidecar) still return text: "" (graceful fallback).
- Backend starts without errors.
"""

import json
import os
import tempfile

from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers — capture the real wave.open and os functions before any patching.
# ---------------------------------------------------------------------------
import wave as _real_wave_module

_ORIGINAL_WAVE_OPEN = _real_wave_module.open
# Save the real os.listdir so mocks can delegate to it without recursion.
_REAL_OS_LISTDIR = os.listdir
_REAL_OS_PATH_EXISTS = os.path.exists
_REAL_OS_PATH_JOIN = os.path.join
_REAL_OS_PATH_BASENAME = os.path.basename


def _mock_tts_model():
    """Create a mock TTS model that writes a minimal valid WAV file."""

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


def _setup_mock_model(
    audio_dir=None,
    speaker_wav_dir=None,
    listdir_override=None,
    path_exists_override=None,
    path_join_override=None,
):
    """Set up mock TTS and filesystem in the app module.

    Parameters
    ----------
    audio_dir : str or None
        Override AUDIO_DIR to a temp directory.  If None, real dir is used.
    speaker_wav_dir : str or None
        Override SPEAKER_WAV_DIR to a temp directory.  If None, real dir is used.
    listdir_override : callable or None
        Replacement for os.listdir.  If None, real os.listdir is used.
    path_exists_override : callable or None
        Replacement for os.path.exists.  If None, real os.path.exists is used.
    path_join_override : callable or None
        Replacement for os.path.join.  If None, real os.path.join is used.
    """
    import app as main_app

    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"

    if audio_dir is not None:
        main_app.AUDIO_DIR = audio_dir
    if speaker_wav_dir is not None:
        main_app.SPEAKER_WAV_DIR = speaker_wav_dir

    if listdir_override is not None:
        main_app.os.listdir = listdir_override
    else:
        main_app.os.listdir = _REAL_OS_LISTDIR

    if path_exists_override is not None:
        main_app.os.path.exists = path_exists_override
    else:
        main_app.os.path.exists = _REAL_OS_PATH_EXISTS

    if path_join_override is not None:
        main_app.os.path.join = path_join_override
    else:
        main_app.os.path.join = _REAL_OS_PATH_JOIN

    # Patch wave.open so that:
    #   - mode == "w"  → real wave.open (TTS mock writes real WAV files)
    #   - mode == "r"  → mock WAV object (validation passes without reading real files)
    def _patched_wave_open(path, mode="r"):
        if mode == "w":
            return _ORIGINAL_WAVE_OPEN(path, mode)
        return _make_mock_wav()

    main_app.wave.open = _patched_wave_open


def _client():
    from app import app

    return TestClient(app)


# ---------------------------------------------------------------------------
# Test 1: POST /api/generate writes a sidecar {timestamp}.meta.json file
# ---------------------------------------------------------------------------


def test_generate_speech_writes_sidecar_metadata_file():
    """POST /api/generate writes a sidecar {timestamp}.meta.json next to the MP3.

    The sidecar file should contain: text, language, voice, speed, pitch, seed,
    and created_at fields.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        # Create the speaker WAV file
        speaker_wav = os.path.join(speaker_dir, "KSA Hamed - Male.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        def _path_exists(path):
            return (
                str(path).endswith((".wav", ".mp3"))
                or str(path).endswith("speaker_wavs")
                or str(path).endswith("downloads")
            )

        # Create the speaker WAV in the real filesystem so the mock path_exists finds it
        speaker_wav = os.path.join(speaker_dir, "KSA Hamed - Male.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        _setup_mock_model(
            audio_dir=audio_dir,
            speaker_wav_dir=speaker_dir,
            path_exists_override=_path_exists,
        )

        client = _client()

        response = client.post(
            "/api/generate",
            json={
                "text": "مرحبا بك في لغةات",
                "language": "ar",
                "speaker": "KSA Hamed - Male",
                "speed": 1.2,
                "pitch": 0.5,
                "seed": 123,
            },
        )

        assert response.status_code == 200

        # The TTS mock writes a real WAV file to the temp audio_dir, ffmpeg converts
        # it to MP3 in the same dir.  os.listdir (real Python) sees the real files.
        mp3_files = [f for f in os.listdir(audio_dir) if f.endswith(".mp3")]
        assert len(mp3_files) == 1, f"Expected 1 MP3 file, got: {mp3_files}"

        # Find the sidecar file (named {timestamp}.meta.json)
        meta_files = [f for f in os.listdir(audio_dir) if f.endswith(".meta.json")]
        assert len(meta_files) == 1, (
            f"Expected 1 sidecar .meta.json file, got: {meta_files}"
        )

        # Read the sidecar and verify its contents
        meta_path = os.path.join(audio_dir, meta_files[0])
        with open(meta_path, "r") as f:
            meta = json.load(f)

        # Verify all required fields exist
        assert "text" in meta
        assert "language" in meta
        assert "voice" in meta
        assert "speed" in meta
        assert "pitch" in meta
        assert "seed" in meta
        assert "created_at" in meta

        # Verify values match the request
        assert meta["text"] == "مرحبا بك في لغةات"
        assert meta["language"] == "ar"
        assert meta["voice"] == "KSA Hamed - Male"
        assert meta["speed"] == 1.2
        assert meta["pitch"] == 0.5
        assert meta["seed"] == 123


# ---------------------------------------------------------------------------
# Test 2: GET /api/history reads sidecar files and returns text field (not empty)
# ---------------------------------------------------------------------------


def test_history_reads_sidecar_and_returns_text():
    """GET /api/history reads sidecar files and returns the text field (not empty).

    When a sidecar file exists next to an MP3, the history endpoint should
    read it and include the original text in the response.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)

        # Create a mock MP3 file and its sidecar
        mp3_filename = "ar_KSA_Hamed_-_Male_abc123.mp3"
        mp3_path = os.path.join(audio_dir, mp3_filename)
        with open(mp3_path, "wb") as f:
            f.write(b"\xff\xfb")  # minimal MP3-like content

        # Create the sidecar file
        meta_filename = "abc123.meta.json"
        meta_path = os.path.join(audio_dir, meta_filename)
        meta_data = {
            "text": "مرحبا بالعالم",
            "language": "ar",
            "voice": "KSA Hamed - Male",
            "speed": 1.0,
            "pitch": 0.0,
            "seed": 42,
            "created_at": "1720000000",
        }
        with open(meta_path, "w") as f:
            json.dump(meta_data, f)

        def _listdir(path):
            if path == audio_dir:
                return [mp3_filename, meta_filename]
            return _REAL_OS_LISTDIR(path)

        _setup_mock_model(
            audio_dir=audio_dir,
            listdir_override=_listdir,
        )

        client = _client()

        response = client.get("/api/history")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1

        entry = data[0]
        assert entry["filename"] == mp3_filename
        assert entry["text"] == "مرحبا بالعالم", (
            "Expected text from sidecar, got empty string"
        )
        assert entry["language"] == "ar"
        assert entry["voice"] == "KSA Hamed - Male"
        assert "created_at" in entry


# ---------------------------------------------------------------------------
# Test 3: Old MP3 files (without sidecar) still return text: "" (graceful fallback)
# ---------------------------------------------------------------------------


def test_history_fallback_to_empty_text_for_old_files_without_sidecar():
    """Old MP3 files (without sidecar) still return text: "" (graceful fallback).

    When a generated MP3 has no corresponding sidecar file (e.g., from before
    S-02 was implemented), the history endpoint should still return the entry
    with text: "" instead of crashing.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)

        # Create a mock MP3 file WITHOUT a sidecar
        mp3_filename = "ar_KSA_Hamed_-_Male_abc123.mp3"
        mp3_path = os.path.join(audio_dir, mp3_filename)
        with open(mp3_path, "wb") as f:
            f.write(b"\xff\xfb")  # minimal MP3-like content

        def _listdir(path):
            if path == audio_dir:
                return [mp3_filename]  # No sidecar file
            return _REAL_OS_LISTDIR(path)

        _setup_mock_model(
            audio_dir=audio_dir,
            listdir_override=_listdir,
        )

        client = _client()

        response = client.get("/api/history")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1

        entry = data[0]
        assert entry["filename"] == mp3_filename
        assert entry["text"] == "", "Expected empty text for old files without sidecar"


# ---------------------------------------------------------------------------
# Test 4: Sidecar file contains all required metadata fields
# ---------------------------------------------------------------------------


def test_sidecar_contains_all_required_metadata_fields():
    """The sidecar file written by generate_speech() must contain all required fields.

    Required fields: text, language, voice, speed, pitch, seed, created_at.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        # Create the speaker WAV in the real filesystem
        speaker_wav = os.path.join(speaker_dir, "KSA Zariyah - Female.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        def _path_exists(path):
            return (
                str(path).endswith((".wav", ".mp3"))
                or str(path).endswith("speaker_wavs")
                or str(path).endswith("downloads")
            )

        _setup_mock_model(
            audio_dir=audio_dir,
            speaker_wav_dir=speaker_dir,
            path_exists_override=_path_exists,
        )

        client = _client()

        response = client.post(
            "/api/generate",
            json={
                "text": "Hello world in English",
                "language": "en",
                "speaker": "KSA Zariyah - Female",
                "speed": 0.8,
                "pitch": -2.0,
                "seed": 99,
            },
        )

        assert response.status_code == 200

        # The TTS mock writes a real WAV → ffmpeg creates MP3 → sidecar written.
        meta_files = [f for f in os.listdir(audio_dir) if f.endswith(".meta.json")]
        assert len(meta_files) == 1, f"Expected 1 sidecar, got: {meta_files}"

        meta_path = os.path.join(audio_dir, meta_files[0])
        with open(meta_path, "r") as f:
            meta = json.load(f)

        # Verify all required fields are present
        required_fields = {
            "text",
            "language",
            "voice",
            "speed",
            "pitch",
            "seed",
            "created_at",
        }
        missing = required_fields - set(meta.keys())
        assert not missing, f"Missing fields in sidecar: {missing}"

        # Verify values
        assert meta["text"] == "Hello world in English"
        assert meta["language"] == "en"
        assert meta["voice"] == "KSA Zariyah - Female"
        assert meta["speed"] == 0.8
        assert meta["pitch"] == -2.0
        assert meta["seed"] == 99
        assert isinstance(meta["created_at"], str)


# ---------------------------------------------------------------------------
# Test 5: Multiple syntheses produce multiple sidecar files
# ---------------------------------------------------------------------------


def test_multiple_syntheses_produce_multiple_sidecar_files():
    """Multiple POST /api/generate calls produce multiple MP3 files with sidecars."""
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        speaker_wav = os.path.join(speaker_dir, "KSA Hamed - Male.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        def _path_exists(path):
            return (
                str(path).endswith((".wav", ".mp3"))
                or str(path).endswith("speaker_wavs")
                or str(path).endswith("downloads")
            )

        _setup_mock_model(
            audio_dir=audio_dir,
            speaker_wav_dir=speaker_dir,
            path_exists_override=_path_exists,
        )

        client = _client()

        # Generate 3 different audio files
        texts = ["مرحبا", "Hello", "أهلا بك"]
        for text in texts:
            response = client.post(
                "/api/generate",
                json={
                    "text": text,
                    "language": "ar"
                    if text.startswith("مرحبا") or text.startswith("أهلا")
                    else "en",
                    "speaker": "KSA Hamed - Male",
                },
            )
            assert response.status_code == 200

        # Verify 3 MP3 files and 3 sidecars
        mp3_files = [f for f in os.listdir(audio_dir) if f.endswith(".mp3")]
        meta_files = [f for f in os.listdir(audio_dir) if f.endswith(".meta.json")]

        assert len(mp3_files) == 3, f"Expected 3 MP3 files, got: {mp3_files}"
        assert len(meta_files) == 3, f"Expected 3 sidecars, got: {meta_files}"

        # Verify each sidecar has unique text
        metas = []
        for meta_file in meta_files:
            meta_path = os.path.join(audio_dir, meta_file)
            with open(meta_path, "r") as f:
                metas.append(json.load(f))

        texts_in_sidecars = [m["text"] for m in metas]
        for expected_text in texts:
            assert expected_text in texts_in_sidecars, (
                f"Expected text '{expected_text}' in sidecars"
            )


# ---------------------------------------------------------------------------
# Test 6: Default seed (42) is stored in sidecar when not explicitly provided
# ---------------------------------------------------------------------------


def test_default_seed_stored_in_sidecar_when_not_explicitly_provided():
    """When seed is not provided, the backend defaults to 42 and stores it in the sidecar."""
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        speaker_wav = os.path.join(speaker_dir, "KSA Zariyah - Female.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        def _path_exists(path):
            return (
                str(path).endswith((".wav", ".mp3"))
                or str(path).endswith("speaker_wavs")
                or str(path).endswith("downloads")
            )

        _setup_mock_model(
            audio_dir=audio_dir,
            speaker_wav_dir=speaker_dir,
            path_exists_override=_path_exists,
        )

        client = _client()

        # No seed provided — should default to 42
        response = client.post(
            "/api/generate",
            json={
                "text": "Test text",
                "language": "ar",
                "speaker": "KSA Zariyah - Female",
            },
        )

        assert response.status_code == 200

        meta_files = [f for f in os.listdir(audio_dir) if f.endswith(".meta.json")]
        assert len(meta_files) == 1, f"Expected 1 sidecar, got: {meta_files}"

        meta_path = os.path.join(audio_dir, meta_files[0])
        with open(meta_path, "r") as f:
            meta = json.load(f)

        assert meta["seed"] == 42, f"Expected default seed 42, got: {meta['seed']}"
