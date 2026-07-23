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

const panelShown = computed(() => props.visible)
</script>

<template>
  <div
    class="audio-panel rounded-[1.5rem] bg-studio-800/80 backdrop-blur-xl
           border border-white/[0.06] shadow-ambient overflow-hidden
           transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
    :class="[panelShown ? 'visible-slide' : 'hidden-slide']"
  >
    <!-- Header -->
    <div class="flex justify-between items-center px-4 md:px-5 py-3 gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
          <span
            aria-hidden="true"
            class="ph-fill ph-music-notes text-gold text-sm"
          />
        </div>
        <div class="overflow-hidden min-w-0">
          <h3 class="text-ink font-semibold text-xs truncate">
            Generated Audio
          </h3>
          <p class="text-[10px] text-ink-dim truncate">
            {{ selectedVoiceName }} {{ speedValue.toFixed(1) }}x
          </p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          class="icon-btn w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-ink-dim/70 hover:text-gold hover:bg-white/[0.08] transition-all duration-500"
          title="Download MP3"
          @click="emit('download')"
        >
          <span class="ph ph-download-simple text-base" />
        </button>
        <button
          class="icon-btn w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-ink-dim/70 hover:text-error hover:bg-error-dim transition-all duration-500"
          title="Close Player"
          @click="emit('close')"
        >
          <span class="ph ph-x text-base" />
        </button>
      </div>
    </div>

    <!-- Controls -->
    <div class="px-4 md:px-5 pb-4">
      <div class="rounded-xl bg-studio-900 p-3 flex items-center gap-3">
        <!-- Play/Pause — gold pill -->
        <button
          class="play-btn w-9 h-9 rounded-full bg-gold text-studio-900
                 flex items-center justify-center shadow-gold
                 active:scale-[0.95] hover:scale-[1.03]
                 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          @click="emit('toggle')"
        >
          <span
            v-if="isPlaying && !isPaused"
            aria-hidden="true"
            class="ph-fill ph-pause text-base"
          />
          <span
            v-else
            aria-hidden="true"
            class="ph-fill ph-play text-base"
          />
        </button>

        <!-- Waveform -->
        <div class="flex-1 h-8 relative w-full overflow-hidden min-w-[100px]">
          <WaveformCanvas
            :visible="true"
            :is-playing="isPlaying"
            :current-time="currentTime"
            :duration="duration"
            @seek="emit('seek', $event)"
          />
        </div>

        <!-- Time -->
        <span class="text-[10px] font-mono text-ink-dim flex-shrink-0 w-10 text-right tabular-nums">
          {{ formatTime(duration) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style>
.hidden-slide {
  transform: translateY(150%);
  opacity: 0;
  pointer-events: none;
}
.visible-slide {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
}
</style>

<style scoped>
.icon-btn {
  transition: transform 300ms var(--ease-spring);
}
.icon-btn:active {
  transform: scale(0.92);
}
.play-btn {
  transition: transform 400ms var(--ease-spring);
}
</style>
