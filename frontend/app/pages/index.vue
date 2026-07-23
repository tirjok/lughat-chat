<script setup lang="ts">
const sidebar = useSidebar()

useSeoMeta({
  title: 'Learning Roadmap — LughatChat',
  description: 'Arabic language learning — view your 30-lesson roadmap across CEFR levels A1, A2, B1'
})

const { lessons, loading, error, groupedLessons } = useLessons()
</script>

<template>
  <div
    class="dashboard-page min-h-screen bg-[#0C0A09] dark:bg-[#0C0A09]"
    dir="rtl"
  >
    <NavBar @toggle="sidebar.toggle" />

    <RoadmapSidebar
      :is-open="sidebar.isOpen.value"
      @close="sidebar.close()"
    />

    <div
      class="max-w-4xl mx-auto px-4 py-8"
      :class="{ 'ml-72': sidebar.isOpen.value && !sidebar.isMobile.value }"
    >
      <!-- Page Header: Calligraphic -->
      <div class="mb-8">
        <h1
          class="font-arabic text-3xl font-bold text-gold mb-1"
          dir="rtl"
        >
          خريطة التعلم
        </h1>
        <p class="text-[10px] font-sans text-ink-dim tracking-[0.2em] uppercase">
          Learning Roadmap
        </p>
      </div>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="text-ink-dim"
      >
        Loading lessons...
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="text-error"
      >
        {{ error }}
      </div>

      <!-- Lessons List -->
      <div v-else>
        <div
          v-for="levelGroup in groupedLessons"
          :key="levelGroup.level"
          class="mb-8"
        >
          <!-- Level header -->
          <h2 class="text-lg font-bold text-ink mb-4 flex items-center gap-3">
            <span class="text-gold text-sm font-sans tracking-wider uppercase">{{ levelGroup.level }} Level</span>
            <span class="flex-1 h-px bg-white/[0.04]" />
            <span class="text-xs text-ink-dim">{{ levelGroup.progress }}%</span>
          </h2>

          <div class="space-y-3">
            <NuxtLink
              v-for="lesson in levelGroup.lessons"
              :key="lesson.id"
              :to="`/lessons/${lesson.id}`"
              class="block"
            >
              <div
                class="dashboard-lesson-card rounded-lg border border-white/[0.04] bg-studio-800 p-4 cursor-pointer transition-all hover:border-gold/20"
                :class="{ 'opacity-40': lesson.status === 'locked' }"
              >
                <div class="flex-between">
                  <div>
                    <h3 class="font-sans font-semibold text-ink text-base">
                      {{ lesson.title }}
                    </h3>
                    <p class="text-xs text-ink-dim mt-1">
                      {{ lesson.section_count }} sections · {{ lesson.competency_count }} competencies
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      v-if="lesson.status === 'available'"
                      class="text-gold text-lg"
                      title="Available"
                    >
                      <span class="ph ph-arrow-right" />
                    </span>
                    <span
                      v-else-if="lesson.status === 'locked'"
                      class="text-ink-dim/50 text-lg"
                      title="Locked"
                    >
                      <span class="ph ph-lock" />
                    </span>
                    <span
                      v-else-if="lesson.status === 'completed'"
                      class="text-gold text-lg"
                      title="Completed"
                    >
                      <span class="ph ph-check-circle" />
                    </span>
                    <span
                      v-else-if="lesson.status === 'in_progress'"
                      class="text-gold text-lg"
                      title="In Progress"
                    >
                      <span class="ph ph-spinner animate-spin" />
                    </span>
                  </div>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="lessons.length === 0"
          class="text-ink-dim"
        >
          No lessons available
        </div>
      </div>
    </div>
  </div>
</template>
