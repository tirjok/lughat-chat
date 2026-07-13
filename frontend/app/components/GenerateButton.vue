<script setup lang="ts">
interface Props {
  isGenerating: boolean
  modelStatus: 'loading' | 'ready' | 'error' | 'retrying'
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
    :aria-busy="modelStatus === 'loading'"
    :aria-disabled="disabled"
    class="generate-btn group"
    @click="emit('click')"
  >
    <!-- Ready state: Button-in-Button trailing icon -->
    <div
      v-if="!isGenerating && modelStatus === 'ready'"
      class="btn-content"
    >
      <span
        aria-hidden="true"
        class="ph-fill ph-play-circle text-xl text-sunrise-magenta group-hover:text-sunrise-orange transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110 group-hover:-translate-y-[1px] group-hover:translate-x-[1px]"
      />
      <span class="font-bold text-white tracking-wide text-sm md:text-base">
        Generate Speech
      </span>
      <!-- Trailing icon circle (button-in-button) -->
      <span
        class="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] shrink-0"
        aria-hidden="true"
      >
        <span class="ph-fill ph-arrow-up-right text-xs text-gray-400 group-hover:text-sunrise-orange transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]" />
      </span>
    </div>

    <!-- Loading/Retrying/Generating state: Button-in-Button trailing icon -->
    <div
      v-else
      class="btn-content loading-state"
    >
      <div class="loader" />
      <span class="font-medium text-sunrise-orange animate-pulse text-sm md:text-base">
        {{ modelStatus === 'retrying' ? 'Retrying...' : 'Loading TTS Model...' }}
      </span>
      <!-- Trailing icon circle (disabled state) -->
      <span
        class="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <span class="ph-fill ph-arrows-clockwise text-xs text-gray-500" />
      </span>
    </div>
  </button>
</template>

<style scoped>
/* Double-Bezel (Doppelrand) + Magnetic Physics */
/* Outer Shell: spring hover + press on active */
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
    0 0 0 0.5px rgba(255, 255, 255, 0.12),
    0 8px 24px rgba(221, 36, 118, 0.1);
  transform: translateY(-1px);
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
