"""Test that merge_audio_files handles spaces in output path."""

import sys
import subprocess
import wave
import math

import pytest

sys.path.insert(0, "/app")
from text_chunker import merge_audio_files


class TestMergeAudioFilesWithSpaces:
    """Test merge_audio_files with spaces in output path."""

    @pytest.fixture
    def valid_mp3_files(self, tmp_path):
        """Create valid MP3 files using ffmpeg."""
        mp3_1 = tmp_path / "chunk_1.mp3"
        mp3_2 = tmp_path / "chunk_2.mp3"

        # Create valid MP3 files using ffmpeg from silence
        for mp3_file in [mp3_1, mp3_2]:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-f",
                    "lavfi",
                    "-i",
                    "aevalsrc=0:d=0.1",
                    "-b:a",
                    "192k",
                    str(mp3_file),
                ],
                check=True,
                capture_output=True,
            )
        return [str(mp3_1), str(mp3_2)]

    @pytest.fixture
    def wav_as_mp3_files(self, tmp_path):
        """Create WAV files with .mp3 extension (simulates _wav_to_mp3 fallback).

        When ffmpeg fails, _wav_to_mp3 falls back to shutil.copy2(wav_path, mp3_path),
        which creates a file with .mp3 extension but WAV content.
        """
        mp3_1 = tmp_path / "chunk_1.mp3"
        mp3_2 = tmp_path / "chunk_2.mp3"

        # Create WAV files and save with .mp3 extension
        for mp3_file in [mp3_1, mp3_2]:
            with wave.open(str(mp3_file), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(22050)
                frames = b""
                for j in range(2205):  # 0.1 seconds
                    val = int(32767 * math.sin(2 * math.pi * 440 * j / 22050))
                    frames += val.to_bytes(2, "little", signed=True)
                wf.writeframes(frames)
        return [str(mp3_1), str(mp3_2)]

    def test_merge_with_spaces_in_output_path(self, valid_mp3_files, tmp_path):
        """With valid MP3 files, merge should work even with spaces in output path."""
        output = tmp_path / "ar_KSA Hamed - Male_028faf1e.mp3"
        merge_audio_files(valid_mp3_files, str(output))
        assert output.exists()

    def test_merge_fallback_wav_as_mp3_with_spaces(self, wav_as_mp3_files, tmp_path):
        """When _wav_to_mp3 falls back to copy, the .mp3 files are actually WAV.

        The fix: merge_audio_files should re-encode WAV files to proper MP3 format
        instead of using -c copy which requires valid MP3 streams.
        """
        output = tmp_path / "ar_KSA Hamed - Male_028faf1e.mp3"

        # This should now succeed because merge_audio_files re-encodes to MP3
        merge_audio_files(wav_as_mp3_files, str(output))
        assert output.exists()

    def test_merge_stderr_on_failure(self, valid_mp3_files, tmp_path):
        """Capture the stderr to understand the exact error."""
        output = tmp_path / "ar_KSA Hamed - Male_028faf1e.mp3"

        try:
            merge_audio_files(valid_mp3_files, str(output))
        except subprocess.CalledProcessError as e:
            print("\n=== FFmpeg stderr ===")
            print(e.stderr.decode() if e.stderr else "(no stderr)")
            print("=== FFmpeg stdout ===")
            print(e.stdout.decode() if e.stdout else "(no stdout)")
            print(f"=== Exit code: {e.returncode} ===\n")
            raise

    def test_merge_with_spaces_in_output_path_no_spaces(
        self, valid_mp3_files, tmp_path
    ):
        """Test that merge works when output path has NO spaces."""
        output = tmp_path / "ar_KSA_Hamed_Male_028faf1e.mp3"  # No spaces
        merge_audio_files(valid_mp3_files, str(output))
        assert output.exists()

    def test_merge_fallback_wav_as_mp3_no_spaces(self, wav_as_mp3_files, tmp_path):
        """Test that merge succeeds even without spaces when input is WAV-as-MP3."""
        output = tmp_path / "ar_KSA_Hamed_Male_028faf1e.mp3"  # No spaces

        # This should now succeed because merge_audio_files re-encodes to MP3
        merge_audio_files(wav_as_mp3_files, str(output))
        assert output.exists()
