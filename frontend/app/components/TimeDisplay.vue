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
    <span v-if="currentLabel">{{ currentLabel }}</span>
    <span>{{ formatTime(currentTime) }}</span>

    <span v-if="durationLabel">{{ durationLabel }}</span>
    <span>{{ formatTime(duration) }}</span>
  </div>
</template>

<style>
.tts-audio__time {
  @apply font-mono text-sm;
}
</style>
