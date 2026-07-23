<script setup lang="ts">
import { useToast } from '../composables/useToast'
import type { ToastType } from '../composables/useToast'

const toasts = useToast()

function toastIconClass(type: ToastType): string {
  switch (type) {
    case 'error': return 'text-red-400 ph ph-alert-circle text-base'
    case 'info': return 'text-blue-400 ph ph-badge-info text-base'
    default: return 'text-gold ph ph-check-circle text-base'
  }
}

function toastBgClass(type: ToastType): string {
  switch (type) {
    case 'error': return 'bg-red-500/8'
    case 'info': return 'bg-blue-500/8'
    default: return 'bg-studio-800/90'
  }
}
</script>

<template>
  <div
    class="fixed top-14 md:top-3 left-3 right-3 md:left-auto md:w-80 z-50 flex flex-col gap-2 pointer-events-none"
    dir="ltr"
  >
    <TransitionGroup name="toast-slide">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="flex items-center gap-3 rounded-2xl px-4 py-3 bg-studio-800/95 backdrop-blur-xl
               border border-white/[0.06] shadow-ambient max-w-md
               transition-all duration-500"
        :class="toastBgClass(toast.type)"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          :class="toastIconClass(toast.type)"
        />
        <p class="text-xs text-ink flex-1 leading-relaxed">
          {{ toast.message }}
        </p>
        <span class="rounded-full bg-studio-900 p-0.5">
          <button
            class="rounded-full bg-studio-800 text-ink-dim/60 hover:text-gold
                   transition-colors duration-500 cursor-pointer active:scale-90"
            aria-label="Close notification"
            @click="toasts.splice(toasts.indexOf(toast), 1)"
          >
            <span class="ph ph-x text-xs" />
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
