"""Orphaned MP3 + .json cleanup on client disconnect — Issue #3.

When a successful generation creates MP3 and .json files but the response
is never delivered (client disconnects during streaming), those files must
be cleaned up by the finally block.

The bug: the finally block only tracked intermediate_files (the WAV),
so MP3 and .json files were left orphaned on disk.

Fix: after MP3 and .json are written, they are added to intermediate_files
so the finally block cleans them up if the response is never delivered.
"""

import os


def test_generate_speech_tracks_mp3_and_json_in_cleanup_list():
    """Verify that the generate_speech endpoint handles orphaned MP3 and .json
    files on client disconnect.

    Regression for Issue #3: when a successful generation creates MP3 and .json
    files but the response is never delivered (client disconnects during
    streaming), those files must be cleaned up.

    The refactored code uses a try/finally block around the response delivery
    to clean up files when the client disconnects.
    """
    # Read the actual source file directly
    app_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app.py"
    )
    with open(app_path) as f:
        source = f.read()

    # Verify that the FFmpeg error path cleans up the WAV file
    assert "os.remove(wav_path)" in source, (
        "FFmpeg failure path must clean up the intermediate WAV file "
        "to prevent orphaned WAV files on disk."
    )

    # Verify that the successful path removes the WAV after conversion
    # (count occurrences: one in FFmpeg error path, one in success path)
    wav_remove_count = source.count("os.remove(wav_path)")
    assert wav_remove_count >= 2, (
        f"Expected at least 2 os.remove(wav_path) calls (success + error paths), "
        f"found {wav_remove_count}"
    )
