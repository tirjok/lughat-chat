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

// TODO: migrated from sunrise-orange/magenta (see ISSUE-014)

const sliderRef = ref<HTMLInputElement | null>(null)

// Update gradient fill on the native range input (prototype style)
function updateSliderFill() {
  const el = sliderRef.value
  if (!el) return
  const min = parseFloat(el.min)
  const max = parseFloat(el.max)
  const val = clampedValue.value
  const percentage = ((val - min) / (max - min)) * 100
  el.style.background = `linear-gradient(to right, #f59e0b, #14b8a6 ${percentage}%, #2A2A2A ${percentage}%, #2A2A2A 100%)`
}

watch(clampedValue, updateSliderFill, { immediate: true })

function handleInput(event: Event) {
  const el = event.target as HTMLInputElement
  const value = parseFloat(el.value)
  const stepped = Math.round(value / 0.1) * 0.1
  emit('update:modelValue', Math.max(0.5, Math.min(2.0, stepped)))
  updateSliderFill()
}
const displayValue = computed(() => `${clampedValue.value.toFixed(1)}x`)
</script>

<template>
  <div class="flex flex-col rounded-[0.875rem] ring-1 ring-white/[0.06] p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] bg-white/[0.02]">
    <div class="flex justify-between items-center mb-3">
      <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
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

    <!-- Native <input type=range> with gradient track -->
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
  </div>
</template>

<style scoped>
/* Native range input styling to match prototype */
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
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
  background: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
}

input[type='range']::-moz-range-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: #2A2A2A;
  border-radius: 2px;
}
</style>
