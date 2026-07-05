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
  <!-- Outer Shell: subtle background + hairline ring + padding + large radius -->
  <div
    class="flex flex-col rounded-[1.375rem] ring-1 ring-white/[0.06] p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] bg-white/[0.02]"
  >
    <!-- Inner Core: distinct background + inner highlight + smaller radius -->
    <div
      class="flex flex-col gap-4 rounded-[calc(1.375rem-0.375rem)] bg-studio-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]"
    >
      <div class="flex justify-between items-end px-4 pt-4">
        <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span
            aria-hidden="true"
            class="ph ph-gauge text-lg"
          />
          Speech Speed
        </label>
        <span class="text-xs font-mono text-sunrise-orange bg-studio-800 px-2 py-1 rounded-md ring-1 ring-white/[0.06]">
          {{ displayValue }}
        </span>
      </div>

      <!-- Prototype: native <input type=range> with gradient track, pt-2 pb-6 wrapper -->
      <div class="relative w-full pt-2 pb-6">
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
        <!-- Range markers (prototype: text-[10px], mt-4 absolute) -->
        <div class="flex justify-between text-[10px] text-gray-500 font-mono mt-4 absolute w-full">
          <span>0.5x</span>
          <span>&nbsp;</span>
          <span>2.0x</span>
        </div>
      </div>

      <!-- Mobile: Stepper buttons (<768px): Double-Bezel + Magnetic -->
      <div class="md:hidden flex items-center justify-center gap-4">
        <!-- Outer Shell: magnetic hover -->
        <span class="magnetic-hover rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
          <!-- Inner Core: spring scale -->
          <button
            class="rounded-full bg-studio-700 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.2)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] hover:bg-studio-600 hover:shadow-[0_6px_16px_rgba(0,0,0,0.3)] active:scale-95 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] w-11 h-11"
            :class="{ 'opacity-40 cursor-not-allowed': clampedValue <= 0.5 }"
            :aria-label="`Decrease speed to ${(clampedValue - 0.1).toFixed(1)}x`"
            @click="adjustSpeed(-0.1)"
          >
            <span
              aria-hidden="true"
              class="ph ph-minus text-lg"
            />
          </button>
        </span>

        <!-- Display value: Double-Bezel -->
        <span class="rounded-[0.625rem] ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
          <span class="rounded-[calc(0.625rem-0.125rem)] text-xl font-mono text-sunrise-orange bg-studio-900 px-4 py-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] min-w-[4rem] text-center">
            {{ displayValue }}
          </span>
        </span>

        <!-- Outer Shell: magnetic hover -->
        <span class="magnetic-hover rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
          <!-- Inner Core: spring scale -->
          <button
            class="rounded-full bg-studio-700 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.2)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] hover:bg-studio-600 hover:shadow-[0_6px_16px_rgba(0,0,0,0.3)] active:scale-95 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] w-11 h-11"
            :class="{ 'opacity-40 cursor-not-allowed': clampedValue >= 2.0 }"
            :aria-label="`Increase speed to ${(clampedValue + 0.1).toFixed(1)}x`"
            @click="adjustSpeed(0.1)"
          >
            <span
              aria-hidden="true"
              class="ph ph-plus text-lg"
            />
          </button>
        </span>
      </div>
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
