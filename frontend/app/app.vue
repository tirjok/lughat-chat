<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
    { name: 'theme-color', content: '#0f172a', media: '(prefers-color-scheme: dark)' },
    { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    // Arabic font support
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap' }
  ],
  htmlAttrs: {
    lang: 'ar',
    dir: 'rtl'
  }
})

const title = 'Lughat Chat - Text to Speech'
const description = 'Arabic Text-to-Speech App - Enter text and listen instantly'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogLocale: 'ar_SA',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <div class="tts-layout">
    <ToastNotification />
    <NuxtPage />
  </div>
</template>

<style>
.tts-layout {
  @apply min-h-screen;
}
</style>
