<script setup lang="ts">
import { useHealthPoll } from '../composables/useHealthPoll'

const { status, modelLoaded } = useHealthPoll()
</script>

<template>
  <header
    class="p-6 border-b border-studio-700 flex justify-between items-center"
    style="background: linear-gradient(to bottom, #1f1f1f, transparent);"
  >
    <div>
      <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
        <span
          aria-hidden="true"
          class="i-lucide-audio-waveform text-sunrise-orange"
          style="filter: drop-shadow(0 0 6px rgba(255,81,47,0.6));"
        />
        Lughat<span style="color: #DD2476;">Chat</span>
      </h1>
      <p class="text-xs text-gray-400 mt-1 uppercase tracking-wider">
        Premium Audio Studio
      </p>
    </div>

    <!-- Status Indicator (pill style) -->
    <div
      class="flex items-center gap-2 bg-studio-900 px-3 py-1.5 rounded-full border border-studio-700"
    >
      <span
        v-if="status === 'loading'"
        aria-hidden="true"
        class="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse"
      />
      <span
        v-else-if="modelLoaded"
        aria-hidden="true"
        class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"
      />
      <span
        v-else
        aria-hidden="true"
        class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"
      />
      <span class="text-xs font-medium text-gray-300">
        {{ status === 'loading' ? 'Loading...' : modelLoaded ? 'Ready' : 'Error' }}
      </span>
    </div>
  </header>
</template>
