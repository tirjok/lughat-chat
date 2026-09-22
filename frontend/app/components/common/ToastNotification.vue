<script setup lang="ts">
import { useToast } from '../../composables/common/useToast'
import type { ToastType } from '../../composables/common/useToast'
import { onUnmounted, watch } from 'vue'
import { animate } from '@motionone/vue'

const toasts = useToast()

let activeAnimations: ReturnType<typeof animate>[] = []
const mountedItems = new Set<string>()

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

// Watch for toast additions and trigger entry animation
let previousToastIds = new Set<string>()
watch(toasts, (current) => {
  // Find newly added toasts (skip on initial undefined/empty)
  const currentIds = new Set((current || []).map(t => String(t.id)))

  for (const toast of (current || [])) {
    const toastId = String(toast.id)
    const isAddition = !previousToastIds.has(toastId)

    // Skip if already been seen (not a new addition)
    if (!isAddition && mountedItems.has(toastId)) continue

    // Only animate new toasts
    if (isAddition) {
      mountedItems.add(toastId)
      // Find the DOM element and animate it
      requestAnimationFrame(() => {
        const item = document.querySelector(`.toast-item[data-toast-id="${toastId}"]`) as HTMLElement | null
        if (item) {
          const anim = animate(item,
            { x: '100%', opacity: 0 },
            {
              x: 0,
              opacity: 1,
              type: 'spring',
              stiffness: 300,
              damping: 22,
              restDelta: 0.01,
              duration: 0.35,
              reduceMotion: 'instant'
            }
          )
          activeAnimations.push(anim)
        }
      })
    }
  }

  // Find removed toasts (dismissed/expired)
  for (const prevId of previousToastIds) {
    if (!currentIds.has(prevId)) {
      mountedItems.delete(prevId)
      // Animate out the removed toast
      requestAnimationFrame(() => {
        const items = document.querySelectorAll<HTMLDivElement>(`.toast-item[data-toast-id="${prevId}"]`)
        for (const item of items) {
          const anim = animate(item,
            { x: 0, opacity: 1 },
            {
              x: '100%',
              opacity: 0,
              type: 'spring',
              stiffness: 300,
              damping: 22,
              restDelta: 0.01,
              duration: 0.25,
              reduceMotion: 'instant'
            }
          )
          activeAnimations.push(anim)
        }
      })
    }
  }

  previousToastIds = currentIds
}, { immediate: true })

// Clean up animations on unmount
onUnmounted(() => {
  for (const anim of activeAnimations) {
    // eslint-disable-next-line @stylistic/max-statements-per-line
    try { anim.cancel() } catch { /* ignore cancel errors */ }
  }
  activeAnimations = []
})
</script>

<template>
  <div
    class="fixed top-20 md:top-4 left-4 right-4 md:left-auto md:w-80 z-50 flex flex-col gap-2 pointer-events-none"
    dir="ltr"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="flex items-center gap-3 rounded-[1.125rem] ring-1 ring-white/[0.06] p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.25)] max-w-md bg-white/[0.02] toast-item"
      :data-toast-id="toast.id"
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
            class="rounded-full bg-stone-700 text-gray-500 hover:text-white cursor-pointer"
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
  </div>
</template>
