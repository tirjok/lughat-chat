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
  <div
    class="rounded-xl bg-studio-800 border border-white/[0.04] shadow-soft overflow-hidden"
    :class="[panelShown ? 'visible-slide' : 'hidden-slide']"
  >
    <!-- Player Header -->
    <div class="flex justify-between items-center px-4 py-3 gap-2">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
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
            {{ selectedVoiceName }} • {{ speedValue.toFixed(1) }}x Speed
          </p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          class="w-8 h-8 rounded-full bg-studio-900 flex items-center justify-center text-ink-dim hover:text-gold transition-colors"
          title="Download MP3"
          @click="emit('download')"
        >
          <span class="ph ph-download-simple text-lg" />
        </button>
        <button
          class="w-8 h-8 rounded-full bg-studio-900 flex items-center justify-center text-ink-dim hover:text-error transition-colors"
          title="Close Player"
          @click="emit('close')"
        >
          <span class="ph ph-x text-lg" />
        </button>
      </div>
    </div>

    <!-- Player Controls -->
    <div class="px-4 pb-4">
      <div class="rounded-lg bg-studio-900 p-3 flex items-center gap-3">
        <!-- Play/Pause -->
        <button
          class="rounded-full bg-gold text-studio-900 flex items-center justify-center shadow-gold active:scale-[0.96] hover:scale-[1.04] w-10 h-10 transition-all"
          @click="emit('toggle')"
        >
          <span
            v-if="isPlaying && !isPaused"
            aria-hidden="true"
            class="ph-fill ph-pause text-lg"
          />
          <span
            v-else
            aria-hidden="true"
            class="ph-fill ph-play text-lg"
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
        <span class="text-[10px] font-mono text-ink-dim flex-shrink-0 w-10 text-right">
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
