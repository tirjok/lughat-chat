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
    class="w-12 h-12 rounded-full bg-sunrise-magenta text-white flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(221,36,118,0.4)]"
    @click="emit('toggle')"
  >
    <span
      v-if="isPlaying"
      aria-hidden="true"
      class="i-lucide-pause text-xl"
    />
    <span
      v-else
      aria-hidden="true"
      class="i-lucide-play text-xl ml-1"
    />
  </button>
</template>
