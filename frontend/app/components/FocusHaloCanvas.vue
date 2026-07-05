<script setup lang="ts">
const haloRef = ref<HTMLDivElement | null>(null)

function handleFocus() {
  if (haloRef.value) {
    haloRef.value.classList.add('active')
  }
}

function handleBlur() {
  const textarea = document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement | null
  if (textarea && textarea.value.trim() === '') {
    haloRef.value?.classList.remove('active')
  }
}

onMounted(() => {
  const textarea = document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement | null
  if (textarea) {
    textarea.addEventListener('focus', handleFocus)
    textarea.addEventListener('blur', handleBlur)
  }
})

onUnmounted(() => {
  const textarea = document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement | null
  if (textarea) {
    textarea.removeEventListener('focus', handleFocus)
    textarea.removeEventListener('blur', handleBlur)
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
  position: fixed;
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
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
