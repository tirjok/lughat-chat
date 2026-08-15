<script setup lang="ts">
// CleanupSettings: Compact section showing cleanup status with "Run Cleanup Now" button.
// Renders below control deck, above waveform canvas.

import { useCleanupSettings } from '../composables/useCleanupSettings'

const { runCleanup, isLoading, lastRemovedCount } = useCleanupSettings()
</script>

<template>
  <div
    data-cleanup-container
    class="w-full px-3 py-2 border-t border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 flex items-center justify-between gap-2"
  >
    <!-- Status text -->
    <span
      data-cleanup-status
      class="text-xs text-stone-500 dark:text-gray-400 flex items-center gap-1.5"
    >
      <span
        aria-hidden="true"
        class="ph ph-broom text-stone-400 dark:text-gray-500"
      />
      <template v-if="lastRemovedCount === null">
        No cleanup run yet
      </template>
      <template v-else>
        Last cleanup: {{ lastRemovedCount }} files removed
      </template>
    </span>

    <!-- Run Cleanup Now button -->
    <button
      data-cleanup-action="run"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-gray-300 text-xs font-medium hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="isLoading"
      @click="runCleanup()"
    >
      <span
        v-if="isLoading"
        aria-hidden="true"
        class="ph ph-spinner animate-spin"
      />
      <span
        aria-hidden="true"
        class="ph ph-broom"
        :class="{ 'animate-spin': isLoading }"
      />
      <span>{{ isLoading ? 'Running...' : 'Run Cleanup Now' }}</span>
    </button>
  </div>
</template>
