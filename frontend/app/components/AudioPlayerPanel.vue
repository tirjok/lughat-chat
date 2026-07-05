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
    Outer Shell: subtle background + hairline ring + padding + large radius
    Always in DOM so CSS transitions fire when `visible` toggles.
    Spring slide-in animation.
  -->
  <div
    class="fixed bottom-0 right-0 w-full md:w-[65%] lg:w-[70%] xl:w-[75%] bg-studio-800 border-t md:border-l ring-white/[0.06] p-1.5 flex flex-col z-50 shadow-[0_-8px_32px_rgba(0,0,0,0.25)]"
    :class="panelShown ? 'visible-slide' : 'hidden-slide'"
    style="transition: transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 700ms cubic-bezier(0.16, 1, 0.3, 1);"
  >
    <!-- Inner Core: distinct background + inner highlight + smaller radius -->
    <div
      class="rounded-[calc(1.125rem-0.375rem)] bg-studio-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex flex-col gap-3 md:gap-4 overflow-hidden"
    >
      <!-- Player Header -->
      <div class="flex justify-between items-center mb-1 md:mb-2 gap-2">
        <div class="flex items-center gap-3 min-w-0">
          <!-- Gradient audio icon -->
          <div
            class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-sunrise-orange to-sunrise-magenta flex items-center justify-center shadow-[0_4px_16px_rgba(255,81,47,0.25)] shrink-0"
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
        <!-- Action buttons: Double-Bezel per button -->
        <div class="flex items-center gap-1 md:gap-2 shrink-0">
          <button
            class="w-8 h-8 md:w-10 md:h-10 rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex items-center justify-center hover:text-white text-gray-400 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            title="Download MP3"
            @click="emit('download')"
          >
            <span class="rounded-full bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center justify-center w-full h-full">
              <span
                aria-hidden="true"
                class="ph ph-download-simple text-lg"
              />
            </span>
          </button>
          <button
            class="w-8 h-8 md:w-10 md:h-10 rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex items-center justify-center hover:text-red-400 text-gray-400 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            title="Close Player"
            @click="emit('close')"
          >
            <span class="rounded-full bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center justify-center w-full h-full">
              <span
                aria-hidden="true"
                class="ph ph-x text-lg"
              />
            </span>
          </button>
        </div>
      </div>

      <!-- Heatmap Waveform Container: Double-Bezel -->
      <!-- Outer Shell -->
      <div class="w-full rounded-[1.125rem] ring-1 ring-white/[0.06] p-1.5 flex items-center gap-2 md:gap-4 bg-white/[0.02]">
        <!-- Inner Core -->
        <div class="w-full rounded-[calc(1.125rem-0.375rem)] bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-2 md:p-4 flex items-center gap-2 md:gap-4">
          <!-- Play/Pause button: Double-Bezel + Magnetic -->
          <!-- Outer Shell: spring hover -->
          <span class="magnetic-hover rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02] flex-shrink-0">
            <!-- Inner Core: scale on hover, press on active -->
            <button
              class="group rounded-full bg-sunrise-magenta text-white flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_0_20px_rgba(221,36,118,0.3)] active:scale-[0.96] hover:scale-[1.04] w-10 h-10 md:w-12 md:h-12"
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
                class="ph-fill ph-play text-lg md:text-xl"
              />
            </button>
          </span>

          <!-- Canvas for dynamic waveform -->
          <div class="flex-1 h-8 md:h-12 relative w-full overflow-hidden min-w-[100px]">
            <WaveformCanvas
              :visible="visible"
              :is-playing="isPlaying"
              :current-time="currentTime"
              :duration="duration"
              @seek="(ratio) => emit('seek', ratio)"
            />
          </div>

          <!-- Time display -->
          <span class="text-[10px] md:text-xs font-mono text-gray-400 flex-shrink-0 w-8 md:w-10 text-right">
            {{ formatTime(duration) }}
          </span>
        </div>
      </div>
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
