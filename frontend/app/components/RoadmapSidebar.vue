<script setup lang="ts">
interface Props {
  isOpen?: boolean
}
defineProps<Props>()
defineEmits<{ close: [] }>()

const { lessons: _lessons, loading, error, groupedLessons } = useLessons()
</script>

<template>
  <aside
    class="roadmap-sidebar fixed top-0 right-0 h-full bg-studio-900/98 backdrop-blur-sm border-l border-white/[0.04] overflow-y-auto"
    :class="{ open: isOpen }"
  >
    <!-- Mobile backdrop: semi-transparent overlay to dismiss sidebar -->
    <Transition
      enter="transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
      enter-from="opacity-0"
      enter-to="opacity-100"
      leave="transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
      leave-from="opacity-100"
      leave-to="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-40 bg-studio-900/80 backdrop-blur-2xl"
        @click="close()"
      />
    </Transition>
    <div class="p-4">
      <div class="mb-4">
        <h2
          class="font-arabic text-xl font-bold text-gold mb-1"
          dir="rtl"
        >
          خريطة التعلم
        </h2>
        <p class="text-[10px] font-sans text-ink-dim tracking-[0.15em] uppercase">
          Learning Roadmap
        </p>
      </div>

      <div
        v-if="loading"
        class="text-ink-dim text-sm"
      >
        Loading lessons...
      </div>
      <div
        v-else-if="error"
        class="text-error text-sm"
      >
        {{ error }}
      </div>

      <div v-else>
        <div
          v-for="levelGroup in groupedLessons"
          :key="levelGroup.level"
          class="mb-6"
        >
          <h3 class="text-xs font-sans font-semibold text-gold tracking-wider uppercase mb-3">
            {{ levelGroup.level }}
          </h3>
          <div class="space-y-2">
            <NuxtLink
              v-for="lesson in levelGroup.lessons"
              :key="lesson.id"
              :to="`/lessons/${lesson.id}`"
              class="block"
            >
              <div
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-studio-700/60 transition-colors"
                :class="{ 'opacity-40': lesson.status === 'locked' }"
              >
                <span class="text-xs font-mono text-ink-dim/40 w-6 text-center">{{ lesson.sequence }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-ink truncate">{{ lesson.title }}</p>
                </div>
                <span
                  v-if="lesson.status === 'completed'"
                  class="text-gold"
                ><span class="ph ph-check-circle" /></span>
                <span
                  v-else-if="lesson.status === 'in_progress'"
                  class="text-gold"
                ><span class="ph ph-arrow-right" /></span>
                <span
                  v-else-if="lesson.status === 'available'"
                  class="text-ink-dim"
                ><span class="ph ph-lock-key-open" /></span>
                <span
                  v-else
                  class="text-ink-dim/40"
                ><span class="ph ph-lock" /></span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.roadmap-sidebar {
  width: 288px;
  transform: translateX(100%);
  transition: transform 0.3s var(--ease-slide);
  z-index: 50;
}
.roadmap-sidebar.open {
  transform: translateX(0);
}
</style>
