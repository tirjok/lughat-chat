<script setup lang="ts">
const props = defineProps<{
  isGenerating: boolean
  modelStatus: 'loading' | 'ready' | 'error'
  disabled: boolean
}>()

const disabledAttr = computed(() => (props.disabled ? 'true' : undefined))

// TODO: migrated from sunrise-orange/magenta (see ISSUE-014)

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    :disabled="disabledAttr"
    :aria-disabled="props.disabled"
    :aria-busy="props.isGenerating"
    :class="{ 'is-disabled': props.disabled }"
    class="generate-btn group"
    @click="emit('click')"
  >
    <!-- Ready state: Button-in-Button trailing icon -->
    <div
      v-if="!props.isGenerating && props.modelStatus === 'ready'"
    >
      <span
        aria-hidden="true"
        class="ph-fill ph-play-circle text-xl text-gold-500 group-hover:text-primary-500 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110 group-hover:-translate-y-[1px] group-hover:translate-x-[1px]"
      />
      <span class="font-bold text-white tracking-wide text-sm md:text-base group-hover:text-white">
        Generate Speech
      </span>
    </div>
    <div
      v-else-if="props.modelStatus === 'error'"
      class="btn-content"
    >
      <span
        class="ph-fill ph-warning-circle text-xl text-red-500"
        aria-hidden="true"
      />
    </div>
    <div
      v-else
      class="btn-content loading-state"
    >
      <div class="loader" />
      <span class="font-medium text-primary-500 animate-pulse text-sm md:text-base">
        Processing Model...
      </span>
    </div>
  </button>
</template>

<style scoped>
/* Double-Bezel (Doppelrand) + Magnetic Physics */
.generate-btn {
  position: relative;
  background: #1A1A1A;
  border-radius: 1.25rem;
  overflow: hidden;
  z-index: 1;
  transition: transform 250ms var(--ease-spring), box-shadow 300ms var(--ease-spring);
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
    0 8px 24px rgba(245, 158, 11, 0.1);
  transform: translateY(-1px);
}

/* Focus-visible: gold ring for keyboard users */
.generate-btn:focus-visible {
  outline: none;
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.08),
    0 0 0 2px #f59e0b,
    0 0 0 3px rgba(245, 158, 11, 0.3);
}

/* Press state */
.generate-btn:active {
  transform: scale(0.98);
}

/* Disabled state: native :disabled attribute + CSS class for styling */

.generate-btn.is-disabled {
  background: #d6d3d1;
  cursor: not-allowed;
  pointer-events: none;
}

/* Inner Core */
.generate-btn::before {
  content: '';
  position: absolute;
  inset: 1px;
  background: #1A1A1A;
  border-radius: 1.15rem;
  z-index: 0;
  transition: background 300ms var(--ease-spring);
  pointer-events: none;
}
.generate-btn.is-disabled::before {
  background: #d6d3d1;
}
.dark .generate-btn.is-disabled {
  background: #44403c;
}
.dark .generate-btn.is-disabled::before {
  background: #44403c;
}

.generate-btn:hover::before {
  background: #232323;
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
    #f59e0b 85%,
    #14b8a6 100%
  );
  animation: spin 4s linear infinite;
  z-index: -1;
  opacity: 0;
  transition: opacity 300ms var(--ease-spring);
}

.generate-btn:hover::after {
  opacity: 1;
}

.generate-btn.is-disabled::after {
  animation: none;
  opacity: 0;
  pointer-events: none;
}

.btn-content {
  @apply flex items-center justify-center gap-2 relative z-10 w-full;
}

.loader {
  border: 3px solid rgba(245, 158, 11, 0.3);
  border-top: 3px solid #f59e0b;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
