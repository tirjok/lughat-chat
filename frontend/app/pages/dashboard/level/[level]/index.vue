<script setup lang="ts">
const route = useRoute()
const currentLevel = (route.params.level as string) || 'A1'
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-950">
    <!-- Page header -->
    <header class="px-4 md:px-6 pt-6 pb-4">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1
              class="text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100"
              data-testid="level-heading"
            >
              Level A1
            </h1>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Lesson content coming soon.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <NuxtLink to="/dashboard">
              <div class="px-4 py-2 rounded text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors">
                Back to Dashboard
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Breadcrumbs -->
    <nav class="px-4 md:px-6 pt-4 pb-2" aria-label="Breadcrumb" data-testid="breadcrumbs">
      <div class="max-w-7xl mx-auto">
        <ol class="flex items-center gap-2 text-sm text-stone-500">
          <li class="flex items-center gap-2">
            <NuxtLink to="/" class="text-primary-600 hover:text-primary-700 transition">Home</NuxtLink>
            <svg class="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            <NuxtLink to="/dashboard" class="text-primary-600 hover:text-primary-700 transition">Dashboard</NuxtLink>
            <svg class="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            <span class="text-stone-800 dark:text-stone-200 font-medium">Level {{ currentLevel }}</span>
          </li>
        </ol>
      </div>
    </nav>

    <!-- Content area -->
    <main class="px-4 md:px-6 pb-8">
      <div class="max-w-7xl mx-auto">
        <!-- Lesson content list (placeholder) -->
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
    </main>
  </div>
</template>
