<script setup lang="ts">
import { useRoute } from '#imports'

interface Props {
  /** When true, hide the hamburger button (used on pages without a sidebar). */
  compact?: boolean
}

interface Emits {
  toggle: []
}

defineProps<Props>()
defineEmits<Emits>()

const route = useRoute()

/** Returns true when the given path matches the current route path. */
function isActive(path: string): boolean {
  return route.path === path
}
</script>

<template>
  <nav
    class="nav-bar sticky top-0 z-50 flex-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rtl md:px-4 md:py-2"
    dir="rtl"
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
        :class="{ active: isActive('/') }"
      >
        Roadmap
      </NuxtLink>
      <NuxtLink
        to="/playground"
        class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        :class="{ active: isActive('/playground') }"
      >
        Playground
      </NuxtLink>
      <!-- TTS status indicator -->
      <ModelStatusIndicator />
    </div>
  </nav>
</template>

<style scoped>
/* Active link styling */
.nav-bar a.active {
  color: rgb(22, 163, 74); /* green-600 */
  font-weight: 600;
}

/* Mobile compact layout (< 768px) */
@media (max-width: 767px) {
  .nav-bar {
    padding: 0.25rem 0.5rem;
  }

  .nav-bar > div:nth-child(3) {
    gap: 0.5rem;
  }

  .nav-bar > div:nth-child(3) > a {
    font-size: 0.75rem;
  }
}
</style>
