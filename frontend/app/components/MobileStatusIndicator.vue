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
</script>

<template>
  <div class="flex items-center gap-1.5 rounded-full px-2 py-0.5 bg-studio-900/50">
    <div class="flex items-center gap-1.5 rounded-full bg-studio-800 px-2.5 py-1">
      <span
        v-if="health.status === 'loading'"
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_#C8A45C] animate-pulse"
      />
      <span
        v-else-if="health.modelLoaded"
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_6px_#5CB87A]"
      />
      <span
        v-else-if="health.status === 'retrying'"
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_#C8A45C] animate-pulse"
      />
      <span
        v-else
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full bg-error shadow-[0_0_6px_#B85C38]"
      />
      <span class="text-[10px] font-medium text-ink-dim">
        {{ displayText() }}
      </span>
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
