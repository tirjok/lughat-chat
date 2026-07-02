<script setup lang="ts">
import { onMounted } from 'vue'
import { useHealthPoll } from '../composables/useHealthPoll'

const { status, modelLoaded, start } = useHealthPoll()
onMounted(() => {
  start()
})
</script>

<template>
  <div
    class="flex items-center gap-2 bg-studio-900 px-3 py-1.5 rounded-full border border-studio-700/60"
    title="Model XTTS-v2 Ready"
  >
    <!-- Loading state: pulsing orange dot -->
    <span
      v-if="status === 'loading'"
      aria-hidden="true"
      class="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse"
    />

    <!-- Ready state: green dot with glow -->
    <span
      v-else-if="modelLoaded"
      aria-hidden="true"
      class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"
    />

    <!-- Error state: red dot -->
    <span
      v-else
      aria-hidden="true"
      class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"
    />

    <span class="text-xs font-medium text-gray-300">
      {{ status === 'loading' ? 'Loading...' : modelLoaded ? 'Ready' : 'Error' }}
    </span>
  </div>
</template>
