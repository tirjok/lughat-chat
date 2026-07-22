<script setup lang="ts">
import { useActiveElement } from '@vueuse/core'

const haloRef = ref<HTMLDivElement | null>(null)

// VueUse: reactive document.activeElement (no manual addEventListener needed)
const activeElement = useActiveElement()
</script>

<template>
  <div
    ref="haloRef"
    class="canvas-halo"
    :class="{ active: activeElement?.tagName === 'TEXTAREA' && (activeElement as HTMLTextAreaElement)?.dir === 'rtl' }"
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
