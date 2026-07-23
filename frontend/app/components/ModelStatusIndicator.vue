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
  <div
    class="flex items-center gap-2 rounded-full px-2.5 py-1 bg-studio-900/50"
    :title="tooltipText()"
  >
    <!-- Inner Core — gold ring -->
    <div class="flex items-center gap-2 rounded-full bg-studio-800 px-3 py-1.5">
      <!-- Status dot -->
      <span
        v-if="health.status === 'loading'"
        aria-hidden="true"
        class="w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_#C8A45C] animate-pulse"
      />
      <span
        v-else-if="health.modelLoaded"
        aria-hidden="true"
        class="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_#5CB87A]"
      />
      <span
        v-else-if="health.status === 'retrying'"
        aria-hidden="true"
        class="w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_#C8A45C] animate-pulse"
      />
      <span
        v-else
        aria-hidden="true"
        class="w-2 h-2 rounded-full bg-error shadow-[0_0_8px_#B85C38]"
      />

      <span class="text-xs font-medium text-ink-dim">
        {{ displayText() }}
      </span>

      <!-- Retry button -->
      <button
        v-if="health.status === 'retrying' || health.status === 'error'"
        aria-label="Retry health check"
        class="rounded-full bg-studio-900 text-ink-dim hover:text-gold transition-colors cursor-pointer active:scale-95"
        @click="health.retry"
      >
        <span class="ph ph-arrow-counter-clockwise text-sm" />
      </button>
    </div>
  </div>
</template>
