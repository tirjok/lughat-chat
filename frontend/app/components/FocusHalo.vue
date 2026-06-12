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

<style>
.tts-halo {
  @apply absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-500 ease-out;

  background: radial-gradient(
    ellipse at center,
    rgba(255, 0, 255, 0.15) 0%,
    rgba(255, 165, 0, 0.1) 40%,
    transparent 70%
  );
  filter: blur(20px);
  transform: scale(1.05);
}
</style>
