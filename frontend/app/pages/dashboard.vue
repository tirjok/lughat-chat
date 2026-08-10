<script setup lang="ts">
import { computed } from 'vue'

interface LevelInfo {
  code: string
  title: string
  arabicTitle: string
  lessons: number
  completed: number
  gradient: string
}

const levels: LevelInfo[] = [
  { code: 'A1', title: 'Beginner', arabicTitle: 'المستوى المبتدئ', lessons: 12, completed: 0, gradient: 'from-teal-700 via-teal-800 to-teal-900' },
  { code: 'A2', title: 'Elementary', arabicTitle: 'المستوى الأساسي', lessons: 12, completed: 0, gradient: 'from-emerald-700 via-emerald-800 to-emerald-900' },
  { code: 'B1', title: 'Intermediate', arabicTitle: 'المستوى المتوسط', lessons: 12, completed: 0, gradient: 'from-cyan-700 via-cyan-800 to-cyan-900' },
  { code: 'B2', title: 'Upper Intermediate', arabicTitle: 'المستوى المتقدم', lessons: 12, completed: 0, gradient: 'from-sky-700 via-sky-800 to-sky-900' },
  { code: 'C1', title: 'Advanced', arabicTitle: 'المستوى المتقدم جداً', lessons: 12, completed: 0, gradient: 'from-indigo-700 via-indigo-800 to-indigo-900' },
  { code: 'C2', title: 'Proficiency', arabicTitle: 'إتقان اللغة', lessons: 12, completed: 0, gradient: 'from-violet-700 via-violet-800 to-violet-900' }
]

const totalLessons = computed(() => levels.reduce((sum, l) => sum + l.lessons, 0))
const completedLessons = computed(() => levels.reduce((sum, l) => sum + l.completed, 0))
const overallProgress = computed(() => totalLessons.value > 0 ? Math.round((completedLessons.value / totalLessons.value) * 100) : 0)
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
              :class="level.gradient"
              class="relative px-5 pt-5 pb-4 overflow-hidden"
            >
              <!-- Decorative Arabic text -->
              <span
                class="absolute top-2 right-3 font-arabic text-white/10 text-2xl select-none"
                aria-hidden="true"
              >
                {{ level.arabicTitle }}
              </span>
              <div class="relative z-10">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-[10px] font-bold tracking-wider">
                    {{ level.code }}
                  </span>
                  <span class="text-white/70 text-xs">{{ level.title }}</span>
                </div>
                <h2 class="text-white font-bold text-lg">
                  {{ level.arabicTitle }}
                </h2>
              </div>
            </div>

            <!-- Card body -->
            <div class="p-5">
              <div class="flex items-center justify-between text-sm text-stone-500 dark:text-stone-400 mb-3">
                <span>{{ level.completed }} / {{ level.lessons }} lessons</span>
                <span class="text-primary-600 dark:text-primary-400 font-medium text-xs uppercase tracking-wide">
                  {{ level.completed >= level.lessons ? 'Completed' : 'In Progress' }}
                </span>
              </div>
              <!-- Progress bar -->
              <div class="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                <div
                  class="h-full bg-primary-500 rounded-full transition-all duration-500"
                  :style="{ width: level.lessons > 0 ? `${(level.completed / level.lessons) * 100}%` : '0%' }"
                />
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
