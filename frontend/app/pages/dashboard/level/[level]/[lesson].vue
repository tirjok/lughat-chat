<script setup lang="ts">
import { computed, shallowRef } from 'vue'

// Route access — deferred inside computed getters to avoid
// NUXT_E1001 when the component is imported outside Nuxt runtime (jsdom tests).
function safeRoute() {
  /* eslint-disable @stylistic/brace-style */
  try {
    return useRoute()
  }
  catch {
    return {} as unknown as ReturnType<typeof useRoute>
  }
}
function safeRouter() {
  try {
    return useRouter()
  }
  catch {
    return {} as unknown as ReturnType<typeof useRouter>
  }
}
const route = computed(() => safeRoute())
const router = computed(() => safeRouter())
const levelParam = computed(() => (route.value.params?.level as string) || '')
const lessonParam = computed(() => (route.value.params?.lesson as string) || '')
// AC-5: Redirect when /dashboard/level/ has no level param
const isMissingLevel = computed(() => {
  return (
    route.value.path.startsWith('/dashboard/level/')
    && !levelParam.value
  )
})

const currentLevel = computed(() => levelParam.value || 'A1')
const levelRoute = computed(() => `/dashboard/level/${currentLevel.value.toLowerCase()}`)
const currentLesson = computed(() => lessonParam.value || '1')

// Breadcrumb trail: Dashboard → Level {level} → Lesson {id}
const breadcrumbs = computed(() => [
  { label: 'Dashboard', to: '/dashboard' },
  { label: `Level ${currentLevel.value}`, to: levelRoute.value },
  { label: `Lesson ${currentLesson.value}`, to: undefined }
])

const sectionTabs = [
  'Dialogue',
  'Vocabulary',
  'Pronouns',
  'Expressions',
  'Grammar',
  'Activities'
]

const activeSection = shallowRef('Dialogue')

// AC-5: Redirect to dashboard when level param is missing.
// Guarded against jsdom tests where onBeforeRouteLeave is not available.
if (typeof onBeforeRouteLeave === 'function') {
  onBeforeRouteLeave((_to: unknown, _from: unknown, next: (go?: unknown) => void) => {
    if (isMissingLevel.value) {
      router.value.push('/dashboard')
      next(false)
    } else {
      next()
    }
  })
}
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-950">
    <!-- Breadcrumbs -->
    <nav
      class="px-4 md:px-6 pt-4 pb-2"
      aria-label="Breadcrumb"
      data-testid="breadcrumbs"
    >
      <div class="max-w-7xl mx-auto">
        <ol class="flex items-center gap-2 text-sm">
          <li
            v-for="(crumb, idx) in breadcrumbs"
            :key="idx"
            class="flex items-center gap-2"
          >
            <NuxtLink
              v-if="crumb.to"
              :to="crumb.to"
              class="text-primary-600 dark:text-primary-400 hover:text-primary-700 transition"
            >
              {{ crumb.label }}
            </NuxtLink>
            <span
              v-else
              class="text-stone-800 dark:text-stone-200 font-medium"
            >
              {{ crumb.label }}
            </span>
            <svg
              v-if="idx < breadcrumbs.length - 1"
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
          </li>
        </ol>
      </div>
    </nav>

    <!-- Hero section -->
    <div
      class="px-4 md:px-6 pb-6"
      data-testid="lesson-hero"
    >
      <div class="max-w-7xl mx-auto">
        <h1 class="text-2xl md:text-3xl lg:text-4xl font-bold text-stone-800 dark:text-stone-100 mb-2">
          Lesson {{ currentLesson }}
        </h1>
        <LessonHero
          :level="currentLevel"
          :lesson-number="currentLesson"
          :is-ready="true"
        />
      </div>
    </div>
    <!-- Section tabs -->
    <section
      class="px-4 md:px-6 pb-4"
      data-testid="section-tabs"
    >
      <div class="max-w-7xl mx-auto">
        <div
          class="bg-stone-100 dark:bg-stone-800 rounded-xl p-1.5 flex flex-wrap gap-1"
          role="tablist"
        >
          <button
            v-for="tab in sectionTabs"
            :id="`tab-${tab}`"
            :key="tab"
            role="tab"
            :aria-selected="activeSection === tab"
            :aria-controls="`panel-${tab}`"
            :class="[
              'flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2',
              activeSection === tab
                ? 'bg-white dark:bg-stone-700 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            ]"
            @click="activeSection = tab"
          >
            {{ tab }}
          </button>
        </div>
      </div>
    </section>

    <!-- Main content area (placeholder) -->
    <main class="px-4 md:px-6 pb-8">
      <div class="max-w-7xl mx-auto">
        <div class="card">
          <p class="text-stone-500 dark:text-stone-400">
            Content for "{{ activeSection }}" section coming soon.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
