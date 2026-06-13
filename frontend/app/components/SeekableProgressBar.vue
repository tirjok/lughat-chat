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
  const ratio = (event.clientX - rect.left) / rect.width
  emit('seek', Math.max(0, Math.min(1, ratio)))
}
</script>

<template>
  <div
    class="relative h-2 rounded-full overflow-hidden cursor-pointer"
    style="background: #2A2A2A;"
    @click="handleSeek"
  >
    <div
      class="absolute top-0 left-0 h-full rounded-full"
      style="background: linear-gradient(to right, #DD2476, #FF512F);"
      :style="{ width: `${progressRatio * 100}%` }"
    />
  </div>
</template>
