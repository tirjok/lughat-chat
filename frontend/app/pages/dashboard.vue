<script setup lang="ts">
import { computed } from 'vue'
import { curriculum, getTotalLessonCount } from '../data/curriculum'

const levels = curriculum

const totalLessons = computed(() => getTotalLessonCount())
const completedLessons = computed(() => 0)
const overallProgress = computed(() => {
  if (totalLessons.value === 0) return 0
  return Math.round((completedLessons.value / totalLessons.value) * 100)
})

// ─── Gradient helper — maps curriculum gradient tokens to CSS background-image ──
// UnoCSS gradient tokens (e.g. 'from-teal-700 via-teal-800 to-teal-900')
// are data strings, not static class attributes. UnoCSS tree-shakes them at
// build time unless safelisted. Using inline styles is the correct pattern
// for data-driven dynamic values — the gradient is rendered directly.

const gradientMap: Record<string, string> = {
  'from-teal-700 via-teal-800 to-teal-900':
    'linear-gradient(135deg, #0f766e, #115e59, #134e4a)',
  'from-emerald-700 via-emerald-800 to-emerald-900':
    'linear-gradient(135deg, #047857, #065f46, #064e3b)',
  'from-cyan-700 via-cyan-800 to-cyan-900':
    'linear-gradient(135deg, #0e7490, #155e75, #164e63)',
  'from-sky-700 via-sky-800 to-sky-900':
    'linear-gradient(135deg, #0369a1, #0c4a6e, #082f49)',
  'from-indigo-700 via-indigo-800 to-indigo-900':
    'linear-gradient(135deg, #4338ca, #3730a3, #312e81)',
  'from-violet-700 via-violet-800 to-violet-900':
    'linear-gradient(135deg, #6d28d9, #5b21b6, #4c1d95)'
}

function gradientToBg(token: string): string {
  return gradientMap[token] ?? 'linear-gradient(135deg, #374151, #1f2937, #111827)'
}
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-950">
    <!-- ── Hero Section ─────────────────────────────────────────────── -->
    <section class="px-4 md:px-6 pt-8 pb-6">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p class="text-xs font-semibold tracking-widest text-primary-600 dark:text-primary-400 uppercase mb-2">
              Your Learning Journey
            </p>
            <h1 class="text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100">
              Dashboard
            </h1>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-2 max-w-md">
              Track your progress across CEFR levels. Complete lessons to advance through the curriculum.
            </p>
          </div>
          <div class="flex items-center gap-4 shrink-0">
            <!-- Overall progress ring -->
            <div class="flex items-center gap-3">
              <div class="relative w-14 h-14">
                <svg
                  class="w-14 h-14 -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke-width="2"
                    class="text-stone-200 dark:text-stone-700"
                    stroke="currentColor"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke-width="2"
                    stroke-linecap="round"
                    class="text-primary-500"
                    stroke="currentColor"
                    :stroke-dasharray="`${overallProgress * 0.974}, 100`"
                  />
                </svg>
                <span class="absolute inset-0 flex items-center justify-center text-xs font-bold text-stone-700 dark:text-stone-200">
                  {{ overallProgress }}%
                </span>
              </div>
              <div class="text-sm text-stone-500 dark:text-stone-400">
                <div class="font-semibold text-stone-700 dark:text-stone-200">
                  {{ completedLessons }} / {{ totalLessons }} lessons
                </div>
              </div>
            </div>
            <NuxtLink
              to="/dashboard"
              class="px-5 py-2.5 rounded-full text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm"
            >
              Continue Learning
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Level Cards ──────────────────────────────────────────────── -->
    <section class="px-4 md:px-6 pb-10">
      <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NuxtLink
            v-for="level in levels"
            :key="level.code"
            :to="`/dashboard/level/${level.code}`"
            class="group card overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-md hover:-translate-y-0.5"
          >
            <!-- Gradient header with Arabic overlay -->
            <div
              :style="{ backgroundImage: gradientToBg(level.gradient) }"
              class="relative px-5 pt-5 pb-4 overflow-hidden"
            >
              <!-- Decorative Arabic text watermark — visible but subtle -->
              <span
                class="absolute top-2 right-3 font-arabic text-white/30 text-2xl select-none"
                aria-hidden="true"
              >
                {{ level.arabicTitle }}
              </span>
              <div class="relative z-10">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wider ring-1 ring-white/30">
                    {{ level.code }}
                  </span>
                  <span class="text-white/90 text-xs font-medium">{{ level.title }}</span>
                </div>
                <h2 class="text-white font-bold text-lg">
                  {{ level.arabicTitle }}
                </h2>
              </div>
            </div>

            <!-- Card body -->
            <div class="p-5">
              <!-- Goal text — primary value-add of the tile -->
              <p class="text-sm text-stone-600 dark:text-stone-300 mb-3 line-clamp-3">
                {{ level.goal }}
              </p>
              <div class="flex items-center justify-between text-sm text-stone-500 dark:text-stone-400 mb-3">
                <span>{{ 0 }} / {{ level.lessons.length }} lessons</span>
                <span class="text-primary-600 dark:text-primary-400 font-medium text-xs uppercase tracking-wide">
                  {{ 0 >= level.lessons.length ? 'Completed' : 'In Progress' }}
                </span>
              </div>
              <!-- Progress bar -->
              <div class="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                <div
                  class="h-full bg-primary-500 rounded-full transition-all duration-500"
                  :style="{ width: level.lessons.length > 0 ? `${(0 / level.lessons.length) * 100}%` : '0%' }"
                />
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
