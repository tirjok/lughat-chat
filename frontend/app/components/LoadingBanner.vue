<script setup lang="ts">
import { useHealthPoll } from '../composables/useHealthPoll'

const { status, modelName } = useHealthPoll()

function bannerText(): string {
  if (status === 'retrying') {
    return 'Retrying connection... Please wait'
  }
  const name = modelName || 'TTS Model'
  return `Loading ${name}... This may take up to 2 minutes`
}
</script>

<template>
  <div
    v-if="status === 'loading' || status === 'retrying'"
    class="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-gold-dim border-b border-gold/20"
    role="status"
    aria-live="polite"
    data-test-id="loading-banner"
  >
    <span
      aria-hidden="true"
      class="ph ph-spinner animate-spin text-gold text-lg"
    />
    <span class="text-sm font-medium text-gold">
      {{ bannerText() }}
    </span>
  </div>
</template>
