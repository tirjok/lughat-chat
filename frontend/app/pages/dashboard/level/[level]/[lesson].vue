<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useSeoMeta } from '@nuxtjs/seo'

// Route access — deferred inside computed getters to avoid
// NUXT_E1001 when the component is imported outside Nuxt runtime (jsdom tests).
const route = computed(() => useRoute())
const router = computed(() => useRouter())
const levelParam = computed(() => (route.params?.level as string) || '')
const lessonParam = computed(() => (route.params?.lesson as string) || '')

// AC-5: Redirect when /dashboard/level/ has no level param
const isMissingLevel = computed(() => {
  return (
    route.path.startsWith('/dashboard/level/') &&
    !levelParam.value
  )
})

const currentLevel = computed(() => levelParam.value || 'A1')
const levelRoute = computed(() => `/dashboard/level/${currentLevel.value.toLowerCase()}`)
const currentLesson = computed(() => lessonParam.value || '1')

// SEO
useSeoMeta({
  title: `Lesson ${currentLesson.value} — Level ${currentLevel.value}`
})

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
      router.push('/dashboard')
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
      <div class="max-w-6xl mx-auto">
        <ol class="flex items-center gap-2 text-sm">
          <li
            v-for="(crumb, idx) in breadcrumbs"
            :key="idx"
            class="flex items-center gap-2"
          >
            <NuxtLink
              v-if="crumb.to"
              :to="crumb.to"
              class="text-primary-600 dark:text-primary-400 hover:underline"
            >
              {{ crumb.label }}
            </NuxtLink>
            <span
              v-else
              class="text-stone-500 dark:text-stone-400"
            >
              {{ crumb.label }}
            </span>
            <span
              v-if="idx < breadcrumbs.length - 1"
              class="text-stone-400"
            >
              ›
            </span>
          </li>
        </ol>
      </div>
    </nav>

    <!-- Hero section -->
    <header class="px-4 md:px-6 pb-6" data-testid="lesson-hero">
      <div class="max-w-6xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1
              class="text-2xl md:text-3xl font-bold text-stone-800 dark:text-stone-100"
              data-testid="lesson-heading"
            >
              Lesson {{ currentLesson }} — Level {{ currentLevel }}
            </h1>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Placeholder — lesson content coming soon.
            </p>
            <NuxtLink
              data-testid="back-to-level"
              :to="`/dashboard/level/${currentLevel.toLowerCase()}`"
            >
              Back to Level
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Section tabs -->
    <section class="px-4 md:px-6 pb-4" data-testid="section-tabs">
      <div class="max-w-6xl mx-auto">
        <div class="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-700" role="tablist">
          <button
            v-for="tab in sectionTabs"
            :key="tab"
            :id="`tab-${tab}`"
            role="tab"
            :aria-selected="activeSection.value === tab"
            :aria-controls="`panel-${tab}`"
            :class="[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeSection.value === tab
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
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
      <div class="max-w-6xl mx-auto">
        <div class="card">
          <p class="text-stone-500 dark:text-stone-400">
            Content for "{{ activeSection.value }}" section coming soon.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
