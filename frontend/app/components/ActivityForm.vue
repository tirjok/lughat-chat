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

const isEmpty = computed(() => !modelValue.value.trim())
</script>

<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-ink-dim/70 mb-1">
      <slot name="label" />
    </label>
    <textarea
      v-model="modelValue"
      :dir="dir"
      :disabled="disabled"
      class="w-full p-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-ink resize-none focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/30 transition-all duration-300 placeholder:text-ink-dim/40"
      :class="{
        'opacity-50 cursor-not-allowed': disabled,
        'border-error/30 focus:ring-error/30 focus:border-error/30': !isSubmitting && !disabled && isEmpty,
      }"
      rows="3"
      :placeholder="placeholder"
      @keydown="emit('keydown', $event as KeyboardEvent)"
    />
    <button
      :disabled="isSubmitting || disabled || isEmpty"
      class="btn w-full"
      :class="{
        'opacity-50 cursor-not-allowed': disabled,
      }"
      @click="emit('submit')"
    >
      <span v-if="isSubmitting">
        <span class="ph ph-spinner animate-spin-slow ml-1.5" />
        Scoring...
      </span>
      <span v-else><slot name="buttonText" /></span>
    </button>
  </div>
</template>
