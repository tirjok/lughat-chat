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
    class="roadmap-sidebar fixed top-0 right-0 h-full bg-studio-900/98 backdrop-blur-sm border-l border-white/[0.12] overflow-y-auto"
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
          <span class="text-gold/50 ml-1">· ESC to close</span>
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
          class="mb-5"
        >
          <div class="flex items-center gap-2 mb-3">
            <div
              class="px-2 py-0.5 rounded-full text-[10px] font-bold border border-gold/25 bg-gold-dim text-gold"
            >
              {{ levelGroup.level }}
            </div>
            <span class="flex-1 h-px bg-white/[0.06]" />
          </div>
          <div class="space-y-1">
            <NuxtLink
              v-for="lesson in levelGroup.lessons"
              :key="lesson.id"
              :to="`/lessons/${lesson.id}`"
              class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-500 hover:bg-gold-dim"
              :class="{
                'text-ink-dim/40': lesson.status === 'locked',
                'text-gold font-medium': lesson.status === 'in_progress',
                'text-ink-dim': lesson.status === 'available' || lesson.status === 'ready'
              }"
              @click="close()"
            >
              <span
                v-if="lesson.status === 'completed'"
                class="ph ph-check-circle text-gold-bright text-sm"
              />
              <span
                v-else-if="lesson.status === 'in_progress'"
                class="ph ph-spinner text-gold text-sm animate-spin"
              />
              <span
                v-else-if="lesson.status === 'locked'"
                class="ph ph-lock-key text-ink-dim/30 text-sm"
              />
              <span
                v-else
                class="ph ph-arrow-right text-ink-dim/40 text-sm"
              />
              <span class="flex-1 truncate">{{ lesson.title }}</span>
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
