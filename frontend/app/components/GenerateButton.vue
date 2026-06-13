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
    class="generate-btn"
    @click="emit('click')"
  >
    <!-- Ready state: play icon + text -->
    <div
      v-if="!isGenerating && modelStatus === 'ready'"
      class="btn-content"
    >
      <span
        aria-hidden="true"
        class="i-lucide-play-circle text-xl text-sunrise-magenta group-hover:text-sunrise-orange"
        style="transition: color;"
      />
      <span class="font-bold text-white tracking-wide">Generate Speech</span>
    </div>

    <!-- Loading/Generating state: spinner + status text -->
    <div
      v-else
      class="btn-content"
    >
      <span
        aria-hidden="true"
        class="i-lucide-loader h-6 w-6"
      />
      <span class="font-medium text-sunrise-orange">
        Processing Model…
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
  padding: 1rem 1.5rem;
  cursor: pointer;
  min-height: 3.5rem;
  border: none;
}

/* Spinning conic-gradient border (sweeping highlight effect) */
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

/* Inner fill (creates the border thickness) */
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
  @apply flex items-center justify-center gap-2 relative z-10;
}

.i-lucide-loader {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
