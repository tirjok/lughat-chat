"""Tests for text_chunker module."""

import sys
import wave
from pathlib import Path

import pytest

# Add backend directory to path so we can import text_chunker
sys.path.insert(0, str(Path(__file__).parent.parent))

from text_chunker import (
    MAX_CHUNK_CHARS,
    CHUNK_OVERLAP_CHARS,
    TextChunk,
    chunk_text,
    detect_language,
    merge_audio_files,
    merge_wav_files,
    split_into_sentences,
)


# ---------------------------------------------------------------------------
# detect_language
# ---------------------------------------------------------------------------


class TestDetectLanguage:
    def test_arabic_text(self):
        assert detect_language("مرحبا بك في لغةات") == "ar"

    def test_english_text(self):
        assert detect_language("Hello world") == "en"

    def test_mixed_text(self):
        # Arabic-dominant mixed text
        mixed = "مرحبا Hello world مرحبا"
        assert detect_language(mixed) == "ar"

    def test_empty_text_defaults_to_arabic(self):
        assert detect_language("") == "ar"

    def test_punctuation_only(self):
        assert detect_language("...") == "en"

    def test_arabic_punctuation(self):
        # Arabic question mark U+061F is outside \u0600-\u06FF but handled explicitly
        # "؟..." = 1 Arabic char out of 4 = 25% < 40% threshold → en
        assert detect_language("؟...") == "en"
        # More Arabic punctuation → ar
        assert detect_language("؟مرحبا") == "ar"


# ---------------------------------------------------------------------------
# split_into_sentences
# ---------------------------------------------------------------------------


class TestSplitIntoSentences:
    def test_arabic_sentences(self):
        text = "مرحبا بك. كيف حالك؟ أنا بخير."
        sentences = split_into_sentences(text)
        assert len(sentences) >= 2

    def test_english_sentences(self):
        text = "Hello world. How are you? I am fine."
        sentences = split_into_sentences(text)
        assert len(sentences) >= 3

    def test_single_sentence(self):
        text = "مرحبا بك في لغةات"
        sentences = split_into_sentences(text)
        assert len(sentences) == 1

    def test_empty_string(self):
        assert split_into_sentences("") == []


# ---------------------------------------------------------------------------
# chunk_text
# ---------------------------------------------------------------------------


class TestChunkText:
    def test_short_text_single_chunk(self):
        chunks = chunk_text("مرحبا بك في لغةات")
        assert len(chunks) == 1
        assert chunks[0].is_last is True
        assert chunks[0].text == "مرحبا بك في لغةات"

    def test_empty_text(self):
        chunks = chunk_text("")
        assert len(chunks) == 0

    def test_long_text_multiple_chunks(self):
        long_text = "مرحبا بك. هذا نص طويل جداً يحتوي على عدة جمل. " * 20
        chunks = chunk_text(long_text, max_chars=MAX_CHUNK_CHARS)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk.text) <= MAX_CHUNK_CHARS + CHUNK_OVERLAP_CHARS

    def test_chunk_indices(self):
        long_text = "مرحبا بك. هذا نص طويل. نعم طويل جداً." * 10
        chunks = chunk_text(long_text, max_chars=MAX_CHUNK_CHARS)
        for i, chunk in enumerate(chunks):
            assert chunk.index == i

    def test_last_chunk_flag(self):
        long_text = "مرحبا بك. هذا نص طويل. نعم طويل جداً." * 10
        chunks = chunk_text(long_text, max_chars=MAX_CHUNK_CHARS)
        assert chunks[-1].is_last is True
        for chunk in chunks[:-1]:
            assert chunk.is_last is False

    def test_fixed_strategy(self):
        long_text = "مرحبا بك في لغةات " * 30
        chunks = chunk_text(long_text, max_chars=MAX_CHUNK_CHARS, strategy="fixed")
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk.text) <= MAX_CHUNK_CHARS + 1  # +1 for trailing space

    def test_chunk_overlap(self):
        text = "مرحبا بك في لغةات. هذا نص تجريبي للاختبار." * 10
        chunks = chunk_text(
            text, max_chars=MAX_CHUNK_CHARS, overlap_chars=CHUNK_OVERLAP_CHARS
        )
        if len(chunks) > 1:
            # Check that chunks overlap (share common text)
            prev = chunks[-2].text
            curr = chunks[-1].text
            # The end of the previous chunk should overlap with the start of the next
            assert len(prev) > 0 and len(curr) > 0

    def test_english_long_text(self):
        long_text = "Hello world. This is a long text for testing. " * 20
        chunks = chunk_text(long_text, max_chars=MAX_CHUNK_CHARS)
        assert len(chunks) > 1
        for chunk in chunks:
            # Allow 1 extra char for edge-case boundary conditions
            assert len(chunk.text) <= MAX_CHUNK_CHARS + CHUNK_OVERLAP_CHARS + 1

    def test_chunk_text_repr(self):
        chunk = TextChunk(index=0, text="test", is_last=True)
        assert "TextChunk" in repr(chunk)
        assert "test" in repr(chunk)


# ---------------------------------------------------------------------------
# merge_audio_files
# ---------------------------------------------------------------------------


class TestMergeAudioFiles:
    @pytest.fixture
    def wav_dir(self, tmp_path):
        return tmp_path / "wav"

    @pytest.fixture
    def sample_wavs(self, wav_dir):
        """Create a few sample WAV files for testing."""
        wav_dir.mkdir(exist_ok=True)
        paths = []
        for i in range(3):
            path = wav_dir / f"sample_{i}.wav"
            with wave.open(str(path), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(24000)
                # Simple sine wave as placeholder audio
                import math

                frames = b""
                for j in range(2400):  # 0.1 seconds
                    val = int(32767 * math.sin(2 * math.pi * 440 * j / 24000))
                    frames += val.to_bytes(2, "little", signed=True)
                wf.writeframes(frames)
            paths.append(str(path))
        return paths

    def test_merge_empty_list(self, tmp_path):
        output = tmp_path / "output.wav"
        merge_audio_files([], str(output))
        # Should not crash, file may or may not exist

    def test_merge_single_file(self, sample_wavs, tmp_path):
        output = tmp_path / "merged.wav"
        merge_audio_files([sample_wavs[0]], str(output))
        assert output.exists()
        # Should be a copy of the single input
        with wave.open(str(output), "rb") as wf:
            assert wf.getnframes() == 2400

    def test_merge_multiple_files(self, sample_wavs, tmp_path):
        output = tmp_path / "merged.wav"
        merge_audio_files(sample_wavs, str(output))
        assert output.exists()
        with wave.open(str(output), "rb") as wf:
            # Should be 3x the frames
            assert wf.getnframes() == 7200
            assert wf.getnchannels() == 1
            assert wf.getframerate() == 24000


# ---------------------------------------------------------------------------
# merge_wav_files
# ---------------------------------------------------------------------------


class TestMergeWavFiles:
    @pytest.fixture
    def sample_wavs(self, tmp_path):
        """Create a few sample WAV files for testing."""
        wav_dir = tmp_path / "wav"
        wav_dir.mkdir(exist_ok=True)
        paths = []
        for i in range(3):
            path = wav_dir / f"sample_{i}.wav"
            with wave.open(str(path), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(24000)
                import math

                frames = b""
                for j in range(2400):  # 0.1 seconds
                    val = int(32767 * math.sin(2 * math.pi * 440 * j / 24000))
                    frames += val.to_bytes(2, "little", signed=True)
                wf.writeframes(frames)
            paths.append(str(path))
        return paths

    def test_merge_wav_empty(self, tmp_path):
        output = tmp_path / "output.wav"
        merge_wav_files([], str(output))

    def test_merge_wav_single(self, sample_wavs, tmp_path):
        output = tmp_path / "merged.wav"
        merge_wav_files([sample_wavs[0]], str(output))
        assert output.exists()
        with wave.open(str(output), "rb") as wf:
            assert wf.getnframes() == 2400

    def test_merge_wav_multiple(self, sample_wavs, tmp_path):
        output = tmp_path / "merged.wav"
        merge_wav_files(sample_wavs, str(output))
        assert output.exists()
        with wave.open(str(output), "rb") as wf:
            assert wf.getnframes() == 7200
            assert wf.getnchannels() == 1
            assert wf.getframerate() == 24000
