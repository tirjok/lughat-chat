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
  <div class="speed-slider">
    <div class="speed-track">
      <div
        class="speed-track-fill"
        :style="{ width: `${trackPercent}%` }"
      />
    </div>
    <input
      :value="modelValue"
      type="range"
      min="0.5"
      max="2.0"
      step="0.1"
      class="speed-slider__input"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    >
    <span class="speed-badge">{{ displayValue }}</span>
  </div>
</template>

<style scoped>
.speed-slider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.speed-track {
  flex: 1;
  height: 0.375rem;
  border-radius: 9999px;
  background: #374151;
  overflow: hidden;
  position: relative;
}

.speed-track-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(to right, #DD2476, #FF512F);
  transition: width 0.1s ease;
}

.speed-slider__input {
  -webkit-appearance: none;
  appearance: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

.speed-slider__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: #DD2476;
  cursor: pointer;
  transition: transform 0.2s ease;
  box-shadow: 0 0 0 2px #374151;

  &:hover {
    transform: scale(1.2);
  }
}

.speed-slider__input::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: #DD2476;
  border: 2px solid #374151;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.2);
  }
}

.speed-badge {
  @apply font-mono text-xs font-semibold text-gray-300 min-w-[3rem];
}
</style>
