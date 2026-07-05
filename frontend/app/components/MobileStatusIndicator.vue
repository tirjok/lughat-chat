<script setup lang="ts">
import { useHealthPoll } from '../composables/useHealthPoll'

const { status, modelLoaded } = useHealthPoll()
</script>

<template>
  <!-- Outer Shell: subtle background + hairline ring -->
  <div
    class="flex items-center gap-1.5 rounded-full ring-1 ring-white/[0.06] px-2 py-0.5 bg-white/[0.02]"
    title="Model XTTS-v2 Ready"
  >
    <!-- Inner Core -->
    <div
      class="flex items-center gap-1.5 rounded-full bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] px-2.5 py-1"
    >
      <!-- Loading state: pulsing orange dot -->
      <span
        v-if="status === 'loading'"
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse"
      />

      <!-- Ready state: green dot with glow -->
      <span
        v-else-if="modelLoaded"
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"
      />

      <!-- Error state: red dot -->
      <span
        v-else
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"
      />

      <span class="text-[10px] font-medium text-gray-300">
        {{ status === 'loading' ? 'Loading...' : modelLoaded ? 'Ready' : 'Error' }}
      </span>
    </div>
  </div>
</template>
