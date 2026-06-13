<script setup lang="ts">
import { useToast } from '../composables/useToast'

const toast = useToast()
</script>

<template>
  <Transition name="tts-toast">
    <div
      v-if="toast.visible"
      aria-live="polite"
      class="fixed top-4 right-4 z-50 p-3 bg-studio-800 rounded-lg shadow-xl border border-studio-700 flex items-center gap-3 max-w-md"
      dir="ltr"
    >
      <div class="w-5 h-5 text-green-400 flex-shrink-0">
        <span
          aria-hidden="true"
          class="i-lucide-check"
        />
      </div>
      <p class="text-sm text-white flex-1">
        {{ toast.message }}
      </p>
      <button
        aria-label="Close notification"
        class="w-5 h-5 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
        @click="toast.visible = false"
      >
        <span
          aria-hidden="true"
          class="i-lucide-x"
        />
      </button>
    </div>
  </Transition>
</template>

<style>
.tts-toast-enter-active,
.tts-toast-leave-active {
  transition: transform, opacity 0.3s ease;
}

.tts-toast-enter-from,
.tts-toast-leave-to {
  opacity: 0;
  transform: translate(50%, -20px);
}
</style>
