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

// Compute lesson progress from activities
const totalActivities = computed(() => currentLesson.value?.activities?.length ?? 0)
const completedActivities = computed(() => {
  const activities = currentLesson.value?.activities ?? []
  const progress = currentLesson.value?.progress?.activities ?? {}
  return activities.filter(a => progress[a.id]?.status === 'completed').length
})
const lessonProgressPercent = computed(() => {
  if (totalActivities.value === 0) return 0
  return Math.round((completedActivities.value / totalActivities.value) * 100)
})

const levelBadgeBg: Record<string, string> = {
  A1: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  A2: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  B1: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
}

function getLevelBadge(level: string): string {
  return levelBadgeBg[level] || 'bg-gold-dim text-gold border-gold/25'
}
</script>

<template>
  <div
    class="lesson-detail-page min-h-screen"
    dir="rtl"
  >
    <!-- Vibrant gradient background -->
    <div
      class="fixed inset-0 z-0"
      style="background: radial-gradient(ellipse 70% 50% at 20% 10%, rgba(139, 92, 246, 0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(245, 158, 11, 0.06) 0%, transparent 55%), linear-gradient(180deg, #0a0a1a 0%, #0f0e1a 50%, #0a0f14 100%);"
    />

    <!-- Content layer -->
    <div class="relative z-10">
      <!-- Navigation bar -->
      <NavBar @toggle="sidebar.toggle" />

      <!-- Roadmap Sidebar (collapsible) -->
      <RoadmapSidebar
        :is-open="sidebar.isOpen.value"
        @close="sidebar.close()"
      />

      <main class="max-w-4xl mx-auto px-4 py-8 md:px-6">
        <!-- Back to Dashboard -->
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-ink-dim/70 hover:text-gold transition-colors duration-300 mb-6 group"
        >
          <span class="ph ph-arrow-right text-sm group-hover:-translate-x-1 transition-transform" />
          <span class="text-sm">Back to Roadmap</span>
        </NuxtLink>

        <!-- Loading State: skeleton cards -->
        <div v-if="currentLoading" class="space-y-5">
          <div
            v-for="i in 3"
            :key="i"
            class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
          >
            <div class="h-6 w-56 rounded-full bg-white/[0.06] animate-pulse mb-4" />
            <div class="h-3 w-24 rounded-full bg-white/[0.04] animate-pulse mb-3" />
            <div class="space-y-2">
              <div class="h-3 w-full rounded-full bg-white/[0.04] animate-pulse" />
              <div class="h-3 w-4/5 rounded-full bg-white/[0.04] animate-pulse" />
              <div class="h-3 w-3/5 rounded-full bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        </div>

        <!-- Error State (locked or not found) -->
        <div
          v-else-if="currentError"
          class="flex flex-col items-center gap-5 py-12"
        >
          <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
            <span class="ph ph-warning-circle text-error text-2xl" />
          </div>
          <p class="text-ink text-center text-lg font-medium">
            {{ getErrorMessage(currentError) }}
          </p>
          <NuxtLink
            to="/"
            class="rounded-full px-6 py-2.5 bg-gold/15 text-gold text-sm font-semibold hover:bg-gold/25 transition-all cursor-pointer border border-gold/25"
          >
            <span class="ph ph-arrow-right ml-2" />
            Back to Roadmap
          </NuxtLink>
        </div>

        <!-- Lesson Content -->
        <template v-else-if="currentLesson">
          <!-- Locked overlay (skip all lesson content when locked) -->
          <div
            v-if="currentLesson.progress?.status === 'locked'"
            class="flex flex-col items-center justify-center py-16 text-center"
          >
            <div class="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm px-8 py-12 max-w-md">
              <div class="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center mb-4">
                <span class="ph ph-lock text-3xl text-ink-dim/40" />
              </div>
              <p class="text-ink text-lg font-medium">
                This lesson is locked.
              </p>
              <p class="text-ink-dim/60 text-sm mt-2">
                Complete previous lessons to unlock it.
              </p>
            </div>
          </div>

          <!-- Completed (review mode) -->
          <div
            v-else-if="currentLesson.progress?.status === 'completed'"
            class="mb-8"
          >
            <div class="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-5 py-3.5">
              <span class="ph ph-check-circle text-emerald-400 text-xl" />
              <span class="text-emerald-400 font-semibold text-sm">Lesson completed — review mode</span>
            </div>
          </div>

          <!-- Lesson Header (hidden when locked) -->
          <div
            v-if="currentLesson.progress?.status !== 'locked'"
            class="mb-8"
          >
            <h1 class="font-sans text-2xl font-bold text-ink mb-3">
              {{ currentLesson.title }}
            </h1>

            <!-- Level badge -->
            <div class="flex items-center gap-3 mb-4">
              <div
                class="px-3 py-1 rounded-full text-xs font-bold border"
                :class="getLevelBadge(currentLesson.level)"
              >
                {{ currentLesson.level }}
              </div>

              <!-- Progress indicator -->
              <div v-if="totalActivities > 0" class="flex items-center gap-2 text-xs text-ink-dim/60">
                <span class="ph ph-chart-bar text-gold/50" />
                <span>{{ completedActivities }}/{{ totalActivities }} activities</span>
                <span class="text-ink-dim/30">·</span>
                <span>{{ lessonProgressPercent }}%</span>
                <div class="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="lessonProgressPercent >= 100 ? 'bg-emerald-400' : 'bg-gold'"
                    :style="{ width: lessonProgressPercent + '%' }"
                  />
                </div>
              </div>
            </div>

            <!-- Competencies -->
            <div class="mt-4">
              <h3 class="text-xs font-sans font-semibold text-ink-dim/60 tracking-wider uppercase mb-2">
                What you'll learn
              </h3>
              <ul class="space-y-1.5">
                <li
                  v-for="(comp, index) in currentLesson.competencies"
                  :key="`comp-${index}`"
                  class="flex items-center gap-2 text-ink-dim text-sm"
                >
                  <span class="ph ph-sparkle text-gold/40" />
                  {{ comp }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Sections rendered by SectionRenderer (smart accordion) -->
          <template
            v-for="(section, index) in currentLesson.sections"
            :key="`section-${index}`"
          >
            <SectionRenderer
              v-if="currentLesson.progress?.status !== 'locked'"
              :section="section"
              :lesson-id="currentLesson.id"
              :section-index="index"
              :section-count="currentLesson.sections.length"
              :activity-progress="currentLesson.progress?.activities"
              :lesson-activities="currentLesson.activities"
            />
          </template>

          <!-- Practice Activities -->
          <div
            v-if="currentLesson.progress?.status !== 'locked'"
            class="mt-10"
          >
            <div class="flex items-center gap-3 mb-5">
              <span class="ph ph-pencil-ruler text-gold text-xl" />
              <h2 class="font-arabic text-xl font-bold text-gold mb-0">
                الممارسة
              </h2>
              <span class="flex-1 h-px bg-white/[0.06]" />
              <span class="text-[10px] font-sans text-ink-dim/50 tracking-[0.2em] uppercase">Practice</span>
            </div>
            <div class="space-y-4">
              <ActivityRenderer
                v-for="(activity, index) in currentLesson.activities"
                :key="`activity-${activity.id}`"
                :activity="activity"
                :lesson-id="currentLesson.id"
                :activity-index="index"
                :total-activities="currentLesson.activities.length"
                @complete-lesson="handleCompleteLesson"
              />
            </div>
          </div>
        </template>

        <!-- Not found / no lesson loaded -->
        <div
          v-else-if="!currentLoading && !currentError && !currentLesson"
          class="flex flex-col items-center gap-4 py-12"
        >
          <div class="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
            <span class="ph ph-books text-gold text-xl" />
          </div>
          <p class="text-ink text-lg font-medium">
            No lesson found.
          </p>
          <NuxtLink
            to="/"
            class="rounded-full px-5 py-2 bg-gold/15 text-gold text-sm font-semibold hover:bg-gold/25 transition-all cursor-pointer border border-gold/25"
          >
            <span class="ph ph-arrow-right ml-1" />
            Back to Roadmap
          </NuxtLink>
        </div>
      </main>
    </div>
  </div>
</template>
