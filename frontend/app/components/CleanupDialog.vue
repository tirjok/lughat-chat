<script setup lang="ts">
// CleanupDialog: Confirmation dialog for in-flight synthesis cleanup.
// TODO: migrated from studio-800/sunrise-magenta (see ISSUE-014)
// Emits 'cleanup' (clean & leave) or 'stay' (cancel navigation).

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'cleanup' | 'stay'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div
    v-if="visible"
    data-cleanup-dialog
    role="dialog"
    aria-modal="true"
    aria-labelledby="cleanup-dialog-title"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
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
