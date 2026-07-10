# ADR-008: Audio Recording UX (Microphone Capture)

## Status

**Accepted — Option A: MediaRecorder** — 2026-07-10

This ADR addresses the question raised in ADR-003: *How do we handle browser microphone permissions, recording UI, and audio preprocessing?* It evaluates microphone capture strategies, Web Audio API integration, and the trade-off between browser-native recording and custom audio processing.

---

## Context

The platform's **role-play** activity (and potentially future pronunciation activities) requires learners to **speak Arabic text** and submit their voice for transcription and scoring. This requires:

1. **Microphone access** — Browser permission to capture audio from the user's microphone
2. **Recording UI** — A visual interface for starting, stopping, and reviewing recordings
3. **Audio preprocessing** — Noise reduction, format conversion, quality checks
4. **Audio submission** — Send the recorded audio to the STT backend (Whisper)
5. **Feedback display** — Show transcription, confidence score, and pronunciation feedback

The PRD defines `role-play` as one of 5 mandatory activity types per lesson. It requires multi-turn dialogue where the learner speaks responses. This ADR evaluates how to implement the recording pipeline.

### Constraints (Inherited from ADR-001)

| Constraint | Implication |
|-----------|-------------|
| **Browser-based** — No native app | Must use Web Audio API, MediaRecorder, getUserMedia |
| **No server-side recording** — Audio processed client-side | All preprocessing happens in the browser |
| **Arabic language** — STT must handle Arabic (Whisper) | Recording quality affects transcription accuracy |
| **Single-user, local** — No cloud processing | Audio stays on the user's device until submission |
| **Mobile support** — The app works on mobile (responsive layout) | Must handle mobile microphone access (iOS Safari quirks) |
| **Privacy** — Audio is local until submission | No audio leaves the device until the user explicitly submits |

---

## Decision

We evaluate three options for microphone capture.

---

### Option A: Browser Native Recording (Recommended for MVP)

Use the **MediaRecorder API** with a simple recording UI (record → stop → submit). No custom audio processing. The browser handles format conversion, and the raw audio is sent to the STT backend.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Nuxt SPA)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RolePlay.vue (activity renderer)                    │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  [🔴 Record]  [⏹ Stop]  [▶ Replay]        │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                     │   │
│  │  useMicrophone.ts (composable)                       │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  1. navigator.mediaDevices.getUserMedia()   │    │   │
│  │  │  2. MediaRecorder(stream)                   │    │   │
│  │  │  3. chunks.push(data)                       │    │   │
│  │  │  4. onstop → Blob → submit to backend       │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  STT Module (Whisper)                                │   │
│  │  POST /api/pronounce  — receives audio, returns     │   │
│  │    { transcription, confidence, score }              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **Simplest implementation** — MediaRecorder API is well-supported in all modern browsers
- **No audio processing** — The browser handles format conversion (WebM/Opus, WAV, or MP4)
- **No custom components** — Just a record button, a stop button, and a replay button
- **Browser handles format** — `MediaRecorder.isTypeSupported()` checks what the browser supports
- **Privacy-first** — Audio stays on the device until the user explicitly submits

**Implementation (composable):**

```typescript
// app/composables/useMicrophone.ts
import { ref, computed, type Ref } from 'vue'

export interface UseMicrophoneOptions {
  onRecordingComplete?: (blob: Blob) => void
  onRecordingError?: (error: string) => void
}

export function useMicrophone(options: UseMicrophoneOptions = {}) {
  const isRecording = ref(false)
  const isPermissionGranted = ref<boolean | null>(null)
  const audioBlob = ref<Blob | null>(null)
  const duration = ref(0)
  const error = ref<string | null>(null)

  let mediaRecorder: MediaRecorder | null = null
  let audioStream: MediaStream | null = null
  let chunks: Blob[] = []
  let startTime = 0
  let timerInterval: ReturnType<typeof setInterval> | null = null

  async function startRecording(): Promise<void> {
    try {
      // Request microphone permission
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      isPermissionGranted.value = true
      error.value = null

      // Check supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : ''

      if (!mimeType) {
        throw new Error('Browser does not support any known audio recording format')
      }

      // Start recording
      mediaRecorder = new MediaRecorder(audioStream, { mimeType })
      chunks = []

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        audioBlob.value = new Blob(chunks, { type: mimeType })
        duration.value = Date.now() - startTime

        // Stop all tracks (release microphone)
        audioStream?.getTracks().forEach(track => track.stop())
        audioStream = null
        mediaRecorder = null

        if (timerInterval) {
          clearInterval(timerInterval)
          timerInterval = null
        }

        options.onRecordingComplete?.(audioBlob.value!)
      }

      mediaRecorder.start()
      isRecording.value = true
      startTime = Date.now()

      // Timer for duration display
      timerInterval = setInterval(() => {
        duration.value = Date.now() - startTime
      }, 100)

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message

      if (message.includes('Permission')) {
        isPermissionGranted.value = false
        options.onRecordingError?.('Microphone permission denied. Please allow microphone access in your browser settings.')
      } else {
        options.onRecordingError?.(`Recording failed: ${message}`)
      }
    }
  }

  function stopRecording(): void {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      isRecording.value = false
    }
  }

  function getAudioBlob(): Blob | null {
    return audioBlob.value
  }

  // Cleanup on unmount
  function dispose(): void {
    stopRecording()
    audioStream?.getTracks().forEach(track => track.stop())
  }

  return {
    isRecording,
    isPermissionGranted,
    audioBlob,
    duration,
    error,
    startRecording,
    stopRecording,
    getAudioBlob,
    dispose
  }
}
```

**Recording UI (component):**

```vue
<!-- app/components/MicrophoneButton.vue -->
<template>
  <div class="flex items-center gap-2">
    <!-- Record button -->
    <button
      v-if="!isRecording"
      class="flex items-center gap-2 px-4 py-2 rounded-full bg-sunrise-magenta text-white text-sm font-medium hover:bg-sunrise-magenta/90 transition-colors"
      @click="startRecording"
    >
      <span class="ph-fill ph-microphone text-lg" />
      <span>{{ isPermissionGranted === false ? 'Enable Mic' : 'Record' }}</span>
    </button>

    <!-- Recording indicator -->
    <div v-else class="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
      <span class="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
      <span class="font-mono">{{ formatDuration(duration) }}</span>
      <button
        class="ml-2 px-2 py-1 rounded bg-red-500/30 text-red-400 text-xs"
        @click="stopRecording"
      >
        Stop
      </button>
    </div>

    <!-- Replay button (after recording) -->
    <button
      v-if="audioBlob && !isRecording"
      class="flex items-center gap-1 px-3 py-1.5 rounded text-gray-400 hover:text-white text-xs"
      @click="replay"
    >
      <span class="ph-fill ph-play" />
      Replay
    </button>
  </div>
</template>
```

---

### Option B: Web Audio API with Custom Processing

Use the **Web Audio API** to capture audio through an `AudioContext`, process it (noise reduction, gain normalization, echo cancellation), then record the processed output.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Nuxt SPA)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Audio Pipeline:                                    │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ Micro-   │→│  AudioContext│→│  AudioWorklet │   │   │
│  │  phone     │  │  (source)    │  │  (processing) │   │   │
│  │  (getUser  │  │              │  │  - noise      │   │   │
│  │  Media)    │  │              │  │    reduction  │   │   │
│  │            │  │              │  │  - gain       │   │   │
│  │            │  │              │  │    normalizer │   │   │
│  │            │  │              │  │  - echo       │   │   │
│  │            │  │              │  │    cancellation│   │   │
│  │            │  │              │  └──────┬───────┘   │   │
│  │            │  │              │         │           │   │
│  │            │  │              │  ┌──────┴───────┐   │   │
│  │            │  │              │  │ MediaStream   │   │   │
│  │            │  │              │  │ Audio         │   │   │
│  │            │  │              │  │ Destination   │   │   │
│  │            │  │              │  │ Node          │   │   │
│  │            │  │              │  └──────┬───────┘   │   │
│  │            │  │              │         │           │   │
│  │            │  │              │  ┌──────┴───────┐   │   │
│  │            │  │              │  │ MediaRecorder │   │   │
│  │            │  │              │  │ → Blob        │   │   │
│  │            │  │              │  └──────────────┘   │   │
│  │            │  └──────────────┘                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **Custom processing** — Noise reduction, gain normalization, echo cancellation
- **AudioWorklet** — Audio processing runs on a dedicated audio thread (no UI jank)
- **Higher quality recordings** — Processed audio transcribes better
- **More complex** — AudioWorklet modules, AudioContext management, format handling
- **Browser compatibility** — AudioWorklet is not supported in all browsers (no Safari < 15.4)

**Implementation complexity:**

```typescript
// app/composables/useAudioPipeline.ts
import { ref } from 'vue'

export function useAudioPipeline() {
  let audioContext: AudioContext | null = null
  let mediaStream: MediaStream | null = null
  let mediaRecorder: MediaRecorder | null = null
  let audioWorkletNode: AudioWorkletNode | null = null

  async function startRecording(): Promise<void> {
    audioContext = new AudioContext()
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const source = audioContext.createMediaStreamSource(mediaStream)

    // Create noise reduction AudioWorklet (runs on audio thread)
    await audioContext.audioWorklet.addModule('/audio-workers/noise-reduction.js')
    audioWorkletNode = new AudioWorkletNode(audioContext, 'noise-reduction-processor')

    // Create gain normalizer
    const gainNode = audioContext.createGain()
    gainNode.gain.value = 1.5  // Boost quiet audio

    // Create echo cancellation
    const echoCancellationNode = audioContext.createBiquadFilter()
    echoCancellationNode.type = 'highpass'
    echoCancellationNode.frequency.value = 100  // Filter low-frequency noise

    // Chain: source → noise reduction → gain → echo cancellation → destination
    source.connect(audioWorkletNode)
    audioWorkletNode.connect(gainNode)
    gainNode.connect(echoCancellationNode)

    const destination = audioContext.createMediaStreamDestination()
    echoCancellationNode.connect(destination)

    // Record the processed audio
    mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm;codecs=opus'
    })

    // ... rest of recording logic (same as Option A)
  }

  function stopRecording(): void {
    // ... cleanup: stop all nodes, close audio context, stop media stream
  }

  return { startRecording, stopRecording }
}
```

---

### Option C: Hybrid — Native Recording with Optional Enhancement

Use **MediaRecorder** (Option A) as the default. If the browser supports Web Audio API processing (Option B), optionally apply enhancement. The user can toggle "enhanced recording" in settings.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Nuxt SPA)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Settings: [Enhanced Recording: OFF/ON]              │   │
│  │                                                     │   │
│  │  OFF (default): MediaRecorder (simple, fast)        │   │
│  │  ON: AudioContext + AudioWorklet (processed, slow)  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **Simple default** — MediaRecorder works everywhere
- **Optional enhancement** — Users who care about quality can enable processing
- **Graceful degradation** — If AudioWorklet is not supported, fall back to MediaRecorder
- **More code** — Two recording paths to maintain

---

## Trade-off Analysis

| Concern | A: MediaRecorder | B: Web Audio API | C: Hybrid |
|---------|-----------------|------------------|-----------|
| **Implementation complexity** | ✅ Simple — ~50 lines of composable code | ❌ Complex — AudioContext, AudioWorklet, multiple nodes | ⚠️ Medium — two paths to maintain |
| **Browser support** | ✅ All modern browsers | ⚠️ AudioWorklet: no Safari < 15.4 | ✅ Falls back to MediaRecorder |
| **Audio quality** | ⚠️ Raw recording (no processing) | ✅ Processed (noise reduction, gain, echo) | ✅ User choice |
| **Mobile support** | ✅ Works on iOS Safari, Android Chrome | ⚠️ AudioWorklet not supported on iOS Safari | ✅ Falls back on iOS |
| **Performance** | ✅ Low CPU usage | ⚠️ AudioWorklet runs on dedicated thread (low UI impact, higher CPU) | ✅ User choice |
| **Privacy** | ✅ Audio stays on device | ✅ Audio stays on device | ✅ Audio stays on device |
| **Development time** | ✅ 1–2 hours | ❌ 4–8 hours (AudioWorklet module + integration) | ⚠️ 3–5 hours |
| **Maintenance** | ✅ Low — one code path | ❌ High — AudioWorklet module + AudioContext management | ⚠️ Medium — two code paths |

---

### When Option B (Web Audio API) Would Be Warranted

Custom audio processing makes sense when:

1. **Recording quality is critical** — Poor recordings lead to bad STT results, which frustrate learners
2. **Noisy environments** — Learners record in cafes, buses, or other noisy places
3. **Professional product** — The platform must compete with Duolingo, Memrise, etc. in recording quality
4. **Desktop-focused** — Most users are on desktop browsers with good microphones and AudioWorklet support
5. **Budget for development time** — 4–8 hours for audio processing is acceptable

**Partial fit for Lughat Chat.** The platform targets a local, offline, solo-developed product. Mobile support (iOS Safari) is important, and AudioWorklet is not supported there. The quality gain from processing is marginal for STT (Whisper handles noisy audio reasonably well).

### When Option C (Hybrid) Would Be Warranted

A hybrid approach makes sense when:

1. **Most users are on desktop** — AudioWorklet works well for desktop users
2. **Mobile users are a minority** — iOS Safari fallback is acceptable
3. **Quality matters but budget is limited** — Default to simple, optional enhancement
4. **User preference** — Some users want quality, others want simplicity

**Good fit for Lughat Chat post-MVP.** After the initial recording pipeline is working (Option A), a "enhanced recording" toggle can be added for users who want better quality.

---

## Consequences

### Choosing Option A (MediaRecorder)

#### What becomes easier

- **Fast implementation** — ~50 lines of composable code; recording UI is ~100 lines
- **Maximum compatibility** — Works on all modern browsers, including iOS Safari
- **No audio processing bugs** — No custom processing to debug, no AudioWorklet module to maintain
- **Simple testing** — Test the composable in isolation; no audio pipeline to set up
- **Privacy guarantee** — Audio stays on the device; no processing happens server-side

#### What becomes harder

- **Noisy recordings** — Background noise, echo, and quiet audio are not processed. Whisper handles these reasonably well, but quality varies.
- **No format control** — The browser chooses the format (WebM/Opus, WebM, or MP4). The backend must handle all supported formats.
- **No quality feedback** — The user doesn't know if their recording is too quiet, too noisy, or has echo.

#### New code to write

| Area | Backend Changes | Frontend Changes |
|------|----------------|------------------|
| **Microphone composable** | — | `app/composables/useMicrophone.ts` (new) |
| **Recording UI** | — | `app/components/MicrophoneButton.vue` (new) |
| **Role-play activity** | — | `app/components/activities/RolePlay.vue` (new/updated) |
| **Audio submission** | `STT Module` — `POST /api/pronounce` | — |

#### API endpoint (existing from ADR-003)

```
POST /api/pronounce
  Body: { audio_data: bytes, expected_text: str, language: 'ar' | 'en' }
  Response: {
    transcription: str,
    confidence: float,
    score: float,
    feedback: str
  }
```

---

### Choosing Option B (Web Audio API)

#### What becomes easier

- **Better audio quality** — Noise reduction, gain normalization, and echo cancellation improve STT accuracy
- **Professional product** — Comparable to Duolingo's recording quality
- **Quality feedback** — Can show real-time audio level (volume meter) to guide the user

#### What becomes harder

- **iOS Safari incompatibility** — AudioWorklet is not supported in iOS Safari < 15.4. Many mobile users are on older iOS versions.
- **AudioWorklet module** — Must write a custom AudioWorklet module for noise reduction. This is a separate JavaScript file that runs on the audio thread.
- **Complex cleanup** — AudioContext must be closed, all nodes disconnected, all tracks stopped. Failure to clean up leaks resources and leaves the microphone indicator active.
- **Testing complexity** — Cannot easily unit test audio processing. Requires integration testing with actual audio input.
- **Development time** — 4–8 hours for a working implementation, plus ongoing maintenance.

---

### Choosing Option C (Hybrid)

#### What becomes easier

- **Best of both worlds** — Simple default, optional enhancement
- **Gradual rollout** — Start with Option A; add enhancement later
- **User choice** — Users who care about quality can enable processing

#### What becomes harder

- **Two code paths** — Must maintain both MediaRecorder and AudioPipeline implementations
- **Settings management** — Must store user preference (enhanced recording ON/OFF) somewhere (localStorage, settings page)
- **Fallback logic** — Must detect AudioWorklet support and fall back gracefully

---

## Recommendation

**Adopt Option A: MediaRecorder (for MVP).**

### Rationale

1. **Maximum compatibility.** MediaRecorder works on all modern browsers, including iOS Safari (where AudioWorklet is not supported). The platform targets mobile users (the responsive layout is a core feature), so iOS support is critical.
2. **Fast implementation.** ~50 lines of composable code. The recording pipeline is simple: request permission → start recording → stop → submit. No custom audio processing to debug.
3. **Whisper handles noise.** Whisper's multilingual model is robust to background noise and echo. The quality gain from custom processing (Option B) is marginal for STT accuracy.
4. **Hybrid is the next step.** After Option A is working, a "enhanced recording" toggle (Option C) can be added for desktop users who want better quality. This is a post-MVP enhancement, not an MVP requirement.
5. **Privacy is preserved.** Audio stays on the device in both options. The difference is only in processing, not in data flow.

### Decision Matrix for Future Migration to Enhanced Recording

| Trigger | Action |
|---------|--------|
| STT accuracy on noisy recordings is below threshold | Evaluate enhanced recording (Option B/C) |
| iOS Safari supports AudioWorklet widely (Safari 17+) | Evaluate hybrid (Option C) |
| Users report poor recording quality | Evaluate enhanced recording (Option B/C) |
| Platform targets desktop-first users | Evaluate full Web Audio API (Option B) |

### What We're Explicitly NOT Doing

- ❌ No AudioWorklet in the MVP — not supported on iOS Safari
- ❌ No noise reduction, gain normalization, or echo cancellation in the MVP |
- ❌ No real-time audio level meter (can be added post-MVP)
- ❌ No server-side audio processing — all processing is client-side
- ❌ No format conversion on the backend — browser handles format

### Audio Pipeline (MVP)

```
User clicks "Record"
    │
    ▼
navigator.mediaDevices.getUserMedia({ audio: true })
    │
    ▼
MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    │
    ▼
User clicks "Stop"
    │
    ▼
MediaRecorder.onstop → Blob (WebM/Opus)
    │
    ▼
POST /api/pronounce (audio_data: Blob)
    │
    ▼
Whisper STT → { transcription, confidence, score }
```

### Open Questions for Future ADRs

1. **Enhanced recording (AudioWorklet)** — If Whisper quality on noisy recordings is unacceptable, add noise reduction (Option C). (ADR-008b)
2. **Real-time audio level meter** — Show the user their recording volume in real-time to guide them. (ADR-008c)
3. **Multi-track role-play** — Role-play activities may require multiple recordings (one per dialogue turn). How do we manage multiple recordings in a single activity? (ADR-008d)
4. **Audio format normalization** — The backend receives WebM/Opus from the browser. Should we convert to WAV for Whisper? (ADR-008e)

---

## References

- [MDN: MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Web Audio API: AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)
- [Web Audio API: AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [Recording Audio in the Browser with Web Audio API](https://blog.openreplay.com/record-audio-browser-web-audio-api/)
- [Browser Support for AudioWorklet](https://caniuse.com/?search=AudioWorklet)
- [Whisper Robustness to Noisy Audio](https://github.com/openai/whisper/issues/1088)
