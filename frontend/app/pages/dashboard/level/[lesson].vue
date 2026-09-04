<script setup lang="ts">
import { getLessonById } from '~/data/curriculum'
import { onUnmounted, ref, watch, computed } from 'vue'
import { useLessonProgress } from '~/composables/lesson/useLessonProgress'
import { useLessonOrchestrator } from '~/composables/lesson/useLessonOrchestrator'

import LessonPronouns from '~/components/lesson/LessonPronouns.vue'
import LessonVocabulary from '~/components/lesson/LessonVocabulary.vue'

const lessonProgress = useLessonProgress()
const lessonId = computed(() => levelParam.value.toLowerCase() + '-' + lessonParam.value.padStart(2, '0'))
const totalLines = computed(() => {
  const lesson = currentLessonData.value
  if (!lesson) return 0
  return lesson.sections.flatMap(s => s.items).length
})

let completedLines = 0

function safeRoute() {
  try {
    return useRoute()
  } catch {
    return {} as ReturnType<typeof useRoute>
  }
}
const route = computed(() => safeRoute())
const levelParam = computed(() => (route.value.params?.level as string) || '')
const lessonParam = computed(() => (route.value.params?.lesson as string) || '')
const currentLevel = computed(() => levelParam.value || 'A1')
const levelRoute = computed(() => `/dashboard/level/${currentLevel.value.toLowerCase()}`)
const currentLesson = computed(() => lessonParam.value || '1')

const breadcrumbs = computed(() => [
  { label: 'Dashboard', to: '/dashboard' },
  { label: `Level ${currentLevel.value}`, to: levelRoute.value },
  { label: `Lesson ${currentLesson.value}`, to: undefined }
])

const lessonTabs = computed(() => {
  const lesson = getLessonById(levelParam.value.toLowerCase() + '-' + lessonParam.value.padStart(2, '0'))
  return lesson ? lesson.sections.map(s => s.name).filter((n): n is string => n != null) : ['Dialogue', 'Vocabulary', 'Pronouns', 'Expressions', 'Grammar', 'Activities']
})

const { activeSection, navigateToSection, handleArrowKey } = useLessonOrchestrator({
  sectionTabs: lessonTabs.value
})

// Page-level arrow key handler for section navigation
function _handlePageKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    handleArrowKey(e.key as 'ArrowLeft' | 'ArrowRight')
  }
}

const currentLessonData = computed(() => {
  const lesson = getLessonById(levelParam.value.toLowerCase() + '-' + lessonParam.value.padStart(2, '0'))
  return lesson
})

const pronounsSection = computed(() => {
  const lesson = currentLessonData.value
  return lesson ? lesson.sections.find(s => s.name === 'Pronouns') : null
})

const vocabularySection = computed(() => {
  const lesson = currentLessonData.value
  return lesson ? lesson.sections.find(s => s.name === 'Vocabulary') : null
})

const estimatedTime = computed(() => {
  const lesson = currentLessonData.value
  if (!lesson) return ''
  const sectionCount = lesson.sections.length
  return `~${sectionCount * 5} mins`
})

const scenes = computed(() => {
  const lesson = currentLessonData.value
  if (!lesson) return ''
  let sceneCount = 0
  let lineCount = 0
  for (const section of lesson.sections) {
    if (section.type === 'dialogue' && 'scenes' in section.content) {
      const dialogue = section.content as { type: 'dialogue', scenes: { label: string, lines: { arabic: string }[] }[] }
      sceneCount += dialogue.scenes.length
      for (const scene of dialogue.scenes) {
        lineCount += scene.lines.length
      }
    }
  }
  if (sceneCount === 0 && lineCount === 0) return ''
  return `${sceneCount} Scenes • ${lineCount} Lines`
})

const currentSectionItems = computed(() => {
  const lesson = currentLessonData.value
  if (!lesson) return []
  const section = lesson.sections.find(s => s.name === activeSection.value)
  return section ? section.items : []
})

const audioModule = useAudioModule()
const ttsApi = useTtsApi()
const audioEl = ref<HTMLAudioElement | null>(null)
watch(audioEl, (el) => {
  audioModule.audioRef.value = el
})

async function _playText(text: string): Promise<void> {
  if (!text || !text.trim()) return
  await audioModule.dispose()
  // Reuse module-scope controller so abortAndCleanup can abort it.
  fetchController = new AbortController()
  fetchTimeoutId = setTimeout(() => fetchController!.abort(), 30_000)
  try {
    const blob = await ttsApi.synthesize({
      text: text.trim(),
      speaker: '',
      signal: fetchController!.signal
    })
    clearTimeout(fetchTimeoutId ?? undefined)
    fetchTimeoutId = null
    audioModule.load(blob)
    audioModule.isPlaying.value = true
    await audioModule.play()
  } catch (err: unknown) {
    clearTimeout(fetchTimeoutId ?? undefined)
    fetchTimeoutId = null
    if (err instanceof DOMException && err.name === 'AbortError') return
    console.error('TTS synthesis failed:', err)
  }
}

// -- Module-scope abort state for cleanup -----------------------------------
let fetchController: AbortController | null = null
let fetchTimeoutId: ReturnType<typeof setTimeout> | null = null
let cleanedUp = false

// -- Cleanup: aborts in-flight fetch, pauses/disposes audio, hides bar,
//    clears progress — all idempotent.
function abortAndCleanup(): void {
  if (cleanedUp) return
  cleanedUp = true

  // 1. Abort in-flight TTS fetch
  fetchController?.abort()
  clearTimeout(fetchTimeoutId ?? undefined)
  fetchController = null
  fetchTimeoutId = null

  // 2. Stop playback
  audioModule.pause()
  audioModule.dispose()
  audioModule.isPlaying.value = false

  lessonProgress.clearLessonProgress(lessonId.value)
  // 4. Reset the AbortController for the next _playText call.
  fetchController = null
  fetchTimeoutId = null
}

async function _handleAudioEnded(): Promise<void> {
  const total = totalLines.value
  if (total > 0) {
    const newCompleted = Math.min(1, total)
    if (newCompleted > completedLines) {
      completedLines = newCompleted
      const pct = (completedLines / totalLines.value) * 100
      lessonProgress.setLessonProgress(lessonId.value, pct, totalLines.value)
    }
  }
}

if (typeof onBeforeRouteLeave === 'function') {
  onBeforeRouteLeave((_to: unknown, _from: unknown, next: (go?: unknown) => void) => {
    abortAndCleanup()
    next()
  })
}

onUnmounted(() => {
  abortAndCleanup()
})
</script>

<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-950">
    <!-- Breadcrumbs -->
    <nav
      class="px-4 md:px-6 pt-4 pb-2"
      aria-label="Breadcrumb"
      data-testid="breadcrumbs"
    >
      <div class="max-w-7xl mx-auto">
        <ol class="flex items-center gap-2 text-sm">
          <li
            v-for="(crumb, idx) in breadcrumbs"
            :key="idx"
            class="flex items-center gap-2"
          >
            <NuxtLink
              v-if="crumb.to"
              :to="crumb.to"
              class="text-primary-600 dark:text-primary-400 hover:text-primary-700 transition"
            >
              {{ crumb.label }}
            </NuxtLink>
            <span
              v-else
              class="text-stone-800 dark:text-stone-200 font-medium"
            >
              {{ crumb.label }}
            </span>
            <svg
              v-if="idx < breadcrumbs.length - 1"
              class="w-4 h-4 text-stone-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </li>
        </ol>
      </div>
    </nav>

    <!-- Hero section -->
    <div
      class="px-4 md:px-6 pb-6"
      data-testid="lesson-hero"
    >
      <div class="max-w-7xl mx-auto">
        <h1 class="text-2xl md:text-3xl lg:text-4xl font-bold text-stone-800 dark:text-stone-100 mb-2">
          Lesson {{ currentLesson }}
        </h1>
        <LessonHero
          :level="currentLevel"
          :lesson-number="currentLesson"
          :arabic-title="currentLessonData?.arabicTitle"
          :estimated-time="estimatedTime"
          :scenes="scenes"
          :audio-type="'AI-Generated Audio'"
          :is-ready="true"
        />
      </div>
    </div>
    <!-- Section tabs -->
    <section
      class="px-4 md:px-6 pb-4"
      data-testid="section-tabs"
      @keydown="_handlePageKeydown"
    >
      <div class="max-w-7xl mx-auto">
        <div
          class="bg-stone-100 dark:bg-stone-800 rounded-xl p-1.5 flex flex-wrap gap-1"
          role="tablist"
        >
          <button
            v-for="tab in lessonTabs"
            :id="`tab-${tab}`"
            :key="tab"
            role="tab"
            :aria-selected="activeSection === tab"
            :aria-controls="`panel-${tab}`"
            :class="[
              'flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2',
              activeSection === tab
                ? 'bg-white dark:bg-stone-700 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            ]"
            @click="navigateToSection(tab)"
          >
            {{ tab }}
          </button>
        </div>
        <div v-if="pronounsSection && activeSection === 'Pronouns'">
          <LessonPronouns
            :section="pronounsSection"
            @play-pronoun="(index: number) => { /* TODO: wire audio */ }"
          />
        </div>
        <div v-if="vocabularySection && activeSection === 'Vocabulary'">
          <LessonVocabulary
            :section="vocabularySection"
            @play-word="(index: number) => { /* TODO: wire audio */ }"
          />
        </div>
        <div
          v-if="currentSectionItems.length > 0"
          class="space-y-4"
        >
          <div
            v-for="item in currentSectionItems"
            :key="item.id"
            class="card"
          >
            <div class="flex flex-col gap-2">
              <p
                class="text-lg font-arabic text-stone-800 dark:text-stone-100 text-right"
                dir="rtl"
              >
                {{ item.arabic }}
              </p>
              <p
                v-if="item.transliteration"
                class="text-sm text-stone-500 dark:text-stone-400 italic"
              >
                {{ item.transliteration }}
              </p>
              <p
                v-if="item.english"
                class="text-sm text-stone-600 dark:text-stone-300"
              >
                {{ item.english }}
              </p>
              <p
                v-if="item.notes"
                class="text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded p-2"
              >
                {{ item.notes }}
              </p>
            </div>
          </div>
        </div>
        <div
          v-else
          class="card"
        >
          <p class="text-stone-500 dark:text-stone-400">
            Content for "{{ activeSection }}" section coming soon.
          </p>
        </div>
      </div>
    </section>
    <StickyAudioBar
      :active="audioModule.isPlaying.value"
      :is-paused="audioModule.isPaused.value"
      :current-time="audioModule.currentTime.value"
      :duration="audioModule.duration.value"
      :shortcuts-enabled="true"
      @close="audioModule.dispose(); audioModule.isPlaying.value = false; audioModule.audioUrl.value = null"
      @toggle="audioModule.toggle()"
      @seek="(ratio: number) => audioModule.seek(ratio)"
      @speed-change="(speed: number) => { audioModule.isPlaying.value = false; }"
    />
    <audio
      ref="audioEl"
      data-testid="lesson-audio"
      preload="none"
      class="hidden"
      @ended="_handleAudioEnded()"
    />
  </div>
</template>
