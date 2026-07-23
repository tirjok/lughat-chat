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

// Update gradient fill on the native range input
function updateSliderFill() {
  const el = sliderRef.value
  if (!el) return
  const min = parseFloat(el.min)
  const max = parseFloat(el.max)
  const val = clampedValue.value
  const percentage = ((val - min) / (max - min)) * 100
  el.style.background = `linear-gradient(to right, #C8A45C ${percentage}%, #2A2622 ${percentage}%, #2A2622 100%)`
}

watch(clampedValue, updateSliderFill, { immediate: true })

function handleInput(event: Event) {
  const el = event.target as HTMLInputElement
  const value = parseFloat(el.value)
  const stepped = Math.round(value / 0.1) * 0.1
  emit('update:modelValue', Math.max(0.5, Math.min(2.0, stepped)))
  updateSliderFill()
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex justify-between items-center mb-3">
      <label class="text-xs font-semibold text-ink/70 flex items-center gap-2 tracking-wide">
        <span
          aria-hidden="true"
          class="ph ph-gauge text-base"
        />
        Speed
      </label>
      <span class="text-xs font-medium text-gold tabular-nums">
        {{ displayValue }}
      </span>
    </div>

    <!-- Native <input type=range> with gold fill track -->
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
/* Gold fill track — webkit */
input[type='range']::-webkit-slider-runnable-track {
  height: 4px;
  background: #2A2622;
  border-radius: 2px;
  cursor: pointer;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #C8A45C;
  cursor: pointer;
  margin-top: -6px;
  box-shadow: 0 0 12px rgba(200, 164, 92, 0.4);
  transition: transform 300ms var(--ease-spring), box-shadow 300ms var(--ease-spring);
}

input[type='range']::-webkit-slider-thumb:hover {
  transform: scale(1.25);
  box-shadow: 0 0 16px rgba(200, 164, 92, 0.6);
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
  background: #C8A45C;
  cursor: pointer;
  box-shadow: 0 0 12px rgba(200, 164, 92, 0.4);
  transition: transform 300ms var(--ease-spring);
}

input[type='range']::-moz-range-thumb:hover {
  transform: scale(1.25);
}

input[type='range']::-moz-range-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: #2A2622;
  border-radius: 2px;
}
</style>
