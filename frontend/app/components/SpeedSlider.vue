<script setup lang="ts">
import { computed, ref, watch } from 'vue'

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

const sliderRef = ref<HTMLInputElement | null>(null)

// Update gradient fill on the native range input (prototype style)
function updateSliderFill() {
  const el = sliderRef.value
  if (!el) return
  const min = parseFloat(el.min)
  const max = parseFloat(el.max)
  const val = clampedValue.value
  const percentage = ((val - min) / (max - min)) * 100
  el.style.background = `linear-gradient(to right, #DD2476, #FF512F ${percentage}%, #2A2A2A ${percentage}%, #2A2A2A 100%)`
}

watch(clampedValue, updateSliderFill, { immediate: true })

function handleInput(event: Event) {
  const el = event.target as HTMLInputElement
  const value = parseFloat(el.value)
  const stepped = Math.round(value / 0.1) * 0.1
  emit('update:modelValue', Math.max(0.5, Math.min(2.0, stepped)))
  updateSliderFill()
}

function adjustSpeed(delta: number) {
  const stepped = Math.round(clampedValue.value / 0.1) * 0.1
  const newValue = Math.max(0.5, Math.min(2.0, stepped + delta))
  emit('update:modelValue', newValue)
}
</script>

<template>
  <div class="flex flex-col gap-4">
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

    <!-- Prototype: native <input type=range> with gradient track, pt-2 pb-4 wrapper -->
    <div class="relative w-full pt-2 pb-4">
      <input
        ref="sliderRef"
        type="range"
        min="0.5"
        max="2.0"
        step="0.1"
        :value="clampedValue"
        class="w-full"
        style="-webkit-appearance: none; width: 100%; background: transparent;"
        @input="handleInput"
      >
      <!-- Range markers (prototype: text-[10px], mt-2 absolute) -->
      <div class="flex justify-between text-[10px] text-gray-500 font-mono mt-2 absolute w-full">
        <span>0.5x</span>
        <span>1.0x</span>
        <span>2.0x</span>
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

<style scoped>
/* Native range input styling to match prototype */
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #FF512F;
  cursor: pointer;
  margin-top: -6px;
  box-shadow: 0 0 10px rgba(255, 81, 47, 0.8);
  transition: transform 0.1s;
}

input[type='range']::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

input[type='range']::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: #2A2A2A;
  border-radius: 2px;
}

/* Firefox */
input[type='range'] {
  appearance: none;
  width: 100%;
  background: transparent;
}

input[type='range']::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #FF512F;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 10px rgba(255, 81, 47, 0.8);
}

input[type='range']::-moz-range-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: #2A2A2A;
  border-radius: 2px;
}
</style>
