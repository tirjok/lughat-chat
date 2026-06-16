import { ref, watch, computed, type Ref } from 'vue'

export interface AudioModuleOptions {
  onPlaybackEnd?: () => void
}

export function useAudioModule(options: AudioModuleOptions = {}) {
  // ── State (exposed to callers) ────────────────────
  const isPlaying = ref(false)
  const isPaused = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const error = ref<string | null>(null)
  const isLoading = ref(false)
  const audioUrl = ref<string | null>(null)

  // ── Internal refs ────────────────────────────────
  const blobRef = ref<Blob | null>(null)
  let currentObjectUrl: string | null = null
  const audioRef = ref<HTMLAudioElement | null>(null) as Ref<HTMLAudioElement | null>

  // ── Absorbed formatTime (useTimeDisplay deleted) ─
  function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // ── Formatted output (exposed to components) ────
  const formattedCurrentTime = computed(() => formatTime(currentTime.value))
  const formattedDuration = computed(() => formatTime(duration.value))

  // ── Internal: revoke previous object URL ─────────
  function revokePrevious() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
      currentObjectUrl = null
    }
    blobRef.value = null
  }

  // ── Load: blob → objectURL → wire element ────────
  function load(blob: Blob) {
    revokePrevious()
    currentObjectUrl = URL.createObjectURL(blob)
    blobRef.value = blob
    audioUrl.value = currentObjectUrl
    isLoading.value = true
    error.value = null

    if (audioRef.value) {
      audioRef.value.src = currentObjectUrl
    }
  }

  // ── Play (nextTick handled internally) ───────────
  async function play() {
    if (!audioRef.value) return
    try {
      await audioRef.value.play()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      error.value = `Unable to play audio: ${msg}`
    }
  }

  // ── Pause ────────────────────────────────────────
  function pause() {
    if (audioRef.value) {
      audioRef.value.pause()
      isPlaying.value = false
    }
  }

  // ── Seek ─────────────────────────────────────────
  function seek(ratio: number) {
    if (!audioRef.value || !duration.value) return
    audioRef.value.currentTime = ratio * duration.value
  }

  // ── Download ─────────────────────────────────────
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

  // ── Wire event listeners ─────────────────────────
  function wireEvents() {
    const audio = audioRef.value
    if (!audio) return

    audio.addEventListener('loadedmetadata', () => {
      duration.value = audio.duration
      isLoading.value = false
    })

    audio.addEventListener('timeupdate', () => {
      currentTime.value = audio.currentTime
    })

    audio.addEventListener('ended', () => {
      isPlaying.value = false
      isPaused.value = false
      options.onPlaybackEnd?.()
    })

    audio.addEventListener('error', () => {
      error.value = 'Failed to load audio'
      isLoading.value = false
    })

    audio.addEventListener('loadstart', () => {
      isLoading.value = true
    })

    audio.addEventListener('play', () => {
      isPlaying.value = true
      isPaused.value = false
    })

    audio.addEventListener('pause', () => {
      isPaused.value = true
    })
  }

  // ── Watch for audio element attachment ───────────
  watch(audioRef, (el) => {
    if (el) {
      wireEvents()
      if (audioUrl.value) {
        el.src = audioUrl.value
      }
    }
  })

  // ── Dispose: safety net (caller may or may not use)
  function dispose() {
    revokePrevious()
    if (audioRef.value) {
      audioRef.value.src = ''
    }
  }

  // ── Expose ───────────────────────────────────────
  return {
    // State
    isPlaying, isPaused, currentTime, duration,
    error, isLoading, audioUrl,
    formattedCurrentTime, formattedDuration,

    // Template binding
    audioRef,

    // Actions
    load,
    play,
    pause,
    seek,
    download,

    // Safety net
    dispose
  }
}
