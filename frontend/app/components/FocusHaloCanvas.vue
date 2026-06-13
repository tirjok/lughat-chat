<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{
  focused?: boolean
}>()

const haloRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  if (haloRef.value && props.focused) {
    haloRef.value.classList.add('active')
  }
})

watch(() => props.focused, (val) => {
  if (haloRef.value) {
    if (val) {
      haloRef.value.classList.add('active')
    } else {
      const textarea = document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement | null
      if (textarea && textarea.value.trim() === '') {
        haloRef.value.classList.remove('active')
      }
    }
  }
})
</script>

<template>
  <div
    ref="haloRef"
    class="canvas-halo"
    :class="{ active: focused }"
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
