<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'

// Reactive state
const audioRef = ref<HTMLAudioElement | null>(null)
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
    const audioEl = audioRef.value
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
  const audioEl = audioRef.value
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
  const audioEl = audioRef.value
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
    const audioEl = audioRef.value
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
  const audioEl = audioRef.value
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
  <audio data-audio-player />

  <!-- Player UI, shown only when audio is loaded -->
  <Transition name="tts-slide-up">
    <div
      v-if="hasAudio"
      class="tts-audio-player-container"
    >
      <!-- Header -->
      <div class="tts-audio__header">
        <h3 class="tts-audio__title">
          <span
            aria-hidden="true"
            class="i-lucide-headphones"
          />
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
          @seek="(ratio: number) => { const el = audioRef; if (el && duration) el.currentTime = ratio * duration }"
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
            @click="() => downloadAudio()"
          >
            <span
              aria-hidden="true"
              class="i-lucide-download"
            />
          </button>
        </div>
      </div>

      <!-- Error display -->
      <div
        v-if="error"
        class="tts-error"
      >
        <div class="tts-error__content">
          <span
            aria-hidden="true"
            class="i-lucide-badge-info tts-error__icon"
          />
          <div class="tts-error__body">
            <p class="tts-error__message">
              {{ error }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.tts-audio-player-container {
  @apply space-y-3 pt-4 border-t border-studio-700;
}

.tts-audio {
  &__header {
    @apply flex items-center justify-between;
  }

  &__title {
    @apply text-xs font-semibold text-studio-text;
  }

  &__duration {
    @apply text-[10px] font-mono text-gray-400;
  }

  &__container {
    @apply bg-studio-900 rounded-xl p-4 space-y-2.5;
  }

  &__time {
    @apply flex justify-between text-[10px] font-mono text-gray-500;
  }

  &__controls {
    @apply flex items-center justify-center gap-3;
  }

  &__download-btn {
    @apply w-9 h-9 rounded-full bg-studio-900 hover:bg-studio-700 text-gray-400 hover:text-white flex items-center justify-center active:scale-95;
    transition: background-color, transform 0.2s ease;

    .i-lucide-download {
      @apply w-4 h-4;
    }
  }
}

.tts-error {
  @apply mt-3;

  &__content {
    @apply flex items-center gap-2;
  }

  &__icon {
    @apply text-red-400 text-lg;
  }

  &__body {
    @apply flex-1;
  }

  &__message {
    @apply text-sm text-red-200;
  }
}
</style>
