<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ]
})

useSeoMeta({
  title: 'LughatChat'
})
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-900">
    <GlobalNavbar />
    <NuxtPage />
  </div>
</template>
