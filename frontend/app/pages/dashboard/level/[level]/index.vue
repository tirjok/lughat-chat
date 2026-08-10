<script setup lang="ts">
const route = useRoute()
const currentLevel = (route.params.level as string) || 'A1'

const levelNames: Record<string, { title: string, arabic: string }> = {
  A1: { title: 'Beginner', arabic: 'المستوى المبتدئ' },
  A2: { title: 'Elementary', arabic: 'المستوى الأساسي' },
  B1: { title: 'Intermediate', arabic: 'المستوى المتوسط' },
  B2: { title: 'Upper Intermediate', arabic: 'المستوى المتقدم' },
  C1: { title: 'Advanced', arabic: 'المستوى المتقدم جداً' },
  C2: { title: 'Proficiency', arabic: 'إتقان اللغة' }
}

const info = levelNames[currentLevel] || { title: currentLevel, arabic: currentLevel }
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-950">
    <!-- ── Level Header ─────────────────────────────────────────────── -->
    <section class="px-4 md:px-6 pt-8 pb-6">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2.5 py-0.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full text-[10px] font-bold tracking-wider">
                {{ currentLevel }}
              </span>
              <span class="text-sm text-stone-500 dark:text-stone-400">{{ info.title }}</span>
            </div>
            <h1 class="text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100">
              {{ info.arabic }}
            </h1>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-2">
              Lesson content coming soon.
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
    </section>

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
