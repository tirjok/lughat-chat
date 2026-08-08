<script setup lang="ts">
import { computed } from 'vue'

type NuxtAppRoute = { path: string, name?: string }
type NuxtAppResult = { route?: NuxtAppRoute }

// Access route via Nuxt app
const useNuxtApp = (globalThis as Record<string, unknown>).useNuxtApp as (() => NuxtAppResult) | undefined
const route = useNuxtApp?.() ?? { route: { path: '/', name: undefined } }

// Known routes that should show the navbar
const KNOWN_PATHS = ['/', '/dashboard', '/dashboard/level']

const showNavbar = computed(() => {
  const path = route.route?.path ?? '/'
  // Check if path matches any known route pattern
  return KNOWN_PATHS.some(pattern =>
    path === pattern || path.startsWith(pattern + '/')
  )
})
</script>

<template>
  <div class="min-h-screen">
    <GlobalNavbar v-if="showNavbar" />
    <NuxtPage />
  </div>
</template>
