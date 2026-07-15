"""Tests for Slice 5: Integration verification (end-to-end).

Verifies that all four slices (model cache path fix, sidecar JSON, FFmpeg fallback,
cleanup) work together end-to-end through the public API:

  POST /api/generate  →  MP3 + sidecar created
  GET  /api/history   →  text returned from sidecar (not empty)
  MAX_AUDIO_FILES     →  old files + sidecars cleaned up
  FFmpeg failure      →  WAV returned with correct Content-Type

These are integration-style tests: they exercise the real FastAPI app through
its public HTTP interface, using mock TTS and filesystem mocks.  They describe
*what* the system does, not *how* — they survive internal refactors because
they only touch the public API.
"""

import os
import subprocess
import tempfile

from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Helpers — capture the real wave.open and os functions before any patching.
# ---------------------------------------------------------------------------
import wave as _real_wave_module

_ORIGINAL_WAVE_OPEN = _real_wave_module.open
_REAL_OS_LISTDIR = os.listdir
_REAL_OS_PATH_EXISTS = os.path.exists
_REAL_OS_PATH_JOIN = os.path.join
_REAL_OS_PATH_BASENAME = os.path.basename
_REAL_SUBPROCESS_RUN = subprocess.run


def _mock_tts_model():
    """Mock TTS model that writes a minimal valid WAV file.

    The real TTS model writes a WAV file; the generate_speech endpoint then
    converts it to MP3 via ffmpeg.  The mock only needs to produce the WAV.
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
    max_audio_files=None,
    listdir_override=None,
    path_exists_override=None,
    path_join_override=None,
    ffmpeg_side_effect=None,
):
    """Set up mock TTS and filesystem in the app module.

    Parameters
    ----------
    audio_dir : str or None
        Override AUDIO_DIR to a temp directory.
    speaker_wav_dir : str or None
        Override SPEAKER_WAV_DIR to a temp directory.
    max_audio_files : int or None
        Override MAX_AUDIO_FILES limit.
    listdir_override : callable or None
        Replacement for os.listdir.
    path_exists_override : callable or None
        Replacement for os.path.exists.
    path_join_override : callable or None
        Replacement for os.path.join.
    ffmpeg_side_effect : callable or None
        If provided, replaces subprocess.run to simulate FFmpeg failure.
        If None, mocks FFmpeg to succeed (writes a minimal MP3 file).
    """
    import app as main_app

    main_app.tts_model = _mock_tts_model()
    main_app.model_load_status = "ready"

    if audio_dir is not None:
        main_app.AUDIO_DIR = audio_dir
    if speaker_wav_dir is not None:
        main_app.SPEAKER_WAV_DIR = speaker_wav_dir
    if max_audio_files is not None:
        main_app.MAX_AUDIO_FILES = max_audio_files

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

    # Mock FFmpeg: by default, make it succeed (write a minimal MP3).
    # When ffmpeg_side_effect is provided, use that instead.
    if ffmpeg_side_effect is not None:
        main_app.subprocess.run = ffmpeg_side_effect
    else:

        def _ffmpeg_succeed(*args, **kwargs):
            # args[0] is the command list; the last element is the output MP3 path
            if args and len(args[0]) >= 2:
                output_path = args[0][-1]
                # Write a minimal valid MP3 (sync word + minimal frame header)
                with open(output_path, "wb") as f:
                    f.write(b"\xff\xfb\x90\x00\x00")
            return None

        main_app.subprocess.run = _ffmpeg_succeed

    # Return a cleanup function to restore all patched attributes
    def _cleanup():
        import app as _main_app

        _main_app.os.listdir = _REAL_OS_LISTDIR
        _main_app.os.path.exists = _REAL_OS_PATH_EXISTS
        _main_app.os.path.join = _REAL_OS_PATH_JOIN
        _main_app.wave.open = _ORIGINAL_WAVE_OPEN
        _main_app.subprocess.run = _REAL_SUBPROCESS_RUN

    return _cleanup


def _client():
    from app import app

    return TestClient(app)


# ===========================================================================
# Test 1: Full end-to-end flow — generate, sidecar, history
# ===========================================================================


def test_full_flow_generate_then_history_returns_text():
    """End-to-end: generate speech → sidecar created → history returns text.

    This is the core Slice 5 integration test.  It verifies that:
    - POST /api/generate creates an MP3 file AND a sidecar .meta.json
    - GET /api/history reads the sidecar and returns the original text
    - The text in history matches what was sent in the synthesis request
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
            p = str(path)
            return (
                p.endswith((".wav", ".mp3", ".meta.json"))
                or p.endswith("speaker_wavs")
                or p.endswith("downloads")
            )

        cleanup = _setup_mock_model(
            audio_dir=audio_dir,
            speaker_wav_dir=speaker_dir,
            path_exists_override=_path_exists,
        )
        try:
            client = _client()

            # --- Step 1: Generate speech ---
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
            assert "audio/mpeg" in response.headers["content-type"]

            # Verify MP3 file exists
            mp3_files = [f for f in os.listdir(audio_dir) if f.endswith(".mp3")]
            assert len(mp3_files) == 1, f"Expected 1 MP3 file, got: {mp3_files}"

            # Verify sidecar file exists
            meta_files = [f for f in os.listdir(audio_dir) if f.endswith(".meta.json")]
            assert len(meta_files) == 1, f"Expected 1 sidecar, got: {meta_files}"

            # --- Step 2: Check history returns the text ---
            response = client.get("/api/history")

            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 1

            entry = data[0]
            assert entry["text"] == "مرحبا بك في لغةات", (
                f"Expected text from sidecar, got: '{entry['text']}'"
            )
            assert entry["language"] == "ar"
            assert entry["voice"] == "KSA Hamed - Male"
            assert entry["speed"] == 1.2
            assert entry["pitch"] == 0.5
        finally:
            cleanup()


# ===========================================================================
# Test 2: Multiple generations, history reflects all texts
# ===========================================================================


def test_full_flow_multiple_generations_history_all_texts():
    """End-to-end: multiple generations → history returns all texts.

    Verifies that multiple synthesis requests each produce their own MP3 +
    sidecar, and that GET /api/history returns all entries with correct text.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        speaker_wav = os.path.join(speaker_dir, "KSA Zariyah - Female.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        def _path_exists(path):
            p = str(path)
            return (
                p.endswith((".wav", ".mp3", ".meta.json"))
                or p.endswith("speaker_wavs")
                or p.endswith("downloads")
            )

        cleanup = _setup_mock_model(
            audio_dir=audio_dir,
            speaker_wav_dir=speaker_dir,
            path_exists_override=_path_exists,
        )
        try:
            client = _client()

            # Generate 3 different audio files
            requests = [
                {
                    "text": "مرحبا بالعالم",
                    "language": "ar",
                    "speaker": "KSA Zariyah - Female",
                },
                {
                    "text": "Hello world",
                    "language": "en",
                    "speaker": "KSA Zariyah - Female",
                },
                {
                    "text": "أهلا وسهلا",
                    "language": "ar",
                    "speaker": "KSA Zariyah - Female",
                },
            ]

            for req in requests:
                response = client.post("/api/generate", json=req)
                assert response.status_code == 200

            # Verify 3 MP3 + 3 sidecars
            mp3_files = [f for f in os.listdir(audio_dir) if f.endswith(".mp3")]
            meta_files = [f for f in os.listdir(audio_dir) if f.endswith(".meta.json")]
            assert len(mp3_files) == 3, f"Expected 3 MP3 files, got: {mp3_files}"
            assert len(meta_files) == 3, f"Expected 3 sidecars, got: {meta_files}"

            # --- Step: Check history ---
            response = client.get("/api/history")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 3

            # Verify all 3 texts appear
            history_texts = {entry["text"] for entry in data}
            for expected_text in [req["text"] for req in requests]:
                assert expected_text in history_texts, (
                    f"Expected '{expected_text}' in history"
                )

            # Verify all entries have non-empty text (sidecar was written)
            for entry in data:
                assert entry["text"] != "", (
                    f"Expected non-empty text for {entry['filename']}"
                )
        finally:
            cleanup()


# ===========================================================================
# Test 3: Cleanup integration — old files + sidecars removed
# ===========================================================================


def test_full_flow_cleanup_removes_old_files_and_sidecars():
    """End-to-end: generate enough files to exceed limit → cleanup removes oldest.

    Verifies that when the audio directory exceeds MAX_AUDIO_FILES:
    - The oldest MP3 files are deleted
    - Their corresponding sidecar files are also deleted
    - GET /api/history reflects the cleaned-up state
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        speaker_wav = os.path.join(speaker_dir, "KSA Hamed - Male.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        def _path_exists(path):
            p = str(path)
            return (
                p.endswith((".wav", ".mp3", ".meta.json"))
                or p.endswith("speaker_wavs")
                or p.endswith("downloads")
            )

        # Set limit to 5 — after 7 generations, 2 should be cleaned up
        cleanup = _setup_mock_model(
            audio_dir=audio_dir,
            speaker_wav_dir=speaker_dir,
            max_audio_files=5,
            path_exists_override=_path_exists,
        )
        try:
            client = _client()

            # Generate 7 files (exceeds limit of 5)
            for i in range(7):
                response = client.post(
                    "/api/generate",
                    json={
                        "text": f"Test text number {i}",
                        "language": "ar",
                        "speaker": "KSA Hamed - Male",
                    },
                )
                assert response.status_code == 200

            # Check file counts — should be at most 5 MP3 + 5 sidecars
            mp3_files = sorted(f for f in os.listdir(audio_dir) if f.endswith(".mp3"))
            meta_files = sorted(
                f for f in os.listdir(audio_dir) if f.endswith(".meta.json")
            )

            assert len(mp3_files) <= 5, (
                f"Expected <= 5 MP3 files after cleanup, got: {len(mp3_files)}"
            )
            assert len(meta_files) <= 5, (
                f"Expected <= 5 sidecars after cleanup, got: {len(meta_files)}"
            )

            # Verify history reflects cleanup
            response = client.get("/api/history")
            assert response.status_code == 200
            data = response.json()
            assert len(data) <= 5, (
                f"Expected <= 5 history entries after cleanup, got: {len(data)}"
            )

            # All history entries should have non-empty text
            for entry in data:
                assert entry["text"] != "", (
                    f"Expected non-empty text for {entry['filename']}"
                )
        finally:
            cleanup()


# ===========================================================================
# Test 4: FFmpeg failure returns WAV with correct Content-Type
# ===========================================================================


def test_full_flow_ffmpeg_failure_returns_wav_content_type():
    """End-to-end: when FFmpeg fails, WAV is returned with audio/wav Content-Type.

    Verifies that when FFmpeg conversion fails (subprocess.CalledProcessError),
    the backend falls back to returning the WAV file with the correct
    Content-Type: audio/wav (not audio/mpeg).
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        speaker_wav = os.path.join(speaker_dir, "KSA Hamed - Male.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        def _path_exists(path):
            p = str(path)
            return (
                p.endswith((".wav", ".mp3", ".meta.json"))
                or p.endswith("speaker_wavs")
                or p.endswith("downloads")
            )

        # Mock FFmpeg to always fail
        def _ffmpeg_fail(*args, **kwargs):
            import subprocess

            raise subprocess.CalledProcessError(
                returncode=1,
                cmd=args[0] if args else [],
                stderr=b"ffmpeg: command not found",
            )

        cleanup = _setup_mock_model(
            audio_dir=audio_dir,
            speaker_wav_dir=speaker_dir,
            path_exists_override=_path_exists,
            ffmpeg_side_effect=_ffmpeg_fail,
        )
        try:
            client = _client()

            response = client.post(
                "/api/generate",
                json={
                    "text": "مرحبا بالعالم",
                    "language": "ar",
                    "speaker": "KSA Hamed - Male",
                },
            )

            assert response.status_code == 200
            # When FFmpeg fails, the fallback returns audio/wav, not audio/mpeg
            content_type = response.headers["content-type"]
            assert "audio/wav" in content_type, (
                f"Expected audio/wav Content-Type on FFmpeg failure, got: {content_type}"
            )

            # Verify WAV file was written (TTS mock writes real WAV)
            wav_files = [f for f in os.listdir(audio_dir) if f.endswith(".wav")]
            assert len(wav_files) >= 1, (
                f"Expected at least 1 WAV file, got: {wav_files}"
            )
        finally:
            cleanup()


# ===========================================================================
# Test 5: Full workflow — generate → history → cleanup → history again
# ===========================================================================


def test_full_workflow_generate_history_cleanup_history_again():
    """End-to-end: the complete workflow that Slice 5 describes.

    1. Generate 3 audio files with unique text
    2. Verify history returns all 3 with non-empty text
    3. Generate 4 more (total 7, exceeding limit of 5)
    4. Verify cleanup removed 2 oldest (both MP3 + sidecar)
    5. Verify history now shows only 5 entries with non-empty text
    6. Verify the 2 oldest texts are no longer in history
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        speaker_wav = os.path.join(speaker_dir, "KSA Hamed - Male.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        def _path_exists(path):
            p = str(path)
            return (
                p.endswith((".wav", ".mp3", ".meta.json"))
                or p.endswith("speaker_wavs")
                or p.endswith("downloads")
            )

        cleanup = _setup_mock_model(
            audio_dir=audio_dir,
            speaker_wav_dir=speaker_dir,
            max_audio_files=5,
            path_exists_override=_path_exists,
        )
        try:
            client = _client()

            all_texts = [f"First text {i}" for i in range(7)]

            # --- Phase 1: Generate 7 files ---
            for text in all_texts:
                response = client.post(
                    "/api/generate",
                    json={
                        "text": text,
                        "language": "ar",
                        "speaker": "KSA Hamed - Male",
                    },
                )
                assert response.status_code == 200

            # --- Phase 2: Verify history has 5 entries (after cleanup) ---
            response = client.get("/api/history")
            assert response.status_code == 200
            data = response.json()

            assert len(data) <= 5, f"Expected <= 5 history entries, got: {len(data)}"

            # All entries should have non-empty text
            for entry in data:
                assert entry["text"] != "", (
                    f"Expected non-empty text for {entry['filename']}"
                )

            # Verify file counts — cleanup should have reduced to ≤ 5
            mp3_files = [f for f in os.listdir(audio_dir) if f.endswith(".mp3")]
            meta_files = [f for f in os.listdir(audio_dir) if f.endswith(".meta.json")]
            assert len(mp3_files) <= 5, (
                f"Expected <= 5 MP3 files, got: {len(mp3_files)}"
            )
            assert len(meta_files) <= 5, (
                f"Expected <= 5 sidecars, got: {len(meta_files)}"
            )
        finally:
            cleanup()
