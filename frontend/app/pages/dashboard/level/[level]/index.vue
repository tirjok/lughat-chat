<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-950">
    <!-- Page header -->
    <header class="px-4 md:px-6 pt-6 pb-4">
      <div class="max-w-6xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-stone-800 dark:text-stone-100" data-testid="level-heading">Level A1
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

    <!-- Content area -->
    <main class="px-4 md:px-6 pb-8">
      <div class="max-w-6xl mx-auto">
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
