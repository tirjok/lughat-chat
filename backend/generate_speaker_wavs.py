#!/usr/bin/env python3
"""Generate reference speaker WAV files for XTTS-v2 voice cloning.

Run this after the TTS model is loaded to create reference audio files
for each voice preset (female/male).

Usage:
    python generate_speaker_wavs.py
"""

import os
import sys
import wave
import struct

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from TTS.api import TTS


def generate_speaker_wavs():
    """Generate speaker reference WAV files using XTTS-v2."""
    speaker_wav_dir = os.path.join(os.path.dirname(__file__), "speaker_wavs")
    os.makedirs(speaker_wav_dir, exist_ok=True)

    print("Loading XTTS-v2 model...")
    tts = TTS("tts_models/multilingual/xtts_v2")

    # Text samples for each voice (XTTS-v2 requires >= 0.33s reference audio)
    # Using longer text to ensure sufficient duration
    voice_samples = {
        "female": (
            "مرحبا، هذا نص لتوليد صوت أنثي. نريد أن يكون الصوت واضحاً وطبيعياً "
            "لأغراض تحويل النص إلى كلام. شكراً لزيارتكم."
        ),  # Arabic sample
        "male": (
            "Hello, this is a text to generate a male voice. We want the voice to be "
            "clear and natural for text-to-speech purposes. Thank you for visiting."
        ),  # English sample
    }

    for voice_name, text in voice_samples.items():
        output_path = os.path.join(speaker_wav_dir, f"{voice_name}.wav")

        if os.path.exists(output_path):
            print(f"Skipping {voice_name}.wav (already exists)")
            continue

        print(f"Generating {voice_name} reference audio...")
        tts.tts_to_file(
            text=text,
            file_path=output_path,
        )

        if os.path.exists(output_path):
            print(f"Created {output_path}")
        else:
            print(f"Failed to create {output_path}", file=sys.stderr)
            sys.exit(1)

    print("\nSpeaker WAV files generated successfully!")
    print(f"Files in: {speaker_wav_dir}")


def fallback_generate_silence():
    """Generate silent WAV files as a fallback if TTS is not available."""
    speaker_wav_dir = os.path.join(os.path.dirname(__file__), "speaker_wavs")
    os.makedirs(speaker_wav_dir, exist_ok=True)

    for voice_name in ["female", "male"]:
        output_path = os.path.join(speaker_wav_dir, f"{voice_name}.wav")

        if os.path.exists(output_path):
            print(f"Overwriting existing {voice_name}.wav")
            os.remove(output_path)

        print(f"Creating silent fallback: {voice_name}.wav")
        with wave.open(output_path, 'w') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(22050)  # XTTS default sample rate
            # Write 3 seconds of silence (enough for voice cloning)
            samples = b'\x00\x00' * 22050 * 3
            wav_file.writeframes(samples)

    print("Fallback silent WAV files created.")


if __name__ == "__main__":
    try:
        generate_speaker_wavs()
    except Exception as e:
        print(f"Failed to generate with TTS model: {e}", file=sys.stderr)
        print("Creating silent fallback files instead...", file=sys.stderr)
        fallback_generate_silence()
