<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRequestURL } from '#app'

// GlobalNavbar lives outside <router-view>, so useRoute() throws at module scope.
// We wrap it in a function and call it inside a computed — that's safe.
function getRoutePath(): string {
  try {
    return useRoute().path
  } catch {
    return '/'
  }
}

// Module-level fallback: only used for SSR initial render when $route is unavailable.
const initialPath = (() => {
  try {
    return useRequestURL().pathname
  } catch {
    return '/'
  }
})()

const currentPath = computed(() => {
  // Client: read $route.path reactively inside computed (safe).
  // Server: use the initial path from SSR.
  if (import.meta.server) {
    return initialPath
  }
  return getRoutePath()
})

// Known routes that should show the navbar
const showNavbar = computed(() => {
  const p = currentPath.value
  const KNOWN_PATHS = ['/', '/dashboard', '/dashboard/level']
  return KNOWN_PATHS.some(pattern =>
    p === pattern || p.startsWith(pattern + '/')
  )
})
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-950">
    <GlobalNavbar
      v-if="showNavbar"
      :current-path="currentPath"
    />
    <NuxtPage />
  </div>
</template>
