<script setup lang="ts">
import type { LessonSummary } from '~/composables/useLessons'

const { lessons, loading, error, fetchLessons } = useLessons()

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

// Gold-spectrum level badge (Issue 9: no level-specific colors)
function getLevelBadge(_level: string): string {
  return `bg-gold-dim text-gold border-gold/25`
}

// Gold-spectrum status icon (Issue 9: no emerald/amber/red)
function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed': return 'ph-check-circle text-gold-bright'
    case 'in_progress': return 'ph-spinner text-gold animate-spin'
    case 'locked': return 'ph-lock-key text-ink-dim/40'
    default: return 'ph-arrow-right text-ink-dim/50'
  }
}

// Gold-spectrum status circle (Issue 9: no emerald/amber/red)
function getStatusCircle(status: string): string {
  switch (status) {
    case 'completed': return 'bg-gold/15 border border-gold/25'
    case 'in_progress': return 'bg-gold-dim border border-gold/25'
    default: return 'bg-white/[0.06] border border-white/[0.08]'
  }
}
</script>

<template>
  <div
    class="lessons-page min-h-screen"
    dir="rtl"
  >
    <div class="relative z-10 max-w-3xl mx-auto px-4 py-8 md:px-6">
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
                class="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-5 cursor-pointer hover:border-gold/30 hover:bg-white/[0.05] transition-all duration-500"
                :class="{ 'opacity-35': lesson.status === 'locked' }"
                :role="lesson.status === 'locked' ? 'status' : undefined"
                :aria-disabled="lesson.status === 'locked' ? 'true' : undefined"
                :aria-label="lesson.status === 'locked' ? `Locked: Complete previous lessons to unlock — ${lesson.title}` : undefined"
              >
                <div class="flex-between">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-9 h-9 rounded-full flex items-center justify-center"
                      :class="getStatusCircle(lesson.status)"
                    >
                      <span :class="getStatusIcon(lesson.status)" />
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
