<script setup lang="ts">
interface Props {
  isGenerating: boolean
  modelStatus: 'loading' | 'ready' | 'error'
  disabled: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    :disabled="disabled"
    class="generate-btn group"
    @click="emit('click')"
  >
    <!-- Ready state -->
    <div
      v-if="!isGenerating && modelStatus === 'ready'"
      class="btn-content"
    >
      <span
        aria-hidden="true"
        class="ph-fill ph-play-circle text-xl text-sunrise-magenta group-hover:text-sunrise-orange"
      />
      <span class="font-bold text-white tracking-wide text-sm md:text-base">
        Generate Speech
      </span>
    </div>

    <!-- Loading/Generating state -->
    <div
      v-else
      class="btn-content loading-state"
    >
      <div class="loader" />
      <span class="font-medium text-sunrise-orange animate-pulse text-sm md:text-base">
        Processing Model...
      </span>
    </div>
  </button>
</template>

<style scoped>
.generate-btn {
  position: relative;
  background: #1A1A1A;
  border-radius: 0.75rem;
  overflow: hidden;
  z-index: 1;
  transition: all 0.3s ease;
  display: block;
  width: 100%;
  /* Prototype: py-3.5 md:py-4 */
  padding: 0.875rem 1.5rem;
  min-height: 3.5rem;
  cursor: pointer;
  border: 1px solid #333333;
}

/* Spinning conic-gradient border */
.generate-btn::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    transparent 70%,
    #DD2476 85%,
    #FF512F 100%
  );
  animation: spin 4s linear infinite;
  z-index: -2;
}

/* Inner fill (border thickness) */
.generate-btn::after {
  content: '';
  position: absolute;
  inset: 2px;
  background: #1A1A1A;
  border-radius: 0.7rem;
  z-index: -1;
  transition: background 0.3s ease;
}

.generate-btn:hover::after {
  background: #1f1f1f;
}

.generate-btn:active {
  transform: scale(0.98);
}

.generate-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.generate-btn:disabled::before {
  animation-duration: 6s;
}

.btn-content {
  @apply flex items-center justify-center gap-2 relative z-10 w-full;
}

.loader {
  border: 3px solid rgba(255, 81, 47, 0.3);
  border-top: 3px solid #FF512F;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
