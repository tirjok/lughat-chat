<script setup lang="ts">
import { computed } from 'vue'
import { getLevelByCode } from '../../../../data/curriculum'

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
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-950">
    <!-- ── Level Header ─────────────────────────────────────────────── -->
    <header class="px-4 md:px-6 pt-8 pb-6">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2.5 py-0.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full text-[10px] font-bold tracking-wider">
                {{ currentLevel }}
              </span>
              <span class="text-sm text-stone-500 dark:text-stone-400">{{ info.title }}</span>
            </div>
            <h1 class="text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100" data-testid="level-heading">Level {{ currentLevel }}: {{ info.title }} — {{ info.arabic }}</h1>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-2" data-testid="level-description">
            </p>
          </div>
          <NuxtLink
            to="/dashboard"
            class="px-5 py-2.5 rounded-full text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm shrink-0"
          >
            Back to Dashboard
          </NuxtLink>
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
            v-for="lesson in ['Introduction', 'Vocabulary', 'Practice', 'Assessment']"
            :key="lesson"
            class="card flex flex-col gap-2 p-4"
          >
            <h2 class="text-base font-semibold text-stone-800 dark:text-stone-100">
              {{ lesson }}
            </h2>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              Placeholder — content coming soon.
            </p>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
