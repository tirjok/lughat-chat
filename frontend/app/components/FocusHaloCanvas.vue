<script setup lang="ts">
// TODO: migrated from sunrise-orange/magenta (see ISSUE-014)

const haloRef = useTemplateRef<HTMLDivElement | null>('haloRef')

function handleFocus(e: FocusEvent) {
  const target = e.target as HTMLTextAreaElement
  if (target.dir === 'rtl' && haloRef.value) {
    haloRef.value.classList.add('active')
  }
}

function handleBlur(e: FocusEvent) {
  const target = e.target as HTMLTextAreaElement
  if (target.dir === 'rtl' && target.value.trim() === '' && haloRef.value) {
    haloRef.value.classList.remove('active')
  }
}
onMounted(() => {
  document.addEventListener('focus', handleFocus, true)
  document.addEventListener('blur', handleBlur, true)
})

onUnmounted(() => {
  document.removeEventListener('focus', handleFocus, true)
  document.removeEventListener('blur', handleBlur, true)
})
</script>

<template>
  <div
    ref="haloRef"
  />
</template>

<style scoped>
.canvas-halo {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: radial-gradient(ellipse at center, rgba(20, 184, 166, 0.15) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 70%);
  opacity: 0;
  transition: opacity 700ms var(--ease-spring);
  pointer-events: none;
  z-index: 0;
}

.canvas-halo.active {
  opacity: 1;
}
</style>
