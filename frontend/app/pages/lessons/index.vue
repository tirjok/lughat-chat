<template>
  <div
    class="lessons-page min-h-screen bg-gray-50 dark:bg-gray-900"
    dir="rtl"
  >
    <!-- Page Header -->
    <div class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Learning Roadmap
      </h1>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="text-gray-500 dark:text-gray-400"
      >
        Loading lessons...
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="text-red-500 dark:text-red-400"
      >
        {{ error }}
      </div>

      <!-- Lessons List -->
      <div v-else>
        <div
          v-for="levelGroup in groupedLessons"
          :key="levelGroup.level"
          class="mb-8"
        >
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {{ levelGroup.level }} Level
          </h2>
          <div class="space-y-4">
            <NuxtLink
              v-for="lesson in levelGroup.lessons"
              :key="lesson.id"
              :to="`/lessons/${lesson.id}`"
              class="block"
            >
              <div
                class="card cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="{ 'opacity-50': lesson.status === 'locked' }"
              >
                <div class="flex-between">
                  <div>
                    <h3 class="font-semibold text-lg text-gray-900 dark:text-white">
                      {{ lesson.title }}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ lesson.section_count }} sections · {{ lesson.competency_count }} competencies
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      v-if="lesson.status === 'available'"
                      class="text-green-500"
                    >✓</span>
                    <span
                      v-else-if="lesson.status === 'locked'"
                      class="text-gray-400"
                    >🔒</span>
                    <span
                      v-else
                      class="text-blue-500"
                    >{{ lesson.status }}</span>
                  </div>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LessonSummary } from '~/composables/useLessons'

const { lessons, loading, error, fetchLessons } = useLessons()

// Fetch lessons on mount
fetchLessons()

// Group lessons by level
const groupedLessons = computed(() => {
  const groups: Record<string, LessonSummary[]> = {}
  for (const lesson of lessons.value) {
    const key = lesson.level
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key]!.push(lesson)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([level, ls]) => ({ level, lessons: ls ?? [] }))
})
</script>
