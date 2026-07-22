import { nextTick, ref, computed } from 'vue'
import { useObjectUrl, useMediaControls } from '@vueuse/core'

export interface AudioModuleOptions {
  onPlaybackEnd?: () => void
}

export function useAudioModule(_options: AudioModuleOptions = {}) {
  // ── Internal refs ────────────────────────────────
  const blobRef = ref<Blob | null>(null)
  const audioRef = ref<HTMLAudioElement | null>(null)

  // VueUse: reactive URL from blob (auto-creates + revokes object URLs)
  const audioUrl = useObjectUrl(blobRef)

  // VueUse: reactive media controls — playing, currentTime, duration, waiting, ended
  const {
    playing,
    currentTime,
    duration,
    waiting,
    ended,
    onSourceError,
    onPlaybackError
  } = useMediaControls(audioRef, { src: computed(() => audioUrl.value ?? '') })
  // ── Load: blob → objectURL (triggers useObjectUrl + useMediaControls) ──
  function load(blob: Blob) {
    // Create an <audio> element and assign it to audioRef if not already set
    if (!audioRef.value) {
      audioRef.value = document.createElement('audio')
    }
    blobRef.value = blob
  }
  // ── Play ─────────────────────────────────────────
  async function play() {
    await nextTick()
    if (!audioRef.value) return
    try {
      playing.value = true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      error.value = `Unable to play audio: ${msg}`
    }
  }

  // ── Pause ────────────────────────────────────────
  function pause() {
    playing.value = false
  }

  // ── Toggle play/pause ────────────────────────────
  async function toggle() {
    await nextTick()
    if (!audioRef.value) return
    playing.value = !playing.value
  }

  // ── Seek ─────────────────────────────────────────
  function seek(ratio: number) {
    if (!audioRef.value || !duration.value) return
    currentTime.value = ratio * duration.value
  }

  // ── Download (unchanged — uses blobRef directly) ──
  function download(filename?: string) {
    if (!blobRef.value) return
    const url = URL.createObjectURL(blobRef.value)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `tts_output_${Date.now()}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  // ── Error state (from VueUse error events) ───────
  const error = ref<string | null>(null)

  onSourceError(() => {
    error.value = 'Failed to load audio'
  })
  onPlaybackError(() => {
    error.value = 'Playback error occurred'
  })

  // ── Dispose: safety net (caller may or may not use)
  function dispose() {
    blobRef.value = null
    if (audioRef.value) {
      audioRef.value.src = ''
    }
  }

  // ── Expose (maintain API compat with callers) ────
  return {
    // State — delegates to VueUse refs
    get isPlaying() { return playing.value },
    get isPaused() { return !playing.value && !ended.value },
    get currentTime() { return currentTime.value },
    get duration() { return duration.value },
    get audioUrl() { return audioUrl.value ?? null },
    get error() { return error.value },
    get isLoading() { return waiting.value },

    // Template binding
    audioRef,

    // Actions
    load,
    play,
    pause,
    toggle,
    seek,
    download,

    // Safety net
    dispose
  }
}
