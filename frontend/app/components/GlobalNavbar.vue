<script setup lang="ts">
import { computed } from 'vue'

// Access route via Nuxt app — useNuxtApp is a Nuxt auto-import.
// In tests, setup.ts stubs useNuxtApp on globalThis.
const useNuxtApp = (globalThis as Record<string, unknown>).useNuxtApp as (() => { route?: { path: string } }) | undefined
const route = useNuxtApp?.() ?? { route: { path: '/' } }

// Fallback: if Nuxt hasn't injected route yet (SSR edge case), default to '/'
const currentPath = route?.route?.path ?? '/'

// ─── Route helpers ────────────────────────────────────────────────────

const isActive = (path: string): boolean => {
  return currentPath === path || (path === '/dashboard' && currentPath.startsWith('/dashboard/level/'))
}

const isLessonRoute = computed(() => currentPath.startsWith('/dashboard/level/'))

// Progress fill: 0% on / and /dashboard, partial on lesson pages
const progressWidth = computed(() => {
  if (!isLessonRoute.value) return '0%'
  // Simple heuristic: extract lesson number from path for a rough progress
  const parts = currentPath.split('/').filter(Boolean)
  // /dashboard/level/{level}/{lesson_id}
  if (parts.length >= 4) {
    const lessonNum = parseInt(parts[3]!, 10)
    if (!isNaN(lessonNum) && lessonNum > 0) {
      const totalLessons = 12 // Estimated total lessons across all levels
      const pct = Math.min(100, Math.round((lessonNum / totalLessons) * 100))
      return `${pct}%`
    }
  }
  return '0%'
})

// ─── Mobile detection ─────────────────────────────────────────────────

const isMobile = computed(() => {
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768
  }
  return false
})
</script>

<template>
  <header>
    <!-- Desktop: h-14 top bar (56px) -->
    <div
      class="h-14 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700"
    >
      <!-- Logo -->
      <NuxtLink
        to="/"
        class="flex items-center gap-2 shrink-0"
      >
        <span
          aria-hidden="true"
          class="ph-fill ph-waves text-primary-500 text-xl"
        />
        <span class="text-lg font-bold text-stone-800 dark:text-stone-200 tracking-tight">
          Lughat<span class="text-primary-500">Chat</span>
        </span>
      </NuxtLink>

      <!-- Desktop nav links (hidden on mobile) -->
      <nav
        class="hidden md:flex items-center gap-1"
        aria-label="Main navigation"
      >
        <NuxtLink
          to="/"
          class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
          :class="isActive('/') ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'"
        >
          Home
        </NuxtLink>
        <NuxtLink
          to="/dashboard"
          class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
          :class="isActive('/dashboard') ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'"
        >
          Dashboard
        </NuxtLink>
        <NuxtLink
          to="/dashboard"
          class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
          :class="isLessonRoute ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'"
        >
          My Courses
        </NuxtLink>
      </nav>

      <!-- Desktop action buttons + avatar -->
      <div class="hidden md:flex items-center gap-3">
        <button
          class="px-3 py-1.5 rounded text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
          aria-label="Ask Instructor"
        >
          <span
            class="ph ph-chats text-lg"
            aria-hidden="true"
          />
          <span class="hidden lg:inline ml-1">Ask Instructor</span>
        </button>
        <button
          class="px-3 py-1.5 rounded text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
          aria-label="Settings"
        >
          <span
            class="ph ph-gear text-lg"
            aria-hidden="true"
          />
          <span class="hidden lg:inline ml-1">Settings</span>
        </button>
        <div
          class="w-8 h-8 rounded-full bg-stone-300 dark:bg-stone-600 flex items-center justify-center"
          aria-hidden="true"
        />
      </div>

      <!-- Mobile: compact bar (h-16 for WCAG 44px touch targets) -->
      <div
        v-if="isMobile"
        class="md:hidden flex items-center justify-between h-16 px-3"
      >
        <!-- Mobile logo -->
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            class="ph-fill ph-waves text-primary-500 text-xl"
          />
          <span class="text-base font-bold text-stone-800 dark:text-stone-200">
            Lughat<span class="text-primary-500">Chat</span>
          </span>
        </NuxtLink>

        <!-- Mobile nav icons -->
        <div class="flex items-center gap-1">
          <NuxtLink
            to="/"
            class="w-11 h-11 flex items-center justify-center rounded-lg transition-colors"
            aria-label="Home"
          />
          <NuxtLink
            to="/dashboard"
            class="w-11 h-11 flex items-center justify-center rounded-lg transition-colors"
            :class="isActive('/dashboard') ? 'text-primary-600 dark:text-primary-400' : 'text-stone-500 dark:text-stone-400'"
            aria-label="Dashboard"
          />
          <NuxtLink
            to="/dashboard"
            class="w-11 h-11 flex items-center justify-center rounded-lg transition-colors"
            :class="isLessonRoute ? 'text-primary-600 dark:text-primary-400' : 'text-stone-500 dark:text-stone-400'"
            aria-label="My Courses"
          />
        </div>

        <!-- Mobile action dropdown trigger -->
        <div class="relative">
          <button
            class="w-11 h-11 flex items-center justify-center rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="More actions"
            aria-haspopup="true"
          />
        </div>
      </div>
    </div>

    <!-- Progress bar (4px, hidden on mobile) -->
    <div
      class="h-1 bg-stone-100 dark:bg-stone-700 md:block hidden"
      aria-hidden="true"
    >
      <div
        class="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
        :style="{ width: progressWidth }"
      />
    </div>
  </header>
</template>
