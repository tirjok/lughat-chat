<script setup lang="ts">
interface Props {
  onClick: () => void
}

defineProps<Props>()
</script>

<template>
  <button
    aria-label="Download audio"
    class="w-10 h-10 rounded-full bg-studio-900 border border-studio-700 flex items-center justify-center hover:text-white text-gray-400 transition-colors"
    @click="onClick"
  >
    <span
      aria-hidden="true"
      class="i-lucide-download"
    />
  </button>
</template>
