<script setup lang="ts">
import { computed, watch, useTemplateRef } from 'vue'
import { onKeyStroke } from '@vueuse/core'
import { animate } from '@motionone/vue'

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

const barRef = useTemplateRef<HTMLDivElement | null>('barRef')
let currentAnimation: ReturnType<typeof animate> | null = null

type Speed = 0.75 | 1.0 | 1.25
const speeds: Speed[] = [0.75, 1.0, 1.25]

const currentSpeedIndex = computed<0 | 1 | 2>(() => {
  const idx = speeds.indexOf(props.speedValue as Speed)
  return (idx >= 0 ? idx : 1) as 0 | 1 | 2
})

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

// Keyboard shortcuts via VueUse onKeyStroke (AC-7)
let stopHandlers: (() => void)[] = []

function registerKeyHandler(key: string, handler: (e: KeyboardEvent) => void): void {
  stopHandlers.push(onKeyStroke(key, handler, { eventName: 'keydown' }))
}

function bindShortcuts(): void {
  registerKeyHandler(' ', (e) => {
    // Ignore space when modifier keys are held (shortcut passthrough)
    if (e.ctrlKey || e.metaKey || e.shiftKey) return
    e.preventDefault()
    emit('toggle')
  })
  registerKeyHandler('Enter', (e) => {
    // Only trigger toggle for Ctrl+Enter or Cmd+Enter
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    emit('toggle')
  })
  registerKeyHandler('ArrowLeft', (e) => {
    e.preventDefault()
    emit('seek', Math.max(0, (props.currentTime / (props.duration || 1)) - 0.05))
  })
  registerKeyHandler('ArrowRight', (e) => {
    e.preventDefault()
    emit('seek', Math.min(1, (props.currentTime / (props.duration || 1)) + 0.05))
  })
  registerKeyHandler('Escape', (e) => {
    e.preventDefault()
    emit('close')
  })
}

function unbindShortcuts(): void {
  stopHandlers.forEach(stop => stop())
  stopHandlers = []
}

watch(() => props.shortcutsEnabled, (enabled) => {
  if (enabled) {
    bindShortcuts()
  } else {
    unbindShortcuts()
  }
}, { immediate: true })

// MotionOne animation for bar visibility
watch(() => props.active, (active) => {
  const el = barRef.value
  if (!el) return

  // Cancel any in-flight animation
  currentAnimation?.cancel()

  if (active) {
    // Show: spring from below to visible position
    currentAnimation = animate(el,
      { y: '100%', opacity: 0 },
      {
        y: 0,
        opacity: 1,
        type: 'spring',
        stiffness: 200,
        damping: 22,
        restDelta: 0.1,
        duration: 0.4,
        reduceMotion: 'instant'
      }
    )
  } else {
    // Hide: spring down with fade
    currentAnimation = animate(el,
      { y: 0, opacity: 1 },
      {
        y: '100%',
        opacity: 0,
        type: 'spring',
        stiffness: 200,
        damping: 22,
        restDelta: 0.1,
        duration: 0.3,
        reduceMotion: 'instant'
      }
    )
  }
}, { immediate: true })

// Expose keyboard handler for testing
function handleKeydown(e: KeyboardEvent): void {
  // Delegate keyboard events to the registered handlers.
  // This allows tests to dispatch events directly on the component instance
  // without relying on window-level event dispatch.
  const { key, ctrlKey, metaKey, shiftKey } = e

  // Space: toggle (only without modifiers)
  if (key === ' ') {
    if (!ctrlKey && !metaKey && !shiftKey) {
      e.preventDefault()
      emit('toggle')
    }
    return
  }

  // Enter: Ctrl+Enter or Cmd+Enter → toggle
  if (key === 'Enter') {
    if (ctrlKey || metaKey) {
      e.preventDefault()
      emit('toggle')
    }
    return
  }

  // ArrowLeft: seek backward
  if (key === 'ArrowLeft') {
    e.preventDefault()
    emit('seek', Math.max(0, (props.currentTime / (props.duration || 1)) - 0.05))
    return
  }

  // ArrowRight: seek forward
  if (key === 'ArrowRight') {
    e.preventDefault()
    emit('seek', Math.min(1, (props.currentTime / (props.duration || 1)) + 0.05))
    return
  }

  // Escape: close bar
  if (key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }
}

defineExpose({
  bindShortcuts,
  unbindShortcuts,
  handleKeydown
})
</script>

<template>
  <!--
    StickyAudioBar: Fixed bottom bar that springs into view when active.
    Three-section layout: left controls | center (waveform/time) | right controls.
  -->
  <div
    ref="barRef"
    data-testid="sticky-bar"
    role="region"
    aria-label="Audio playback controls"
    class="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-2 px-3 py-2 border-t bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700"
    :class="active ? 'translate-y-0' : 'translate-y-full'"
  >
    <!-- Left Controls: prev / play-pause -->
    <div
      class="flex items-center gap-2"
      data-testid="controls-left"
    >
      <!-- Prev button -->
      <button
        class="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-700/70 cursor-pointer"
        data-testid="prev-button"
        data-icon="prev"
        aria-label="Previous track"
        @click="emit('prevTrack')"
      >
        <span class="ph-fill ph-skip-left text-lg" />
      </button>

      <!-- Play/Pause button -->
      <button
        class="w-11 h-11 rounded-full flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white cursor-pointer shadow-[0_4px_12px_rgba(20,184,166,0.3)]"
        data-testid="play-pause-button"
        aria-label="Play/Pause"
        @click="emit('toggle')"
      >
        <span
          class="ph-fill ph-play text-xl"
          :class="{ hidden: isPlaying && !isPaused }"
        />
        <span
          class="ph-fill ph-pause text-xl"
          :class="{ hidden: !isPlaying || isPaused }"
        />
      </button>
      <!-- Next button -->
      <button
        class="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-700/70 cursor-pointer"
        data-testid="next-button"
        data-icon="next"
        aria-label="Next track"
        @click="emit('nextTrack')"
      >
        <span class="ph-fill ph-skip-right text-lg" />
      </button>

      <!-- Download button -->
      <button
        class="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-700/70 cursor-pointer"
        data-testid="download-button"
        aria-label="Download audio"
        @click="emit('download')"
      >
        <span class="ph-fill ph-download-simple text-lg" />
      </button>
    </div>

    <!-- Center: Arabic text + wave animation + progress bar + time -->
    <div
      class="flex-1 flex flex-col items-center gap-1 min-w-0 px-2"
      data-testid="controls-center"
    >
      <!-- Arabic text (truncated) -->
      <p
        class="text-sm text-stone-700 dark:text-gray-300 font-arabic truncate max-w-[240px] text-center"
        data-testid="arabic-text"
        dir="rtl"
      >
        {{ displayText }}
      </p>

      <!-- Waveform + time -->
      <div class="flex items-center gap-3 w-full">
        <!-- Waveform bars -->
        <div
          class="flex items-end gap-0.5 h-5"
          data-testid="wave-animation"
          :class="{ playing: isPlaying && !isPaused }"
        >
          <span class="w-1 rounded-full bg-primary-500" />
          <span class="w-1 rounded-full bg-primary-500" />
          <span class="w-1 rounded-full bg-primary-500" />
          <span class="w-1 rounded-full bg-primary-500" />
          <span class="w-1 rounded-full bg-primary-500" />
        </div>

        <!-- Progress bar -->
        <div
          class="flex-1 h-1 rounded-full bg-stone-300 dark:bg-stone-600 overflow-hidden"
          data-testid="progress-bar"
        >
          <div
            class="h-full bg-primary-500 rounded-full cursor-pointer"
            data-testid="progress-fill"
            :style="{ width: `${progressPercent}%` }"
            @click="(e) => { const rect = (e.target as HTMLElement).getBoundingClientRect(); const ratio = (e.clientX - rect.left) / rect.width; emit('seek', ratio) }"
          />
        </div>
      </div>
      <!-- Time -->
      <span
        class="text-xs font-mono text-stone-500 dark:text-gray-400 shrink-0"
        data-testid="current-time"
      >
        {{ formattedCurrentTime }} /
        <span data-testid="duration-time">{{ formattedDurationTime }}</span>
      </span>
    </div>

    <!-- Right Controls: speed / repeat / close -->
    <div
      class="flex items-center gap-2"
      data-testid="controls-right"
    >
      <!-- Speed selector -->
      <button
        class="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-700/70 cursor-pointer"
        data-testid="speed-toggle"
        aria-label="Playback speed"
        @click="speedNext"
      >
        <span class="ph ph-gear text-lg" />
      </button>

      <!-- Repeat mode -->
      <button
        class="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-700/70 cursor-pointer"
        data-testid="repeat-button"
        aria-label="Repeat mode"
        @click="repeatNext"
      >
        <span
          class="ph-fill ph-repeat text-lg"
          :class="{ active: repeatMode !== 'off' }"
        />
      </button>

      <!-- Close button -->
      <button
        class="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-700/70 cursor-pointer"
        data-testid="close-button"
        aria-label="Close player"
        @click="emit('close')"
      >
        <span class="ph-fill ph-x text-lg" />
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
