<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ]
})

const title = 'Lughat Chat - Premium Audio Studio'
const description = 'Arabic Text-to-Speech Studio - Professional TTS with XTTS-v2'

useSeoMeta({
  title,
  description
})
</script>

<template>
  <div>
    <NuxtLoadingIndicator />
    <NuxtPage />
  </div>
</template>
