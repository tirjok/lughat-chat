import { ref, watch } from 'vue'

// Composable for audio playback and blob management

export interface UseAudioPlayerOptions {
  onPlaybackEnd?: () => void
}

// Composable for managing audio playback state
export const useAudioPlayer = (options: UseAudioPlayerOptions = {}) => {
  // Refs for audio element and state
  const audioRef = ref<HTMLAudioElement | null>(null)
  const audioUrl = ref<string | null>(null)
  const blobRef = ref<Blob | null>(null)

  // State tracking
  const isPlaying = ref(false)
  const isPaused = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const duration = ref<number>(0)
  const currentTime = ref<number>(0)

  // Cleanup function to prevent memory leaks
  function cleanup() {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
      audioUrl.value = null
    }
    blobRef.value = null
    isPlaying.value = false
    isPaused.value = false
  }

  // Load audio from blob (returned by API)
  function loadAudio(blob: Blob): string {
    // Cleanup previous audio URL if exists
    cleanup()

    // Create object URL from blob
    const url = URL.createObjectURL(blob)
    audioUrl.value = url
    blobRef.value = blob

    return url
  }

  // Play audio
  async function play() {
    if (audioRef.value) {
      try {
        await audioRef.value.play()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        error.value = `Unable to play audio: ${message}`
      }
    }
  }

  // Pause audio
  function pause() {
    if (audioRef.value) {
      audioRef.value.pause()
    }
  }

  // Toggle play/pause
  function togglePlayPause() {
    if (isPlaying.value && !isPaused.value) {
      pause()
    } else {
      play()
    }
  }

  // Get download URL for the audio blob
  function getDownloadUrl(): string | null {
    if (!blobRef.value) return null
    return URL.createObjectURL(blobRef.value)
  }

  // Download audio as WAV file
  function downloadAudio(filename?: string) {
    if (!blobRef.value) return

    const url = getDownloadUrl()
    if (!url) return

    const link = document.createElement('a')
    link.href = url
    link.download = filename || `tts_output_${Date.now()}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Cleanup after a short delay to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  // Handle audio element events
  function setupAudioEvents() {
    const audio = audioRef.value
    if (!audio) return

    // Duration loaded
    audio.addEventListener('loadedmetadata', () => {
      duration.value = audio.duration
      isLoading.value = false
    })

    // Time update during playback
    audio.addEventListener('timeupdate', () => {
      currentTime.value = audio.currentTime
    })

    // Playback ended
    audio.addEventListener('ended', () => {
      isPlaying.value = false
      isPaused.value = false
      if (options.onPlaybackEnd) {
        options.onPlaybackEnd()
      }
    })

    // Error handling
    audio.addEventListener('error', () => {
      error.value = 'Failed to load audio'
      isLoading.value = false
    })

    // Loading state
    audio.addEventListener('loadstart', () => {
      isLoading.value = true
    })

    // Play/Pause state changes
    audio.addEventListener('play', () => {
      isPlaying.value = true
      isPaused.value = false
    })

    audio.addEventListener('pause', () => {
      isPaused.value = true
    })
  }

  // Watch for audio URL changes to setup events
  watch(audioUrl, (newUrl) => {
    if (newUrl && audioRef.value) {
      setupAudioEvents()
      // Load the audio source
      audioRef.value.src = newUrl
    }
  })

  return {
    // Refs for template binding
    audioRef,
    audioUrl,
    blobRef,
    duration,
    currentTime,

    // State
    isPlaying,
    isPaused,
    isLoading,
    error,

    // Methods
    loadAudio,
    play,
    pause,
    togglePlayPause,
    getDownloadUrl,
    downloadAudio,

    // Cleanup (call on component unmount)
    cleanup
  }
}
