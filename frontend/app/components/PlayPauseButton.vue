<script setup lang="ts">
interface Props {
  isPlaying: boolean
  isPaused: boolean
  isLoading: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button
    class="tts-audio__play-btn"
    :disabled="isLoading"
    @click="emit('toggle')"
  >
    <span
      v-if="!isPlaying || isPaused"
      class="i-lucide-play"
    />
    <span
      v-else
      class="i-lucide-pause"
    />
  </button>
</template>

<style scoped>
.tts-audio__play-btn {
  @apply w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white flex items-center justify-center transition-all shadow-md active:scale-95;

  .i-lucide-play,
  .i-lucide-pause {
    @apply w-5 h-5 fill-current;
  }

  &:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
}
</style>
