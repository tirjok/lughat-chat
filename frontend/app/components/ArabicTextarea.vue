<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  maxLength?: number
}>(), {
  modelValue: '',
  maxLength: 2000,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const defaultPlaceholder = 'Type text here... Example:  السلام عليكم ورحمة الله وبركته'

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
          class="tts-input__ring-fill transition-all"
          :class="ringColorClass"
        />
      </svg>
      <textarea
        :value="modelValue"
        :placeholder="placeholder ?? defaultPlaceholder"
        dir="auto"
        style="
          font-family: 'Noto Sans Arabic', 'Amiri', 'Scheherazade New', sans-serif;
          font-size: 1.35rem;
          line-height: 2.1;
          letter-spacing: 0.015em;
          word-spacing: 0.08em;
          text-align: right;
          min-height: 6rem;
          max-height: 20rem;
          resize: vertical;
          border: 1.5px solid #d1d5db;
          border-radius: 0.75rem;
          padding: 1.25rem;
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
          min-width: 0;
          background-color: rgba(255, 255, 255, 0.6);
          color: #111827;
        "
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>
    <div class="tts-input__meta">
      <span :class="ringColorClass">
        {{ charCount }}/{{ maxLength }} characters
      </span>
    </div>
  </div>
</template>

<style scoped>
.tts-input-wrapper {
  @apply relative;
}

.tts-input__ring {
  @apply absolute top-3 left-3 w-8 h-8;

  &-bg {
    @apply stroke-gray-300 dark:stroke-gray-600;
  }

  &-fill {
    @apply transition-all;
  }
}

.tts-input__meta {
  @apply flex justify-between text-xs text-gray-500 dark:text-gray-400;
}

textarea:focus-visible {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

@media (prefers-color-scheme: dark) {
  textarea {
    border-color: #4b5563;
    background-color: rgba(17, 24, 39, 0.4);
    color: #f3f4f6;
  }

  textarea:focus-visible {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

textarea::placeholder {
  color: #9ca3af;
  font-size: inherit;
  line-height: inherit;
}

@media (prefers-color-scheme: dark) {
  textarea::placeholder {
    color: #6b7280;
  }
}
</style>
