<script setup lang="ts">
import type { LessonSummary } from '~/composables/useLessons'

const { lessons, loading, error } = useLessons()

// Group lessons by level and sort by sequence
const groupedLessons = computed(() => {
  const groups: Record<string, LessonSummary[]> = {}
  for (const lesson of lessons.value) {
    const key = lesson.level
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key]!.push(lesson)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([level, ls]) => ({
      level,
      lessons: [...(ls ?? [])].sort((a, b) => a.sequence - b.sequence)
    }))
})

const levelBadgeBg: Record<string, string> = {
  A1: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  A2: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  B1: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
}

function getLevelBadge(level: string): string {
  return levelBadgeBg[level] || 'bg-gold-dim text-gold border-gold/25'
}
</script>

<template>
  <div
    class="lessons-page min-h-screen"
    dir="rtl"
  >
    <!-- Vibrant gradient background -->
    <div
      class="fixed inset-0 z-0"
      style="background: radial-gradient(ellipse 70% 50% at 20% 10%, rgba(139, 92, 246, 0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(245, 158, 11, 0.06) 0%, transparent 55%), linear-gradient(180deg, #0a0a1a 0%, #0f0e1a 50%, #0a0f14 100%);"
    />

    <div class="relative z-10 max-w-4xl mx-auto px-4 py-8 md:px-6">
      <h1 class="text-2xl font-bold text-ink mb-6">
        Learning Roadmap
      </h1>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="space-y-5"
      >
        <div
          v-for="i in 4"
          :key="i"
          class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
        >
          <div class="flex-between">
            <div class="space-y-2">
              <div class="h-5 w-56 rounded-full bg-white/[0.06] animate-pulse" />
              <div class="h-3 w-36 rounded-full bg-white/[0.04] animate-pulse" />
            </div>
            <div class="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse" />
          </div>
          <div class="mt-4 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div class="h-full rounded-full bg-white/[0.06] animate-pulse" style="width: 0%" />
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="flex flex-col items-center gap-4 py-12"
      >
        <div class="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center">
          <span class="ph ph-warning-circle text-error text-xl" />
        </div>
        <p class="text-ink text-center">
          {{ error }}
        </p>
        <button
          class="rounded-full px-5 py-2 bg-gold/15 text-gold text-sm font-semibold hover:bg-gold/25 transition-all cursor-pointer border border-gold/25"
          @click="lessons.length > 0 ? fetchLessons() : null"
        >
          <span class="ph ph-arrows-clockwise ml-1" />
          Retry
        </button>
      </div>

      <!-- Lessons List -->
      <div v-else>
        <div
          v-for="levelGroup in groupedLessons"
          :key="levelGroup.level"
          class="mb-8"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="px-3 py-1 rounded-full text-xs font-bold border"
              :class="getLevelBadge(levelGroup.level)"
            >
              {{ levelGroup.level }}
            </div>
            <span class="flex-1 h-px bg-white/[0.06]" />
          </div>
          <div class="space-y-3">
            <NuxtLink
              v-for="lesson in levelGroup.lessons"
              :key="lesson.id"
              :to="`/lessons/${lesson.id}`"
              class="block"
            >
              <div
                class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 cursor-pointer hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-500"
                :class="{ 'opacity-30': lesson.status === 'locked' }"
              >
                <div class="flex-between">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-9 h-9 rounded-full flex items-center justify-center"
                      :class="lesson.status === 'completed'
                        ? 'bg-emerald-500/15 border border-emerald-500/25'
                        : lesson.status === 'in_progress'
                          ? 'bg-amber-500/15 border border-amber-500/25'
                          : 'bg-white/[0.06] border border-white/[0.08]'"
                    >
                      <span
                        v-if="lesson.status === 'completed'"
                        class="ph ph-check-circle text-emerald-400"
                      />
                      <span
                        v-else-if="lesson.status === 'in_progress'"
                        class="ph ph-spinner text-amber-400 animate-spin"
                      />
                      <span
                        v-else-if="lesson.status === 'locked'"
                        class="ph ph-lock-key text-ink-dim/40"
                      />
                      <span
                        v-else
                        class="ph ph-arrow-right text-ink-dim/50"
                      />
                    </div>
                    <div>
                      <h3 class="font-sans font-semibold text-ink text-base">
                        {{ lesson.title }}
                      </h3>
                      <p class="text-xs text-ink-dim/60 mt-0.5">
                        {{ lesson.section_count }} sections · {{ lesson.competency_count }} competencies
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
