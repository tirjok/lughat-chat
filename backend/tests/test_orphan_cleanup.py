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
    """Verify that the generate_speech endpoint adds mp3_path and meta_path
    to the intermediate_files cleanup list, so the finally block cleans up
    orphaned MP3 and .json files on client disconnect.

    Regression for Issue #3: the finally block only tracked intermediate_files
    (the WAV), leaving MP3 and .json orphaned on disk.
    """
    # Read the actual source file directly
    app_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app.py"
    )
    with open(app_path) as f:
        source = f.read()

    # Verify that mp3_path is added to intermediate_files
    assert "intermediate_files.append(mp3_path)" in source, (
        "generate_speech must add mp3_path to intermediate_files "
        "so the finally block cleans up orphaned MP3 files on disconnect."
    )

    # Verify that meta_path is added to intermediate_files
    assert "intermediate_files.append(meta_path)" in source, (
        "generate_speech must add meta_path to intermediate_files "
        "so the finally block cleans up orphaned .json files on disconnect."
    )
