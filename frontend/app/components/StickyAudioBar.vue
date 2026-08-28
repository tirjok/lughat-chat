<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'

interface Props {
  active?: boolean
  textContent?: string
  isPlaying?: boolean
  isPaused?: boolean
  shortcutsEnabled?: boolean
  speedValue?: number
  repeatMode?: 'off' | 'one' | 'all'
  currentTime?: number
  duration?: number
}

interface Emits {
  (e: 'close' | 'toggle' | 'prevTrack' | 'nextTrack' | 'download'): void
  (e: 'seek' | 'speedChange', value: number): void
  (e: 'repeatChange', mode: 'off' | 'one' | 'all'): void
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  textContent: '',
  isPlaying: false,
  isPaused: false,
  shortcutsEnabled: false,
  speedValue: 1.0,
  repeatMode: 'off',
  currentTime: 0,
  duration: 0
})

const emit = defineEmits<Emits>()

type Speed = 0.75 | 1.0 | 1.25
const speeds: Speed[] = [0.75, 1.0, 1.25]

const currentSpeedIndex = computed<0 | 1 | 2>(() => {
  const idx = speeds.indexOf(props.speedValue as Speed)
  return (idx >= 0 ? idx : 1) as 0 | 1 | 2
})

const currentSpeed = computed<Speed>(() => speeds[currentSpeedIndex.value] as Speed)

const speedNext = () => {
  const nextIdx = (currentSpeedIndex.value + 1) % speeds.length
  emit('speedChange', speeds[nextIdx] as Speed)
}

const repeatNext = () => {
  const order = ['off', 'one', 'all'] as const
  const currentIdx = order.indexOf(props.repeatMode)
  const nextIdx = (currentIdx + 1) % order.length
  emit('repeatChange', order[nextIdx as 0 | 1 | 2])
}

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formattedCurrentTime = computed(() => formatTime(props.currentTime))
const formattedDurationTime = computed(() => formatTime(props.duration))

const progressPercent = computed(() => {
  if (!props.duration) return 0
  return Math.min(100, (props.currentTime / props.duration) * 100)
})

const displayText = computed(() => props.textContent || 'Generating...')

const isPlaying = computed(() => props.isPlaying && !props.isPaused)

// Keyboard shortcuts (AC-7)
const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    // Allow Ctrl/Cmd+Enter as a toggle shortcut even with modifiers
    if (e.key === 'Enter') {
      e.preventDefault()
      emit('toggle')
      return
    }
    return
  }

  switch (e.key) {
    case ' ':
      e.preventDefault()
      emit('toggle')
      break
    case 'ArrowLeft':
      e.preventDefault()
      emit('seek', Math.max(0, (props.currentTime / (props.duration || 1)) - 0.05))
      break
    case 'ArrowRight':
      e.preventDefault()
      emit('seek', Math.min(1, (props.currentTime / (props.duration || 1)) + 0.05))
      break
    case 'Escape':
      e.preventDefault()
      emit('close')
      break
  }
}

onMounted(() => {
  if (props.shortcutsEnabled) {
    window.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (props.shortcutsEnabled) {
    window.removeEventListener('keydown', handleKeydown)
  }
})

// Expose keyboard handler for testing
defineExpose({
  handleKeydown
})
</script>

<template>
  <!--
    StickyAudioBar: Fixed bottom bar that slides up when active.
    Three-section layout: left controls | center (waveform/time) | right controls.
  -->
  <div
    data-testid="sticky-bar"
    role="region"
    aria-label="Audio playback controls"
    class="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-2 px-3 py-2 border-t transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700"
    :class="active ? 'translate-y-0' : 'translate-y-full'"
  >
    <!-- Left Controls: prev / play-pause -->
    <div
      data-testid="controls-left"
      class="flex items-center gap-2 shrink-0"
    >
      <!-- Previous track -->
      <button
        data-testid="prev-button"
        data-icon="prev"
        aria-label="Previous track"
        class="w-10 h-10 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        @click="emit('prevTrack')"
      >
        <span
          class="ph-fill ph-skip-back text-xl"
          aria-hidden="true"
        />
      </button>

      <!-- Play / Pause (primary-600, 44px) -->
      <button
        data-testid="play-pause-button"
        data-icon="play"
        :aria-label="isPlaying ? 'Pause' : 'Play'"
        class="bg-primary-600 rounded-full w-11 h-11 flex items-center justify-center text-white shadow-[0_0_16px_rgba(221,36,118,0.3)] hover:scale-[1.04] active:scale-[0.96] transition-all duration-300"
        @click="emit('toggle')"
      >
        <span
          v-if="isPlaying"
          data-icon="pause"
          class="ph-fill ph-pause text-xl"
          aria-hidden="true"
        />
        <span
          v-else
          data-icon="play"
          class="ph-fill ph-play text-xl"
          aria-hidden="true"
        />
      </button>

      <!-- Next track -->
      <button
        data-testid="next-button"
        data-icon="next"
        aria-label="Next track"
        class="w-10 h-10 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        @click="emit('nextTrack')"
      >
        <span
          class="ph-fill ph-skip-forward text-xl"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- Center: Arabic text + wave animation + progress bar + time -->
    <div
      data-testid="controls-center"
      class="flex-1 flex items-center gap-3 min-w-0"
    >
      <!-- Arabic text (RTL) -->
      <div
        data-testid="arabic-text"
        class="rtl text-sm font-semibold text-stone-800 dark:text-stone-200 truncate"
      >
        {{ displayText }}
      </div>

      <!-- Wave animation (visible when playing) -->
      <div
        data-testid="wave-animation"
        class="flex items-center gap-0.5 shrink-0"
        :class="{ playing: isPlaying }"
        aria-hidden="true"
      >
        <span
          v-for="i in 5"
          :key="i"
          class="w-0.5 rounded-full bg-primary-500 dark:bg-primary-400"
        />
      </div>

      <!-- Progress bar -->
      <div
        role="slider"
        aria-label="Seek"
        :aria-valuenow="Math.round(progressPercent)"
        aria-valuemin="0"
        aria-valuemax="100"
        :class="isPlaying ? 'playing' : ''"
        data-testid="progress-bar"
        class="flex-1 h-8 bg-stone-300 dark:bg-stone-600 rounded-full cursor-pointer relative group flex items-center"
        @click="emit('seek', progressPercent / 100)"
      >
        <div
          data-testid="progress-fill"
          class="h-1.5 primary-600 rounded-full"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>

      <!-- Time display -->
      <span
        data-testid="current-time"
        class="text-xs font-mono text-stone-500 dark:text-stone-400 shrink-0 w-10 text-right"
      >
        {{ formattedCurrentTime }}
      </span>
      <span class="text-xs font-mono text-stone-400 dark:text-stone-500 shrink-0 w-10 text-right">
        /
      </span>
      <span
        data-testid="duration-time"
        class="text-xs font-mono text-stone-400 dark:text-stone-500 shrink-0 w-10 text-right"
      >
        {{ formattedDurationTime }}
      </span>
    </div>

    <!-- Right Controls: speed / repeat / close -->
    <div
      data-testid="controls-right"
      class="flex items-center gap-2 shrink-0"
    >
      <!-- Speed toggle -->
      <button
        data-testid="speed-toggle"
        aria-label="Toggle speed"
        class="text-xs font-mono text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors px-2 py-1 rounded"
        @click="speedNext"
      >
        {{ currentSpeed.toFixed(1) }}x
      </button>

      <!-- Repeat -->
      <button
        data-testid="repeat-button"
        aria-label="Repeat mode"
        class="relative flex items-center justify-center w-9 h-9 rounded-full text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        :class="{ active: repeatMode !== 'off' }"
        @click="repeatNext"
      >
        <span
          class="ph-fill ph-repeat text-lg"
          aria-hidden="true"
        />
        <span
          v-if="repeatMode === 'one'"
          class="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-primary-600 bg-stone-100 dark:bg-stone-800 rounded-full w-3.5 h-3.5 flex items-center justify-center"
        >
          1
        </span>
        <span
          v-else-if="repeatMode === 'all'"
          class="absolute -top-0.5 -right-0.5 text-[8px] text-primary-600 bg-stone-100 dark:bg-stone-800 rounded-full w-3.5 h-3.5 flex items-center justify-center"
        >
          ∞
        </span>
      </button>

      <!-- Download -->
      <button
        data-testid="download-button"
        aria-label="Download"
        class="w-9 h-9 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        @click="emit('download')"
      >
        <span
          class="ph-fill ph-download text-lg"
          aria-hidden="true"
        />
      </button>

      <!-- Close -->
      <button
        data-testid="close-button"
        aria-label="Close"
        class="w-9 h-9 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        @click="emit('close')"
      >
        <span
          class="ph-fill ph-x text-lg"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Wave animation bars */
@keyframes wave-bar {
  0%, 100% { height: 8px; }
  50% { height: 20px; }
}

.playing span {
  animation: wave-bar 0.8s ease-in-out infinite;
}

.playing span:nth-child(2) {
  animation-delay: 0.1s;
}

.playing span:nth-child(3) {
  animation-delay: 0.2s;
}

.playing span:nth-child(4) {
  animation-delay: 0.3s;
}

.playing span:nth-child(5) {
  animation-delay: 0.4s;
}

/* Repeat button active state */
.active {
  color: rgb(221 36 118);
}
</style>
