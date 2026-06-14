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

const displayValue = computed(() => `${clampedValue.value.toFixed(1)}x`)

const trackPercent = computed(() => {
  const ratio = (clampedValue.value - 0.5) / (2.0 - 0.5)
  return ratio * 100
})

const sliderRef = ref<HTMLElement | null>(null)
let isDragging = false

function handlePointerDown(event: PointerEvent) {
  isDragging = true
  const target = event.target as HTMLElement
  target.setPointerCapture(event.pointerId)
  updateFromEvent(event)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging)
    return
  updateFromEvent(event)
}

function handlePointerUp() {
  isDragging = false
}

function updateFromEvent(event: PointerEvent) {
  const el = sliderRef.value
  if (!el)
    return
  const rect = el.getBoundingClientRect()
  const ratio = (event.clientX - rect.left) / rect.width
  const clampedRatio = Math.max(0, Math.min(1, ratio))
  const value = 0.5 + clampedRatio * (2.0 - 0.5)
  const stepped = Math.round(value / 0.1) * 0.1
  emit('update:modelValue', Math.max(0.5, Math.min(2.0, stepped)))
}

function adjustSpeed(delta: number) {
  const stepped = Math.round(clampedValue.value / 0.1) * 0.1
  const newValue = Math.max(0.5, Math.min(2.0, stepped + delta))
  emit('update:modelValue', newValue)
}
</script>

<template>
  <div class="flex flex-col gap-4 border-b border-studio-700 pb-6">
    <div class="flex justify-between items-end">
      <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
        <span
          aria-hidden="true"
          class="i-lucide-gauge text-lg"
        />
        Speech Speed
      </label>
      <span class="text-xs font-mono text-sunrise-orange bg-studio-900 px-2 py-1 rounded border border-studio-700">
        {{ displayValue }}
      </span>
    </div>

    <!-- Desktop: Horizontal slider (≥768px) -->
    <div
      ref="sliderRef"
      class="speed-slider__track relative h-6 cursor-pointer select-none"
      :style="{ touchAction: 'pan-y' }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
    >
      <!-- Track background -->
      <div
        class="speed-slider__bg absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full rounded-full"
        style="background: #2A2A2A;"
      />
      <!-- Filled track -->
      <div
        class="speed-slider__fill absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full"
        style="background: linear-gradient(to right, #DD2476, #FF512F);"
        :style="{ width: `${trackPercent}%` }"
      />
      <!-- Thumb knob (centered on track) -->
      <div
        class="speed-slider__thumb absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg transition-transform duration-100"
        style="background: #FF512F; box-shadow: 0 0 10px rgba(255, 81, 47, 0.8);"
        :style="{ left: `calc(${trackPercent}% - 8px)` }"
        :class="{ 'scale-125': isDragging }"
      />
      <!-- Range markers -->
      <div class="relative text-[10px] text-gray-500 font-mono mt-5 pointer-events-none">
        <span class="absolute left-0">0.5x</span>
        <span
          class="absolute"
          :style="{ left: ((1.0 - 0.5) / (2.0 - 0.5)) * 100 + '%' }"
        >1.0x</span>
        <span class="absolute right-0">2.0x</span>
      </div>
    </div>

    <!-- Mobile: Stepper buttons (<768px) -->
    <div class="md:hidden flex items-center justify-center gap-4">
      <button
        class="w-11 h-11 rounded-full bg-studio-700 border border-studio-600 text-white flex items-center justify-center shadow-md hover:bg-studio-600 active:scale-95 transition-all"
        :class="{ 'opacity-40 cursor-not-allowed': clampedValue <= 0.5 }"
        :aria-label="`Decrease speed to ${(clampedValue - 0.1).toFixed(1)}x`"
        @click="adjustSpeed(-0.1)"
      >
        <span
          aria-hidden="true"
          class="i-lucide-minus text-lg"
        />
      </button>

      <span class="text-xl font-mono text-sunrise-orange bg-studio-900 px-4 py-2 rounded-lg border border-studio-700 min-w-[4rem] text-center">
        {{ displayValue }}
      </span>

      <button
        class="w-11 h-11 rounded-full bg-studio-700 border border-studio-600 text-white flex items-center justify-center shadow-md hover:bg-studio-600 active:scale-95 transition-all"
        :class="{ 'opacity-40 cursor-not-allowed': clampedValue >= 2.0 }"
        :aria-label="`Increase speed to ${(clampedValue + 0.1).toFixed(1)}x`"
        @click="adjustSpeed(0.1)"
      >
        <span
          aria-hidden="true"
          class="i-lucide-plus text-lg"
        />
      </button>
    </div>
  </div>
</template>
