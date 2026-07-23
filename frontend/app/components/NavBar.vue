<script setup lang="ts">
import { useRoute } from '#imports'
import { ref } from 'vue'

interface Props {
  /** When true, hide the hamburger button (used on pages without a sidebar). */
  compact?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ toggle: [] }>()

const route = useRoute()
const menuOpen = ref(false)

function isActive(path: string): boolean {
  return route.path === path
}
</script>

<template>
  <div class="fixed top-3 left-0 right-0 z-50 flex justify-center px-4 md:px-6 pointer-events-none">
    <nav
      class="nav-pill pointer-events-auto flex items-center justify-between
             rounded-full px-4 md:px-5 h-[48px]
             bg-studio-800/70 backdrop-blur-xl
             border border-white/[0.06]
             shadow-ambient
             transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
             md:w-auto w-full max-w-2xl"
      dir="rtl"
      style="--nav-height: 48px"
    >
      <!-- Left: Hamburger (hidden when compact) + Brand -->
      <div class="flex items-center gap-3">
        <button
          v-if="!props.compact"
          data-testid="hamburger"
          class="hamburger-btn relative w-8 h-8 rounded-full bg-white/[0.04]
                 flex items-center justify-center
                 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                 hover:bg-white/[0.08] active:scale-[0.95]"
          :class="{ 'bg-gold/20': menuOpen }"
          @click="menuOpen = !menuOpen; emit('toggle')"
        >
          <span
            class="hamburger-line absolute w-4 h-[1.5px] bg-ink-dim rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            :class="{ 'rotate-45 translate-y-[3px]': menuOpen }"
          />
          <span
            class="hamburger-line absolute w-4 h-[1.5px] bg-ink-dim rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            :class="{ 'opacity-0 scale-0': menuOpen }"
          />
          <span
            class="hamburger-line absolute w-4 h-[1.5px] bg-ink-dim rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            :class="{ '-rotate-45 -translate-y-[3px]': menuOpen }"
          />
        </button>

        <NuxtLink
          to="/"
          class="flex items-center gap-2"
        >
          <span class="text-gold font-bold text-base tracking-tight">
            LughatChat
          </span>
        </NuxtLink>
      </div>

      <!-- Right: Nav links + Status -->
      <div class="flex items-center gap-2 md:gap-4">
        <NuxtLink
          to="/"
          class="nav-link text-xs text-ink-dim/80 hover:text-gold transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          :class="{ 'text-gold font-medium': isActive('/') }"
        >
          Roadmap
        </NuxtLink>
        <NuxtLink
          to="/playground"
          class="nav-link text-xs text-ink-dim/80 hover:text-gold transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          :class="{ 'text-gold font-medium': isActive('/playground') }"
        >
          Playground
        </NuxtLink>
        <ModelStatusIndicator />
      </div>
    </nav>
  </div>

  <!-- Mobile: expanded menu overlay -->
  <Transition
    enter="transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
    enter-from="opacity-0"
    enter-to="opacity-100"
    leave="transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
    leave-from="opacity-100"
    leave-to="opacity-0"
  >
    <div
      v-if="menuOpen && !props.compact"
      class="mobile-menu fixed inset-0 z-40 flex items-center justify-center
             bg-studio-900/80 backdrop-blur-2xl pointer-events-auto"
      @click="menuOpen = false"
    >
      <div class="flex flex-col items-center gap-6">
        <NuxtLink
          to="/"
          class="text-xl font-medium text-ink hover:text-gold transition-colors duration-500"
          :class="{ 'text-gold': isActive('/') }"
          @click="menuOpen = false"
        >
          Roadmap
        </NuxtLink>
        <NuxtLink
          to="/playground"
          class="text-xl font-medium text-ink hover:text-gold transition-colors duration-500"
          :class="{ 'text-gold': isActive('/playground') }"
          @click="menuOpen = false"
        >
          Playground
        </NuxtLink>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.nav-pill {
  box-shadow: var(--shadow-ambient);
}

.hamburger-line {
  transform-origin: center;
}

.nav-link {
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
}

.nav-link:hover {
  background: rgba(200, 164, 92, 0.06);
}

@media (max-width: 767px) {
  .nav-pill {
    padding: 0 0.75rem;
  }
  .nav-link {
    font-size: 0.65rem;
    padding: 0.2rem 0.4rem;
  }
}
</style>
