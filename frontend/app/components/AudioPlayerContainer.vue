<script setup lang="ts">
import { useAudioPlayer } from '../composables/useAudioPlayer'
import { useTimeDisplay } from '../composables/useTimeDisplay'
import PlayPauseButton from './PlayPauseButton.vue'
import SeekableProgressBar from './SeekableProgressBar.vue'
import TimeDisplay from './TimeDisplay.vue'
import DownloadButton from './DownloadButton.vue'

const {
  audioRef,
  duration,
  currentTime,
  isPlaying,
  isPaused,
  isLoading,
  audioUrl,
  downloadAudio
} = useAudioPlayer()

const { formatTime } = useTimeDisplay()

const emit = defineEmits<{
  toggle: []
}>()

function handleDownload() {
  downloadAudio(`tts_output_${Date.now()}.mp3`)
}

function handleSeek(ratio: number) {
  if (audioRef.value && duration.value) {
    audioRef.value.currentTime = ratio * duration.value
  }
}
</script>

<template>
  <Transition name="tts-slide-up">
    <div v-if="audioUrl" class="tts-audio-player-container">
      <!-- Header -->
      <div class="tts-audio__header">
        <h3 class="tts-audio__title">
          <span aria-hidden="true" class="i-lucide-headphones" />
          Result
        </h3>
        <span class="tts-audio__duration">{{ formatTime(duration) }}</span>
      </div>

      <!-- Hidden audio element -->
      <audio ref="audioRef" class="hidden" />

      <!-- Controls -->
      <div class="tts-audio__container">
        <!-- Progress Bar -->
        <SeekableProgressBar
          :current-time="currentTime"
          :duration="duration"
          @seek="handleSeek"
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
            @toggle="$emit('toggle')"
          />

          <DownloadButton @click="handleDownload" />
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
}

.hidden {
  @apply hidden;
}
</style>
