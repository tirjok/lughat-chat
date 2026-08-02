# WORKFLOW: Audio Playback Session

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Load → Play → Pause → Seek → Download → End lifecycle

---

## Overview

After successful speech generation, the frontend receives an MP3 Blob. The `useAudioModule` composable creates a Blob URL (`URL.createObjectURL()`), wires it to a hidden `<audio>` element, and manages playback state (playing, paused, currentTime, duration). The AudioPlayerPanel slides up from the bottom, showing playback controls (play/pause, seek bar, download, close). This workflow covers the complete audio playback lifecycle.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Frontend (`useAudioModule`) | Manages audio playback state, Blob URL lifecycle, `<audio>` element wiring |
| Frontend (AudioPlayerPanel) | UI for playback controls (play/pause, seek, download, close) |
| Frontend (WaveformCanvas) | Renders waveform visualization during playback |
| Browser `<audio>` element | Native HTML5 audio player (hidden in DOM) |
| Blob URL (`URL.createObjectURL()`) | Creates browser-internal URL from Blob |

---

## Prerequisites

- MP3 Blob received from `/api/generate` (binary response)
- Hidden `<audio>` element exists in DOM (in `index.vue`)
- AudioPlayerPanel is rendered (conditionally visible)

---

## Trigger

`audioModule.load(blob)` is called after successful speech generation.

---

## Workflow Tree

### STEP 1: Load Audio Blob
**Actor**: `useAudioModule.load(blob)`
**Action**: Creates Blob URL via `URL.createObjectURL(blob)`; stores in `audioUrl` ref; wires to `<audio>` element via `audioRef`
**Timeout**: N/A (synchronous)
**Input**: `{ Blob (audio/mpeg) }`
**Output on SUCCESS**: Blob URL created; `audioUrl` ref set; `<audio>` element wired → GO TO STEP 2
**Output on FAILURE**: N/A (Blob URL creation should not fail)

**Observable states during this step**:
- Customer sees: N/A (internal processing)
- Operator sees: N/A
- Database: N/A
- Logs: (none)

**Resources created**: Blob URL (`URL.createObjectURL()` — tracked in `objectUrls` Set)

---

### STEP 2: Wire Event Listeners
**Actor**: `useAudioModule.wireEvents()` (called in `load()`)
**Action**: Attaches `<audio>` event listeners: `play`, `pause`, `ended`, `timeupdate`, `error`
**Timeout**: N/A (synchronous)
**Input**: `{ HTMLAudioElement }` (via `audioRef`)
**Output on SUCCESS**: Event listeners attached → WORKFLOW CONTINUES (ready to play)
**Output on FAILURE**: N/A (event attachment should not fail)

**Observable states during this step**:
- Customer sees: N/A (internal processing)
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 3: Auto-Play
**Actor**: `index.vue` (after `audioModule.load(blob)` returns)
**Action**: Calls `await nextTick()` (DOM settles), then `audioModule.play()`
**Timeout**: N/A (synchronous, except `nextTick()`)
**Input**: (none)
**Output on SUCCESS**: Audio starts playing; `isPlaying = true`; AudioPlayerPanel slides up → GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(play_blocked)`: Browser blocks autoplay (no user gesture) → audio does not play; user must click play

**Observable states during this step**:
- Customer sees: AudioPlayerPanel slides up from bottom; audio starts playing; waveform animates
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 4: Playback (Active)
**Actor**: Browser `<audio>` element (automatic)
**Action**: Audio plays; `timeupdate` events fire; waveform canvas updates; currentTime/duration refs update
**Timeout**: N/A (automatic)
**Input**: (none)
**Output on SUCCESS**: Audio continues playing → GO TO STEP 5 (pause, seek, or end)
**Output on FAILURE**:
  - `FAILURE(audio_error)`: `<audio>` element error event → `error` ref set; toast shown

**Observable states during this step**:
- Customer sees: Audio plays; waveform animates; time counter updates; play/pause button shows pause icon
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 5: User Actions (During Playback)
**Actor**: Frontend (AudioPlayerPanel + WaveformCanvas)
**Action**: User can:
  - **Pause**: Click play/pause button (pauses audio)
  - **Resume**: Click play/pause button (resumes audio)
  - **Seek**: Click on waveform canvas (seeks to position)
  - **Download**: Click download button (creates download link)
  - **Close**: Click close button (hides panel, pauses audio)

**Timeout**: N/A (synchronous)
**Input**: User actions
**Output on SUCCESS**: State updates; audio responds → GO TO STEP 4 (if playing) or STEP 6 (if ended)
**Output on FAILURE**: N/A (actions are synchronous)

**Observable states during this step**:
- Customer sees: Audio pauses/resumes/seeks; waveform updates; time counter updates
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 6: Playback Ended
**Actor**: Browser `<audio>` element (`ended` event)
**Action**: `isPlaying = false`; `isPaused = false`; `currentTime = 0`; `onPlaybackEnd` callback fires (currently no-op)
**Timeout**: N/A (automatic)
**Input**: (none)
**Output on SUCCESS**: Playback state reset → GO TO STEP 7 (post-playback)
**Output on FAILURE**: N/A (ended event is automatic)

**Observable states during this step**:
- Customer sees: Audio stops; play icon reappears; time counter resets to 0:00
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 7: Post-Playback (Idle)
**Actor**: Frontend (AudioPlayerPanel)
**Action**: Panel remains visible (audio can be re-played); user can download, close, or re-play
**Timeout**: N/A (passive)
**Input**: (none)
**Output on SUCCESS**: Panel stays visible until user closes it → WORKFLOW CONTINUES (idle state)
**Output on FAILURE**: N/A (panel visibility is passive)

**Observable states during this step**:
- Customer sees: AudioPlayerPanel stays visible; play button available; download button available; close button available
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 8: Close Panel (User Action)
**Actor**: Frontend (`handleClosePlayer()`)
**Action**: Sets `playerVisible = false`; calls `audioModule.pause()`
**Timeout**: N/A (synchronous)
**Input**: (none)
**Output on SUCCESS**: Panel slides down; audio pauses → WORKFLOW CONTINUES (panel hidden, audio paused)
**Output on FAILURE**: N/A (action is synchronous)

**Observable states during this step**:
- Customer sees: AudioPlayerPanel slides down (hides); audio pauses
- Operator sees: N/A
- Database: N/A
- Logs: (none)

---

### STEP 9: Dispose (Safety Net)
**Actor**: `index.vue` (`onUnmounted` → `audioModule.dispose()`)
**Action**: Revokes all Blob URLs; clears `<audio>` element; removes event listeners
**Timeout**: N/A (synchronous)
**Input**: (none)
**Output on SUCCESS**: All resources cleaned up → WORKFLOW COMPLETE
**Output on FAILURE**: N/A (dispose should not fail)

**Observable states during this step**:
- Customer sees: N/A (cleanup is invisible)
- Operator sees: N/A
- Database: N/A
- Logs: (none)

**Resources destroyed**: All Blob URLs (via `URL.revokeObjectURL()`); event listeners removed

---

## State Transitions

```
[Loaded] -> (play) -> [Playing]
[Playing] -> (pause) -> [Paused]
[Playing] -> (seek) -> [Playing] (at new position)
[Playing] -> (ended) -> [Ended] (state reset: isPlaying=false, currentTime=0)
[Paused] -> (play) -> [Playing]
[Ended] -> (play) -> [Playing] (re-play)
[Loaded] -> (close) -> [Closed] (panel hidden, audio paused)
[Closed] -> (play) -> [Playing] (re-play from paused position)
[Loaded] -> (dispose) -> [Disposed] (all resources cleaned up)
```

---

## Handoff Contracts

### Frontend → Browser: Audio Playback
**From**: `useAudioModule` composable
**To**: HTML5 `<audio>` element
**Payload**: Blob URL (`URL.createObjectURL(blob)`)
**Events**: `play`, `pause`, `ended`, `timeupdate`, `error`
**State exposed**: `isPlaying`, `isPaused`, `currentTime`, `duration`, `error`, `isLoading`, `audioUrl`
**Methods**: `load(blob)`, `play()`, `pause()`, `toggle()`, `seek(ratio)`, `download(filename)`, `dispose()`

---

### Frontend → Browser: Blob URL Lifecycle
**From**: `useAudioModule.load()`
**To**: Browser internal URL registry
**Payload**: `URL.createObjectURL(blob)` → string URL
**Lifetime**: Until `URL.revokeObjectURL(url)` is called
**Cleanup**: `audioModule.dispose()` revokes all tracked URLs (via `objectUrls` Set)
**Risk**: Without disposal, Blob URLs accumulate → memory leak

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Blob URL | STEP 1 (load) | STEP 9 (dispose) | `URL.revokeObjectURL(url)` |
| Event listeners | STEP 2 (wireEvents) | STEP 9 (dispose) | `audio.removeEventListener()` (per event) |
| `<audio>` element wiring | STEP 1 (load) | STEP 9 (dispose) | `audioRef.value = null` |

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: Load and play | `audioModule.load(blob)` called | Blob URL created; audio plays; panel slides up; waveform renders |
| TC-02: Pause | User clicks pause | Audio pauses; `isPaused = true`; play icon shows |
| TC-03: Resume | User clicks play (while paused) | Audio resumes; `isPlaying = true`; pause icon shows |
| TC-04: Seek | User clicks waveform canvas | Audio seeks to clicked position; waveform updates |
| TC-05: Download | User clicks download button | MP3 downloaded as `tts_output_{timestamp}.mp3` |
| TC-06: Close panel | User clicks close button | Panel slides down; audio pauses |
| TC-07: Playback ended | Audio reaches end | `isPlaying = false`; `currentTime = 0`; play icon shows |
| TC-08: Audio error | `<audio>` element error | `error` ref set; toast shown |
| TC-09: Dispose | Component unmount | All Blob URLs revoked; event listeners removed |
| TC-10: Re-play after end | Audio ended, user clicks play | Audio re-plays from beginning |
| TC-11: Re-play after pause | Audio paused, user clicks play | Audio resumes from paused position |
| TC-12: Multiple load calls | `audioModule.load(blob)` called twice | Previous Blob URL revoked; new URL created (no leak) |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | Blob URLs are properly tracked and revoked | `useAudioModule.ts:23` (`objectUrls` Set), `revokeAll()` | Without tracking, URLs leak memory |
| A2 | HTML5 `<audio>` element supports MP3 playback | HTML5 spec | Some browsers may not support MP3; WAV fallback is explicitly disabled |
| A3 | Autoplay works after user gesture (speech generation = user action) | Browser autoplay policy | If browser blocks autoplay, user must manually click play |
| A4 | `URL.createObjectURL()` returns a stable URL until revoked | Browser spec | URL is stable until revoked; no expiration |

---

## Open Questions

1. Should there be a way to queue multiple audio files for sequential playback? (Currently: one audio at a time.)

2. Should the waveform visualization render the full waveform (not just during playback)? (Currently: only renders during playback.)

3. Should there be a volume control? (Currently: no — browser default volume.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `useAudioModule.ts`, `AudioPlayerPanel.vue`, `WaveformCanvas.vue` | Documented Blob URL lifecycle; autoplay after user gesture; no volume control |
