import { ref, watch, shallowRef, type Ref } from 'vue'

export interface AudioModuleOptions {
  onPlaybackEnd?: () => void
}

export function useAudioModule(options: AudioModuleOptions = {}) {
  const isPlaying = shallowRef(false)
  const isPaused = shallowRef(false)
  const currentTime = shallowRef(0)
  const duration = shallowRef(0)
  const error = ref<string | null>(null)
  const isLoading = shallowRef(false)
  const audioUrl = shallowRef<string | null>(null)

  // ── Internal refs ────────────────────────────────
  const blobRef = ref<Blob | null>(null)
  let currentObjectUrl: string | null = null
  let downloadUrlRef: string | null = null
  const audioRef = ref<HTMLAudioElement | null>(null) as Ref<HTMLAudioElement | null>

  function revokePrevious() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
      currentObjectUrl = null
    }
    blobRef.value = null
  }

  function load(blob: Blob) {
    revokePrevious()
    blobRef.value = blob
    const url = URL.createObjectURL(blob)
    currentObjectUrl = url
    audioUrl.value = url
    isLoading.value = true
    error.value = null
  }

  async function play() {
    if (!audioRef.value) return
    try {
      await audioRef.value.play()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      error.value = `Unable to play audio: ${msg}`
    }
  }

  function pause() {
    if (audioRef.value) {
      audioRef.value.pause()
      isPlaying.value = false
    }
  }

  async function toggle() {
    if (!audioRef.value) return
    if (isPlaying.value && !isPaused.value) {
      pause()
    } else {
      await play()
    }
  }

  function seek(ratio: number) {
    if (!audioRef.value || !duration.value) return
    audioRef.value.currentTime = ratio * duration.value
  }

  function download(filename?: string) {
    if (!blobRef.value) return
    const url = URL.createObjectURL(blobRef.value)
    downloadUrlRef = url
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `tts_output_${Date.now()}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

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
      if (audioRef.value) {
        audioRef.value.currentTime = 0
      }
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

  watch(audioRef, (el) => {
    if (el) {
      wireEvents()
      const url = audioUrl.value
      if (url) {
        el.src = url
      }
    }
  })

  function dispose() {
    revokePrevious()
    if (downloadUrlRef) {
      URL.revokeObjectURL(downloadUrlRef)
      downloadUrlRef = null
    }
    if (audioRef.value) {
      audioRef.value.src = ''
    }
  }

  return {
    // State
    isPlaying, isPaused, currentTime, duration,
    audioUrl, error,

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
