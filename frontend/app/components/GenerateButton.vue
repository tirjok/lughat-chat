<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  isGenerating: boolean
  modelStatus: 'loading' | 'ready' | 'error'
  disabled: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()

const isReady = computed(() => !props.isGenerating && props.modelStatus === 'ready')
</script>

<template>
  <div
    class="generate-btn-wrapper"
    :class="{ 'is-disabled': disabled }"
  >
    <button
      :disabled="disabled"
      class="generate-btn"
      @click="emit('click')"
    >
      <!-- Ready state: play icon + text -->
      <div
        v-if="isReady"
        class="btn-content btn-content-ready"
      >
        <span
          aria-hidden="true"
          class="i-lucide-play h-4 w-4"
        />
        <span>Generate Speech</span>
      </div>
      <!-- Loading/Generating state: spinner + status text -->
      <div
        v-else
        class="btn-content btn-content-loading"
      >
        <span
          aria-hidden="true"
          class="i-lucide-loader h-4 w-4"
        />
        <span>
          {{ isGenerating ? 'Generating\u2026' : 'Processing Model\u2026' }}
        </span>
      </div>
    </button>
  </div>
</template>

<style>
.generate-btn-wrapper {
  position: relative;
  background: #1A1A1A;
  border-radius: 0.75rem;
  overflow: hidden;
  z-index: 1;
  transition: all 0.3s ease;
  display: block;
  width: 100%;
}

/* Spinning conic-gradient border (sweeping highlight effect) */
.generate-btn-wrapper::before {
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
.generate-btn-wrapper::after {
  content: '';
  position: absolute;
  inset: 2px;
  background: #1A1A1A;
  border-radius: 0.7rem;
  z-index: -1;
  transition: background 0.3s ease;
}

.generate-btn-wrapper:hover::after {
  background: #1f1f1f;
}

.generate-btn-wrapper:active {
  transform: scale(0.98);
}

.generate-btn-wrapper.is-disabled::before {
  animation-duration: 6s;
}

.generate-btn {
  position: relative;
  z-index: 10;
  background: transparent;
  border: none;
  padding: 0.875rem 1.5rem;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  min-height: 3.5rem;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.generate-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-content {
  @apply flex items-center justify-center gap-2;
}

.btn-content .i-lucide-loader {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
