<script setup lang="ts">
import { computed } from 'vue'

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
      <span
        class="text-xs font-mono text-sunrise-orange bg-studio-900 px-2 py-1 rounded border border-studio-700"
      >
        {{ displayValue }}
      </span>
    </div>

    <div class="relative w-full pt-2 pb-4">
      <!-- Custom range input with gradient track -->
      <input
        :value="clampedValue"
        type="range"
        min="0.5"
        max="2.0"
        step="0.1"
        class="speed-slider__input"
        :style="{
          background: `linear-gradient(to right, #DD2476, #FF512F ${trackPercent}%, #2A2A2A ${trackPercent}%, #2A2A2A 100%)`
        }"
        @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      >
      <!-- Range markers -->
      <div class="flex justify-between text-[10px] text-gray-500 font-mono mt-2 absolute w-full pointer-events-none">
        <span>0.5x</span>
        <span>1.0x</span>
        <span>2.0x</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.speed-slider__input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: transparent;
  cursor: pointer;
  border-radius: 2px;
}

.speed-slider__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #FF512F;
  cursor: pointer;
  margin-top: -6px;
  box-shadow: 0 0 10px rgba(255, 81, 47, 0.8);
  transition: transform 0.1s;
}

.speed-slider__input::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.speed-slider__input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #FF512F;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(255, 81, 47, 0.8);
  border: none;
  transition: transform 0.1s;
}

.speed-slider__input::-moz-range-thumb:hover {
  transform: scale(1.2);
}
</style>
