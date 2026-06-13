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
const _isOverLimit = computed(() => charCount.value > props.maxLength)
const isNearLimit = computed(() => {
  const ratio = charCount.value / props.maxLength
  return ratio >= 0.8 && charCount.value <= props.maxLength
})
const isOverLimit = computed(() => charCount.value > props.maxLength)

function clearText() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="relative flex flex-col h-full">
    <FocusHalo :focused="focused" />
    <textarea
      :id="id"
      :value="modelValue"
      :placeholder="placeholder ?? defaultPlaceholder"
      dir="rtl"
      :disabled="disabled"
      class="flex-1 w-full bg-transparent border-none outline-none resize-none text-gray-200 placeholder-gray-700 scroll-smooth z-10"
      style="caret-color: #FF512F;"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @focus="focused = true"
      @blur="focused = false"
    />
    <!-- Character counter and clear button -->
    <div class="flex flex-col items-end gap-1 px-2 py-1">
      <span
        class="text-xs font-medium"
        :class="{
          'text-amber-400': isNearLimit,
          'text-red-500': isOverLimit,
          'text-gray-400': !isNearLimit && !isOverLimit
        }"
      >
        {{ charCount }}/{{ maxLength }}
      </span>
      <button
        v-if="charCount > 0"
        aria-label="Clear text"
        class="text-gray-400 hover:text-white transition-colors cursor-pointer"
        @click="clearText"
      >
        <span class="i-lucide-x text-sm" />
      </button>
    </div>
  </div>
</template>
