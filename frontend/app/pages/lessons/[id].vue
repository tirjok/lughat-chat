<template>
  <div
    class="lesson-detail-page min-h-screen bg-gray-50 dark:bg-gray-900"
    dir="rtl"
  >
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Loading State -->
      <div
        v-if="currentLoading"
        class="text-gray-500 dark:text-gray-400"
      >
        Loading lesson...
      </div>

      <!-- Error State -->
      <div
        v-else-if="currentError"
        class="text-red-500 dark:text-red-400"
      >
        {{ currentError }}
      </div>

      <!-- Lesson Content -->
      <template v-else-if="currentLesson">
        <!-- Lesson Header -->
        <div class="lesson-header mb-8">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {{ currentLesson.title }}
          </h1>
          <div class="level-badge inline-block px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm font-semibold mb-4">
            {{ currentLesson.level }}
          </div>

          <!-- Competencies -->
          <div class="competency-list mt-4">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Competencies
            </h3>
            <ul class="space-y-1">
              <li
                v-for="(comp, i) in currentLesson.competencies"
                :key="i"
                class="text-gray-600 dark:text-gray-400"
              >
                {{ comp }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Sections rendered by SectionRenderer -->
        <SectionRenderer
          v-for="(section, index) in currentLesson.sections"
          :key="index"
          :section="section"
          :lesson-id="currentLesson.id"
        />

        <!-- Practice Activities -->
        <div class="practice-section mt-8">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Practice Activities
          </h2>
          <div class="space-y-4">
            <div
              v-for="(activity, index) in currentLesson.activities"
              :key="index"
              class="card"
            >
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ (activity as Record<string, unknown>).title }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ (activity as Record<string, unknown>).description }}
              </p>
              <span
                class="activity-status text-sm font-medium"
                :class="getActivityStatusColor(index + 1)"
              >
                {{ getActivityStatus(index + 1) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { currentLesson, currentLoading, currentError, fetchLesson } = useLessons()

const lessonId = computed(() => Number(route.params.id) || 1)

// Fetch the lesson
fetchLesson(lessonId.value)

function getActivityStatus(activityId: number): string {
  if (!currentLesson.value?.progress?.activities) return 'locked'
  const activity = currentLesson.value.progress.activities[String(activityId)]
  return (activity?.status as string) || 'locked'
}

function getActivityStatusColor(activityId: number): string {
  const status = getActivityStatus(activityId)
  if (status === 'completed') return 'text-green-500'
  if (status === 'available') return 'text-blue-500'
  return 'text-gray-400'
}
</script>
