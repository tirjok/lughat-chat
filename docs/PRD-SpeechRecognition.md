# PRD: Speech Recognition — Arabic STT for Homework Verification

**Implementation Phases:**
1. **Phase 1 (current): SILMA TTS replacement + cleanup** — Replace Coqui XTTS-v2 with SILMA (same `/api/generate` contract), remove stale empty directories (`tts/`, `storage/`, `learning/`, `content/`, `db/`, `frontend_source/`). No new endpoints, no frontend changes.
2. **Phase 2: Whisper STT** — Add `POST /api/transcribe`, recording UI, `useSpeechRecognition()` composable.
3. **Phase 3: LM Studio evaluation** — Add `POST /api/evaluate`, `usePronunciationFeedback()` composable, `PronunciationFeedback.vue`.
4. **Phase 4: Frontend speaking exercises** — `RecordingPad.vue`, lesson practice page, waveform visualization.

## Problem Statement

Lughat Chat converts text to speech (TTS) but cannot evaluate how well a student pronounces Arabic words. There is no way for a student to practice speaking — the app is a one-way broadcast (text → audio), not a two-way learning loop (speak → evaluate → improve). Students need to record themselves speaking Arabic, have it transcribed, and receive feedback on their pronunciation accuracy against the expected lesson text.

## Solution

Add a bidirectional speech pipeline to Lughat Chat: students record their voice speaking lesson text, the app transcribes it using Whisper (local, offline, CPU-friendly), and a local LLM (LM Studio) evaluates pronunciation accuracy and provides structured feedback. The pipeline is: **Record → Transcribe (Whisper) → Evaluate (LM Studio) → Feedback**. All processing is local — no cloud APIs, no network required after initial setup.

## User Stories

1. As a language learning student, I want to record myself speaking Arabic text so that I can practice pronunciation
2. As a student, I want to see my spoken words transcribed back to me so that I can compare what I said with what I was supposed to say
3. As a student, I want to see a pronunciation score for each speaking exercise so that I can track my improvement over time
4. As a student, I want specific feedback on which words or sounds I pronounced incorrectly so that I can focus my practice
5. As a student, I want the transcription to work offline after initial setup so that I can practice anywhere without internet
6. As a student, I want the app to handle undiacritized (haraqat-free) Arabic text in my speech so that I don't need to type diacritics
7. As a student, I want to compare my spoken text against the expected lesson text side by side so that I can see exactly what I got right and wrong
8. As a student, I want to re-record and retry a speaking exercise as many times as I want so that I can improve my score
9. As a student, I want the recording to work on my Mac (including Apple Silicon) without requiring any special hardware
10. As a student, I want the app to guide me through a speaking exercise — showing expected text, recording, then feedback — in a single smooth flow
11. As a student, I want my speaking progress (scores, retries, completed exercises) to be tracked alongside my reading progress
12. As a student, I want the transcription to handle both Modern Standard Arabic (MSA) and recognize when I'm speaking a dialect
13. As a student, I want the audio recording to be captured in WAV format for maximum transcription accuracy
14. As a student, I want to see a visual waveform of my recording so that I can monitor that I'm actually speaking
15. As a student, I want the feedback to be in Arabic so that my reading level isn't a barrier to understanding my pronunciation errors
16. As a student, I want the speaking exercises to be integrated into existing lessons (not a separate page) so that learning feels cohesive
17. As a student, I want the app to handle microphone permission prompts gracefully with clear Arabic instructions
18. As a student, I want the transcription to complete in a reasonable time (under 30 seconds) so that the exercise doesn't feel frustratingly slow
19. As a student, I want to be able to use the speaking feature on mobile devices (responsive recording UI)
20. As a student, I want the app to clearly distinguish between TTS (text-to-speech for listening practice) and STT (speech-to-text for speaking practice) so that the two features don't get confused

## Implementation Decisions

### Architecture: Four-Service Pipeline

The system consists of four services:

1. **Backend (Docker, FastAPI)** — Phase 1: Runs SILMA for TTS. Phase 2+: Adds Whisper for STT. Exposes `POST /api/generate` (SILMA), `POST /api/transcribe` (Whisper, Phase 2+), `POST /api/evaluate` (LM Studio, Phase 3+).

2. **Frontend (Docker, Nuxt SPA)** — Phase 1: No changes. Phase 2+: Adds recording UI (Web Audio API → WAV → POST to `/api/transcribe`), displays transcribed text vs expected text, shows LM Studio's evaluation results.

3. **LM Studio (Host machine, not in Docker)** — Phase 3+: Desktop application running on the user's Mac. Provides local LLM inference at `localhost:1234`. The Docker backend calls it via `host.docker.internal:1234`.

4. **Nginx (Docker)** — Existing reverse proxy. Routes `/api/transcribe` and `/api/evaluate` to backend. No changes needed for new endpoints.

### Technology Stack Decisions

- **TTS Engine (Phase 1)**: SILMA TTS (150M parameters, 2.6 GB model). Replaces Coqui XTTS-v2. MSA Arabic + English bilingual, handles undiacritized text via CATT Tashkeel, Apache 2.0 license.
- **STT Engine (Phase 2+)**: OpenAI Whisper base model (145 MB). Runs on CPU, handles Arabic well, natively handles undiacritized text. The "base" model is the right trade-off: 145 MB model, ~5-15s inference on CPU, good Arabic accuracy.
- **LLM Evaluation (Phase 3+)**: LM Studio (host desktop app). User chooses their model. The backend sends a structured prompt with expected + transcribed text and receives structured feedback (score, errors, suggestions).
- **Audio Format (Phase 1)**: MP3 for TTS output (existing). ffmpeg handles conversion.
- **Recording (Phase 2+)**: Web Audio API → MediaRecorder → WAV encoding → POST to backend.

### API Contract Changes

**New endpoints:**

- `POST /api/transcribe` — Phase 2+: Accepts WAV audio file (multipart/form-data), returns `{ transcribed_text: string }`
- `POST /api/evaluate` — Phase 3+: Accepts `{ expected_text: string, transcribed_text: string }`, returns `{ score: number, errors: string[], feedback: string }`

**Existing endpoints unchanged:**

- `POST /api/generate` — TTS (uses SILMA, Phase 1). API contract unchanged.
- `GET /health` — Health check (reports SILMA status, Phase 1; reports SILMA + Whisper status, Phase 2+)
- `GET /api/voices` — List voices (unchanged)
- `GET /api/history` — Generated audio history (unchanged)

### Docker Changes

- `requirements.txt` (Phase 1): Replace `coqui-tts[codec]` with `silma-tts`
- `Dockerfile` (Phase 1): Keep PyTorch CPU (already present), replace Coqui install with SILMA, keep ffmpeg
- `docker-compose.yml` (Phase 1): No changes. (Phase 3+: Add `LM_STUDIO_URL` env var pointing to `http://host.docker.internal:1234`)
- Model cache volume grows from ~2 GB to ~2.6 GB (SILMA only, Phase 1)
- Docker image grows from ~500 MB to ~700 MB (SILMA only, Phase 1)
- Load time: ~65s (SILMA only, Phase 1)

### Frontend New Composables

- `useSpeechRecognition()` — Phase 2+: Wraps Web Audio API for recording, encodes to WAV, POSTs to `/api/transcribe`
- `usePronunciationFeedback()` — Phase 3+: POSTs expected + transcribed text to `/api/evaluate`, processes LM Studio response
- Extend existing `useTtsApi()` — Phase 1: No changes. (Phase 2+: Add `transcribe()` method, Phase 3+: Add `evaluate()` method)

### Frontend New Pages/Components

- New page: `/dashboard/level/[level]/[lesson]/practice` — Phase 4: Speaking exercise page
- New component: `RecordingPad.vue` — Phase 4: Record button, waveform visualization, recording timer
- New component: `PronunciationFeedback.vue` — Phase 3+: Score display, error highlighting, retry button
- Extend existing lesson page with a "Practice" tab — Phase 4: alongside Dialogue, Vocabulary, Grammar, Activities

### Integration with Existing System

- The speaking exercise integrates into existing lesson structure (JSON-based lesson content)
- Each lesson section (Dialogue, Vocabulary, Grammar, Activities) can have an optional `speaking_text` field
- Speaking progress stored in existing SQLite progress tracking alongside reading progress
- Existing `speaker_wavs/` directory is NOT used for STT (different purpose — STT records the student, not pre-recorded voices)
- Existing `downloads/` directory stores TTS output (Phase 1). STT output is transient (transcribed text, not saved, Phase 2+)

### LM Studio Integration

- LM Studio runs on the host Mac, not in Docker
- Backend calls LM Studio via `host.docker.internal:1234` (Docker's built-in DNS for host)
- The prompt is structured: `{ expected_text, transcribed_text, language: 'ar' }` → `{ score, errors, feedback }`
- LM Studio model choice is up to the user — the backend doesn't manage LLM models
- If LM Studio is not available, the `/api/evaluate` endpoint falls back to simple text comparison without LLM evaluation

## Testing Decisions

### What makes a good test

- Test external behavior only (inputs → outputs), not implementation details
- Backend: Test API endpoints with mocked TTS/STT models, verify request/response schemas
- Frontend: Test composable logic (recording state, transcription flow) in isolation
- Integration: Verify Docker Compose stack starts and services communicate

### Modules to test

1. **TTS Replacement (Phase 1)**: `POST /api/generate` with SILMA — Integration tests: same API contract, SILMA produces valid MP3
2. **STT Endpoint (Phase 2)**: `POST /api/transcribe` — Unit tests: verify WAV input → text output, error handling for invalid audio, 503 when model not loaded
3. **Evaluate Endpoint (Phase 3)**: `POST /api/evaluate` — Unit tests: verify expected + transcribed text → structured feedback, LM Studio unavailability fallback
4. **Recording Composable (Phase 2)**: `useSpeechRecognition()` — Unit tests: Web Audio API recording, WAV encoding, POST to `/api/transcribe`
5. **Feedback Composable (Phase 3)**: `usePronunciationFeedback()` — Unit tests: POST to `/api/evaluate`, parse structured response
6. **RecordingPad Component (Phase 4)**: Component tests: record button, waveform visualization, recording timer
7. **PronunciationFeedback Component (Phase 3)**: Component tests: score display, error highlighting, retry flow
8. **Lesson Practice Page (Phase 4)**: Component tests: full speaking exercise flow (show expected → record → transcribe → evaluate → display feedback)

### Prior art

- Existing `test_generate.py` — Updated (Phase 1): Mock TTS model → SILMA mock
- Existing `test_generate_blob.py` — Updated (Phase 1): Same API contract with SILMA
- Existing composables (`useTtsApi.ts`, `useAudioModule.ts`) — Pure functions with clear interfaces — easy to unit test
- Existing component tests (`GenerateButton.test.ts`, `StickyAudioBar.test.ts`) — Follow Vue Test Utils patterns — extend for new components
- Existing `useTtsApi.test.ts` — Extended (Phase 1): No new methods needed yet. (Phase 2+: Add `transcribe()` method, Phase 3+: Add `evaluate()` method)

### New test files needed

- `backend/tests/test_generate.py` — Updated (Phase 1): Existing mock TTS model → SILMA mock
- `backend/tests/test_generate_blob.py` — Updated (Phase 1): Same API contract with SILMA
- `frontend/tests/composables/useTtsApi.test.ts` — Extended (Phase 1): No new methods needed yet. (Phase 2+: Add `transcribe()` method, Phase 3+: Add `evaluate()` method)
- `frontend/tests/composables/useAudioModule.test.ts` — No changes (Phase 1)
- `backend/tests/test_transcribe.py` — New (Phase 2): Whisper STT endpoint tests
- `backend/tests/test_evaluate.py` — New (Phase 3): LM Studio evaluation endpoint tests
- `frontend/tests/composables/useSpeechRecognition.test.ts` — New (Phase 2): Recording composable tests
- `frontend/tests/composables/usePronunciationFeedback.test.ts` — New (Phase 3): Feedback composable tests
- `frontend/tests/components/RecordingPad.test.ts` — New (Phase 4): Recording UI component tests
- `frontend/tests/components/PronunciationFeedback.test.ts` — New (Phase 3): Feedback display component tests

## Out of Scope
- Real-time streaming transcription (transcribes full recording, then returns)
- Cloud-based STT or LLM (all processing is local)
- Voice cloning for STT (not relevant — STT transcribes the student, not clones a voice)
- Live pronunciation coaching (feedback is post-recording, not real-time)
- Audio format conversion beyond WAV (input) and MP3 (TTS output)
- Batch transcription (single recording at a time)
- Integration with external learning management systems (LMS)

## Further Notes

### Tracking PRD Changes

This PRD replaces the existing `docs/PRD.md`. Future changes to requirements should:

1. Update `docs/PRD.md` directly (never create separate PRD files)
2. Add a `## Changelog` section at the bottom tracking: date, change, rationale
3. Reference any ADRs that record the trade-off decisions (e.g., "Why Whisper base over large-v3")
4. Cross-reference with `CONTEXT.md` glossary entries (add new terms like "Speech Recognition", "Transcription", "Pronunciation Score")

### Migration Path from Current State

The current system has:

- Coqui XTTS-v2 (TTS only)
- `POST /api/generate` (text → MP3)
- No recording or transcription capability
- No speaking exercises in lessons

The migration is:

1. **Phase 1 (current): Replace Coqui with SILMA** (same API contract for `/api/generate`) — See Phase 1 note above.
2. **Phase 2: Add Whisper STT** (`POST /api/transcribe`)
3. **Phase 3: Add LM Studio evaluation** (`POST /api/evaluate`)
4. **Phase 4: Add recording UI** (frontend)
5. **Phase 5: Add speaking exercises** to lesson structure

Each step is backward-compatible — existing TTS functionality continues to work.

### Resource Impact Summary

| Before (Phase 1) | After (Phase 1) | After (Full) |
|---|---|---|
| Model cache: ~2 GB (XTTS) | Model cache: ~2.6 GB (SILMA) | Model cache: ~4.3 GB (SILMA + Whisper) |
| Docker image: ~500 MB | Docker image: ~700 MB | Docker image: ~900 MB |
| Load time: ~120s | Load time: ~65s (SILMA only) | Load time: ~95s (SILMA + Whisper) |
| RAM: 8-16 GB | RAM: 8-16 GB (Docker) | RAM: 10-16 GB (Docker) + 2-4 GB (LM Studio on host) |
| No STT | No STT (Phase 1) | Whisper base: 5-15s inference on CPU |
| No LLM evaluation | No LLM evaluation (Phase 1) | LM Studio: ~2-10s per evaluation on host GPU |

### Known Technical Risks

1. **SILMA dependency footprint**: 15+ PyTorch-related packages make Docker builds slow. Mitigation: consider running SILMA as a separate Docker container (SILMA ships with a FastAPI server). — **Applies to Phase 1**
2. **Whisper on Apple Silicon Docker**: Whisper runs inside Docker Linux emulation on macOS. Inference is slower than native but functional. — **Phase 2+**
3. **LM Studio availability**: If LM Studio is not installed or not running, `/api/evaluate` falls back to simple text comparison without LLM evaluation. — **Phase 3+**
4. **Memory pressure**: Running SILMA (~2.6 GB) + Docker overhead approaches 8-16 GB on M-series Macs. Adding Whisper + LM Studio (Phases 2-4) may approach 16 GB on 16 GB Macs.
