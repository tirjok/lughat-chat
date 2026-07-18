<script setup lang="ts">
interface Props {
  isOpen?: boolean
}

interface Emits {
  close: []
}

defineProps<Props>()
defineEmits<Emits>()

const { lessons, loading, error, fetchLessons, groupedLessons } = useLessons()

// Fetch lessons on mount
fetchLessons()
</script>

<template>
  <aside
    class="roadmap-sidebar fixed top-0 right-0 h-full bg-white dark:bg-gray-800 shadow-lg overflow-y-auto"
    :class="{ open: isOpen }"
  >
    <div class="p-4">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">
        Learning Roadmap
      </h2>

      <!-- Loading state -->
      <div
        v-if="loading"
        class="text-gray-500 dark:text-gray-400"
      >
        Loading roadmap...
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="text-red-500 dark:text-red-400"
      >
        {{ error }}
      </div>

      <!-- Lessons grouped by level -->
      <div v-else>
        <div
          v-for="levelGroup in groupedLessons"
          :key="levelGroup.level"
          class="mb-6"
        >
          <!-- Level header with progress -->
          <div class="flex-between mb-2">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">
              {{ levelGroup.level }} Level
            </h3>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ levelGroup.progress }}%
            </span>
          </div>

          <!-- Lesson cards -->
          <div class="space-y-2">
            <NuxtLink
              v-for="lesson in levelGroup.lessons"
              :key="lesson.id"
              :to="`/lessons/${lesson.id}`"
              class="block"
            >
              <div
                class="sidebar-lesson-card flex-between px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                :class="{ 'opacity-50': lesson.status === 'locked' }"
              >
                <span class="text-sm text-gray-900 dark:text-white">
                  {{ lesson.title }}
                </span>
                <span
                  v-if="lesson.status === 'available'"
                  class="text-green-500"
                >✓</span>
                <span
                  v-else-if="lesson.status === 'locked'"
                  class="text-gray-400"
                >🔒</span>
                <span
                  v-else-if="lesson.status === 'completed'"
                  class="text-green-600"
                >✓</span>
                <span
                  v-else-if="lesson.status === 'in_progress'"
                  class="text-blue-500"
                >→</span>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="lessons.length === 0"
          class="text-gray-500 dark:text-gray-400"
        >
          No lessons available
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.roadmap-sidebar {
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 50;
}

.roadmap-sidebar.open {
  transform: translateX(0);
}
</style>
