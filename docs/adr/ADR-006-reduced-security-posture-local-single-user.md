# ADR-006: Reduced Security Posture for Local Single-User Deployment

## Status
Accepted

## Context
PRD-SpeechRecognition defines a four-service speech pipeline for Lughat Chat. Previous security analysis assumed a multi-user / network-exposed threat model and identified authentication, rate limiting, network isolation, and external abuse mitigations.

The application is local-only, runs via Docker Compose on a single user's Mac, and serves one user. No internet exposure, no multi-tenant data, no external API consumers. Nginx reverse proxy is localhost-only. LM Studio runs on the host and is accessed via `host.docker.internal`.

## Decision
Adopt **Local-First Minimal Hardening**. Keep stability and privacy controls, drop external-facing security controls.

**Keep:**
- In-memory audio processing only. No persistence of recordings to disk. Transcribed text is transient.
- WAV validation: magic bytes `RIFF....WAVE`, max file size 50 MB, sample rate 8-48 kHz.
- Resource guard: max 1 concurrent Whisper job, request timeout 60s, Docker memory cap.
- Minimal prompt sanitization for LM Studio: strip control chars U+0000-U+001F/U+007F-U+009F, structured JSON template. Goal is stability, not anti-attack.
- Model version pinning in Dockerfile/requirements.

**Drop for now:**
- API key authentication on `/api/transcribe` and `/api/evaluate`.
- Per-IP rate limiting.
- CORS hardening beyond default same-origin.
- Network isolation for `host.docker.internal:1234`.

## Consequences
**Easier:** No auth plumbing, no Nginx rate limit config, faster implementation. Fits single-user local constraints.

**Harder:** No protection if the app is later exposed to network or shared. Adding auth later requires Nginx + frontend changes.

**Risks accepted:** External attacker risk is accepted as ~0 given current deployment. Self-inflicted stability and privacy risks are mitigated by the kept controls.

**Reversibility:** All dropped controls can be added later without changing domain logic. The kept controls are additive and do not couple to auth.

## Implementation Notes
- In-memory audio: FastAPI `UploadFile` → read to bytes in memory, process with Whisper, discard. No tempfile write.
- WAV validation middleware: `backend/app/middleware/file_validation.py`
- Resource guard: `asyncio.Semaphore(1)` for Whisper, 60s timeout
- LM Studio ACL: `backend/app/adapters/lmstudio_acl.py` — sanitization only
- Model pinning: versions in `requirements.txt`, document SHA-256 in `CONTEXT.md`

## Related
- PRD: `docs/PRD-SpeechRecognition.md`
- Requirements analysis: `docs/PRD-SpeechRecognition-Requirements.md`
