<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const _props = defineProps<{
  focused?: boolean
}>()

const haloRef = ref<HTMLDivElement | null>(null)

function updateHalo() {
  if (!haloRef.value) return
  const textarea = document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement | null
  if (textarea && textarea.value.trim() === '') {
    haloRef.value.classList.remove('active')
  } else {
    haloRef.value.classList.add('active')
  }
}

function handleTextareaFocus() {
  updateHalo()
}

function handleTextareaBlur() {
  const textarea = document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement | null
  if (textarea && textarea.value.trim() === '') {
    haloRef.value?.classList.remove('active')
  }
}

onMounted(() => {
  updateHalo()
  const textarea = document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement | null
  if (textarea) {
    textarea.addEventListener('focus', handleTextareaFocus)
    textarea.addEventListener('blur', handleTextareaBlur)
  }
})

onUnmounted(() => {
  const textarea = document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement | null
  if (textarea) {
    textarea.removeEventListener('focus', handleTextareaFocus)
    textarea.removeEventListener('blur', handleTextareaBlur)
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
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 100px;
  background: radial-gradient(ellipse at center, rgba(255, 81, 47, 0.15) 0%, rgba(221, 36, 118, 0.05) 50%, transparent 70%);
  filter: blur(20px);
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
  pointer-events: none;
}

.canvas-halo.active {
  opacity: 1;
}
</style>
