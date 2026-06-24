# PRD: Unlimited Text Support via Sentence Splitting

## Problem Statement

Users can only enter up to 3000 characters of Arabic text because the backend uses `tts_to_file()` without `enable_text_splitting`. The XTTS-v2 model has a hard 400-token limit per inference, and without sentence splitting, any text beyond the model's context window gets truncated or produces garbled audio. This makes the app unusable for anything longer than a short paragraph — no audiobooks, no long scripts, no educational content.

## Solution

Enable `enable_text_splitting=True` on the `tts_to_file()` call in the `/api/generate` endpoint. This instructs Coqui TTS to automatically split long text into sentences, generate audio for each sentence separately, and concatenate the results into a single MP3 file. The frontend 3000-character limit is removed (or raised significantly), and a "Generating audio..." progress indicator is shown during the longer generation time.

## User Stories

1. As a user, I want to paste or type text longer than 3000 characters so that I can generate audio from full articles, scripts, or stories
2. As a user, I want the app to automatically split long text into sentences and generate audio for each so that I don't have to manually chunk my text
3. As a user, I want to see a "Generating audio..." progress indicator during synthesis so that I know the app is working (since longer text takes longer)
4. As a user, I want a single MP3 file returned even when the text is split into multiple sentences so that I can play or download the complete audio without managing multiple files
5. As a user, I want the audio to flow naturally between sentence boundaries so that the concatenation is not jarring
6. As a user, I want the character limit removed (or raised to 10,000+) so that I'm not blocked from using longer content
7. As an Arabic language teacher, I want to paste an entire lesson script and get one audio file so that I can produce learning materials efficiently
8. As a content creator, I want to generate audio from a full blog post or article so that I can produce podcast-style content without manual chunking
9. As a user, I want the generation to still respect voice, speed, and pitch settings across all sentences so that the output is consistent
10. As a user with slow hardware, I want to understand that longer text will take proportionally longer to generate so that I can plan accordingly

## Implementation Decisions

### Backend: `enable_text_splitting` on `tts_to_file()`

The `/api/generate` endpoint currently calls:

```python
tts_model.tts_to_file(
    text=request.text,
    speaker_wav=speaker_wav,
    language=request.language,
    file_path=wav_path,
    temperature=0.4,
)
```

This is changed to:

```python
tts_model.tts_to_file(
    text=request.text,
    speaker_wav=speaker_wav,
    language=request.language,
    file_path=wav_path,
    temperature=0.4,
    enable_text_splitting=True,
)
```

`enable_text_splitting=True` is the single parameter that enables sentence-level splitting. Coqui TTS handles:
- Splitting text into sentences using language-aware sentence boundary detection
- Running inference on each sentence independently
- Concatenating the resulting WAV files
- The same `file_path` receives the final concatenated output

No changes to the API contract are needed — the endpoint still returns a single MP3 `FileResponse`.

### Frontend: Remove 3000-character hard limit

The `SynthesisRequest` model in `app.py` has `max_length=3000` on the `text` field. This is raised to a much higher value (e.g., 10,000 or removed entirely, letting the backend handle it).

The frontend `useInputValidation` composable currently has no length check — the 3000-character limit is enforced purely by the Pydantic model on the backend. The frontend character counter (displaying `{{ charCount }} / 3000`) should be updated to reflect the new limit.

### Frontend: Progress indicator during generation

When `enable_text_splitting=True`, generation time scales with text length. The existing `isGenerating` state and `GenerateButton` loading state already handle this, but the user experience should be improved:

- The button shows "Generating audio..." with a spinner (already implemented)
- Consider adding an estimated time indicator based on text length (e.g., "≈ 15s" for ~5000 characters) — this is a nice-to-have, not required for v1

### No changes to API contract

The `/api/generate` endpoint still:
- Accepts the same `SynthesisRequest` fields (text, language, speaker, speed, pitch, seed)
- Returns the same `audio/mpeg` binary response
- Returns the same error codes (400, 422, 503, 500)

The only behavioral change is that longer text now works instead of being rejected.

### Seed determinism is preserved

The existing `torch.manual_seed(seed)` call before `tts_to_file()` remains unchanged. With sentence splitting, each sentence is generated independently, so the seed applies to the first sentence. This is acceptable — full determinism across sentence boundaries is not guaranteed by Coqui TTS, but the existing behavior (seed defaults to 42) is preserved.

## Testing Decisions

### Backend tests (pytest, highest seam: HTTP endpoint)

**New test file: `backend/tests/test_generate_long_text.py`**

Tests at the HTTP endpoint level (highest seam, matching existing `test_generate.py` pattern):

1. **Long text (>3000 chars) returns 200 with audio/mpeg** — The existing test `test_generate_speech_rejects_text_too_long` sends 3001 characters and expects 422. This test must be updated to expect 200 instead (or removed), and a new test sends 5000+ characters and verifies a successful MP3 response.

2. **Very long text (10,000+ chars) returns valid MP3** — Sends 10,000 characters of Arabic text and verifies the response is a valid MP3 blob with non-zero length.

3. **Multi-sentence text produces coherent audio** — Sends text with multiple Arabic sentences (periods, question marks, exclamation points) and verifies the response is a single MP3 file (not an error).

4. **Speed and pitch settings apply to the full output** — Sends long text with custom speed/pitch and verifies the returned audio respects those settings (same as existing `test_generate_speech_returns_valid_response_on_success` but with longer text).

**Existing test to update:**
- `test_generate_speech_rejects_text_too_long` — This test will fail after the change (3001 chars will no longer be rejected). It should be removed or changed to verify that text *up to the new limit* is accepted.

**Mock considerations:**
The existing `_mock_tts_model()` creates a mock `tts_to_file()` that writes a 0.1-second WAV file. This mock does NOT pass `enable_text_splitting` as a parameter. The mock needs to accept and ignore the new kwarg (or explicitly accept it). Since Python's `**kwargs` or explicit parameter acceptance handles this, the mock should be updated to accept `enable_text_splitting` as an optional keyword argument.

### Frontend tests (Vitest, highest seam: component behavior)

**Updated test: `frontend/tests/useInputValidation.test.ts`**

No functional change needed — `useInputValidation` doesn't currently enforce a character count. The character counter display in `index.vue` (showing `{{ charCount }} / 3000`) is a visual element, not a validation rule. If the new limit is 10,000, the display string changes but the validation logic is unchanged.

**New component test (optional, nice-to-have):**

If a progress indicator component is added (showing estimated time based on text length), it would be tested in `frontend/tests/` following the existing component test pattern (jsdom environment, mocked API calls).

### Integration test (end-to-end, lowest priority)

If the CI pipeline supports it, an integration test could send a 5000-character Arabic text to the `/api/generate` endpoint (via `TestClient`) and verify:
- Status code is 200
- Content-Type is `audio/mpeg`
- Response body is non-empty

This follows the existing `test_generate_speech_returns_valid_response_on_success` pattern.

## Out of Scope

- **Real-time streaming** — The app generates the full audio file before returning it. Streaming audio sentence-by-sentence as it's generated is a future enhancement.
- **AI Smart Tools** — The "Translate," "Add Diacritics," and "Continue Script" buttons are still placeholders. This PRD does not implement them.
- **Audio quality tuning per sentence** — No per-sentence temperature or parameter tuning. The same `temperature=0.4` applies to all sentences.
- **Chunk metadata** — The app does not store or expose information about how many sentences were in the original text or where sentence boundaries fell.
- **Cancellation** — There is no way to cancel an in-progress generation. This is a known limitation that is not addressed.
- **WebSocket or SSE for progress** — No real-time progress updates during generation. The user sees "Generating audio..." until the full file is ready.

## Further Notes

### Why `enable_text_splitting` and not manual chunking?

Manual chunking on the frontend or backend would require:
- Sentence boundary detection (Arabic-aware)
- Managing multiple API calls
- Concatenating audio blobs client-side or server-side
- Handling edge cases (abbreviations, ellipses, quotes with periods)

`enable_text_splitting=True` does all of this internally in Coqui TTS. It uses language-aware sentence splitting, handles Arabic punctuation, and concatenates the audio. This is a one-line change with zero new code.

### Performance implications

With `enable_text_splitting=True`:
- A 500-character text might take ~5 seconds (same as before)
- A 5000-character text might take ~30–60 seconds (5–12 sentences × ~5s each)
- A 10,000-character text might take ~60–120 seconds

This is inherent to CPU-only XTTS-v2 inference. The user experience must communicate this clearly. The existing `isGenerating` state and loading spinner are sufficient for v1.

### Arabic sentence boundary detection

Arabic uses the same period character (`.`) as English, but also uses Arabic question marks (`؟`) and other punctuation. Coqui TTS's sentence splitter handles Arabic natively, so no custom logic is needed.

### Backward compatibility

Existing clients sending ≤3000 characters will continue to work exactly as before. The only change is that longer text is now accepted. No API contract changes means no breaking changes for existing integrations.
