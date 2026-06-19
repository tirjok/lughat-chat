<script setup lang="ts">
import { useToast } from '../composables/useToast'
import type { ToastType } from '../composables/useToast'

const toasts = useToast()

function toastIconClass(type: ToastType): string {
  switch (type) {
    case 'error': return 'text-red-400 i-lucide-alert-circle text-lg'
    case 'info': return 'text-blue-400 i-lucide-badge-info text-lg'
    default: return 'text-green-400 i-lucide-check-circle text-lg'
  }
}

function toastBgClass(type: ToastType): string {
  switch (type) {
    case 'error': return 'bg-red-500/10 border-red-500/50'
    case 'info': return 'bg-blue-500/10 border-blue-500/50'
    default: return 'bg-studio-800 border-studio-700'
  }
}
</script>

<template>
  <div
    class="fixed top-20 md:top-4 left-4 right-4 md:left-auto md:w-80 z-50 flex flex-col gap-2 pointer-events-none"
    dir="ltr"
  >
    <TransitionGroup name="toast-slide">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl max-w-md"
        :class="toastBgClass(toast.type)"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          :class="toastIconClass(toast.type)"
        />
        <p class="text-sm text-white flex-1">
          {{ toast.message }}
        </p>
        <button
          class="text-gray-500 hover:text-white transition-colors cursor-pointer"
          aria-label="Close notification"
          @click="toasts.splice(toasts.indexOf(toast), 1)"
        >
          <span
            aria-hidden="true"
            class="i-lucide-x text-sm"
          />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style>
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-slide-leave-active {
  transition-duration: 0.2s;
}
</style>
