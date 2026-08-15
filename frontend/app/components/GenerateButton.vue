<script setup lang="ts">
const props = defineProps<{
  isGenerating: boolean
  modelStatus: 'loading' | 'ready' | 'error'
  disabled: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    :disabled="props.disabled"
    :aria-busy="props.isGenerating"
    :class="{
      'rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm flex items-center justify-center gap-2 w-full': true,
      'is-disabled': props.disabled,
      'bg-primary-500 text-white hover:bg-primary-600': !props.disabled && props.modelStatus === 'ready' && !props.isGenerating,
      'bg-red-500 text-white': props.modelStatus === 'error',
      'bg-primary-500 text-white': props.isGenerating,
      'bg-stone-300 dark:bg-stone-700 text-stone-500 dark:text-stone-400 cursor-not-allowed': props.disabled
    }"
    @click="emit('click')"
  >
    <template v-if="props.modelStatus === 'ready' && !props.isGenerating">
      <span
        class="ph-fill ph-play-circle text-lg"
        aria-hidden="true"
      />
      <span>Generate Speech</span>
    </template>
    <template v-else-if="props.modelStatus === 'error'">
      <span
        class="ph-fill ph-warning-circle text-lg"
        aria-hidden="true"
      />
      <span>Error</span>
    </template>
    <template v-else>
      <span
        class="ph ph-loader text-lg animate-spin"
        aria-hidden="true"
      />
      <span class="animate-pulse">Generating Speech...</span>
    </template>
  </button>
</template>
