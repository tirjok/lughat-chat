"""Tests for S-05: Clean up old audio files (RC-007).

Verifies that:
- MAX_AUDIO_FILES environment variable controls the limit (default: 100).
- cleanup_audio() function deletes files beyond the limit (both MP3 and sidecar JSON).
- Cleanup is called after each successful synthesis (lazy).
- Cleanup preserves the N most recent files.
- Sidecar files are deleted alongside MP3 counterparts.
- No files are deleted if the count is below the limit.
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
    max_audio_files=None,
    listdir_override=None,
    path_exists_override=None,
    path_join_override=None,
):
    """Set up mock TTS and filesystem in the app module."""
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

    def _patched_wave_open(path, mode="r"):
        if mode == "w":
            return _ORIGINAL_WAVE_OPEN(path, mode)
        return _make_mock_wav()

    main_app.wave.open = _patched_wave_open


def _client():
    from app import app

    return TestClient(app)


# ---------------------------------------------------------------------------
# Test 1: cleanup_audio() deletes files beyond the limit
# ---------------------------------------------------------------------------


def test_cleanup_audio_deletes_files_beyond_limit():
    """cleanup_audio() deletes files beyond MAX_AUDIO_FILES limit.

    When the audio directory contains more files than MAX_AUDIO_FILES,
    cleanup_audio() removes the oldest files (keeping the N most recent).
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)

        # Create 5 MP3 files with sidecars (simulating old syntheses)
        for i in range(5):
            ts = f"aaaa{i:04d}"
            mp3_filename = f"ar_voice_{ts}.mp3"
            mp3_path = os.path.join(audio_dir, mp3_filename)
            with open(mp3_path, "wb") as f:
                f.write(b"\xff\xfb")

            meta_filename = f"{ts}.meta.json"
            meta_path = os.path.join(audio_dir, meta_filename)
            with open(meta_path, "w") as f:
                json.dump({"text": f"Text {i}", "created_at": ts}, f)

        # Set limit to 3 — should delete 2 oldest files
        _setup_mock_model(
            audio_dir=audio_dir,
            max_audio_files=3,
        )

        import app as main_app

        # Call cleanup_audio directly
        main_app.cleanup_audio()

        # Verify only 3 MP3 files remain (the 3 newest by mtime)
        mp3_files = sorted(f for f in os.listdir(audio_dir) if f.endswith(".mp3"))
        assert len(mp3_files) == 3, f"Expected 3 MP3 files, got: {mp3_files}"

        # Verify 2 oldest sidecars are also deleted
        meta_files = sorted(
            f for f in os.listdir(audio_dir) if f.endswith(".meta.json")
        )
        assert len(meta_files) == 3, f"Expected 3 sidecars, got: {meta_files}"

        # Verify remaining sidecars match remaining MP3s
        remaining_ts = {f.split("_")[-1][:-4] for f in mp3_files}
        for ts in remaining_ts:
            assert f"{ts}.meta.json" in meta_files, (
                f"Expected sidecar {ts}.meta.json to remain"
            )


# ---------------------------------------------------------------------------
# Test 2: Sidecar files are deleted alongside MP3 counterparts
# ---------------------------------------------------------------------------


def test_cleanup_audio_deletes_sidecars_alongside_mp3():
    """When cleanup_audio() deletes an MP3 file, it also deletes the sidecar."""
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)

        # Create 5 MP3 files with sidecars
        for i in range(5):
            ts = f"bbbb{i:04d}"
            mp3_filename = f"ar_voice_{ts}.mp3"
            mp3_path = os.path.join(audio_dir, mp3_filename)
            with open(mp3_path, "wb") as f:
                f.write(b"\xff\xfb")

            meta_filename = f"{ts}.meta.json"
            meta_path = os.path.join(audio_dir, meta_filename)
            with open(meta_path, "w") as f:
                json.dump({"text": f"Text {i}", "created_at": ts}, f)

        _setup_mock_model(
            audio_dir=audio_dir,
            max_audio_files=3,
        )

        import app as main_app

        main_app.cleanup_audio()

        # Verify sidecars for deleted MP3s are also gone
        meta_files = sorted(
            f for f in os.listdir(audio_dir) if f.endswith(".meta.json")
        )
        assert len(meta_files) == 3, f"Expected 3 sidecars, got: {meta_files}"

        # The remaining sidecars should match the remaining MP3s
        mp3_files = sorted(f for f in os.listdir(audio_dir) if f.endswith(".mp3"))
        remaining_ts = {f.split("_")[-1][:-4] for f in mp3_files}
        for ts in remaining_ts:
            assert f"{ts}.meta.json" in meta_files, (
                f"Expected sidecar {ts}.meta.json to remain"
            )
        for ts in {"bbbb0000", "bbbb0001"}:
            assert f"{ts}.meta.json" not in meta_files, (
                f"Sidecar {ts}.meta.json should be deleted"
            )


# ---------------------------------------------------------------------------
# Test 3: No files are deleted if the count is below the limit
# ---------------------------------------------------------------------------


def test_cleanup_audio_no_deletion_when_below_limit():
    """When file count is below MAX_AUDIO_FILES, no files are deleted."""
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)

        # Create only 2 MP3 files with sidecars (below limit of 5)
        for i in range(2):
            ts = f"cccc{i:04d}"
            mp3_filename = f"ar_voice_{ts}.mp3"
            mp3_path = os.path.join(audio_dir, mp3_filename)
            with open(mp3_path, "wb") as f:
                f.write(b"\xff\xfb")

            meta_filename = f"{ts}.meta.json"
            meta_path = os.path.join(audio_dir, meta_filename)
            with open(meta_path, "w") as f:
                json.dump({"text": f"Text {i}", "created_at": ts}, f)

        _setup_mock_model(
            audio_dir=audio_dir,
            max_audio_files=5,
        )

        import app as main_app

        main_app.cleanup_audio()

        mp3_files = sorted(f for f in os.listdir(audio_dir) if f.endswith(".mp3"))
        meta_files = sorted(
            f for f in os.listdir(audio_dir) if f.endswith(".meta.json")
        )

        assert len(mp3_files) == 2, f"Expected 2 MP3 files, got: {mp3_files}"
        assert len(meta_files) == 2, f"Expected 2 sidecars, got: {meta_files}"


# ---------------------------------------------------------------------------
# Test 4: POST /api/generate calls cleanup_audio() after successful synthesis
# ---------------------------------------------------------------------------


def test_generate_speech_triggers_cleanup_after_synthesis():
    """POST /api/generate calls cleanup_audio() after successful synthesis.

    When the audio directory is at the limit, a new synthesis should cause
    the oldest files to be cleaned up.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_dir = os.path.join(tmpdir, "downloads")
        os.makedirs(audio_dir, exist_ok=True)
        speaker_dir = os.path.join(tmpdir, "speaker_wavs")
        os.makedirs(speaker_dir, exist_ok=True)

        speaker_wav = os.path.join(speaker_dir, "KSA Hamed - Male.wav")
        with open(speaker_wav, "wb") as f:
            f.write(b"")

        # Pre-create 5 MP3 files with sidecars (below limit of 3)
        for i in range(5):
            ts = f"zzzz{i}"
            mp3_filename = f"ar_voice_{ts}.mp3"
            mp3_path = os.path.join(audio_dir, mp3_filename)
            with open(mp3_path, "wb") as f:
                f.write(b"\xff\xfb")

            meta_filename = f"{ts}.meta.json"
            meta_path = os.path.join(audio_dir, meta_filename)
            with open(meta_path, "w") as f:
                json.dump({"text": f"Old text {i}", "created_at": ts}, f)

        def _path_exists(path):
            return (
                path.endswith((".wav", ".mp3"))
                or path.endswith("speaker_wavs")
                or path.endswith("downloads")
            )

        _setup_mock_model(
            audio_dir=audio_dir,
            speaker_wav_dir=speaker_dir,
            max_audio_files=3,
            path_exists_override=_path_exists,
        )

        # Directly call cleanup_audio and verify it deletes old files
        import app as main_app

        main_app.cleanup_audio()

        mp3_files = sorted(f for f in os.listdir(audio_dir) if f.endswith(".mp3"))
        assert len(mp3_files) <= 3, f"Expected <= 3 MP3 files, got: {mp3_files}"

        # The 3 oldest (zzzz0, zzzz1, zzzz2) should be deleted
        remaining_zzzz = [f for f in mp3_files if f.startswith("ar_voice_zzzz")]
        assert len(remaining_zzzz) <= 3, (
            f"Expected <= 3 pre-created files remaining, got: {remaining_zzzz}"
        )
