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
        class="flex items-center gap-3 rounded-xl px-4 py-3 bg-studio-800/95 backdrop-blur-sm border border-white/[0.04] shadow-ambient max-w-md"
        :class="toastBgClass(toast.type)"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          :class="toastIconClass(toast.type)"
        />
        <p class="text-sm text-ink flex-1">
          {{ toast.message }}
        </p>
        <span class="rounded-full bg-studio-900 p-0.5">
          <button
            class="rounded-full bg-studio-800 text-ink-dim hover:text-gold transition-colors cursor-pointer active:scale-95"
            aria-label="Close notification"
            @click="toasts.splice(toasts.indexOf(toast), 1)"
          >
            <span class="ph ph-x text-sm" />
          </button>
        </span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style>
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 700ms cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.toast-slide-leave-active {
  transition-duration: 0.5s;
}
</style>
