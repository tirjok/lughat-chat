# ADR-003: Speech Recognition and Pronunciation Scoring

## Status

**Accepted** — 2026-07-10

This ADR addresses the question raised in ADR-001: *If we add pronunciation scoring, does the TTS module need to split into "synthesis" and "recognition" sub-modules?* It evaluates speech recognition options, scoring strategies, and architectural integration with the existing TTS module.

---

## Context

The current platform generates speech from text (TTS = Text-to-Speech). The PRD explicitly states: *"No speech recognition — Pronunciation scoring is out of scope for MVP."*

However, pronunciation scoring is a natural extension of a language learning platform. The question is **how** to add it and **when** it becomes necessary.

### What Pronunciation Scoring Would Do

| Feature | Description |
|---------|-------------|
| **Speech-to-text** | Learner speaks Arabic text → system transcribes it |
| **Pronunciation scoring** | Compare learner's pronunciation against a reference (TTS-generated or native speaker) |
| **Phoneme-level feedback** | Identify specific sounds that were mispronounced |
| **Confidence score** | 0.0–1.0 score for overall pronunciation accuracy |
| **Visual feedback** | Highlight correctly/incorrectly pronounced words in the lesson text |

### Constraints (Inherited from ADR-001)

| Constraint | Implication |
|-----------|-------------|
| **CPU-only inference** | Speech recognition models are computationally heavy (often GPU-recommended) |
| **~2GB TTS model** — Already resource-heavy | Cannot add another ~2GB speech recognition model |
| **Local Docker Compose only** | No cloud STT (Speech-to-Text) APIs |
| **Arabic language** | Arabic STT models are less mature than English |
| **Solo developer** | Must minimize model management, training, and evaluation complexity |

### What We Know About Arabic STT

| Model | Size | Arabic Support | GPU Required | License |
|-------|------|---------------|--------------|---------|
| **Whisper (openai)** | ~1.5GB (small) to 3GB (large) | Good (multilingual) | Recommended but runs on CPU | MIT |
| **Mozilla DeepSpeech** | ~1GB | Moderate | Yes (GPU) | MPL 2.0 |
| **Kaldi + Arabic LM** | ~500MB + LM | Good | Yes (GPU) | Apache 2.0 |
| **Cloud APIs** (Google, Azure, AWS) | N/A | Excellent | N/A | Paid per minute |

**Whisper is the clear candidate** for a local, CPU-only deployment. It runs on CPU (slowly but functional), has good Arabic support, is MIT-licensed, and is a single model download (~1.5GB for "small" model).

---

## Decision

We evaluate three options for adding pronunciation scoring.

---

### Option A: Keep TTS-Only (Current) — No Speech Recognition

Maintain the current design. No speech recognition, no pronunciation scoring.

---

### Option B: Add Whisper STT as a Separate Module

Add speech recognition as a **separate module** within the modular monolith. The TTS module and STT module coexist in the same process but have no shared state.

```
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI) — Modular Monolith                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ Content    │ │ Progress   │ │  TTS       │              │
│  │ Module     │ │ Module     │ │ Module     │              │
│  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘              │
│         │               │               │                    │
│         │               │         ┌─────┴─────┐             │
│         │               │         │  STT      │  ← NEW     │
│         │               │         │  Module   │             │
│         │               │         └─────┬─────┘             │
│         │               │               │                    │
│         │               │         ┌─────┴─────┐             │
│         │               │         │ Whisper   │  ← NEW     │
│         │               │         │ (model)   │             │
│         │               │         └───────────┘             │
│         ▼               ▼               ▼                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ SQLite     │ │ SQLite     │ │ XTTS-v2   │              │
│  │            │ │            │ │ + Whisper  │              │
│  └────────────┘ └────────────┘ └────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

**Module structure:**

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| **TTS** | Synthesize speech from text (XTTS-v2) | None |
| **STT** (NEW) | Transcribe speech to text (Whisper) | None |
| **Content** | Serve lessons, sections, activities | None |
| **Progress** | Track user progress, activity scores | Content |
| **API** | Expose HTTP endpoints | All modules |

**API endpoint (new):**

```
POST /api/pronounce
  Body: { audio_data: bytes, expected_text: str, language: 'ar' | 'en' }
  Response: { transcription: str, confidence: float, score: float }
```

**Memory footprint:**
- Current: ~500MB (FastAPI + XTTS-v2)
- With STT: ~500MB + ~1.5GB (Whisper small) = ~2GB total

---

### Option C: Cloud STT API

Use a cloud-based Speech-to-Text API (Google Cloud Speech-to-Text, Azure Speech, AWS Transcribe) for pronunciation scoring. The local system remains TTS-only; pronunciation scoring happens in the cloud.

```
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ Content    │ │ Progress   │ │  TTS       │              │
│  │ Module     │ │ Module     │ │ Module     │              │
│  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘              │
│         │               │               │                    │
│         │               │         ┌─────┴─────┐             │
│         │               │         │  Cloud    │  ← NEW     │
│         │               │         │  STT API  │             │
│         │               │         └─────┬─────┘             │
│         ▼               ▼               ▼                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ SQLite     │ │ SQLite     │ │ XTTS-v2   │              │
│  └────────────┘ └────────────┘ └────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

### Option D: Hybrid Approach (Local TTS + Cloud STT)

Keep TTS local (XTTS-v2) but use cloud STT for pronunciation scoring. This balances the ~1.5GB local model cost with cloud API pricing.

---

## Trade-off Analysis

| Concern | A: TTS-Only | B: Local STT (Whisper) | C: Cloud STT | D: Hybrid |
|---------|------------|----------------------|-------------|-----------|
| **Setup complexity** | ✅ None | ❌ Add Whisper model (~1.5GB) | ❌ API key management, rate limits | ⚠️ Both |
| **Resource usage** | ✅ ~500MB | ❌ ~2GB (TTS + STT) | ✅ ~500MB | ✅ ~500MB |
| **Offline capability** | ✅ Full | ✅ Full | ❌ Requires internet | ⚠️ Partial (STT needs internet) |
| **Pronunciation quality** | N/A | ⚠️ Good but not phoneme-level | ✅ Excellent (commercial models) | ✅ Excellent |
| **Cost** | ✅ Free | ✅ Free (one-time download) | ❌ $0.006/min (Google) | ⚠️ Pay per minute |
| **Latency** | ✅ ~5–10s (TTS) | ⚠️ ~10–30s (STT on CPU) | ✅ ~1–3s (cloud) | ⚠️ Variable |
| **Arabic support** | ✅ Excellent (XTTS-v2) | ⚠️ Good (Whisper multilingual) | ✅ Excellent (commercial) | ✅ Excellent |
| **Team size** | ✅ 1 developer | ✅ 1 developer | ⚠️ 1 developer + API management | ⚠️ 1 developer |
| **Privacy** | ✅ Full (local) | ✅ Full (local) | ❌ Audio sent to cloud | ⚠️ Partial (STT goes to cloud) |
| **Scalability** | ✅ N/A (single user) | ⚠️ Limited by CPU | ✅ Unlimited (cloud) | ✅ Unlimited (cloud) |
| **Model management** | ✅ One model | ❌ Two models (TTS + STT) | ✅ No local model | ⚠️ One model + API |

---

### When Option B (Local STT) Would Be Warranted

Local speech recognition makes sense when **all** of the following are true:

1. **Offline capability is required** — The platform must work without internet
2. **Privacy is a concern** — Audio cannot leave the user's machine
3. **Budget is zero** — No budget for cloud API subscriptions
4. **CPU resources are available** — ~2GB total memory is acceptable
5. **Latency is acceptable** — 10–30 second STT processing time is tolerable for a learning context

**These conditions are met by Lughat Chat.** The platform is designed for local, offline, zero-cost deployment.

---

### When Option C (Cloud STT) Would Be Warranted

Cloud STT makes sense when:

1. **Pronunciation quality is critical** — Commercial models (Google, Azure) are significantly more accurate than open-source models
2. **Phoneme-level feedback is needed** — Cloud APIs often provide word-level or phoneme-level timing
3. **Latency matters** — Cloud STT is faster (~1–3s vs 10–30s on CPU)
4. **Multi-language support** — Cloud APIs support more languages with better accuracy
5. **Budget is available** — The cost per minute of audio is acceptable

**None of these strongly apply to Lughat Chat** at the current stage. The platform targets a local, offline, zero-cost deployment.

---

### When Option A (TTS-Only) Would Be Warranted

Keeping TTS-only makes sense when:

1. **Pronunciation scoring is not a priority** — The platform focuses on reading comprehension, not speaking
2. **Resources are too constrained** — Cannot afford another ~1.5GB model
3. **The MVP scope is narrow** — Speech recognition adds significant complexity
4. **Arabic STT quality is insufficient** — Open-source Arabic STT is not yet production-quality

**This is the current state.** It works for reading-based learning but blocks speaking practice.

---

## Consequences

### Choosing Option B (Local STT — Whisper)

#### What becomes easier

- **Pronunciation practice** — Learners can speak Arabic text and get transcription feedback
- **Offline capability** — Full platform works without internet (TTS + STT both local)
- **Privacy** — No audio leaves the user's machine
- **Cost** — One-time ~1.5GB download, no recurring costs
- **Arabic support** — Whisper's multilingual model handles Arabic reasonably well
- **Module independence** — STT module has no dependencies on TTS or Progress modules (following the modular monolith's dependency rules)

#### What becomes harder

- **Memory usage** — Total memory rises from ~500MB to ~2GB (TTS + Whisper). On a machine with 4GB RAM, this is manageable but leaves little headroom.
- **CPU latency** — Whisper on CPU takes 10–30 seconds for a few seconds of audio. This is slow but acceptable for a learning context (not real-time).
- **Model management** — Two large models (XTTS-v2 ~2GB + Whisper ~1.5GB = ~3.5GB total). Docker image grows, startup time increases.
- **Arabic quality** — Whisper's Arabic transcription is good but not perfect. Mis-transcriptions lead to misleading pronunciation scores. This is a **quality risk** — the feature may frustrate users if the transcription is often wrong.
- **Phoneme-level scoring** — Whisper outputs text, not phoneme-level timing. To score pronunciation, we must compare the transcribed text against the expected text (string matching with fuzzy logic). This is less precise than phoneme-level scoring from a dedicated speech model.
- **Audio recording** — The frontend must capture microphone input. This adds a new frontend module (`useMicrophone.ts`) and browser permission handling.

#### New code to write

| Area | Backend Changes | Frontend Changes |
|------|----------------|------------------|
| **STT module** | `backend/stt/routes.py`, `backend/stt/models.py` | — |
| **Microphone capture** | — | `app/components/MicrophoneButton.vue`, `app/composables/useMicrophone.ts` |
| **Pronunciation scoring** | `backend/stt/scoring.py` (fuzzy string match) | — |
| **Audio recording** | `backend/stt/audio.py` (recording → WAV) | — |
| **New API endpoint** | `POST /api/pronounce` | — |

#### New API endpoint

```
POST /api/pronounce
  Body: { audio_data: bytes, expected_text: str, language: 'ar' | 'en' }
  Response: {
    transcription: str,           // Whisper's transcription
    confidence: float,            // 0.0–1.0
    score: float,                 // 0.0–1.0 (fuzzy match against expected_text)
    feedback: str                 // "Your pronunciation was 85% accurate"
  }
```

#### Scoring strategy (text-level, not phoneme-level)

Since Whisper outputs text (not phoneme-level data), scoring is done via **fuzzy string matching**:

```python
def score_pronunciation(transcribed: str, expected: str, language: str) -> float:
    """Score pronunciation by comparing transcribed text against expected text."""
    # Normalize: remove harakat for Arabic, lowercase, strip whitespace
    normalized_expected = normalize_text(expected, language)
    normalized_transcribed = normalize_text(transcribed, language)

    # Levenshtein distance (edit distance)
    distance = levenshtein(normalized_expected, normalized_transcribed)
    max_len = max(len(normalized_expected), len(normalized_transcribed))

    return 1.0 - (distance / max_len) if max_len > 0 else 1.0
```

This is **not phoneme-level scoring** — it's word-level text comparison. It's simpler, less accurate, but sufficient for a learning context.

---

### Choosing Option C (Cloud STT)

#### What becomes easier

- **Pronunciation quality** — Commercial STT models (Google, Azure) are significantly more accurate than open-source models
- **Phoneme-level feedback** — Cloud APIs provide word-level timing and phoneme-level confidence scores
- **Multi-language support** — Cloud APIs support more languages with better accuracy
- **Lower latency** — Cloud STT is faster (~1–3s vs 10–30s on CPU)
- **No local model** — No additional ~1.5GB download; system stays at ~500MB

#### What becomes harder

- **Internet dependency** — STT requires internet. The platform is no longer fully offline.
- **API costs** — Google Cloud Speech-to-Text: $0.006/min. For a learning platform with frequent practice, this adds up quickly.
- **Privacy** — Audio is sent to a third-party cloud. This may violate privacy expectations for a local-first platform.
- **Rate limits** — Cloud APIs have rate limits. A classroom of 30 students practicing simultaneously may hit limits.
- **API key management** — Cloud API keys must be stored securely (environment variables, secrets manager). This adds operational complexity.
- **Vendor lock-in** — Switching from Google to Azure to AWS requires rewriting the STT integration.

#### Pricing comparison (per minute of audio)

| Provider | Price (min) | Arabic Support | Offline |
|----------|------------|---------------|---------|
| **Google Cloud** | $0.006 | Excellent | No |
| **Azure Speech** | $0.0075 | Excellent | No |
| **AWS Transcribe** | $0.0024 | Good | No |
| **Whisper (local)** | $0.00 (one-time) | Good | Yes |

---

### Choosing Option A (TTS-Only)

#### What becomes easier

- **Zero additional work** — the current system works for its narrow purpose
- **No additional model** — stays at ~500MB
- **No latency** — no 10–30 second STT processing time
- **No microphone handling** — no frontend microphone capture, no browser permissions
- **No privacy concerns** — no audio recording, no transcription, no third-party APIs

#### What becomes harder

- **No speaking practice** — Learners can read and hear but cannot practice speaking. This is a significant gap in language learning.
- **Incomplete learning experience** — A language platform without speaking practice is like a music app without playback. It's fundamentally incomplete.
- **Competitive disadvantage** — Modern language platforms (Duolingo, Memrise, Pimsleur) all include speaking practice. A TTS-only platform is a tool, not a complete learning experience.
- **Delayed feature** — When pronunciation scoring is eventually added, the platform will need a complete STT integration anyway. Doing it now avoids a future rewrite.

---

## Recommendation

**Adopt Option B: Local STT (Whisper) as a separate module.**

### Rationale

1. **The platform is local and offline.** Cloud STT (Options C and D) breaks the offline guarantee. Whisper runs locally, preserving the platform's core value proposition.
2. **The resource cost is acceptable.** ~2GB total (TTS + Whisper) is manageable on a 4GB machine. The TTS model is ~2GB; Whisper small is ~1.5GB. Total: ~3.5GB. This is the same order of magnitude as the current ~2GB TTS model.
3. **Arabic quality is "good enough."** Whisper's Arabic transcription is not perfect, but for a learning context (reading-based pronunciation feedback, not phoneme-level analysis), it is sufficient. The fuzzy string matching scoring strategy compensates for transcription errors.
4. **Module independence.** The STT module has no dependencies on TTS or Progress modules. It follows the modular monolith's dependency rules: STT is a self-contained infrastructure module, like TTS.
5. **No recurring cost.** One-time ~1.5GB download. No API subscriptions, no per-minute charges.

### Decision Matrix for Future Migration to Cloud STT

| Trigger | Action |
|---------|--------|
| Whisper Arabic quality is unacceptable | Evaluate cloud STT (Option C) |
| Users demand phoneme-level feedback | Evaluate cloud STT (Option C) |
| Budget available for cloud APIs | Evaluate cloud STT (Option C) |
| Latency is a problem (10–30s unacceptable) | Evaluate cloud STT (Option C) |

### What We're Explicitly NOT Doing

- ❌ No phoneme-level scoring — text-level fuzzy matching only
- ❌ No real-time pronunciation feedback — STT takes 10–30 seconds on CPU
- ❌ No cloud STT in the MVP — local Whisper only
- ❌ No microphone streaming — recording is a discrete action (press button → speak → release button)
- ❌ No pronunciation history — no storage of pronunciation scores (beyond what's in `user_progress`)
- ❌ No speech model training — Whisper is used as-is, no fine-tuning on Arabic data

### Module Dependency Graph (After Adoption)

```
Content (no deps)
    ↑
Progress (depends on: Content)
    ↑
TTS (no deps)
STT (no deps)  ← NEW
    ↑
API (depends on: Content, Progress, TTS, STT)
```

Note: STT and TTS are **independent** — neither depends on the other. This is important: if we later swap Whisper for a cloud STT, the TTS module is unaffected.

### Open Questions for Future ADRs

1. **Phoneme-level scoring** — If Whisper's text-level matching is insufficient, do we need a dedicated Arabic phoneme model? (ADR-003b)
2. **Cloud STT migration** — If we migrate from local Whisper to cloud STT, what is the migration path? (ADR-003c)
3. **Audio recording UX** — How do we handle browser microphone permissions, recording UI, and audio preprocessing (noise reduction, format conversion)? (ADR-008)

---

## References

- [PRD: Constraints (No speech recognition)](../PRD.md)
- [ADR-001: Language Learning Platform Architecture](./ADR-001-language-learning-platform-architecture.md)
- [OpenAI Whisper — Multilingual Speech Recognition](https://github.com/openai/whisper)
- [Whisper Performance on CPU](https://github.com/openai/whisper/discussions/1088)
- [Arabic STT Comparison: Open-Source vs Cloud](https://huggingface.co/spaces/saharB/Arabic-STT-Comparison)
