<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentTime: number
  duration: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  seek: [ratio: number]
}>()

const progressRatio = computed(() => {
  if (!props.duration || props.duration === 0) return 0
  return props.currentTime / props.duration
})

function handleSeek(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  // RTL: calculate from right side
  const clickX = rect.right - event.clientX
  const ratio = clickX / rect.width
  emit('seek', Math.max(0, Math.min(1, ratio)))
}
</script>

<template>
  <div
    class="tts-audio__progress-wrapper"
    @click="handleSeek"
  >
    <div class="tts-audio__progress">
      <div
        class="tts-audio__progress-fill"
        :style="{ width: `${progressRatio * 100}%` }"
      />
    </div>
    <div
      class="tts-audio__progress-thumb"
      :style="{ right: `${progressRatio * 100}%` }"
    />
  </div>
</template>

<style scoped>
.tts-audio__progress {
  @apply relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden;

  &-fill {
    @apply absolute top-0 right-0 h-full bg-gradient-to-l from-blue-500 to-indigo-500;
    transition: width 0.1s ease;
    border-radius: inherit;
  }

  &-wrapper {
    @apply relative cursor-pointer;
  }

  &-thumb {
    @apply absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full -translate-x-1/2 shadow-md;
  }
}
</style>
