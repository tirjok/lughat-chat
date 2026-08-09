<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'

// ─── Route path: received from app.vue parent as a prop ─────────────────
// GlobalNavbar lives in app.vue (outside <router-view>), so useRoute()
// throws. The parent passes the reactive path via prop.

interface Props {
  currentPath: string
}

const props = defineProps<Props>()
const _props = () => props.currentPath // eslint-disable-line
// ─── Navigation definition (single source of truth) ──────────────────────

interface NavItem {
  to: string
  label: string
  icon: string
  activeIcon: string
}

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    icon: 'ph-house',
    activeIcon: 'ph-fill ph-house'
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: 'ph-squares-four',
    activeIcon: 'ph-fill ph-squares-four'
  }
]

// "My Courses" — shares the Dashboard route but highlights on lesson pages
const myCoursesActive = computed(() => props.currentPath.startsWith('/dashboard/level/'))

// ─── Active-state helper ──────────────────────────────────────────────────
// "Dashboard" should highlight on /dashboard AND any /dashboard/* sub-route.
// "Home" highlights only on exact '/'.

function isActive(item: NavItem): boolean {
  if (item.to === '/dashboard') return props.currentPath.startsWith('/dashboard')
  return props.currentPath === item.to
}

// Progress fill: 0% on / and /dashboard, partial on lesson pages
const progressWidth = computed(() => {
  if (!myCoursesActive.value) return '0%'
  const parts = props.currentPath.split('/').filter(Boolean)
  // /dashboard/level/{level}/{lesson_id}
  if (parts.length >= 4) {
    const lessonNum = parseInt(parts[3]!, 10)
    if (!isNaN(lessonNum) && lessonNum > 0) {
      const totalLessons = 12
      const pct = Math.min(100, Math.round((lessonNum / totalLessons) * 100))
      return `${pct}%`
    }
  }
  return '0%'
})

// ─── Mobile state ─────────────────────────────────────────────────────────

const isMobile = ref(false)
const menuOpen = ref(false)
const menuRef = useTemplateRef<HTMLDivElement | null>('menuRef')

function checkMobile(): void {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 768
  }
}

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value
}

function closeMenu(): void {
  menuOpen.value = false
}

// React to viewport changes (client-side only)
if (typeof window !== 'undefined') {
  checkMobile()
  window.addEventListener('resize', checkMobile)
}
</script>

<template>
  <header>
    <!-- ── Desktop: compact bar ──────────────────────────────────────────── -->
    <div
      class="hidden md:flex h-14 items-center justify-between px-4 md:px-6 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-700/80"
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
          Lughat<span class="text-gold-500">Chat</span>
        </span>
      </NuxtLink>

      <!-- Desktop nav links -->
      <nav
        class="flex items-center gap-1"
        aria-label="Main navigation"
      >
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :exact="item.to === '/'"
          class="px-3 py-1.5 rounded text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          :class="isActive(item)
            ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10'
            : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'"
        >
          {{ item.label }}
        </NuxtLink>

        <!-- My Courses — shares /dashboard route but highlights on lesson pages -->
        <NuxtLink
          to="/dashboard"
          class="px-3 py-1.5 rounded text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          :class="myCoursesActive
            ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10'
            : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'"
        >
          My Courses
        </NuxtLink>
      </nav>

      <!-- Desktop action buttons + avatar -->
      <div class="flex items-center gap-3">
        <button
          class="px-3 py-1.5 rounded text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          aria-label="Ask Instructor"
        >
          <span
            class="ph ph-chats text-lg"
            aria-hidden="true"
          />
          <span class="hidden lg:inline ml-1">Ask Instructor</span>
        </button>
        <button
          class="px-3 py-1.5 rounded text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          aria-label="Settings"
        >
          <span
            class="ph ph-gear text-lg"
            aria-hidden="true"
          />
          <span class="hidden lg:inline ml-1">Settings</span>
        </button>
        <div
          class="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-semibold text-sm"
          aria-hidden="true"
        >
          S
        </div>
      </div>
    </div>

    <!-- ── Mobile: Floating Glass Pill ───────────────────────────────────── -->
    <div
      v-if="isMobile"
      class="md:hidden"
    >
      <!-- Floating pill: detached from edges, safe-area aware -->
      <div
        class="mx-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))] mt-[max(0.5rem,env(safe-area-inset-top))] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-full ring-1 ring-stone-200/80 dark:ring-stone-700/80 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
      >
        <div class="flex items-center justify-between px-3 py-2">
          <!-- Logo (compact, icon-only on smallest screens) -->
          <NuxtLink
            to="/"
            class="flex items-center gap-2 shrink-0"
            @click="closeMenu"
          >
            <span
              aria-hidden="true"
              class="ph-fill ph-waves text-primary-500 text-lg"
            />
            <span class="text-sm font-bold text-stone-800 dark:text-stone-200 tracking-tight lg:inline">
              Lughat<span class="text-gold-500">Chat</span>
            </span>
          </NuxtLink>

          <!-- Hamburger / Close toggle -->
          <button
            class="w-9 h-9 flex items-center justify-center rounded-full text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            :class="menuOpen ? 'text-primary-600 dark:text-primary-400' : ''"
            aria-label="Navigation menu"
            :aria-expanded="menuOpen"
            @click="toggleMenu"
          >
            <!-- Hamburger icon (3 lines) -->
            <span
              v-if="!menuOpen"
              class="ph ph-list text-xl"
              aria-hidden="true"
            />
            <!-- Close icon (X) -->
            <span
              v-else
              class="ph ph-x text-xl"
              aria-hidden="true"
            />
          </button>
        </div>

        <!-- Expanded menu: staggered reveal -->
        <div
          ref="menuRef"
          v-if="menuOpen"
          class="border-t border-stone-100 dark:border-stone-800 px-3 pb-3 pt-2"
        >
          <!-- Nav links with icons -->
          <div class="flex flex-col gap-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              :exact="item.to === '/'"
              class="flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              :class="isActive(item)
                ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'"
              @click="closeMenu"
            >
              <span
                :class="isActive(item) ? item.activeIcon : item.icon"
                class="text-lg"
                aria-hidden="true"
              />
              <span>{{ item.label }}</span>
            </NuxtLink>

            <!-- My Courses — shares /dashboard route, highlights on lesson pages -->
            <NuxtLink
              to="/dashboard"
              class="flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              :class="myCoursesActive
                ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'"
              @click="closeMenu"
            >
              <span
                :class="myCoursesActive ? 'ph-fill ph-book-open' : 'ph ph-book-open'"
                class="text-lg"
                aria-hidden="true"
              />
              <span>My Courses</span>
            </NuxtLink>
          </div>

          <!-- Mobile action buttons -->
          <div class="flex items-center gap-2 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              aria-label="Ask Instructor"
              @click="closeMenu"
            >
              <span class="ph ph-chats text-lg" aria-hidden="true" />
              Ask Instructor
            </button>
            <button
              class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              aria-label="Settings"
              @click="closeMenu"
            >
              <span class="ph ph-gear text-lg" aria-hidden="true" />
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Progress bar (4px, hidden on mobile) ─────────────────────────── -->
    <div
      class="hidden md:block h-1 bg-stone-100 dark:bg-stone-700"
      aria-hidden="true"
    >
      <div
        class="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
        :style="{ width: progressWidth }"
      />
    </div>
  </header>
</template>
