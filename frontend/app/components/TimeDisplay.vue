<script setup lang="ts">
import { useTimeDisplay } from '../composables/useTimeDisplay'

const _props = withDefaults(
  defineProps<{
    currentTime: number
    duration: number
    currentLabel?: string
    durationLabel?: string
  }>(),
  {
    currentLabel: '',
    durationLabel: ''
  }
)

const { formatTime } = useTimeDisplay()
</script>

<template>
  <div
    class="tts-audio__time font-mono"
    dir="rtl"
  >
    <span
      v-if="currentLabel"
      class="sr-only"
    >{{ currentLabel }}</span>
    <span>{{ formatTime(currentTime) }}</span>

    <span
      v-if="durationLabel"
      class="sr-only"
    >{{ durationLabel }}</span>
    <span>{{ formatTime(duration) }}</span>
  </div>
</template>

<style scoped>
.tts-audio__time {
  @apply font-mono text-sm;
}

.sr-only {
  @apply sr-only;
}
</style>
