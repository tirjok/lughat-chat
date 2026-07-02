"""Text chunking utilities for efficient XTTS-v2 synthesis.

Splits long text into manageable chunks before sending to the TTS model.
This prevents the CPU from being overwhelmed by large inference windows.

Design decisions:
  - Arabic-aware: respects Arabic sentence-ending punctuation (؟ ،)
  - Hard limit: no chunk exceeds MAX_CHARS (default 400)
  - Overlap: short overlap (5–10 chars) between chunks to preserve prosody
  - Language detection: Arabic vs English punctuation handling

Two strategies:
  - "sentence": split on sentence boundaries (preferred for quality)
  - "fixed": split on character boundaries (fallback for edge cases)
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List


@dataclass
class TextChunk:
    """A single chunk of text ready for synthesis."""

    index: int
    text: str
    is_last: bool = False

    def __repr__(self) -> str:
        return (
            f"TextChunk(index={self.index}, text={self.text!r}, is_last={self.is_last})"
        )


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Maximum characters per chunk. XTTS-v2 handles ~300–400 chars comfortably
# on CPU. Going beyond this causes the CPU to be overwhelmed with
# autoregressive decoding steps.
MAX_CHUNK_CHARS = 400

# Characters of overlap between chunks to preserve prosody/continuity.
# Small overlap (5–10 chars) ensures smooth concatenation.
CHUNK_OVERLAP_CHARS = 10

# Minimum chunk size (below this we merge rather than split).
MIN_CHUNK_CHARS = 100

# Arabic sentence-ending punctuation (؟ and .)
ARABIC_SENTENCE_ENDERS = r"[؟.]"
# English sentence-ending punctuation (. ! ? : ;)
ENGLISH_SENTENCE_ENDERS = r"[.!?:;]"
# Combined pattern
SENTENCE_ENDERS = f"[{ARABIC_SENTENCE_ENDERS}{ENGLISH_SENTENCE_ENDERS}]"


def detect_language(text: str) -> str:
    """Detect whether text is primarily Arabic or English.

    Returns 'ar' if > 40% of characters are Arabic letters OR
    Arabic punctuation (including ؟ U+061F), otherwise 'en'.
    """
    arabic_chars = sum(
        1
        for c in text
        if "\u0600" <= c <= "\u06ff"  # Arabic letters
        or c == "\u061f"  # Arabic question mark
        or c == "\u06d4"  # Arabic end of sentence
    )
    total = len(text.strip())
    if total == 0:
        return "ar"  # default to Arabic
    return "ar" if (arabic_chars / total) > 0.4 else "en"


def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences, respecting Arabic and English punctuation.

    This handles:
      - Arabic sentence endings:  ؟  .
      - English sentence endings:  . ! ? : ;
      - Quoted text
      - Multiple spaces/newlines
    """
    lang = detect_language(text)

    # Use a single pattern that matches all sentence-ending punctuation.
    # The lookbehind asserts we're after one of these chars, then splits
    # on following whitespace.
    if lang == "ar":
        # Arabic: split on ؟ and .
        pattern = r"(?<=[؟.])\s+"
    else:
        # English: split on . ! ? : ;
        pattern = r"(?<=[.!?;:])\s+"

    parts = re.split(pattern, text.strip())

    # Filter out empty parts and strip whitespace
    sentences = [s.strip() for s in parts if s.strip()]
    return sentences


def chunk_text(
    text: str,
    max_chars: int = MAX_CHUNK_CHARS,
    overlap_chars: int = CHUNK_OVERLAP_CHARS,
    strategy: str = "sentence",
) -> List[TextChunk]:
    """Split text into chunks suitable for XTTS-v2 synthesis.

    Args:
        text: Input text to chunk (Arabic or English).
        max_chars: Maximum characters per chunk (default 400).
        overlap_chars: Characters of overlap between chunks (default 10).
        strategy: "sentence" (split on sentence boundaries) or "fixed" (char limit).

    Returns:
        List of TextChunk objects ready for synthesis.

    Strategy details:
        - "sentence": Splits on sentence boundaries first. If any sentence
          exceeds max_chars, falls back to "fixed" splitting for that sentence.
          This preserves linguistic boundaries for best audio quality.
        - "fixed": Splits purely on character count with overlap.
          Use this only when sentence splitting produces poor results.

    Example:
        >>> chunks = chunk_text("مرحبا بك في لغةات. هذا نص طويل جداً...", max_chars=400)
        >>> for c in chunks:
        ...     print(c.text)
    """
    text = text.strip()
    if not text:
        return []

    if len(text) <= max_chars:
        return [TextChunk(index=0, text=text, is_last=True)]

    if strategy == "sentence":
        return _chunk_by_sentences(text, max_chars, overlap_chars)
    else:
        return _chunk_by_chars(text, max_chars, overlap_chars)


def _chunk_by_sentences(
    text: str, max_chars: int, overlap_chars: int
) -> List[TextChunk]:
    """Split text into chunks respecting sentence boundaries."""
    sentences = split_into_sentences(text)

    if not sentences:
        return [TextChunk(index=0, text=text, is_last=True)]

    chunks: List[TextChunk] = []
    current_chunk_parts: List[str] = []
    current_length = 0

    for i, sentence in enumerate(sentences):
        sentence_len = len(sentence)

        # If a single sentence exceeds max_chars, split it further
        if sentence_len > max_chars:
            # Flush current chunk first
            if current_chunk_parts:
                chunks.append(
                    TextChunk(
                        index=len(chunks),
                        text=" ".join(current_chunk_parts),
                        is_last=False,
                    )
                )
                current_chunk_parts = []
                current_length = 0

            # Split the long sentence into fixed-size pieces
            long_chunks = _chunk_by_chars(sentence, max_chars, 0)
            for j, lc in enumerate(long_chunks):
                chunks.append(
                    TextChunk(
                        index=len(chunks),
                        text=lc.text,
                        is_last=(j == len(long_chunks) - 1 and i == len(sentences) - 1),
                    )
                )
            continue

        # Try adding this sentence to the current chunk
        if current_length + sentence_len + 1 <= max_chars:
            current_chunk_parts.append(sentence)
            current_length += sentence_len + 1  # +1 for space
        else:
            # Flush current chunk
            if current_chunk_parts:
                chunks.append(
                    TextChunk(
                        index=len(chunks),
                        text=" ".join(current_chunk_parts),
                        is_last=False,
                    )
                )

            # Start new chunk with this sentence
            current_chunk_parts = [sentence]
            current_length = sentence_len

    # Flush remaining
    if current_chunk_parts:
        chunks.append(
            TextChunk(
                index=len(chunks),
                text=" ".join(current_chunk_parts),
                is_last=True,
            )
        )

    # Add overlap to all but the last chunk
    for i in range(len(chunks) - 1):
        if overlap_chars > 0 and len(chunks[i].text) >= overlap_chars:
            # Append overlap from next chunk to current chunk end
            overlap = chunks[i + 1].text[:overlap_chars]
            chunks[i].text = chunks[i].text.rstrip() + " " + overlap

    return chunks


def _chunk_by_chars(text: str, max_chars: int, overlap_chars: int) -> List[TextChunk]:
    """Split text into fixed-size chunks with optional overlap."""
    if len(text) <= max_chars:
        return [TextChunk(index=0, text=text, is_last=True)]

    chunks: List[TextChunk] = []
    start = 0

    while start < len(text):
        end = min(start + max_chars, len(text))

        # If not at the end, try to break at a word boundary
        if end < len(text):
            # Look backward for a space (word boundary)
            split_pos = text.rfind(" ", start, end)
            if split_pos > start + MIN_CHUNK_CHARS:
                end = split_pos + 1  # Include the word after the space

        chunk_text = text[start:end].strip()
        if chunk_text:
            is_last = end >= len(text)
            chunks.append(
                TextChunk(
                    index=len(chunks),
                    text=chunk_text,
                    is_last=is_last,
                )
            )

        # Advance with overlap
        if overlap_chars > 0 and not is_last:
            start = end - overlap_chars
        else:
            start = end

    return chunks


def merge_audio_files(file_paths: List[str], output_path: str) -> None:
    """Concatenate multiple WAV/MP3 files into a single output file.

    Uses ffmpeg to concatenate audio files seamlessly.

    Args:
        file_paths: List of audio file paths to concatenate.
        output_path: Output file path for the merged audio.
    """
    if not file_paths:
        return

    if len(file_paths) == 1:
        import shutil

        shutil.copy2(file_paths[0], output_path)
        return

    import subprocess

    # Build ffmpeg concat filter
    # Create a file list for ffmpeg's concat demuxer
    import tempfile

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        for path in file_paths:
            # FFmpeg concat demuxer requires single-quoted paths.
            # Paths with spaces, special chars, etc. must be quoted.
            f.write(f"file '{path}'\n")
        list_path = f.name

    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                list_path,
                "-b:a",
                "192k",
                output_path,
            ],
            check=True,
            capture_output=True,
        )
    finally:
        import os

        try:
            os.unlink(list_path)
        except OSError:
            pass


def merge_wav_files(file_paths: List[str], output_path: str) -> None:
    """Concatenate multiple WAV files into a single output file.

    Handles WAV header reconstruction since simple concatenation
    of WAV files produces invalid headers.

    Args:
        file_paths: List of WAV file paths to concatenate.
        output_path: Output WAV file path.
    """
    if not file_paths:
        return

    if len(file_paths) == 1:
        import shutil

        shutil.copy2(file_paths[0], output_path)
        return

    import wave

    # Read the first file to get format parameters
    with wave.open(file_paths[0], "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()

    # Concatenate all frames
    all_frames = b""
    for path in file_paths:
        with wave.open(path, "rb") as wf:
            all_frames += wf.readframes(wf.getnframes())

    # Write concatenated WAV
    with wave.open(output_path, "wb") as wf:
        wf.setnchannels(n_channels)
        wf.setsampwidth(sampwidth)
        wf.setframerate(framerate)
        wf.writeframes(all_frames)
