<template>
  <div
    class="dashboard-page min-h-screen bg-gray-50 dark:bg-gray-900"
    dir="rtl"
  >
    <!-- Navigation bar -->
    <NavBar @toggle="sidebar.toggle" />

    <!-- Roadmap Sidebar (collapsible) -->
    <RoadmapSidebar
      :is-open="sidebar.isOpen.value"
      @close="sidebar.close()"
    />

    <!-- Main content area (shifts when sidebar is open on desktop) -->
    <div
      class="max-w-4xl mx-auto px-4 py-8"
      :class="{ 'ml-72': sidebar.isOpen.value && !sidebar.isMobile.value }"
    >
      <!-- Page Header -->
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
          <!-- Level header with progress -->
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {{ levelGroup.level }} Level
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({{ levelGroup.progress }}%)
            </span>
          </h2>

          <div class="space-y-4">
            <NuxtLink
              v-for="lesson in levelGroup.lessons"
              :key="lesson.id"
              :to="`/lessons/${lesson.id}`"
              class="block"
            >
              <div
                class="dashboard-lesson-card card cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                      v-else-if="lesson.status === 'completed'"
                      class="text-green-600"
                    >✓</span>
                    <span
                      v-else-if="lesson.status === 'in_progress'"
                      class="text-blue-500"
                    >→</span>
                  </div>
                </div>
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
  </div>
</template>

<script setup lang="ts">
const sidebar = useSidebar()

// SEO metadata for dashboard page
useSeoMeta({
  title: 'Learning Roadmap — LughatChat',
  description: 'Arabic language learning — view your 30-lesson roadmap across CEFR levels A1, A2, B1'
})

const { lessons, loading, error, fetchLessons, groupedLessons } = useLessons()

// Fetch lessons on mount
fetchLessons()
</script>
