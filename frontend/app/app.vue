<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRequestURL } from '#app'

function getRoutePath(): string {
  try {
    return useRoute().path
  } catch {
    return '/'
  }
}

const initialPath = (() => {
  try {
    return useRequestURL().pathname
  } catch {
    return '/'
  }
})()

const currentPath = computed(() => {
  if (import.meta.server) {
    return initialPath
  }
  return getRoutePath()
})

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
