<script setup lang="ts">
import { useHealthPoll } from '../composables/useHealthPoll'

const { status, modelLoaded } = useHealthPoll()
</script>

<template>
  <div class="flex items-center gap-2 text-sm">
    <!-- Loading state: spinning loader -->
    <span
      v-if="status === 'loading'"
      aria-hidden="true"
      class="i-lucide-loader animate-spin w-4 h-4"
    />

    <!-- Ready state: green check -->
    <span
      v-else-if="modelLoaded"
      aria-hidden="true"
      class="i-lucide-check-circle w-4 h-4 text-green-500"
    />

    <!-- Error state: red alert -->
    <span
      v-else
      aria-hidden="true"
      class="i-lucide-alert-circle w-4 h-4 text-red-500"
    />

    <span>
      {{ status === 'loading' ? 'Loading...' : modelLoaded ? 'Model Ready' : 'Model Load Error' }}
    </span>
  </div>
</template>
