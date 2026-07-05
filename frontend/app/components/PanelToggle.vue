<script setup lang="ts">
import type { PanelName } from '../composables/usePanelToggle'

interface Props {
  activePanel: PanelName
  togglePanel: () => void
}

defineProps<Props>()
</script>

<template>
  <!-- Panel Toggle FAB — visible only on mobile/tablet (<768px) -->
  <button
    class="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-studio-700 ring-1 ring-white/[0.06] text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-studio-600 active:scale-95 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden"
    :aria-label="activePanel === 'canvas' ? 'Switch to voice settings' : 'Switch to text editor'"
    style="min-width: 48px; min-height: 48px;"
    @click="togglePanel"
  >
    <!-- Icon: slides-up (from canvas → control deck) -->
    <span
      v-if="activePanel === 'canvas'"
      aria-hidden="true"
      class="ph ph-sliders-horizontal text-xl"
    />
    <!-- Icon: terminal (from control deck → canvas) -->
    <span
      v-else
      aria-hidden="true"
      class="ph ph-terminal text-xl"
    />
    <!-- Label (visible on hover/tap for accessibility) -->
    <span class="text-xs font-medium pr-1">
      {{ activePanel === 'canvas' ? 'Voice settings' : 'Text editor' }}
    </span>
  </button>
</template>
