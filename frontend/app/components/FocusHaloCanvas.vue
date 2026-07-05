<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const haloRef = ref<HTMLDivElement | null>(null)

let textareaEl: HTMLTextAreaElement | null = null

function handleFocus() {
  if (haloRef.value) {
    haloRef.value.classList.add('active')
  }
}

function handleBlur() {
  if (textareaEl && textareaEl.value.trim() === '') {
    haloRef.value?.classList.remove('active')
  }
}

function findTextarea(): HTMLTextAreaElement | null {
  // Find the active textarea by checking parent containers
  const activeEl = document.activeElement
  if (activeEl?.tagName === 'TEXTAREA' && (activeEl as HTMLTextAreaElement).dir === 'rtl') {
    return activeEl as HTMLTextAreaElement
  }
  // Fallback: find any RTL textarea in the app
  return document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement | null
}

onMounted(() => {
  textareaEl = findTextarea()
  if (textareaEl) {
    textareaEl.addEventListener('focus', handleFocus)
    textareaEl.addEventListener('blur', handleBlur)
  }
})

onUnmounted(() => {
  if (textareaEl) {
    textareaEl.removeEventListener('focus', handleFocus)
    textareaEl.removeEventListener('blur', handleBlur)
  }
})
</script>

<template>
  <div
    ref="haloRef"
    class="canvas-halo"
  />
</template>

<style scoped>
.canvas-halo {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: radial-gradient(ellipse at center, rgba(255, 81, 47, 0.15) 0%, rgba(221, 36, 118, 0.05) 50%, transparent 70%);
  opacity: 0;
  transition: opacity 700ms var(--ease-spring);
  pointer-events: none;
  z-index: 0;
}

.canvas-halo.active {
  opacity: 1;
}
</style>
