<script setup lang="ts">
import { useTemplateRef } from 'vue'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'cleanup' | 'stay'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const dialogEl = useTemplateRef<HTMLDivElement | null>('dialogEl')

function handleKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const dialog = dialogEl.value
  if (!dialog) return
  const focusable = dialog.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}
</script>

<template>
  <div
    v-if="props.visible"
    ref="dialogEl"
    data-cleanup-dialog
    role="dialog"
    aria-modal="true"
    aria-labelledby="cleanup-dialog-title"
    @keydown="handleKeydown"
    @keydown.escape.prevent="emit('stay')"
  >
    <div class="bg-stone-800 rounded-xl p-6 max-w-md w-full mx-4 ring-1 ring-white/[0.06] shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
      <h3
        id="cleanup-dialog-title"
        class="text-white text-lg font-semibold mb-3"
      >
        A synthesis is in progress.
      </h3>
      <p class="text-gray-400 text-sm mb-5">
        Clean up the generated files when you leave?
      </p>
      <div class="flex gap-3 justify-end">
        <button
          data-cleanup-action="clean"
          class="px-4 py-2 rounded-lg bg-gold-500 text-white text-sm font-medium hover:bg-gold-500/80 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500"
          @click="emit('cleanup')"
        >
          Clean &amp; Leave
        </button>
        <button
          data-cleanup-action="stay"
          class="px-4 py-2 rounded-lg bg-white/[0.06] text-gray-300 text-sm font-medium hover:bg-white/[0.1] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          @click="emit('stay')"
        >
          Stay
        </button>
      </div>
    </div>
  </div>
</template>
