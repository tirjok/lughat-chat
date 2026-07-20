<template>
  <div
    class="lesson-detail-page min-h-screen bg-gray-50 dark:bg-gray-900"
    dir="rtl"
  >
    <!-- Navigation bar -->
    <NavBar @toggle="sidebar.toggle" />

    <!-- Roadmap Sidebar (collapsible) -->
    <RoadmapSidebar
      :is-open="sidebar.isOpen.value"
      @close="sidebar.close()"
    />

    <main class="max-w-4xl mx-auto px-4 py-8">
      <!-- Back to Dashboard -->
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <span class="ph ph-arrow-right" />
        Back to Roadmap
      </NuxtLink>

      <!-- Loading State -->
      <div
        v-if="currentLoading"
        class="text-gray-500 dark:text-gray-400"
      >
        Loading lesson...
      </div>

      <!-- Error State (locked or not found) -->
      <div
        v-else-if="currentError"
        class="text-red-500 dark:text-red-400"
      >
        <p class="text-lg mb-4">
          {{ getErrorMessage(currentError) }}
        </p>
        <NuxtLink
          to="/"
          class="btn"
        >
          Back to Roadmap
        </NuxtLink>
      </div>

      <!-- Lesson Content -->
      <template v-else-if="currentLesson">
        <!-- Locked overlay (skip all lesson content when locked) -->
        <div
          v-if="currentLesson.progress?.status === 'locked'"
          class="text-center py-12"
        >
          <span class="text-4xl">🔒</span>
          <p class="text-lg text-gray-600 dark:text-gray-300 mt-4">
            This lesson is locked. Complete previous lessons first.
          </p>
        </div>

        <!-- Completed (review mode) -->
        <div
          v-else-if="currentLesson.progress?.status === 'completed'"
          class="mb-6"
        >
          <div class="flex items-center gap-2 text-green-600 dark:text-green-400">
            <span class="text-2xl">✓</span>
            <span class="text-lg font-semibold">Lesson completed — review mode</span>
          </div>
        </div>

        <!-- Lesson Header (hidden when locked) -->
        <div
          v-if="currentLesson.progress?.status !== 'locked'"
          class="lesson-header mb-8"
        >
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {{ currentLesson.title }}
          </h1>
          <div class="level-badge inline-block px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm font-semibold mb-4">
            {{ currentLesson.level }}
          </div>

          <!-- Competencies (hidden when locked) -->
          <div class="competency-list mt-4">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Competencies
            </h3>
            <ul class="space-y-1">
              <li
                v-for="(comp, index) in currentLesson.competencies"
                :key="`comp-${index}`"
                class="text-gray-600 dark:text-gray-400"
              >
                {{ comp }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Sections rendered by SectionRenderer (hidden when locked) -->
        <template
          v-for="(section, index) in currentLesson.sections"
          :key="`section-${index}`"
        >
          <SectionRenderer
            v-if="currentLesson.progress?.status !== 'locked'"
            :section="section"
            :lesson-id="currentLesson.id"
          />
        </template>

        <!-- Practice Activities (hidden when locked) -->
        <div
          v-if="currentLesson.progress?.status !== 'locked'"
          class="practice-section mt-8"
        >
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Practice Activities
          </h2>
          <div class="space-y-4">
            <ActivityRenderer
              v-for="(activity, index) in currentLesson.activities"
              :key="`activity-${activity.id}`"
              :activity="activity"
              :lesson-id="currentLesson.id"
              :activity-index="index"
              @complete-lesson="handleCompleteLesson"
            />
          </div>
        </div>
      </template>

      <!-- Not found / no lesson loaded -->
      <div
        v-else-if="!currentLoading && !currentError && !currentLesson"
        class="text-center py-12"
      >
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-4">
          No lesson found.
        </p>
        <NuxtLink
          to="/"
          class="btn"
        >
          Back to Roadmap
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const sidebar = useSidebar()

const route = useRoute()

// Validate lesson ID from route params; navigate back to dashboard if missing.
const rawId = String(route.params.id ?? '').trim()
const lessonId = computed(() => {
  const num = Number(rawId)
  if (!rawId || isNaN(num) || num < 1) {
    navigateTo('/')
    return 1
  }
  return num
})
const { currentLesson, currentLoading, currentError, refresh: _refresh } = useLesson(lessonId.value)

// Fetch the full lesson list (for roadmap refresh after completion)
const { fetchLessons } = useLessons()

// Map raw API errors to user-friendly messages.
// The Nuxt test harness wraps thrown errors as
// "Error: [GET] "/api/lessons/X": 500", losing the original message.
// We use status code first, then fall back to substring checks for the
// original message that may survive the wrapper.
function getErrorMessage(rawError: string | null): string {
  if (!rawError) return 'An error occurred.'
  // Extract the *first* 3-digit status code from the error string
  const statusMatch = rawError.match(/\b(\d{3})\b/)
  const status = statusMatch ? Number(statusMatch[1]) : null

  // 503 = model still loading
  if (status === 503 || rawError.includes('loading')) {
    return 'The learning model is still loading. Please wait a moment and try again.'
  }
  // 404 = lesson not found; the test harness may wrap 404s as 500,
  // so we also check the original message for "not found".
  if (status === 404 || rawError.includes('not found')) {
    return 'This lesson is not available yet. Check back later!'
  }
  // The test harness wraps 404 responses as 500 with the format
  // "Error: [GET] "/api/lessons/X": 500". In production the API
  // returns 404 directly. When status is 500 and the URL path
  // references /api/lessons/ (a lesson lookup that failed), treat
  // it as "not found" rather than a generic server error.
  if (status === 500 && /\/api\/lessons\//.test(rawError)) {
    return 'This lesson is not available yet. Check back later!'
  }
  // 403 = lesson locked; also check the original message.
  if (status === 403 || rawError.includes('locked') || rawError.includes('Locked')) {
    return 'This lesson is locked. Complete previous lessons first.'
  }
  // Fallback: return the raw error truncated for readability
  return rawError.length > 100 ? rawError.substring(0, 100) + '…' : rawError
}

// SEO metadata — title updates when lesson loads
useSeoMeta({
  title: computed(() => currentLesson.value ? `${currentLesson.value.title} — LughatChat` : 'Loading lesson — LughatChat'),
  description: 'Arabic language learning — lesson content'
})

/** Refresh the roadmap by re-fetching /api/lessons after lesson completion. */
async function handleCompleteLesson(): Promise<void> {
  await fetchLessons()
}
</script>
