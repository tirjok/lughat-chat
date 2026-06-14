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
    class="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-studio-700 border border-studio-600 text-white shadow-lg hover:bg-studio-600 active:scale-95 transition-all md:hidden"
    :aria-label="activePanel === 'canvas' ? 'Switch to voice settings' : 'Switch to text editor'"
    style="min-width: 48px; min-height: 48px;"
    @click="togglePanel"
  >
    <!-- Icon: slides-up (from canvas → control deck) -->
    <span
      v-if="activePanel === 'canvas'"
      aria-hidden="true"
      class="i-lucide-sliders-horizontal text-xl"
    />
    <!-- Icon: terminal (from control deck → canvas) -->
    <span
      v-else
      aria-hidden="true"
      class="i-lucide-terminal text-xl"
    />
    <!-- Label (visible on hover/tap for accessibility) -->
    <span class="text-xs font-medium pr-1">
      {{ activePanel === 'canvas' ? 'Voice settings' : 'Text editor' }}
    </span>
  </button>
</template>
