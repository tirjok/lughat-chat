<script setup lang="ts">
import { ref } from 'vue'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in <script setup> template bindings
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

const defaultPlaceholder = 'اكتب النص هنا... مثال: السلام عليكم ورحمة الله وبركاته'
const focused = ref(false)
</script>

<template>
  <div class="relative flex flex-col h-full">
    <textarea
      :id="id"
      :value="modelValue"
      :placeholder="placeholder ?? defaultPlaceholder"
      dir="rtl"
      :disabled="disabled"
      class="flex-1 w-full bg-transparent border-none outline-none resize-none text-gray-200 placeholder-gray-700 scroll-smooth z-10"
      style="
        font-family: 'Cairo', sans-serif;
        font-size: clamp(1.5rem, 3vw, 3rem);
        line-height: 2;
        caret-color: #FF512F;
      "
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @focus="focused = true"
      @blur="focused = false"
    />
  </div>
</template>
