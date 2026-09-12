<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const showNavbar = computed(() => {
  const p = route.path
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
      :current-path="route.path"
    />
    <NuxtPage />
  </div>
</template>
