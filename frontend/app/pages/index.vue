<script setup lang="ts">
const sidebar = useSidebar()

useSeoMeta({
  title: 'Learning Roadmap — LughatChat',
  description: 'Arabic language learning — view your 30-lesson roadmap across CEFR levels A1, A2, B1'
})

const { lessons, loading, error, groupedLessons, fetchLessons } = useLessons()

// Gold-spectrum level badge (Issue 9: no level-specific colors)
function getLevelBadge(_level: string): string {
  return `bg-gold-dim text-gold border-gold/25`
}

// Level icon (preserved — meaningful for level identity)
function getLevelIcon(level: string): string {
  const icons: Record<string, string> = {
    A1: 'ph-seedling',
    A2: 'ph-fire-flame-simple',
    B1: 'ph-rocket-launch'
  }
  return icons[level] || 'ph-book-open'
}

// Gold-spectrum status icon (Issue 9: no emerald/amber/red)
function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed': return 'ph-check-circle text-gold-bright text-lg'
    case 'in_progress': return 'ph-spinner text-gold text-lg animate-spin'
    default: return 'ph-arrow-right text-ink-dim/50 text-lg group-hover:text-gold transition-colors'
  }
}

// Gold-spectrum status circle (Issue 9)
function getStatusCircle(status: string): string {
  switch (status) {
    case 'completed': return 'bg-gold/15 border border-gold/25'
    case 'in_progress': return 'bg-gold-dim border border-gold/25'
    default: return 'bg-white/[0.06] border border-white/[0.08]'
  }
}

// Gold-spectrum progress bar (Issue 9: no emerald)
function getProgressColor(status: string): string {
  return status === 'completed' ? 'bg-gold-bright' : 'bg-gold'
}

function getLevelProgressColor(progress: number): string {
  return progress >= 100 ? 'bg-gold-bright' : 'bg-gold'
}
</script>

<template>
  <div
    class="dashboard-page min-h-screen"
    dir="rtl"
  >
    <NavBar @toggle="sidebar.toggle" />

    <RoadmapSidebar
      :is-open="sidebar.isOpen.value"
      @close="sidebar.close()"
    />

    <!-- Content layer above background -->
    <div
      class="relative z-10 max-w-3xl mx-auto px-4"
      :class="{ 'ml-72': sidebar.isOpen.value && !sidebar.isMobile.value }"
      style="padding-top: var(--nav-offset);"
    >
      <!-- Hero Header — tightened -->
      <div class="mb-8 text-center">
        <div class="inline-flex items-center gap-2.5 mb-2">
          <span class="ph ph-student text-gold text-2xl" />
          <h1
            class="font-arabic text-3xl font-bold text-gold"
            dir="rtl"
          >
            خريطة التعلم
          </h1>
        </div>
        <p class="text-[10px] font-sans text-ink-dim/60 tracking-[0.2em] uppercase">
          Your Journey to Arabic Fluency
        </p>

        <!-- Overall progress — consolidated inline stats (Issue 9) -->
        <div
          v-if="groupedLessons?.length > 0 && !loading"
          class="flex items-center justify-center gap-4 text-xs mt-3"
        >
          <span class="inline-flex items-center gap-1.5">
            <span class="ph ph-check-circle text-gold-bright text-sm" />
            <span class="text-ink-dim font-medium">{{ (groupedLessons?.reduce((sum, g) => sum + g.lessons.filter(l => l.status === 'completed').length, 0) ?? 0) }}</span>
          </span>
          <span class="text-ink-dim/25">/</span>
          <span class="inline-flex items-center gap-1.5">
            <span class="ph ph-spinner text-gold text-sm" />
            <span class="text-ink-dim font-medium">{{ (groupedLessons?.reduce((sum, g) => sum + g.lessons.filter(l => l.status === 'in_progress').length, 0) ?? 0) }}</span>
          </span>
          <span class="text-ink-dim/25">/</span>
          <span class="inline-flex items-center gap-1.5">
            <span class="ph ph-lock-key text-ink-dim/40 text-sm" />
            <span class="text-ink-dim font-medium">{{ (groupedLessons?.reduce((sum, g) => sum + g.lessons.filter(l => l.status === 'locked').length, 0) ?? 0) }}</span>
          </span>
        </div>
      </div>

      <!-- Loading State: skeleton cards — Issue 22: WCAG AA border -->
      <div
        v-if="loading"
        class="space-y-5"
      >
        <div
          v-for="i in 5"
          :key="i"
          class="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-5"
        >
          <div class="flex-between">
            <div class="space-y-2">
              <div class="h-5 w-56 rounded-full bg-white/[0.06] animate-pulse" />
              <div class="h-3 w-36 rounded-full bg-white/[0.04] animate-pulse" />
            </div>
            <div class="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse" />
          </div>
          <div class="mt-4 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div
              class="h-full rounded-full bg-white/[0.06] animate-pulse"
              style="width: 0%"
            />
          </div>
        </div>
      </div>

      <!-- Error State: friendly message + retry -->
      <div
        v-else-if="error"
        class="flex flex-col items-center gap-4 py-12"
      >
        <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
          <span class="ph ph-warning-circle text-error text-2xl" />
        </div>
        <p class="text-ink text-center font-medium">
          {{ error }}
        </p>
        <button
          class="rounded-full px-6 py-2.5 bg-gold/15 text-gold text-sm font-semibold hover:bg-gold/25 transition-all cursor-pointer border border-gold/25"
          @click="fetchLessons()"
        >
          <span class="ph ph-arrows-clockwise ml-2" />
          Try Again
        </button>
      </div>

      <!-- Lessons List -->
      <div v-else>
        <div
          v-for="levelGroup in groupedLessons"
          :key="levelGroup.level"
          class="mb-10"
        >
          <!-- Level section header — compact -->
          <div class="flex items-center gap-3 mb-4">
            <div
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
              :class="getLevelBadge(levelGroup.level)"
            >
              <span
                class="ph"
                :class="getLevelIcon(levelGroup.level)"
              />
              {{ levelGroup.level }}
            </div>
            <span class="flex-1 h-px bg-white/[0.06]" />
            <span class="text-[11px] text-ink-dim/50">{{ levelGroup.progress }}%</span>
            <div class="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="getLevelProgressColor(levelGroup.progress)"
                :style="{ width: levelGroup.progress + '%' }"
              />
            </div>
          </div>

          <!-- Lesson Cards — tightened: removed redundant status badge (icon circle suffices) -->
          <div class="space-y-2.5">
            <template
              v-for="lesson in levelGroup.lessons"
              :key="lesson.id"
            >
              <!-- Non-locked lessons: glass-morphism card with gold-spectrum (Issue 9) -->
              <NuxtLink
                v-if="lesson.status !== 'locked'"
                :to="`/lessons/${lesson.id}`"
                class="group block"
              >
                <div
                  class="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a1a]"
                >
                  <!-- Card body — Issue 22: WCAG AA border -->
                  <div
                    class="relative rounded-2xl border border-white/[0.12] bg-white/[0.03] backdrop-blur-sm p-4 group-hover:border-gold/30 group-hover:bg-white/[0.05] transition-all duration-500 cursor-pointer"
                    tabindex="0"
                    data-testid="lesson-card"
                  >
                    <div class="flex items-center gap-3">
                      <!-- Status icon circle — gold-spectrum (Issue 9) -->
                      <div
                        class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                        :class="getStatusCircle(lesson.status)"
                      >
                        <span :class="getStatusIcon(lesson.status)" />
                      </div>

                      <div class="flex-1 min-w-0">
                        <h3 class="font-sans font-semibold text-ink text-sm group-hover:text-gold transition-colors duration-300 truncate">
                          {{ lesson.title }}
                        </h3>
                        <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-ink-dim/50">
                          <span>{{ lesson.section_count }} sections</span>
                          <span class="text-ink-dim/25">·</span>
                          <span>{{ lesson.competency_count }} competencies</span>
                        </div>
                      </div>
                    </div>

                    <!-- Progress bar — gold-spectrum (Issue 9: no emerald) -->
                    <div class="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-700"
                        :class="getProgressColor(lesson.status)"
                        :style="{ width: (lesson.status === 'completed' ? 100 : 0) + '%' }"
                      />
                    </div>
                  </div>
                </div>
              </NuxtLink>
              <!-- Issue 2: Visible locked lessons — dimmed with lock pattern -->
              <div
                v-else
                class="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 opacity-40"
                role="status"
                :aria-label="`Locked: ${lesson.title}. Complete previous lessons to unlock.`"
                data-testid="locked-lesson"
              >
                <div class="flex items-center gap-3">
                  <div class="flex-shrink-0 w-9 h-9 rounded-full bg-white/[0.04] flex items-center justify-center">
                    <span class="ph ph-lock-key text-ink-dim/40 text-base" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-sans font-semibold text-ink-dim/50 text-sm truncate">
                      {{ lesson.title }}
                    </h3>
                    <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-ink-dim/35">
                      <span>{{ lesson.section_count }} sections</span>
                      <span class="text-ink-dim/20">·</span>
                      <span>{{ lesson.competency_count }} competencies</span>
                    </div>
                  </div>
                  <span class="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.04] text-ink-dim/40 border border-white/[0.06]">
                    <span class="ph ph-lock text-[10px]" />
                    Locked
                  </span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Empty state — compact -->
        <div
          v-if="lessons.length === 0"
          class="flex flex-col items-center gap-3 py-12"
        >
          <div class="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
            <span class="ph ph-books text-gold text-xl" />
          </div>
          <p class="text-ink text-sm font-medium">
            No lessons available yet
          </p>
          <p class="text-ink-dim/50 text-xs text-center max-w-xs">
            Check back when new lessons are unlocked.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
