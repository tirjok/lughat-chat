<script setup lang="ts">
defineProps<{
  focused?: boolean
}>()
</script>

<template>
  <div
    class="tts-halo"
    :class="{ 'opacity-0': !focused }"
  />
</template>
