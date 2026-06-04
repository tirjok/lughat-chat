<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'

// Reactive state
const audioSrc = ref<string | null>(null)
const isPlaying = ref(false)
const isPaused = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const duration = ref(0)
const currentTime = ref(0)

// Format time in MM:SS format
function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Cleanup blob URL on unmount
onUnmounted(() => {
  if (audioSrc.value) {
    URL.revokeObjectURL(audioSrc.value)
  }
})

// Load audio from blob and auto-play
async function loadAudio(blob: Blob): Promise<void> {
  // Reset state
  error.value = null
  isLoading.value = true
  currentTime.value = 0

  // Revoke previous URL if exists
  if (audioSrc.value) {
    URL.revokeObjectURL(audioSrc.value)
  }

  // Create new blob URL
  const url = URL.createObjectURL(blob)
  audioSrc.value = url

  // Create a temporary audio element to wait for metadata
  const tempAudio = document.createElement('audio')
  tempAudio.src = url

  await new Promise<void>((resolve) => {
    const onLoaded = () => {
      tempAudio.removeEventListener('loadedmetadata', onLoaded)
      resolve()
    }

    const onError = () => {
      tempAudio.removeEventListener('error', onError)
      error.value = 'Failed to load audio'
      isLoading.value = false
      resolve()
    }

    tempAudio.addEventListener('loadedmetadata', onLoaded)
    tempAudio.addEventListener('error', onError)

    // Fallback timeout
    setTimeout(resolve, 5000)
  })

  duration.value = tempAudio.duration
  isLoading.value = false

  // Auto-play using the real audio element
  try {
    const audioEl = document.querySelector('audio[data-audio-player]') as HTMLAudioElement | null
    if (audioEl) {
      audioEl.src = url
      await audioEl.play()
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    error.value = `Failed to play audio: ${message}`
  }

  // Clean up temp element
  tempAudio.remove()
}

// Play audio
async function play(): Promise<void> {
  const audioEl = document.querySelector('audio[data-audio-player]') as HTMLAudioElement | null
  if (!audioEl) return

  try {
    await audioEl.play()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    error.value = `Failed to play audio: ${message}`
  }
}

// Pause audio
function pause(): void {
  const audioEl = document.querySelector('audio[data-audio-player]') as HTMLAudioElement | null
  audioEl?.pause()
}

// Toggle play/pause
function togglePlayPause(): void {
  if (isPlaying.value && !isPaused.value) {
    pause()
  } else {
    play()
  }
}

// Download audio as WAV file
function downloadAudio(filename?: string): void {
  if (!audioSrc.value) return

  const link = document.createElement('a')
  link.href = audioSrc.value
  link.download = filename || `tts_output_${Date.now()}.mp3`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Expose methods and state for parent to use
defineExpose({
  loadAudio,
  play,
  pause,
  togglePlayPause,
  downloadAudio,
  isPlaying,
  isPaused,
  isLoading,
  error,
  duration,
  currentTime
})

// Computed for v-if condition
const hasAudio = computed(() => !!audioSrc.value)

// Interval-based progress update (more reliable than timeupdate event)
let progressInterval: ReturnType<typeof setInterval> | null = null

function startProgressTracking(): void {
  stopProgressTracking()
  progressInterval = setInterval(() => {
    const audioEl = document.querySelector('audio[data-audio-player]') as HTMLAudioElement | null
    if (audioEl) {
      currentTime.value = audioEl.currentTime
      isPlaying.value = !audioEl.paused && !audioEl.ended
      isPaused.value = audioEl.paused && currentTime.value > 0

      if (audioEl.ended) {
        isPlaying.value = false
        isPaused.value = false
        currentTime.value = 0
      }
    }
  }, 100) // Update every 100ms for smooth progress bar
}

function stopProgressTracking(): void {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
}

// Watch src changes to update the real audio element and start progress tracking
watch(audioSrc, (newSrc) => {
  if (!newSrc) return
  const audioEl = document.querySelector('audio[data-audio-player]') as HTMLAudioElement | null
  if (audioEl && audioEl.src !== newSrc) {
    audioEl.src = newSrc
  }
  startProgressTracking()
})

// Cleanup on unmount
onUnmounted(() => {
  stopProgressTracking()
})
</script>

<template>
  <!-- Hidden audio element, always mounted -->
  <audio data-audio-player class="hidden" />

  <!-- Player UI, shown only when audio is loaded -->
  <Transition name="tts-slide-up">
    <div v-if="hasAudio" class="tts-audio-player-container">
      <!-- Header -->
      <div class="tts-audio__header">
        <h3 class="tts-audio__title">
          <span class="i-lucide-headphones" />
          Result
        </h3>
        <span class="tts-audio__duration">{{ formatTime(duration) }}</span>
      </div>

      <!-- Controls -->
      <div class="tts-audio__container">
        <!-- Progress Bar -->
        <SeekableProgressBar
          :current-time="currentTime"
          :duration="duration"
          @seek="(ratio: number) => { const audioEl = document.querySelector('audio[data-audio-player]') as HTMLAudioElement | null; if (audioEl && duration) audioEl.currentTime = ratio * duration }"
        />

        <!-- Time Display -->
        <TimeDisplay
          :current-time="currentTime"
          :duration="duration"
        />

        <!-- Control Buttons -->
        <div class="tts-audio__controls">
          <PlayPauseButton
            :is-playing="isPlaying"
            :is-paused="isPaused"
            :is-loading="isLoading"
            @toggle="togglePlayPause"
          />

          <button
            class="tts-audio__download-btn"
            @click="downloadAudio"
          >
            <span class="i-lucide-download" />
          </button>
        </div>
      </div>

      <!-- Error display -->
      <div v-if="error" class="tts-error">
        <div class="tts-error__content">
          <span class="i-lucide-alert-circle tts-error__icon" />
          <div class="tts-error__body">
            <p class="tts-error__message">{{ error }}</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.tts-audio-player-container {
  @apply space-y-3 pt-4 border-t border-gray-200/60 dark:border-gray-700/60;
}

.tts-audio {
  &__header {
    @apply flex items-center justify-between;
  }

  &__title {
    @apply text-xs font-semibold text-gray-700 dark:text-gray-300;
  }

  &__duration {
    @apply text-[10px] font-mono text-gray-400 dark:text-gray-500;
  }

  &__container {
    @apply bg-gray-50/60 dark:bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 space-y-2.5;
  }

  &__time {
    @apply flex justify-between text-[10px] font-mono text-gray-500 dark:text-gray-400;
  }

  &__controls {
    @apply flex items-center justify-center gap-3;
  }

  &__download-btn {
    @apply w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-all active:scale-95;

    .i-lucide-download {
      @apply w-4 h-4;
    }
  }
}

.hidden {
  @apply hidden;
}
</style>
