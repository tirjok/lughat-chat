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
/* Double-Bezel (Doppelrand) Architecture */
/* Outer Shell */
.generate-btn {
  position: relative;
  background: #1A1A1A;
  border-radius: 1.25rem;
  overflow: hidden;
  z-index: 1;
  transition: transform 700ms var(--ease-spring), box-shadow 700ms var(--ease-spring);
  display: block;
  width: 100%;
  padding: 0.875rem 1.5rem;
  min-height: 3.5rem;
  cursor: pointer;
  /* Ring-based subtle border (replaces 1px solid gray) */
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.08),
    0 0 0 0.5px rgba(255, 255, 255, 0.06);
}

.generate-btn:hover {
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.1),
    0 0 0 0.5px rgba(255, 255, 255, 0.1),
    0 4px 16px rgba(221, 36, 118, 0.08);
}

.generate-btn:active {
  transform: scale(0.98);
}

.generate-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Inner Core */
.generate-btn::before {
  content: '';
  position: absolute;
  inset: 1px;
  background: #1A1A1A;
  border-radius: 1.15rem;
  z-index: 0;
  transition: background 700ms var(--ease-spring);
  pointer-events: none;
}

.generate-btn:hover::before {
  background: #1f1f1f;
}

/* Spinning conic-gradient accent (behind everything) */
.generate-btn::after {
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
  z-index: -1;
  opacity: 0;
  transition: opacity 700ms var(--ease-spring);
}

.generate-btn:hover::after {
  opacity: 1;
}

.generate-btn:disabled::after {
  animation: none;
  opacity: 0;
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
