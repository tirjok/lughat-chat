<script setup lang="ts">
import { useToast } from '../composables/useToast'

const toast = useToast()
</script>

<template>
  <Transition name="tts-toast">
    <div
      v-if="toast.visible"
      class="tts-toast tts-toast--error"
      dir="rtl"
    >
      <div class="tts-toast__icon">
        <span aria-hidden="true" class="i-lucide-alert-circle" />
      </div>
      <p class="tts-toast__message">
        {{ toast.message }}
      </p>
      <button
        aria-label="Close notification"
        class="tts-toast__close"
        @click="toast.visible = false"
      >
        <span aria-hidden="true" class="i-lucide-x" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.tts-toast {
  @apply fixed top-4 left-1/2 -translate-x-1/2 z-50 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex items-center gap-3 max-w-md;

  &--error {
    @apply border-red-300 dark:border-red-700;
  }

  &__icon {
    @apply w-5 h-5 text-red-500 flex-shrink-0;
  }

  &__message {
    @apply text-sm text-gray-900 dark:text-white flex-1;
  }

  &__close {
    @apply w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer;
  }
}

.tts-toast-enter-active,
.tts-toast-leave-active {
  transition: all 0.3s ease;
}

.tts-toast-enter-from,
.tts-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
