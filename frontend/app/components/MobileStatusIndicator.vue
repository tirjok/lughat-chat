<script setup lang="ts">
import { useHealthPoll } from '../composables/useHealthPoll'

const health = useHealthPoll({ maxRetries: 10 })

function displayText(): string {
  if (health.status === 'loading') {
    const name = health.modelName || 'XTTS-v2'
    return health.subStatus === 'initializing'
      ? `Loading ${name}...`
      : 'Loading...'
  }
  if (health.status === 'retrying') {
    return 'Retrying...'
  }
  return health.modelLoaded ? 'Ready' : 'Error'
}

function tooltipText(): string {
  if (health.status === 'loading') {
    const name = health.modelName || 'XTTS-v2'
    return health.subStatus === 'initializing'
      ? `Model ${name} Loading...`
      : 'Model Loading...'
  }
  if (health.status === 'retrying') {
    return 'Model XTTS-v2 — Retrying...'
  }
  return health.modelLoaded ? 'Model Ready' : 'Model Error'
}
</script>

<template>
  <!-- Outer Shell: subtle background + hairline ring -->
  <div
    class="flex items-center gap-1.5 rounded-full ring-1 ring-white/[0.06] px-2 py-0.5 bg-white/[0.02]"
    :title="tooltipText()"
  >
    <!-- Inner Core -->
    <div
      class="flex items-center gap-1.5 rounded-full bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] px-2.5 py-1"
    >
      <!-- Loading state: pulsing orange dot -->
      <span
        v-if="health.status === 'loading'"
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse"
      />

      <!-- Ready state: green dot with glow -->
      <span
        v-else-if="health.modelLoaded"
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"
      />

      <!-- Retrying state: orange dot with slow pulse (same as loading) -->
      <span
        v-else-if="health.status === 'retrying'"
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse"
      />

      <!-- Error state: red dot -->
      <span
        v-else
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"
      />

      <span class="text-[10px] font-medium text-gray-300">
        {{ displayText() }}
      </span>

      <!-- Manual retry button: visible in retrying and error states -->
      <button
        v-if="health.status === 'retrying' || health.status === 'error'"
        aria-label="Retry health check"
        class="rounded-full bg-studio-900 text-gray-400 hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] cursor-pointer active:scale-95"
        @click="health.retry"
      >
        <span
          aria-hidden="true"
          class="ph ph-arrow-counter-clockwise text-sm"
        />
      </button>
    </div>
  </div>
</template>
