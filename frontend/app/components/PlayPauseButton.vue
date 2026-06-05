<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  isPlaying: boolean
  isPaused: boolean
  isLoading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggle: []
}>()

const ariaLabel = computed(() => {
  if (props.isLoading) return 'Loading'
  if (props.isPlaying && !props.isPaused) return 'Pause'
  return 'Play'
})
</script>

<template>
  <button
    :aria-label="ariaLabel"
    class="tts-audio__play-btn"
    :disabled="isLoading"
    @click="emit('toggle')"
  >
    <span
      v-if="!isPlaying || isPaused"
      aria-hidden="true"
      class="i-lucide-play"
    />
    <span
      v-else
      aria-hidden="true"
      class="i-lucide-pause"
    />
  </button>
</template>

<style scoped>
.tts-audio__play-btn {
  @apply w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white flex items-center justify-center shadow-md active:scale-95;
  transition: background-color, transform 0.2s ease;

  .i-lucide-play,
  .i-lucide-pause {
    @apply w-5 h-5 fill-current;
  }

  &:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
}
</style>
