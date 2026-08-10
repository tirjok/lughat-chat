<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 1.0
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const clampedValue = computed(() =>
  Math.max(0.5, Math.min(2.0, props.modelValue))
)

const sliderValue = computed(() =>
  ((clampedValue.value - 0.5) / 1.5) * 100
)

const sliderRef = ref<HTMLDivElement | null>(null)

function handleTrackClick(event: MouseEvent) {
  const el = sliderRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const value = 0.5 + ratio * 1.5
  const stepped = Math.round(value / 0.1) * 0.1
  emit('update:modelValue', Math.max(0.5, Math.min(2.0, stepped)))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    const stepped = Math.round((clampedValue.value + 0.1) / 0.1) * 0.1
    emit('update:modelValue', Math.min(2.0, stepped))
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    const stepped = Math.round((clampedValue.value - 0.1) / 0.1) * 0.1
    emit('update:modelValue', Math.max(0.5, stepped))
  }
}
function handleThumbDrag(event: MouseEvent) {
  const el = sliderRef.value
  if (!el) return
  const trackRect = el.getBoundingClientRect()

  function onMove(e: MouseEvent) {
    const ratio = Math.max(0, Math.min(1, (e.clientX - trackRect.left) / trackRect.width))
    const value = 0.5 + ratio * 1.5
    const stepped = Math.round(value / 0.1) * 0.1
    emit('update:modelValue', Math.max(0.5, Math.min(2.0, stepped)))
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  onMove(event)
}

const displayValue = computed(() => `${Math.max(0.5, Math.min(2.0, props.modelValue)).toFixed(1)}x`)
</script>

<template>
  <div class="flex flex-col rounded-[0.875rem] ring-1 ring-stone-200 dark:ring-white/[0.06] p-3 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] bg-white dark:bg-white/[0.02]">
    <div class="flex justify-between items-center mb-3">
      <label class="text-sm font-semibold text-stone-700 dark:text-gray-300 flex items-center gap-2">
        <span
          aria-hidden="true"
          class="ph ph-gauge text-lg"
        />
        Speech Speed
      </label>
      <span class="text-sm font-mono text-primary-500">
        {{ displayValue }}
      </span>
    </div>

    <!-- Slider track with fill and thumb -->
    <div
      ref="sliderRef"
      role="slider"
      aria-label="Speech speed"
      :aria-valuemin="0.5"
      :aria-valuemax="2"
      :aria-valuenow="clampedValue"
      :tabindex="0"
      class="relative h-4 w-full cursor-pointer group"
      @click="handleTrackClick"
      @keydown="handleKeydown"
    >
      <!-- Track background -->
      <div class="absolute top-1/2 -translate-y-1/2 h-1 w-full rounded-full bg-stone-300 dark:bg-stone-600" />
      <!-- Filled portion -->
      <div
        class="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
        :style="{ width: `${sliderValue}%`, background: '#14b8a6' }"
      />
      <!-- Thumb -->
      <div
        class="slider-thumb absolute rounded-full bg-primary-500 shadow-[0_0_10px_rgba(20,184,166,0.8)] w-4 h-4 cursor-grab active:cursor-grabbing"
        :style="{ left: `calc(${sliderValue}% - 8px)`, top: `calc(50% - 8px)`, width: '16px', height: '16px' }"
        @mousedown="handleThumbDrag"
      />
    </div>
  </div>
</template>

<style scoped>
.slider-thumb {
  transition: transform 0.1s;
}
</style>
