<script setup lang="ts">
interface Props {
  currentTime: string
  duration: string
}

defineProps<Props>()
</script>

<template>
  <div class="flex justify-between text-[10px] font-mono text-gray-400">
    <span>{{ currentTime }}</span>
    <span>{{ duration }}</span>
  </div>
</template>
