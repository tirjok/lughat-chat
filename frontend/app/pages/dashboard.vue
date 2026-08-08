<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-950">
    <!-- Page header (below GlobalNavbar from app.vue) -->
    <header class="px-4 md:px-6 pt-6 pb-4">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100">
              Your Learning Journey
            </h1>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Track your progress across CEFR levels
            </p>
          </div>
          <div class="flex items-center gap-3">
            <NuxtLink
              to="/dashboard"
              class="px-4 py-2 rounded text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors"
            >
              Continue Learning
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Content area -->
    <main class="px-4 md:px-6 pb-8">
      <div class="max-w-7xl mx-auto">
        <!-- Health status (non-blocking — page renders regardless) -->
        <div
          class="mb-6"
          aria-label="Model Status"
        >
          <ModelStatusIndicator :light="true" />
        </div>

        <!-- Card grid: course/level cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Level cards (placeholder — backend integration deferred) -->
          <div
            v-for="level in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']"
            :key="level"
            class="card flex flex-col gap-3"
          >
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100">
                Level {{ level }}
              </h2>
              <span
                class="px-2 py-0.5 rounded text-xs font-medium bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300"
              >
                {{ level }}
              </span>
            </div>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              Placeholder content — lessons coming soon.
            </p>
            <div class="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
              <div
                class="h-full bg-primary-500 rounded-full"
                style="width: 0%"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
