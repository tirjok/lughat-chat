<script setup lang="ts">
interface Props {
  /** When true, hide the hamburger button (used on pages without a sidebar). */
  compact?: boolean
}

interface Emits {
  toggle: []
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<template>
  <nav
    class="nav-bar sticky top-0 z-50 flex-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
    style="--nav-height: 56px"
  >
    <!-- Hamburger button (opens sidebar) — hidden when compact -->
    <button
      v-if="!compact"
      data-testid="hamburger"
      class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      @click="$emit('toggle')"
    >
      <span class="ph ph-list text-xl" />
    </button>

    <!-- Logo -->
    <NuxtLink
      to="/"
      class="text-lg font-bold text-gray-900 dark:text-white"
    >
      LughatChat
    </NuxtLink>

    <!-- Navigation links -->
    <div class="flex items-center gap-4">
      <NuxtLink
        to="/"
        class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        Roadmap
      </NuxtLink>
      <NuxtLink
        to="/playground"
        class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        Playground
      </NuxtLink>
      <!-- TTS status indicator -->
      <ModelStatusIndicator />
    </div>
  </nav>
</template>
