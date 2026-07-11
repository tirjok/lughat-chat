# ADR-011: Default Voice Resolution and Voice Name Mismatch

## Status

**Accepted** — 2026-07-11

Addresses **RC-003**: Default voice name mismatch — frontend defaults to `"female"` but deployed WAV files are `"KSA Hamed - Male"` and `"KSA Zariyah - Female"`.

---

## Context

When a user opens the Playground (TTS Studio) and does not manually select a voice, the synthesis request defaults to `voice = "female"`. The backend then looks for `speaker_wavs/female.wav`, which **does not exist** — the deployed WAV files are:

- `KSA Hamed - Male.wav`
- `KSA Zariyah - Female.wav`

Result: a 500 error with `"Speaker WAV file not found for voice 'female'"`. The user sees a generic "An error occurred on the server" toast and cannot generate speech without manually selecting a voice first.

### Current Code (`app.py`)

```python
# Resolve voice: accept both "voice" and "speaker" fields; default to "female"
voice = request.speaker if request.speaker else (request.voice or "female")

# ...
speaker_wav = os.path.join(SPEAKER_WAV_DIR, f"{voice}.wav")

if not os.path.exists(speaker_wav):
    raise HTTPException(
        status_code=500,
        detail=f"Speaker WAV file not found for voice '{voice}' (expected at '{speaker_wav}'). Add it to speaker_wavs/.",
    )
```

### Frontend Default Selection

The frontend's `index.vue` has:

```typescript
watch(speakerVoices, (v) => {
  if (!selectedSpeaker.value && v.length > 0) {
    selectedSpeaker.value = v[0]!.id  // ← Frontend selects first voice
  }
}, { immediate: true })
```

This **does** select the first voice from `/api/voices` on mount. However, the backend's default resolution (`"female"`) is a **dead fallback** — it only triggers when:
1. No voice is selected in the frontend (but the watch above prevents this), AND
2. No `speaker` field is sent in the request

The mismatch exists because:
- The voice generation script (`generate_speaker_wavs.py`) originally created `female.wav` and `male.wav`
- The deployed files were renamed to `"KSA Hamed - Male"` and `"KSA Zariyah - Female"`
- The backend default (`"female"`) was never updated to match

### Severity

**Critical** — A user who doesn't interact with the voice selector (or whose voice selector fails to load) cannot use the app at all. The default path is broken.

---

## Decision

### We choose: Dynamic Default Voice Resolution

When no voice is explicitly selected, the backend resolves to the **first discovered voice** from the `speaker_wavs/` directory (via `discover_voices()`) instead of the hardcoded `"female"`.

### Implementation

In `generate_speech()`, after resolving `voice = request.speaker ?? request.voice`:

```python
# If no voice was explicitly provided, use the first discovered voice
if not voice:
    discovered = discover_voices(SPEAKER_WAV_DIR)
    voice = discovered[0]["id"] if discovered else "female"
```

This means:
- If `speaker` is provided → use it directly (explicit selection wins)
- If `voice` is provided → use it directly (explicit selection wins)
- If neither is provided → use the first discovered voice from `speaker_wavs/`
- If no voices exist in `speaker_wavs/` → fall back to `"female"` (backwards compatibility for deployments that still use `female.wav`)

### What Changes

| File | Change |
|------|--------|
| `backend/app.py` | Replace `request.voice or "female"` with dynamic first-voice resolution |
| `frontend/app/composables/useTtsApi.ts` | No change needed — frontend already sends the selected voice |
| `frontend/app/pages/index.vue` | No change needed — frontend already selects first voice on mount |

### What Does NOT Change

- The `/api/voices` endpoint returns the same list of voices (already sorted from `speaker_wavs/`)
- The frontend's voice selector behavior (selects first voice on mount) — this already works correctly
- The `generate_speaker_wavs.py` script — it still generates `female.wav`/`male.wav` for initial setup; the backend handles the name mismatch

---

## Options Considered

### Option A: Dynamic First-Voice Resolution (Chosen)

When no voice is explicitly provided, use the first discovered voice from `speaker_wavs/`.

**Pros:**
- **Fixes the broken default** — the first voice from the directory is always used, regardless of filename
- **No configuration needed** — works with any set of WAV files
- **Frontend already does this** — `index.vue` selects `v[0].id` on mount, so the frontend and backend are now aligned
- **Backwards compatible** — if `female.wav` exists, it will be the first (alphabetically) or a custom-named file will be first
- **No user action required** — no UI changes, no new settings

**Cons:**
- The "default" voice depends on alphabetical ordering of filenames. If a new WAV file is added that sorts before the current default, the default changes. This is acceptable for a local deployment with 2–4 voices.

### Option B: Hardcode Default to First Deployed Voice

Change the default from `"female"` to `"KSA Zariyah - Female"` (the actual deployed default).

**Pros:**
- Simple one-line change: `request.voice or "KSA Zariyah - Female"`
- Predictable — always uses the same voice

**Cons:**
- **Fragile** — if the deployed WAV files change, the hardcoded default becomes wrong again
- **Not portable** — deployments with different WAV files would need code changes
- **Same problem as current** — just shifts the mismatch to a different filename
- **No improvement** — this is the same class of bug, just with a different string

### Option C: Require Explicit Voice Selection (Fail-Fast)

Remove the default entirely. If no voice is selected, return a 400 error: `"Please select a voice before generating speech."`

**Pros:**
- Forces the user to make an explicit choice
- No ambiguity about which voice is being used

**Cons:**
- **Worse UX** — the user must interact with the voice selector before generating speech, even for a quick test
- **Frontend already handles this** — the watch in `index.vue` selects the first voice on mount, so the user never sees the error. But if the frontend is ever bypassed (API call directly), the user gets a confusing 400 error.
- **Doesn't fix the root cause** — it just hides the error behind a frontend workaround

---

## Trade-off Analysis

| Dimension | Option A (Chosen) | Option B (Hardcode) | Option C (Fail-Fast) |
|-----------|-------------------|--------------------|--------------------|
| **Robustness** | High — adapts to any WAV files | Low — breaks when WAV files change | Medium — requires frontend workaround |
| **First-use UX** | Excellent — first voice works immediately | Good — known default voice | Poor — must select before using |
| **Portability** | High — works with any deployment | Low — tied to specific filenames | High — works with any deployment |
| **Implementation effort** | Low — 3 lines of code | Trivial — 1 string change | Low — frontend change + error handling |
| **Backwards compatibility** | Full — falls back to `"female"` | Partial — tied to specific files | Full — no code changes needed |
| **Debugging** | Easy — first voice is obvious | OK — hardcoded string visible | OK — 400 error is clear |

### What We're Giving Up

- **Explicit default** — The user doesn't know which voice will be used until they see the voice selector. This is acceptable because the voice selector shows the selected voice prominently.
- **Predictable defaults for API users** — If someone calls `/api/generate` without a voice field (bypassing the frontend), the default depends on filename ordering. This is acceptable for a local deployment.

### Why This Is Reversible

This decision only changes the backend's voice resolution logic. It can be reverted by changing the single line in `app.py`. No frontend changes are involved. No API contract changes are involved (the endpoint still accepts the same `voice`/`speaker` fields).

---

## Consequences

### What Becomes Easier

- **First-use setup** — Users can generate speech immediately without interacting with the voice selector
- **Deployment portability** — The same code works with any set of WAV files (no hardcoded defaults)
- **Backend-frontend alignment** — Both the frontend (voice selector) and backend (default resolution) now use the same "first voice" logic

### What Becomes Harder

- **Predictability of default** — The default voice depends on alphabetical ordering of filenames. If a new WAV file is added that sorts before the current default, the default changes. This is acceptable for a local deployment with 2–4 voices.

### Impact on Existing Components

| Component | Impact |
|-----------|--------|
| `app.py` (generate_speech) | **Modified** — Replace hardcoded `"female"` default with dynamic first-voice resolution |
| `app.py` (discover_voices) | **No change** — Already returns sorted list from `speaker_wavs/` |
| `/api/voices` | **No change** — Returns the same voice list |
| `index.vue` (frontend) | **No change** — Already selects first voice on mount |
| `useTtsApi.ts` | **No change** — Already passes the selected voice |
| `VoiceSelector.vue` | **No change** — Already shows and selects voices correctly |

### Files to Modify

| File | Change |
|------|--------|
| `backend/app.py` | Replace `request.voice or "female"` with dynamic first-voice resolution |

---

## References

- **PRD**: [RC-003](../../PRD.md#known-issues) — Default voice name mismatch
- **Backend**: [`app.py`](../../backend/app.py) — `generate_speech()` voice resolution logic
- **Frontend**: [`index.vue`](../../frontend/app/pages/index.vue) — `watch(speakerVoices)` selects first voice
- **Frontend**: [`useTtsApi.ts`](../../frontend/app/composables/useTtsApi.ts) — Sends selected voice to backend
- **Frontend**: [`VoiceSelector.vue`](../../frontend/app/components/VoiceSelector.vue) — Voice selection UI
- **Speakers**: `backend/speaker_wavs/` — `KSA Hamed - Male.wav`, `KSA Zariyah - Female.wav`
- **Related ADR**: [ADR-010](./ADR-010-non-blocking-frontend-boot-with-loading-screen.md) — Docker health check race condition (both address the first-startup experience)
- **Implementation**: [`IMPLEMENTATION-speech-synthesis.md`](../../implementation/IMPLEMENTATION-speech-synthesis.md) — Slice S-01: Fix default voice resolution
