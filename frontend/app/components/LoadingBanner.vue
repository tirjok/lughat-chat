<script setup lang="ts">
import { useHealthPoll } from '../composables/useHealthPoll'

const { status, modelName } = useHealthPoll()

function bannerText(): string {
  if (status.value === 'retrying') {
    return 'Retrying connection... Please wait'
  }
  const name = modelName.value || 'TTS Model'
  return `Loading ${name}... This may take up to 2 minutes`
}
</script>

<template>
  <!-- Persistent loading banner — visible only when model is loading or retrying -->
  <div
    v-if="status === 'loading' || status === 'retrying'"
    class="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 rounded px-4 py-2 bg-orange-500/15 border-b border-orange-500/20"
    role="status"
    aria-live="polite"
    data-test-id="loading-banner"
  >
    <!-- Spinning loader icon -->
    <span
      aria-hidden="true"
      class="ph ph-spinner animate-spin text-orange-400 text-lg"
    />
    <!-- Informative text — not alarming, just informative -->
    <span class="text-sm font-medium text-orange-300">
      {{ bannerText() }}
    </span>
  </div>
</template>
