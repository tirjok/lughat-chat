<script setup lang="ts">
import { computed, ref } from 'vue'
import FocusHalo from './FocusHalo.vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  maxLength?: number
  id?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  maxLength: 3000,
  id: 'arabic-textarea',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const defaultPlaceholder = 'Type text here... Example:  السلام عليكم ورحمة الله وبركته'
const focused = ref(false)

const charCount = computed(() => props.modelValue.length)
const ringColorClass = computed(() => {
  const ratio = charCount.value / props.maxLength
  if (ratio >= 1) return 'text-red-500'
  if (ratio >= 0.8) return 'text-amber-500'
  return ''
})
const circumference = 2 * Math.PI * 54 // r=54 → ~339.24
const dashOffset = computed(() => {
  if (charCount.value === 0) return circumference
  const ratio = charCount.value / props.maxLength
  return circumference - ratio * circumference
})
</script>

<template>
  <div class="tts-section">
    <div class="tts-input-wrapper">
      <!-- Character counter ring -->
      <svg
        v-if="charCount > 0"
        class="tts-input__ring"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke-width="3"
          class="tts-input__ring-bg"
        />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke-width="3"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          class="tts-input__ring-fill"
          :class="ringColorClass"
        />
      </svg>
      <label
        :for="id"
        class="tts-section__label"
      >
        Enter Arabic text to convert to speech
      </label>
      <button
        class="tts-textarea__trash"
        type="button"
        aria-label="Clear text"
        :disabled="!modelValue"
        @click="emit('update:modelValue', '')"
      >
        <span class="i-lucide-trash" />
      </button>
      <FocusHalo :focused="focused" />
      <textarea
        :id="id"
        :value="modelValue"
        :placeholder="placeholder ?? defaultPlaceholder"
        dir="rtl"
        :disabled="disabled"
        class="tts-textarea__input"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @focus="focused = true"
        @blur="focused = false"
      />
    </div>
    <div class="tts-input__meta">
      <span :class="ringColorClass">
        {{ charCount }}/{{ maxLength }}
      </span>
    </div>
  </div>
</template>

<style>
.tts-input-wrapper {
  @apply relative flex flex-col;
}

.tts-textarea__input {
  @apply w-full rounded-xl border-2 border-gray-600 bg-gray-900/40 text-gray-100 placeholder-gray-500 p-5 font-sans text-lg leading-relaxed tracking-wide resize-y overflow-x-hidden min-w-0 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/20 transition-colors flex-1;

  &::placeholder {
    @apply text-base;
  }

  &:disabled {
    @apply opacity-50 cursor-not-allowed border-red-500/50 bg-gray-800/50;
  }
}

.tts-textarea__trash {
  @apply absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent;

  .i-lucide-trash {
    @apply h-5 w-5;
  }
}

.tts-input__ring {
  @apply absolute top-3 left-3 w-8 h-8;

  &-bg {
    @apply stroke-gray-600;
  }

  &-fill {
    transition: stroke 0.3s ease;
  }
}

.tts-input__meta {
  @apply flex justify-between text-xs text-gray-400;
}
</style>
