<script setup lang="ts">
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
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <Transition name="slide-up-player">
    <div
      v-if="visible"
      class="absolute bottom-0 left-0 w-full md:right-0 bg-studio-800 border-t border-studio-700 p-6 flex flex-col gap-4 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      style="border-left: 1px solid #333333; border-right: 1px solid #333333"
    >
      <!-- Mobile: narrower bottom sheet so it doesn't cover the entire textarea -->
      <div class="w-[92%] md:w-full mx-auto">
        <!-- Player Header -->
        <div class="flex justify-between items-center px-4">
          <div class="flex items-center gap-3">
            <!-- Gradient audio icon -->
            <div
              class="w-10 h-10 rounded-full bg-gradient-to-br from-sunrise-orange to-sunrise-magenta flex items-center justify-center shadow-lg"
            >
              <span
                aria-hidden="true"
                class="i-lucide-music text-white"
              />
            </div>
            <div>
              <h3 class="text-white font-semibold text-sm">
                Generated Audio
              </h3>
              <p class="text-xs text-gray-400">
                {{ selectedVoiceName }} • {{ speedValue.toFixed(1) }}x Speed
              </p>
            </div>
          </div>
          <!-- Action buttons — 44px on mobile for WCAG touch target minimums -->
          <div class="flex items-center gap-2">
            <button
              class="w-11 h-11 md:w-10 md:h-10 rounded-full bg-studio-900 border border-studio-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title="Download MP3"
              @click="emit('download')"
            >
              <span
                aria-hidden="true"
                class="i-lucide-download text-lg"
              />
            </button>
            <button
              class="w-11 h-11 md:w-10 md:h-10 rounded-full bg-studio-900 border border-studio-700 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
              title="Close Player"
              @click="emit('close')"
            >
              <span
                aria-hidden="true"
                class="i-lucide-x text-lg"
              />
            </button>
          </div>
        </div>

        <!-- Waveform Container -->
        <!-- Desktop (≥768px): horizontal row — Play | Waveform | Duration -->
        <div
          class="hidden md:w-full md:bg-studio-900 md:rounded-lg md:border md:border-studio-700 md:p-4 md:flex md:items-center md:gap-4"
        >
          <!-- Play/Pause button -->
          <button
            class="w-12 h-12 rounded-full bg-sunrise-magenta text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_15px_rgba(221,36,118,0.4)] flex-shrink-0"
            @click="emit('toggle')"
          >
            <span
              v-if="props.isPlaying && !props.isPaused"
              aria-hidden="true"
              class="i-lucide-pause text-xl"
            />
            <span
              v-else
              aria-hidden="true"
              class="i-lucide-play text-xl ml-1"
            />
          </button>

          <!-- Waveform canvas -->
          <div class="flex-1 h-12 relative w-full overflow-hidden">
            <WaveformCanvas
              :visible="visible"
              :is-playing="isPlaying"
              :current-time="currentTime"
              :duration="duration"
            />
          </div>

          <!-- Duration display -->
          <span class="text-xs font-mono text-gray-400 flex-shrink-0 w-10 text-right">
            {{ formatTime(duration) }}
          </span>
        </div>

        <!-- Mobile (<768px): stacked layout — Play above Waveform -->
        <div
          class="w-full bg-studio-900 rounded-lg border border-studio-700 p-4 flex flex-col gap-3"
        >
          <!-- Play/Pause button — full-width on mobile, enlarged to 48px for WCAG touch targets -->
          <button
            class="w-12 h-12 mx-auto rounded-full bg-sunrise-magenta text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_15px_rgba(221,36,118,0.4)]"
            @click="emit('toggle')"
          >
            <span
              v-if="props.isPlaying && !props.isPaused"
              aria-hidden="true"
              class="i-lucide-pause text-xl"
            />
            <span
              v-else
              aria-hidden="true"
              class="i-lucide-play text-xl ml-1"
            />
          </button>

          <!-- Waveform canvas — full width, no button squeezing it -->
          <div class="w-full h-12 relative overflow-hidden">
            <WaveformCanvas
              :visible="visible"
              :is-playing="isPlaying"
              :current-time="currentTime"
              :duration="duration"
            />
          </div>

          <!-- Duration display — inline with waveform on mobile -->
          <span class="text-xs font-mono text-gray-400 w-10 text-right">
            {{ formatTime(duration) }}
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.slide-up-player-enter-active,
.slide-up-player-leave-active {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-player-enter-from,
.slide-up-player-leave-to {
  opacity: 0;
  transform: translateY(150%);
}
</style>
