<script setup lang="ts">
interface Props {
  onClick: () => void
}

defineProps<Props>()
</script>

<template>
  <button
    aria-label="Download audio"
    class="tts-audio__download-btn"
    @click="onClick"
  >
    <span class="i-lucide-download" />
  </button>
</template>

<style scoped>
.tts-audio__download-btn {
  @apply w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-all active:scale-95;

  .i-lucide-download {
    @apply w-4 h-4;
  }
}
</style>
