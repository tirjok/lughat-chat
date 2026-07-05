<script setup lang="ts">
import { useToast } from '../composables/useToast'
import type { ToastType } from '../composables/useToast'

const toasts = useToast()

function toastIconClass(type: ToastType): string {
  switch (type) {
    case 'error': return 'text-red-400 ph ph-alert-circle text-lg'
    case 'info': return 'text-blue-400 ph ph-badge-info text-lg'
    default: return 'text-green-400 ph ph-check-circle text-lg'
  }
}

function toastBgClass(type: ToastType): string {
  switch (type) {
    case 'error': return 'bg-red-500/10 ring-1 ring-red-500/30'
    case 'info': return 'bg-blue-500/10 ring-1 ring-blue-500/30'
    default: return 'bg-studio-800 ring-1 ring-white/[0.06]'
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
        class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.3)] max-w-md"
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
            class="ph ph-x text-sm"
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
