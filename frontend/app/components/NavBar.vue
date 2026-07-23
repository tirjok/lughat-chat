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
    class="nav-bar sticky top-0 z-50 flex items-center justify-between px-4 h-[56px] bg-studio-900/95 backdrop-blur-sm border-b border-white/[0.04]"
    dir="rtl"
    style="--nav-height: 56px"
  >
    <!-- Left: Hamburger (hidden when compact) + Brand -->
    <div class="flex items-center gap-3">
      <button
        v-if="!compact"
        data-testid="hamburger"
        class="p-2 rounded text-gold hover:text-white transition-colors"
        @click="$emit('toggle')"
      >
        <span class="ph ph-list text-xl" />
      </button>

      <NuxtLink
        to="/"
        class="flex items-center gap-2"
      >
        <span class="text-gold font-bold text-lg tracking-tight">
          LughatChat
        </span>
      </NuxtLink>
    </div>

    <!-- Right: Nav links + Status -->
    <div class="flex items-center gap-4">
      <NuxtLink
        to="/"
        class="text-sm text-ink-dim hover:text-gold transition-colors"
        :class="{ 'text-gold font-medium': isActive('/') }"
      >
        Roadmap
      </NuxtLink>
      <NuxtLink
        to="/playground"
        class="text-sm text-ink-dim hover:text-gold transition-colors"
        :class="{ 'text-gold font-medium': isActive('/playground') }"
      >
        Playground
      </NuxtLink>
      <ModelStatusIndicator />
    </div>
  </nav>
</template>

<style scoped>
.nav-bar a.active-link {
  color: var(--gold);
  font-weight: 500;
}

@media (max-width: 767px) {
  .nav-bar {
    padding: 0.25rem 0.5rem;
  }
  .nav-bar > div:last-child {
    gap: 0.5rem;
  }
  .nav-bar > div:last-child > a {
    font-size: 0.7rem;
  }
}
</style>
