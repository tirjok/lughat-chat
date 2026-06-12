<script setup lang="ts">
import { computed, ref } from 'vue'
import FocusHalo from './FocusHalo.vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  maxLength?: number
  id?: string
}>(), {
  modelValue: '',
  maxLength: 3000,
  id: 'arabic-textarea'
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
          border: 1.5px solid #4b5563;
          border-radius: 0.75rem;
          padding: 1.25rem;
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
          min-width: 0;
          background-color: rgba(17, 24, 39, 0.4);
          color: #f3f4f6;
        "
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
.tts-textarea__trash {
  @apply absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent;

  .i-lucide-trash {
    @apply h-5 w-5;
  }
}
.tts-input-wrapper {
  @apply relative;
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

textarea:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

textarea::placeholder {
  color: #6b7280;
  font-size: inherit;
  line-height: inherit;
}
</style>
