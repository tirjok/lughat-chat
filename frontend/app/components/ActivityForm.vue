<script setup lang="ts">
/**
 * Shared answer form: <textarea> + submit button.
 * Used by all activity type views to collect and submit user answers.
 */

const { dir = 'ltr', disabled = false, isSubmitting = false } = defineProps<{
  /** RTL direction for Arabic input. */
  dir?: 'rtl' | 'ltr'
  /** Whether the form is disabled (max attempts / complete). */
  disabled?: boolean
  /** Whether a submission is currently in progress. */
  isSubmitting?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'submit': []
  'keydown': [event: KeyboardEvent]
}>()

const modelValue = defineModel<string>({ required: true })
</script>

<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-ink-dim mb-1">
      <slot name="label" />
    </label>
    <textarea
      v-model="modelValue"
      :dir="dir"
      :disabled="disabled"
      class="w-full p-3 rounded-lg border border-white/[0.06] bg-studio-800 text-ink resize-none focus:outline-none focus:ring-1 focus:ring-gold/30"
      rows="2"
      :placeholder="placeholder"
      @keydown="emit('keydown', $event as KeyboardEvent)"
    />
    <button
      :disabled="isSubmitting || disabled || !modelValue.trim()"
      class="btn w-full"
      @click="emit('submit')"
    >
      <span v-if="isSubmitting">Scoring...</span>
      <span v-else><slot name="buttonText" /></span>
    </button>
  </div>
</template>
