# PRD — AI Smart Tools for Lughat Chat

**Status:** Ready for Agent
**Labels:** `feature`, `ai-tools`, `ready-for-agent`
**Created:** 2026-06-20

---

## Problem Statement

Arabic text-to-speech tools exist, but they produce poor-quality audio because Arabic is an abjad script — without vowel marks (diacritics/harakat), the same consonant string can represent multiple words with different meanings. Users must manually write perfectly diacritized text, which requires expertise they may not have. Additionally, non-Arabic speakers who want to produce Arabic audio have no single tool that handles translation + TTS in one workflow.

The result: users either accept robotic-sounding audio, or they spend significant effort manually fixing text before generation. There is no tool that combines **translation**, **diacritization**, and **TTS** into a single, seamless pipeline.

## Solution

Add three AI-powered tools to Lughat Chat that sit **between text input and TTS generation**, forming a preprocessing pipeline:

1. **Translate** — Convert text from any supported language into Arabic before TTS
2. **Add Diacritics** — Apply proper Arabic vowel marks (harakat) to undiacritized text
3. **Continue Script** — AI-assisted text completion for longer-form content

These tools are wired into the existing "AI Smart Tools" toolbar buttons (currently placeholders) and operate as **in-place text transformations** on the textarea content, with undo support and loading states.

The pipeline is: **User writes text → AI transforms (translate/diacritize) → TTS generates audio**. Each tool is independently triggerable, composable, and reversible.

## User Stories

1. As a non-Arabic content creator, I want to write text in English (or any language) and have it automatically translated to Arabic before TTS, so that I can produce Arabic audio without knowing Arabic.

2. As an Arabic speaker who writes informally (without diacritics), I want the app to automatically add proper diacritics to my text before TTS, so that the generated speech sounds natural and correct.

3. As an Arabic language teacher, I want to write lesson text without diacritics and have them added automatically, so that my students hear properly pronounced audio.

4. As a podcast producer, I want to write a script in English, translate it to Arabic, add diacritics, and generate speech — all in one click — so that I don't need to juggle multiple tools.

5. As a user who accidentally triggers a translation or diacritization, I want to undo the change and return to my original text, so that I'm not stuck with an unwanted transformation.

6. As a user who wants to write a longer script, I want the app to suggest the next few sentences in the same style and language, so that I can draft content faster.

7. As a user, I want to see a loading indicator while an AI tool is processing, so that I know the app is working and don't click multiple times.

8. As a user, I want the AI tools to transform only the text in the textarea (not trigger TTS), so that I can review and edit the result before generating audio.

9. As a user, I want to chain AI tools together (e.g., translate first, then add diacritics), so that the final text is as accurate as possible before TTS.

10. As a user on mobile, I want the AI tools to be accessible from the compact toolbar, so that I can use them on small screens without losing screen real estate.

11. As a user, I want the AI tools to work with the same voice, speed, and speaker settings I've already configured, so that the transformation doesn't reset my TTS preferences.

12. As a user, I want error messages to explain why a tool failed (e.g., "Translation service unavailable" or "Text too long for diacritization"), so that I can decide whether to retry or proceed without the tool.

13. As a developer, I want the AI tools to be implemented as backend API endpoints with the same error handling patterns as the existing TTS endpoints, so that the codebase remains consistent.

14. As a user, I want the character limit (3000 characters) to apply to the final text after AI transformations, so that I'm aware if a translation makes my text too long for TTS.

15. As a user, I want the AI tools to be visually distinct from the "Generate Speech" button, so that I don't accidentally trigger TTS when I meant to transform text.

## Implementation Decisions

### Architecture

The three AI tools form a **preprocessing pipeline** that sits between the textarea and the TTS generation endpoint. The pipeline is:

```
User writes text → [Translate?] → [Diacritize?] → [Continue Script?] → TTS Generate
```

Each tool is **optional and independently triggerable**. They can be chained in any order. The pipeline does NOT run automatically — the user explicitly clicks a tool button to trigger it.

### Backend API Endpoints

Three new endpoints are added to the existing FastAPI backend:

**`POST /api/translate`**
- Request: `{ text: string, source_lang: string }`
- Response: `{ translated_text: string, source_lang: string, target_lang: "ar" }`
- Uses `facebook/nllb-200-distilled-600M` via `transformers` library
- `source_lang` defaults to `"eng_Latn"` (English) if not specified
- Returns 400 if text exceeds 3000 characters (same as TTS limit)
- Returns 503 if the translation model is not loaded

**`POST /api/diacritize`**
- Request: `{ text: string }`
- Response: `{ diacritized_text: string }`
- Uses an Arabic diacritization model via `transformers` library (e.g., `alqalam` or `aya-diacritize`)
- Returns 400 if text exceeds 3000 characters
- Returns 503 if the diacritization model is not loaded
- Text is passed through unchanged if no diacritization is needed (e.g., already fully diacritized)

**`POST /api/continue-script`**
- Request: `{ text: string, language: "ar" | "en" }`
- Response: `{ continuation: string }`
- Uses a lightweight Arabic text generation model via `transformers` library
- Returns 400 if text exceeds 2000 characters (lower limit — continuation is short)
- Returns 503 if the script model is not loaded
- The continuation is appended to the existing text (not a replacement)

### Backend Dependencies

Add to `backend/requirements.txt`:
```
transformers>=4.40.0
accelerate>=0.28.0
```

Models are loaded during backend startup (in the existing `lifespan` function), alongside the TTS model. Three model instances are managed: `translation_model`, `diacritization_model`, `script_model`.

### Frontend API Composable

A new composable `useAiTools.ts` is created in `app/composables/` with three methods:

```typescript
interface UseAiToolsReturn {
  translate(text: string, sourceLang?: string): Promise<string>
  diacritize(text: string): Promise<string>
  continueScript(text: string, language: string): Promise<string>
  isProcessing: Ref<boolean>
  activeTool: Ref<string | null>  // 'translate' | 'diacritize' | 'continueScript' | null
}
```

This composable is imported by `app/pages/index.vue` and wired to the existing toolbar buttons.

### Frontend UI Changes

The existing "AI Smart Tools" toolbar (three buttons: Translate, Add Diacritics, Continue Script) is activated. These buttons:

- Are visible on both mobile and desktop (currently hidden on mobile)
- Show a loading spinner + label when processing (e.g., "Translating...")
- Replace the textarea content in-place when the tool completes
- Are disabled while any AI tool is processing or while TTS is generating
- Are visually distinct from the "Generate Speech" button (smaller, outlined, with ✨ icon)

### Textarea State Management

The textarea content is the single source of truth. AI tools read from and write to `textInput` (the existing `shallowRef<string>`). No new state is needed for the transformed text — it lives in the textarea.

### Undo Support

A single "Undo last AI transformation" action is provided:
- A small "↩ Undo" button appears in the toolbar after any AI tool completes
- It reverts the textarea to the content before the last AI tool was applied
- Only the most recent transformation is tracked (single-level undo)
- Undo is disabled during TTS generation

### Error Handling

- All AI tool errors are shown via the existing `showToast()` system
- Error types: `"error"` (tool failed), `"info"` (tool skipped, e.g., text already diacritized)
- Errors do NOT block TTS — users can generate speech even if an AI tool failed
- Error messages are user-facing (not technical model names)

### Character Limit

The 3000-character limit applies to the **final text** (after all AI transformations). If a translation makes the text exceed 3000 characters, the user is warned but can still generate TTS (the backend will reject it with a 400 error).

### Model Loading

All three AI models are loaded during backend startup, alongside the existing TTS model. The `/health` endpoint is extended to report the status of each model:

```json
{
  "status": "ready",
  "model_loaded": true,
  "translation_model": "loaded" | "loading" | "error",
  "diacritization_model": "loaded" | "loading" | "error",
  "script_model": "loaded" | "loading" | "error"
}
```

### Docker / Infrastructure

- Additional disk space: ~2-4GB for AI models (translation + diacritization)
- Additional RAM: ~2-4GB for AI model inference
- Startup time increases by ~60-120 seconds (loading 3 additional models)
- No new Docker volumes needed (models cached in `tts-model-cache`)

## Testing Decisions

### Backend Testing

New pytest tests in `backend/tests/`:
- `test_translate.py` — Tests `/api/translate` endpoint (success, error, model not loaded)
- `test_diacritize.py` — Tests `/api/diacritize` endpoint (success, error, model not loaded)
- `test_continue_script.py` — Tests `/api/continue-script` endpoint (success, error, model not loaded)
- `test_health_extended.py` — Tests extended `/health` response with AI model statuses

Tests follow the existing pattern: mock the `transformers` library, test request/response contracts, test error handling.

### Frontend Testing

New Vitest tests in `frontend/tests/`:
- `useAiTools.test.ts` — Tests the new composable (API calls, loading states, error handling)
- `AiToolsIntegration.test.ts` — Tests toolbar button interactions (click → loading → content update → undo)

Existing test patterns to follow:
- `useTtsApi.test.ts` — API composable testing (fetch mocking, error handling)
- `useVoices.test.ts` — State management testing (refs, computed)
- `mocks.ts` — Reuse `createMockUseTtsApi` pattern for AI tools

### Integration Testing

- The full pipeline (textarea → AI tool → textarea → TTS) is tested in `index.test.ts`
- Test that AI tools do NOT trigger TTS automatically
- Test that AI tools can be chained (translate → diacritize → TTS)

## Out of Scope

- **Real-time translation** — Tools are triggered by explicit button clicks, not on every keystroke
- **Multi-language TTS** — Only Arabic output is supported (existing behavior)
- **Model fine-tuning** — Pre-trained models are used as-is
- **User accounts / saved scripts** — No persistence of AI-transformed scripts
- **Batch processing** — One text at a time
- **Streaming responses** — All AI tools return complete results (no streaming)
- **Custom model uploads** — Users cannot upload their own AI models
- **API rate limiting** — No rate limits on AI tools (single-user deployment)

## Further Notes

### Why Translate + Diacritize First, Continue Script Later?

The Translate and Diacritize tools are lightweight (~2GB combined), fast (2-5 seconds), and solve the #1 quality problem for Arabic TTS. "Continue Script" is heavier (~1-26GB depending on model), slower (5-30 seconds), and has less proven value. It should be implemented as a third phase after Translate and Diacritize are working.

### Model Selection Rationale

- **Translation:** `facebook/nllb-200-distilled-600M` — smallest NLLB model, supports 200+ languages including Arabic dialects, runs on CPU
- **Diacritization:** `alqalam` family models — specifically trained for Arabic text normalization, good quality for general text
- **Script completion:** Deferred — no model selected yet; will be evaluated based on user feedback

### Backward Compatibility

All changes are additive. The existing `/api/generate`, `/health`, `/api/voices`, and `/api/history` endpoints are unchanged. Existing frontend behavior (text input → TTS) continues to work without AI tools.

### Performance Considerations

- AI models are loaded once at startup (not per-request)
- Inference runs on CPU; expect 2-30 seconds per tool depending on text length and model
- The existing 120-second model load time increases to ~180-300 seconds
- RAM usage increases from ~4GB to ~6-10GB
