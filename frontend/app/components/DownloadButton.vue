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
    <span
      aria-hidden="true"
      class="i-lucide-download"
    />
  </button>
</template>

<style>
.tts-audio__download-btn {
  @apply w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center active:scale-95;
  transition: background-color, transform 0.2s ease;

  .i-lucide-download {
    @apply w-4 h-4;
  }
}
</style>
