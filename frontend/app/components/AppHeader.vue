<script setup lang="ts">
import { useHealthPoll } from '../composables/useHealthPoll'

const { status, modelLoaded } = useHealthPoll()
</script>

<template>
  <header class="flex items-center justify-between gap-4 px-6 py-4">
    <!-- Left: Icon + Title -->
    <div class="flex items-center gap-4">
      <!-- Waves icon (volume-2) -->
      <span
        aria-hidden="true"
        class="i-lucide-volume-2 h-8 w-8"
      />

      <!-- Title: "Lughat" + "Chat" in magenta -->
      <div>
        <h1 class="text-xl font-bold">
          <span>Lughat</span><span style="color: #DD2476;">Chat</span>
        </h1>
        <p class="text-xs text-gray-400">
          Premium Audio Studio
        </p>
      </div>
    </div>

    <!-- Right: Model status indicator -->
    <div class="flex items-center gap-2 text-sm">
      <!-- Loading state: spinning loader -->
      <span
        v-if="status === 'loading'"
        aria-hidden="true"
        class="i-lucide-loader animate-spin h-4 w-4"
      />

      <!-- Ready state: green check -->
      <span
        v-else-if="modelLoaded"
        aria-hidden="true"
        class="i-lucide-check-circle h-4 w-4 text-green-500"
      />

      <!-- Error state: red alert -->
      <span
        v-else
        aria-hidden="true"
        class="i-lucide-alert-circle h-4 w-4 text-red-500"
      />

      <span>
        {{ status === 'loading' ? 'Loading...' : modelLoaded ? 'Model Ready' : 'Model Load Error' }}
      </span>
    </div>
  </header>
</template>
