# PRD-SpeechRecognition: Functional & Security Requirements Analysis

Generated: 2026-08-12
Source: `docs/PRD-SpeechRecognition.md`

---

## 1. Functional Requirements

| ID | Requirement | Source | Phase | Priority |
|----|-------------|--------|-------|------------|
| FR-01 | System records student audio via browser microphone using Web Audio API / MediaRecorder | US-1, US-13 | 2 | P0 |
| FR-02 | System encodes recorded audio to WAV format before transmission | US-13 | 2 | P0 |
| FR-03 | System exposes `POST /api/transcribe` accepting WAV multipart/form-data | PRD §API Contract | 2 | P0 |
| FR-04 | System transcribes WAV audio to Arabic text using local Whisper base model (145 MB) | PRD §Solution | 2 | P0 |
| FR-05 | System returns `{ transcribed_text: string }` from `/api/transcribe` | PRD §API Contract | 2 | P0 |
| FR-06 | System exposes `POST /api/evaluate` accepting `{ expected_text, transcribed_text }` | PRD §API Contract | 3 | P0 |
| FR-07 | System returns `{ score: number, errors: string[], feedback: string }` from `/api/evaluate` | PRD §API Contract | 3 | P0 |
| FR-08 | System evaluates transcribed text against expected lesson text using local LLM (LM Studio at `host.docker.internal:1234`) | PRD §LM Studio Integration | 3 | P0 |
| FR-09 | System falls back to simple text comparison when LM Studio is unavailable | PRD §LM Studio Integration (line 112) | 3 | P1 |
| FR-10 | System displays transcribed text alongside expected lesson text for side-by-side comparison | US-2, US-7 | 2-4 | P0 |
| FR-11 | System displays a pronunciation score per exercise | US-3 | 3 | P0 |
| FR-12 | System identifies and displays specific words/sounds pronounced incorrectly | US-4 | 3 | P0 |
| FR-13 | System provides feedback in Arabic language | US-15 | 3 | P1 |
| FR-14 | System handles undiacritized (haraqat-free) Arabic text natively in both input and output | US-6, PRD §Tech Stack | 2 | P0 |
| FR-15 | System handles Modern Standard Arabic (MSA) and detects dialect speech | US-12 | 2 | P1 |
| FR-16 | System allows unlimited re-recording and retry per exercise | US-8 | 4 | P1 |
| FR-17 | System integrates speaking exercises into existing lesson pages (Practice tab alongside Dialogue, Vocabulary, Grammar, Activities) | US-16, PRD §Frontend Pages | 4 | P0 |
| FR-18 | System stores speaking progress (scores, retries, completed exercises) in existing SQLite progress tracking | PRD §Integration | 4 | P1 |
| FR-19 | System provides a visual waveform of the recording in real time | US-14 | 4 | P1 |
| FR-20 | System provides a recording timer | PRD §RecordingPad.vue | 4 | P1 |
| FR-21 | System handles microphone permission prompts gracefully with Arabic instructions | US-17 | 2 | P1 |
| FR-22 | System completes transcription within 30 seconds | US-18 | 2 | P1 |
| FR-23 | System works offline after initial model download (no cloud APIs) | US-5, PRD §Out of Scope | 2 | P0 |
| FR-24 | System works on Mac including Apple Silicon without special hardware | US-9 | 2 | P0 |
| FR-25 | System is responsive and usable on mobile devices | US-19 | 4 | P1 |
| FR-26 | System clearly distinguishes TTS from STT in the UI | US-20 | 2-4 | P1 |
| FR-27 | System guides users through a speaking exercise flow (show expected → record → transcribe → evaluate → display feedback) | US-10 | 4 | P0 |
| FR-28 | System supports lesson JSON content with optional `speaking_text` field per section | PRD §Integration (line 101) | 4 | P1 |
| FR-29 | System exposes `GET /health` reporting SILMA + Whisper model load status | PRD §API Contract | 2 | P1 |
| FR-30 | System exposes `useSpeechRecognition()` composable wrapping Web Audio API recording + WAV encoding + POST | PRD §Composables | 2 | P0 |
| FR-31 | System exposes `usePronunciationFeedback()` composable POSTing to `/api/evaluate` | PRD §Composables | 3 | P0 |
| FR-32 | System extends `useTtsApi()` with `transcribe()` and `evaluate()` methods | PRD §Composables | 2-3 | P0 |

---

## 2. Security Requirements

Categorized by CIA triad (Confidentiality, Integrity, Availability) plus adversarial robustness.

### 2a. Confidentiality

| ID | Requirement | Rationale | Phase |
|----|-------------|-----------|-------|
| SC-01 | Audio recordings must NOT be persisted to disk or transmitted outside the Docker container after transcription completes | Student voice data is biometrically sensitive; PRD states STT output is "transient" (line 104) | 2 |
| SC-02 | Transcribed text must NOT be stored in logs, error messages, or debug output | Transcribed text may contain personally identifiable speech | 2-3 |
| SC-03 | LM Studio API key (if any) and model configuration must NOT be exposed in frontend bundles or Docker env files committed to VCS | PRD §Docker Changes (line 80) | 3 |
| SC-04 | `host.docker.internal:1234` must NOT be accessible from outside the Docker host network | Docker network isolation | 3 |
| SC-05 | Student speaking progress/scores stored in SQLite must be accessible only to the authenticated user session | Existing auth model; no new exposure | 4 |
| SC-06 | No audio recording data may be cached in browser localStorage, IndexedDB, or service worker caches beyond the active session | Browser storage security | 2 |

### 2b. Integrity

| ID | Requirement | Rationale | Phase |
|----|-------------|-----------|-------|
| SI-01 | `/api/transcribe` must validate that uploaded content is a valid WAV file (magic bytes, header parsing) before processing | Prevents arbitrary file upload exploitation | 2 |
| SI-02 | `/api/transcribe` must enforce a maximum file size (recommend 50 MB) to prevent denial-of-service via large uploads | Resource exhaustion | 2 |
| SI-03 | `/api/evaluate` must validate that `expected_text` and `transcribed_text` are non-empty strings before processing | Prevents empty-payload abuse | 3 |
| SI-04 | `/api/evaluate` must sanitize all text inputs before passing to LM Studio prompt to prevent prompt injection | LLM prompt injection is a documented attack vector (OWASP LLM01) | 3 |
| SI-05 | The fallback text-comparison mode (when LM Studio is unavailable) must produce deterministic, auditable results | Ensures grading consistency when LLM is absent | 3 |
| SI-06 | Speaking progress records in SQLite must be tamper-evident (no client-writable fields) | Grade integrity | 4 |
| SI-07 | Whisper model files must be verified (checksum) on download/install to prevent supply-chain compromise | Model integrity | 2 |
| SI-08 | SILMA model files must be verified (checksum) on download/install | Model integrity | 1 |

### 2c. Availability

| ID | Requirement | Rationale | Phase |
|----|-------------|-----------|-------|
| SA-01 | `/api/transcribe` must return 503 with clear error when Whisper model is not loaded | PRD §Testing (line 126) | 2 |
| SA-02 | `/api/evaluate` must return 503 or fallback response when LM Studio is unreachable | PRD §Known Risks (line 209) | 3 |
| SA-03 | `/api/transcribe` must enforce a per-request timeout (recommend 60s) to prevent hung requests consuming resources | CPU-bound inference can stall indefinitely | 2 |
| SA-04 | System must handle concurrent transcription requests gracefully (queue or reject with 503) | Multi-tab/multi-device usage | 2 |
| SA-05 | Docker container must not exceed host memory limits (recommend cgroup memory limit of 12 GB for 16 GB Macs) | PRD §Known Risks (line 210) | 2 |
| SA-06 | Microphone permission denial must result in a graceful UI message, not a crash or infinite retry loop | Browser security model | 2 |

### 2d. Input Validation & Sanitization (OWASP-aligned)

| ID | Requirement | OWASP Mapping | Phase |
|----|-------------|---------------|-------|
| SV-01 | All API endpoints must validate Content-Type headers match expected types (multipart/form-data for `/api/transcribe`, application/json for `/api/evaluate`) | OWASP API8:2023 — Security Misconfiguration | 2-3 |
| SV-02 | Arabic text inputs must be validated as valid UTF-8; reject non-UTF-8 payloads with 400 | OWASP API1:2023 — Broken Object Level Authorization (data integrity) | 2-3 |
| SV-03 | `/api/transcribe` must reject WAV files with sample rates outside 8000–48000 Hz range | Whisper base model expects 16000 Hz; out-of-range causes silent failure | 2 |
| SV-04 | `/api/evaluate` prompt sent to LM Studio must strip or escape control characters (U+0000–U+001F, U+007F–U+009F) | OWASP LLM01:2023 — Prompt Injection | 3 |
| SV-05 | All API responses must include appropriate CORS headers (no `*` wildcard in production) | OWASP API5:2023 — Broken Access Control | 2-3 |
| SV-06 | `/api/transcribe` must limit concurrent in-flight requests to prevent resource exhaustion | OWASP API6:2023 — Unrestricted Resource Consumption | 2 |

---

## 3. Non-Deterministic Execution Risks (AI Components)

| Risk ID | Component | Risk | Mitigation | Phase |
|---------|-----------|------|------------|-------|
| ND-01 | Whisper STT | Transcription is probabilistic; same audio may produce different text across runs or model versions | Store transcription version; do not use for high-stakes grading without human review | 2 |
| ND-02 | LM Studio LLM | LLM output is non-deterministic; same prompt may produce different scores/feedback across runs | Prompt must include temperature=0 or equivalent; fallback mode must be deterministic | 3 |
| ND-03 | SILMA TTS | Model may produce different audio outputs for same input text (probabilistic generation) | Not a security concern; document in user-facing notes | 1 |
| ND-04 | Whisper + LM Studio pipeline | Error propagation: Whisper mis-transcription → LM Studio evaluates wrong text → cascading inaccuracy | Fallback mode must include confidence scoring; system should flag low-confidence transcriptions | 2-3 |
| ND-05 | Model version drift | Model updates (even minor) may change behavior without API contract change | Pin model versions; document in `CONTEXT.md` glossary | 2-3 |

---

## 4. Abuse Case Matrix

Categorized by attacker type, technique, target, impact, and mitigation.

### 4a. External Attacker (unauthenticated)

| Abuse ID | Technique | Target | Impact | Severity | Mitigation | Phase |
|----------|-----------|--------|--------|----------|------------|-------|
| AB-01 | Upload non-WAV file (e.g., shell script, ELF binary) as `/api/transcribe` multipart body | `/api/transcribe` endpoint | Remote code execution via model inference pipeline; model may attempt to process binary as audio | Critical | Validate magic bytes (`RIFF....WAVE`) and WAV header fields; reject non-conforming files with 400 | 2 |
| AB-02 | Upload extremely large WAV file (e.g., 10 GB) to exhaust disk space and memory | `/api/transcribe` endpoint | Denial of service; disk full, OOM kill | High | Enforce max file size (50 MB); stream to temp file with size check before processing | 2 |
| AB-03 | Send rapid-fire `/api/transcribe` requests to exhaust CPU/memory | `/api/transcribe` endpoint | Denial of service; system unresponsive to legitimate users | High | Rate limit (recommend 5 requests/minute per IP); queue or reject with 503 | 2 |
| AB-04 | Send crafted WAV with malformed headers to trigger buffer overflow in audio parsing library | `/api/transcribe` endpoint | Crash or arbitrary code execution in Docker container | Critical | Use well-tested audio parsing library; validate all header fields; run in sandboxed container | 2 |
| AB-05 | Send malicious JSON to `/api/evaluate` with oversized payloads to cause memory exhaustion | `/api/evaluate` endpoint | Denial of service | Medium | Enforce max payload size (recommend 10 KB per field) | 3 |
| AB-06 | Send crafted `expected_text` or `transcribed_text` containing prompt injection payloads to LM Studio | `/api/evaluate` endpoint | LLM returns manipulated feedback; potential data exfiltration via LLM output | Critical | Sanitize inputs before passing to LM Studio; use structured prompt templates; never interpolate raw user text into prompt instructions | 3 |
| AB-07 | Send `expected_text` containing special characters (null bytes, control chars) to crash the evaluation pipeline | `/api/evaluate` endpoint | Service crash; potential information disclosure via error messages | High | Validate UTF-8; strip control characters; return 400 on invalid input | 3 |
| AB-08 | Probe `/api/evaluate` without authentication to discover endpoint existence | `/api/evaluate` endpoint | Information disclosure; reconnaissance for further attacks | Medium | Require authentication on all new endpoints; return 401 for unauthenticated requests | 3 |

### 4b. Authenticated Attacker (malicious student)

| Abuse ID | Technique | Target | Impact | Severity | Mitigation | Phase |
|----------|-----------|--------|--------|----------|------------|-------|
| AB-09 | Upload audio containing steganographic content (hidden data encoded in audio) | `/api/transcribe` endpoint | Data exfiltration via audio; bypasses text-only inspection | Low | Not a primary concern for STT; document as known limitation | 2 |
| AB-10 | Submit adversarial audio designed to produce specific (wrong) transcription via Whisper | `/api/transcribe` endpoint | Manipulate grading results; bypass speaking exercises | Medium | Flag adversarial audio patterns; require human review for suspicious score patterns | 2 |
| AB-11 | Submit audio that causes Whisper to produce extremely long transcription (thousands of words) | `/api/transcribe` endpoint | Resource exhaustion; LM Studio prompt overflow | Medium | Enforce max transcription length; truncate with warning | 2-3 |
| AB-12 | Manipulate `expected_text` in `/api/evaluate` to match any transcription, bypassing grading | `/api/evaluate` endpoint | Grade manipulation; bypass learning objectives | High | `expected_text` must come from server-side lesson content, not client-supplied | 3 |
| AB-13 | Tamper with SQLite progress records to fake completed exercises and scores | SQLite progress store | Grade inflation; bypass learning progression | High | Server-side validation of progress records; no client-writable fields | 4 |
| AB-14 | Record silence or non-speech audio and claim exercise completion | `/api/transcribe` endpoint | Bypass speaking exercises without actual practice | Low | Detect silence/low-energy audio; require minimum audio energy threshold | 2 |
| AB-15 | Replay previously recorded audio (replay attack) to reuse a transcription | `/api/transcribe` endpoint | Reuse of previous exercise answers | Low | Not preventable without liveness detection; document as known limitation | 2 |

### 4c. Insider/Developer

| Abuse ID | Technique | Target | Impact | Severity | Mitigation | Phase |
|----------|-----------|--------|--------|----------|------------|-------|
| AB-16 | Expose `host.docker.internal:1234` to external networks via Docker network misconfiguration | Docker networking | Unauthorized access to LM Studio from outside host | High | Restrict Docker network to internal only; do not publish port 1234 to host | 3 |
| AB-17 | Commit LM Studio API keys or model paths to version control | Git repository | Credential/model exposure | High | `.gitignore` Docker env files; use `.env` files excluded from VCS | 3 |
| AB-18 | Ship Whisper/SILMA models from unverified sources with embedded malicious code | Model distribution | Supply-chain compromise | Critical | Verify model checksums (SHA-256) on download; use official model sources | 1-2 |
| AB-19 | Log transcribed student audio or text in development/staging environments | Application logs | Privacy violation; PII exposure | High | Redact or omit audio/text from logs; use structured logging with PII filtering | 2-3 |
| AB-20 | Leave `/api/transcribe` or `/api/evaluate` endpoints accessible without authentication in production | API endpoints | Unauthorized access to speech processing | Critical | Require authentication on all new endpoints; verify in CI/CD pipeline | 2-3 |

---

## 5. OWASP Mapping Summary

| OWASP Category | Relevant Requirements |
|----------------|----------------------|
| **API1:2023 — Broken Object Level Authorization** | SC-05, SV-02 |
| **API5:2023 — Broken Access Control** | SC-05, SV-05, AB-08, AB-20 |
| **API6:2023 — Unrestricted Resource Consumption** | SA-04, SA-05, AB-02, AB-03, AB-05, AB-11, SV-06 |
| **API8:2023 — Security Misconfiguration** | SV-01, SV-05, AB-16 |
| **LLM01:2023 — Prompt Injection** | SI-04, SV-04, AB-06 |
| **LLM03:2023 — Insecure Output Handling** | SI-04 (LM Studio output validation) |
| **LLM09:2023 — Supply Chain** | SI-07, SI-08, AB-18 |

---

## 6. Summary of Critical Gaps in PRD

The PRD does not address the following security concerns:

1. **No authentication specified** for `/api/transcribe` or `/api/evaluate` endpoints.
2. **No file validation** specified for uploaded WAV files (magic bytes, header, size).
3. **No rate limiting** specified for either new endpoint.
4. **No prompt injection mitigation** specified for LM Studio integration.
5. **No persistence policy** specified for audio recordings (PRD says "transient" but does not define what "transient" means technically).
6. **No model integrity verification** specified (no checksums, no source verification).
7. **No Docker network isolation** specified for `host.docker.internal:1234`.
8. **No logging policy** specified — transcribed student speech in logs is a privacy risk.
9. **No adversarial audio handling** specified — Whisper is known to be vulnerable to adversarial examples.
10. **No concurrency limits** specified — multiple simultaneous transcriptions could exhaust resources.

These gaps must be addressed before Phase 2 implementation begins.
