<script setup lang="ts">
import { computed } from 'vue'
import { getLevelByCode, type LessonDefinition } from '~/data/curriculum'

function safeRoute() {
  try {
    return useRoute()
  }
  catch {
    return {} as unknown as ReturnType<typeof useRoute>
  }
}
const route = computed(() => safeRoute())
const currentLevel = computed(() => (route.value.params?.level as string) || 'A1')

const level = computed(() => getLevelByCode(currentLevel.value))
const info = computed(() => level.value
  ? { title: level.value.title, arabic: level.value.arabicTitle }
  : { title: currentLevel.value, arabic: currentLevel.value })

// ─── Progress helpers ────────────────────────────────────────────────────

const totalLessons = computed(() => level.value?.lessons.length ?? 0)
const completedLessons = computed(() => 0) // TODO: connect to progress store
const overallProgress = computed(() => {
  if (totalLessons.value === 0) return 0
  return Math.round((completedLessons.value / totalLessons.value) * 100)
})

// ─── Learning tags extracted from lesson sections ────────────────────────
// For each lesson, extract the first item from each section as a "learning tag".
// This matches the screenshot: green pills showing key concepts.

function extractLearningTags(lesson: LessonDefinition): string[] {
  const tags: string[] = []
  for (const section of lesson.sections) {
    const firstItem = section.items[0]
    if (firstItem) {
      // Prefer notes (learning context), fall back to arabic + english
      if (firstItem.notes) {
        tags.push(firstItem.notes)
      }
      else if (firstItem.english) {
        tags.push(firstItem.english)
      }
    }
  }
  return tags
}
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-950">
    <!-- ── Level Header ─────────────────────────────────────────────── -->
    <header class="px-4 md:px-6 pt-8 pb-6">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="px-2.5 py-0.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full text-[10px] font-bold tracking-wider">
                {{ currentLevel }}
              </span>
              <span class="text-sm text-stone-500 dark:text-stone-400">{{ info.title }}</span>
              <span class="text-xs text-stone-400 dark:text-stone-500">
                ({{ completedLessons }} of {{ totalLessons }} lessons)
              </span>
              <span class="px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold">
                {{ overallProgress }}%
              </span>
            </div>
            <h1 class="text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100" data-testid="level-heading">Level {{ currentLevel }}: {{ info.title }} — {{ info.arabic }}</h1>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-2" data-testid="level-description">
              {{ level?.description ?? '' }}
            </p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <!-- All Lessons filter dropdown (placeholder) -->
            <button
              class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-stone-200/60 dark:bg-stone-700/60 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 4a13 13 0 0110.364 4.354A5 5 0 0118 11h.5a3 3 0 003-3V6.5A14 14 0 0121 4"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 14.5a13 13 0 014.364-4.354A5 5 0 009 11H8.5a3 3 0 01-3-3V6.5A14 14 0 003 4"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 17.5v3.5"
                />
              </svg>
              All Lessons
              <svg
                class="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <NuxtLink
              to="/dashboard"
              class="px-5 py-2.5 rounded-full text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm"
            >
              Back to Dashboard
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>
    <!-- ── Breadcrumbs ──────────────────────────────────────────────── -->
    <nav
      class="px-4 md:px-6 pt-4 pb-2"
      aria-label="Breadcrumb"
      data-testid="breadcrumbs"
    >
      <div class="max-w-7xl mx-auto">
        <ol class="flex items-center gap-2 text-sm text-stone-500">
          <li class="flex items-center gap-2">
            <NuxtLink
              to="/"
              class="text-primary-600 hover:text-primary-700 transition"
            >Home</NuxtLink>
            <svg
              class="w-4 h-4 text-stone-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <NuxtLink
              to="/dashboard"
              class="text-primary-600 hover:text-primary-700 transition"
            >Dashboard</NuxtLink>
            <svg
              class="w-4 h-4 text-stone-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span class="text-stone-800 dark:text-stone-200 font-medium">Level {{ currentLevel }}</span>
          </li>
        </ol>
      </div>
    </nav>

    <!-- ── Content Area ─────────────────────────────────────────────── -->
    <section class="px-4 md:px-6 pb-10">
      <div class="max-w-7xl mx-auto">
        <ul
          class="space-y-3"
          data-testid="lesson-list"
        >
          <li
            v-for="(lesson, index) in level?.lessons ?? []"
            :key="lesson.id"
            class="card overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-md"
          >
            <!-- Lesson header -->
            <div class="px-5 pt-5 pb-3">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="px-2 py-0.5 bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-full text-[10px] font-bold">
                      Lesson {{ index + 1 }}
                    </span>
                    <span class="px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-semibold">
                      Completed
                    </span>
                  </div>
                  <h2 class="text-lg font-bold text-stone-800 dark:text-stone-100">
                    {{ lesson.title }}
                  </h2>
                </div>
                <NuxtLink
                  :to="`/dashboard/level/${currentLevel}/${lesson.id}`"
                  class="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition shrink-0"
                >
                  Show Lesson
                </NuxtLink>
              </div>

              <!-- Learning tags — green pills from section items -->
              <div class="flex flex-wrap gap-1.5 mt-3">
                <span
                  v-for="tag in extractLearningTags(lesson)"
                  :key="tag"
                  class="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full text-[11px] font-medium"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <!-- Review Feedback button -->
            <div class="px-5 pb-5">
              <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-stone-800/10 dark:bg-stone-100/5 text-stone-600 dark:text-stone-300 hover:bg-stone-800/15 dark:hover:bg-stone-100/10 transition-colors"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Review Feedback
              </button>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
