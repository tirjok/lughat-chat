<script setup lang="ts">
import { computed } from 'vue'
import WaveformCanvas from './WaveformCanvas.vue'

interface Props {
  visible: boolean
  isPlaying: boolean
  isPaused: boolean
  currentTime: number
  duration: number
  audioUrl: string | null
  selectedVoiceName: string
  speedValue: number
}

interface Emits {
  (e: 'close' | 'toggle' | 'download'): void
  (e: 'seek', ratio: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Whether the panel is in the "shown" state (for animation purposes)
const panelShown = computed(() => props.visible)
</script>

<template>
  <!--
    Wrapper: always in DOM so CSS transitions fire when `visible` toggles.
    Prototype: fixed bottom, responsive width, no inner wrapper.
  -->
  <div
    class="fixed bottom-0 right-0 w-full md:w-[65%] lg:w-[70%] xl:w-[75%] bg-studio-800 border-t md:border-l border-studio-700 p-4 md:p-6 flex flex-col gap-3 md:gap-4 z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.6)]"
    :class="panelShown ? 'visible-slide' : 'hidden-slide'"
    style="transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1), opacity 500ms cubic-bezier(0.16, 1, 0.3, 1);"
  >
    <!-- Player Header (prototype: mb-1 md:mb-2 gap-2, smaller icons on mobile) -->
    <div class="flex justify-between items-center mb-1 md:mb-2 gap-2">
      <div class="flex items-center gap-3 min-w-0">
        <!-- Gradient audio icon (prototype: w-8 h-8 md:w-10 md:h-10) -->
        <div
          class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-sunrise-orange to-sunrise-magenta flex items-center justify-center shadow-lg shrink-0"
        >
          <span
            aria-hidden="true"
            class="ph-fill ph-music-notes text-white text-sm md:text-base"
          />
        </div>
        <div class="overflow-hidden min-w-0">
          <h3 class="text-white font-semibold text-xs md:text-sm truncate">
            Generated Audio
          </h3>
          <p class="text-[10px] md:text-xs text-gray-400 truncate">
            {{ selectedVoiceName }} • {{ speedValue.toFixed(1) }}x Speed
          </p>
        </div>
      </div>
      <!-- Action buttons (prototype: w-8 h-8 md:w-10 md:h-10) -->
      <div class="flex items-center gap-1 md:gap-2 shrink-0">
        <button
          class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-studio-900 border border-studio-700 flex items-center justify-center hover:text-white text-gray-400 transition-colors"
          title="Download MP3"
          @click="emit('download')"
        >
          <span
            aria-hidden="true"
            class="ph ph-download-simple text-lg"
          />
        </button>
        <button
          class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-studio-900 border border-studio-700 flex items-center justify-center hover:text-red-400 text-gray-400 transition-colors"
          title="Close Player"
          @click="emit('close')"
        >
          <span
            aria-hidden="true"
            class="ph ph-x text-lg"
          />
        </button>
      </div>
    </div>

    <!-- Heatmap Waveform Container (prototype: p-2 md:p-4, gap-2 md:gap-4, h-8 md:h-12) -->
    <div class="w-full bg-studio-900 rounded-lg border border-studio-700 p-2 md:p-4 flex items-center gap-2 md:gap-4">
      <!-- Play/Pause button (prototype: w-10 h-10 md:w-12 md:h-12) -->
      <button
        class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-sunrise-magenta text-white flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(221,36,118,0.4)] flex-shrink-0"
        @click="emit('toggle')"
      >
        <span
          v-if="isPlaying && !isPaused"
          aria-hidden="true"
          class="ph-fill ph-pause text-lg md:text-xl"
        />
        <span
          v-else
          aria-hidden="true"
          class="ph-fill ph-play text-lg md:text-xl ml-1"
        />
      </button>

      <!-- Canvas for dynamic waveform (prototype: h-8 md:h-12, min-w-[100px]) -->
      <div class="flex-1 h-8 md:h-12 relative w-full overflow-hidden min-w-[100px]">
        <WaveformCanvas
          :visible="visible"
          :is-playing="isPlaying"
          :current-time="currentTime"
          :duration="duration"
        />
      </div>

      <!-- Time display (prototype: text-[10px] md:text-xs, w-8 md:w-10) -->
      <span class="text-[10px] md:text-xs font-mono text-gray-400 flex-shrink-0 w-8 md:w-10 text-right">
        {{ formatTime(duration) }}
      </span>
    </div>
  </div>
</template>

<style>
/* Hidden state: off-screen (downward) */
.hidden-slide {
  transform: translateY(150%);
  opacity: 0;
  pointer-events: none;
}

/* Visible state: on-screen */
.visible-slide {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
}
</style>
