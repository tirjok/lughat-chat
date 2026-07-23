<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  isGenerating: boolean
  modelStatus: 'loading' | 'ready' | 'error' | 'retrying'
  disabled: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

const isReadyState = computed(
  () => !props.isGenerating && props.modelStatus === 'ready'
)

const isBusyState = computed(
  () =>
    props.modelStatus === 'loading'
    || props.modelStatus === 'retrying'
    || props.modelStatus === 'error'
    || props.isGenerating
)
</script>

<template>
  <button
    :disabled="props.disabled || props.isGenerating"
    :aria-busy="isBusyState"
    :aria-disabled="props.disabled || props.isGenerating"
    class="generate-btn group relative w-full h-12 rounded-lg bg-gold text-studio-900 font-bold text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
    @click="emit('click')"
  >
    <!-- Ready state -->
    <div
      v-if="isReadyState"
      class="btn-content flex items-center justify-center gap-2"
    >
      <span class="ph-fill ph-magic-wand text-lg" />
      <span>Generate Speech</span>
      <span class="w-7 h-7 rounded-full bg-studio-900/10 flex items-center justify-center">
        <span class="ph ph-arrow-right text-sm" />
      </span>
    </div>

    <!-- Loading state -->
    <div
      v-else-if="isBusyState"
      class="btn-content flex items-center justify-center gap-2"
    >
      <span class="ph ph-spinner animate-spin text-lg" />
      <span>{{ isGenerating ? 'Generating...' : 'Loading...' }}</span>
    </div>
  </button>
</template>

<style scoped>
.generate-btn {
  box-shadow: var(--shadow-gold);
}
.generate-btn:hover:not(:disabled) {
  box-shadow: 0 6px 24px rgba(200, 164, 92, 0.25);
}
</style>
