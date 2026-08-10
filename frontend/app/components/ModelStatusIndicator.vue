<script setup lang="ts">
import { useHealthPoll } from '../composables/useHealthPoll'

const props = defineProps<{ light?: boolean }>()

const { status, modelLoaded } = useHealthPoll()
</script>

<template>
  <!-- Outer Shell: subtle background + hairline ring -->
  <div
    :class="props.light
      ? 'bg-stone-100 ring-stone-200'
      : 'bg-white/[0.02] ring-white/[0.06]'"
    class="flex items-center gap-2 rounded-full ring-1 px-2.5 py-1"
    :title="`Model XTTS-v2 ${status === 'loading' ? 'Loading...' : status === 'error' ? 'Error' : 'Ready'}`"
  >
    <!-- Inner Core -->
    <div
      :class="props.light
        ? 'bg-white border-stone-200'
        : 'bg-stone-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]'"
      class="flex items-center gap-2 rounded-full px-3 py-1.5 border"
    >
      <!-- Loading state: pulsing orange dot -->
      <span
        v-if="status === 'loading'"
        aria-hidden="true"
        :class="props.light ? '' : 'shadow-[0_0_8px_#f97316]'"
        class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"
      />

      <!-- Ready state: green dot with glow -->
      <span
        v-else-if="modelLoaded"
        aria-hidden="true"
        :class="props.light ? '' : 'shadow-[0_0_8px_#22c55e]'"
        class="w-2 h-2 rounded-full bg-green-500 animate-pulse"
      />

      <!-- Error state: red dot -->
      <span
        v-else
        aria-hidden="true"
        :class="props.light ? '' : 'shadow-[0_0_8px_#ef4444]'"
        class="w-2 h-2 rounded-full bg-red-500"
      />

      <span
        :class="props.light
          ? 'text-stone-700'
          : 'text-gray-300'"
        class="text-xs font-medium"
      >
        {{ status === 'loading' ? 'Loading...' : modelLoaded ? 'Ready' : 'Error' }}
      </span>
    </div>
  </div>
</template>
