<script setup lang="ts">
import { useToast } from '../composables/useToast'
import type { ToastType } from '../composables/useToast'
// TODO: migrated from studio-800/studio-700 (see ISSUE-014)

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
    default: return 'bg-stone-800 ring-1 ring-white/[0.06]'
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
        class="flex items-center gap-3 rounded-[1.125rem] ring-1 ring-white/[0.06] p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.25)] max-w-md bg-white/[0.02]"
        :class="toastBgClass(toast.type)"
        aria-live="polite"
      >
        <!-- Inner Core -->
        <div
          class="flex items-center gap-3 rounded-[calc(1.125rem-0.375rem)] px-4 py-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] max-w-md"
        >
          <span
            aria-hidden="true"
            :class="toastIconClass(toast.type)"
          />
          <p class="text-sm text-white flex-1">
            {{ toast.message }}
          </p>
          <!-- Close button: Double-Bezel -->
          <span class="rounded-full ring-1 ring-white/[0.06] p-0.5 bg-white/[0.02]">
            <button
              class="rounded-full bg-stone-700 text-gray-500 hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] active:scale-95"
              aria-label="Close notification"
              @click="toasts.splice(toasts.indexOf(toast), 1)"
            >
              <span
                aria-hidden="true"
                class="ph ph-x text-sm"
              />
            </button>
          </span>
        </div>
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
