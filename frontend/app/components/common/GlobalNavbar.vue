<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useHealthPoll } from '../../composables/studio/useHealthPoll'
import { useLessonProgress } from '../../composables/lesson/useLessonProgress'

interface Props {
  currentPath: string
}

const props = defineProps<Props>()

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

const { getLessonProgress } = useLessonProgress()

const progressWidth = computed(() => {
  // Only show progress on lesson routes; return '0%' elsewhere
  if (!props.currentPath.startsWith('/dashboard/level/')) return '0%'
  // Extract lessonId from route: /dashboard/level/{level}/{lesson}
  const parts = props.currentPath.split('/')
  const level = parts[3] || ''
  const lesson = parts[4] || ''
  const lessonId = level.toLowerCase() + '-' + lesson.padStart(2, '0')
  const pct = getLessonProgress(lessonId)
  return `${pct}%`
})

function isActive(item: NavItem): boolean {
  if (item.to === '/dashboard') return props.currentPath.startsWith('/dashboard')
  return props.currentPath === item.to
}

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

if (typeof window !== 'undefined') {
  checkMobile()
  window.addEventListener('resize', checkMobile)
}

const { status, modelLoaded } = useHealthPoll()
</script>

<template>
  <header>
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
      </nav>

      <!-- Model status indicator (desktop) -->
      <div
        class="bg-white/[0.02] ring-white/[0.06] flex items-center gap-2 rounded-full ring-1 px-2.5 py-1"
        :title="`Model XTTS-v2 ${status === 'loading' ? 'Loading...' : status === 'error' ? 'Error' : 'Ready'}`"
      >
        <div
          class="bg-stone-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center gap-2 rounded-full px-3 py-1.5 border"
        >
          <!-- Loading state: pulsing orange dot -->
          <span
            v-if="status === 'loading'"
            aria-hidden="true"
            class="shadow-[0_0_8px_#f97316] w-2 h-2 rounded-full bg-orange-500 animate-pulse"
          />

          <!-- Ready state: green dot with glow -->
          <span
            v-else-if="modelLoaded"
            aria-hidden="true"
            class="shadow-[0_0_8px_#22c55e] w-2 h-2 rounded-full bg-green-500 animate-pulse"
          />

          <!-- Error state: red dot -->
          <span
            v-else
            aria-hidden="true"
            class="shadow-[0_0_8px_#ef4444] w-2 h-2 rounded-full bg-red-500"
          />

          <span class="text-gray-300 text-xs font-medium">
            {{ status === 'loading' ? 'Loading...' : modelLoaded ? 'Ready' : 'Error' }}
          </span>
        </div>
      </div>

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
          v-if="menuOpen"
          ref="menuRef"
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
          </div>

          <!-- Mobile action buttons -->
          <div class="flex items-center gap-2 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              aria-label="Ask Instructor"
              @click="closeMenu"
            >
              <span
                class="ph ph-chats text-lg"
                aria-hidden="true"
              />
              Ask Instructor
            </button>
            <button
              class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              aria-label="Settings"
              @click="closeMenu"
            >
              <span
                class="ph ph-gear text-lg"
                aria-hidden="true"
              />
              Settings
            </button>
          </div>

          <!-- Mobile status indicator -->
          <div
            class="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800"
            :title="`Model XTTS-v2 ${status === 'loading' ? 'Loading...' : status === 'error' ? 'Error' : 'Ready'}`"
          >
            <div
              class="bg-stone-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex items-center gap-1.5 rounded-full px-2.5 py-1 border"
            >
              <span
                v-if="status === 'loading'"
                aria-hidden="true"
                class="shadow-[0_0_8px_#f97316] w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"
              />
              <span
                v-else-if="modelLoaded"
                aria-hidden="true"
                class="shadow-[0_0_8px_#22c55e] w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"
              />
              <span
                v-else
                aria-hidden="true"
                class="shadow-[0_0_8px_#ef4444] w-1.5 h-1.5 rounded-full bg-red-500"
              />
              <span class="text-gray-300 text-[10px] font-medium">
                {{ status === 'loading' ? 'Loading...' : modelLoaded ? 'Ready' : 'Error' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

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
