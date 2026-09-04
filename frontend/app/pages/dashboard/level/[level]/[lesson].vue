<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAudioModule } from '~/composables/common/useAudioModule'
import { useTtsApi } from '~/composables/common/useTtsApi'
import { getLessonById } from '~/data/curriculum'
import { useLessonProgress } from '~/composables/lesson/useLessonProgress'

import LessonActivities from '~/components/lesson/LessonActivities.vue'

const lessonProgress = useLessonProgress()
const lessonId = computed(() => levelParam.value.toLowerCase() + '-' + lessonParam.value.padStart(2, '0'))
const totalLines = computed(() => {
  const lesson = currentLessonData.value
  if (!lesson) return 0
  return lesson.sections.flatMap(s => s.items).length
})

let completedLines = 0
const route = useRoute()
const router = useRouter()
const levelParam = computed(() => (route.params.level as string) || '')
const lessonParam = computed(() => (route.params.lesson as string) || '')
const isMissingLevel = computed(() => {
  return (
    route.path.startsWith('/dashboard/level/')
    && !levelParam.value
  )
})
const levelRoute = computed(() => `/dashboard/level/${currentLevel.value.toLowerCase()}`)
const currentLevel = computed(() => levelParam.value || 'A1')
const currentLesson = computed(() => lessonParam.value || '1')

const breadcrumbs = computed(() => [
  { label: 'Dashboard', to: '/dashboard' },
  { label: `Level ${currentLevel.value}`, to: levelRoute.value },
  { label: `Lesson ${currentLesson.value}`, to: undefined }
])

const sectionTabs = computed(() => {
  const lesson = currentLessonData.value
  return lesson ? lesson.sections.map(s => s.name).filter((n): n is string => n != null) : ['Dialogue', 'Vocabulary', 'Pronouns', 'Expressions', 'Grammar', 'Activities']
})
const activeSection = shallowRef<string | undefined>('Dialogue')
const currentLessonData = computed(() => {
  const lesson = getLessonById(levelParam.value.toLowerCase() + '-' + lessonParam.value.padStart(2, '0'))
  return lesson
})

const expressionsSection = computed(() => {
  const lesson = currentLessonData.value
  if (!lesson) return null
  return lesson.sections.find(s => s.type === 'expressions')
})

const activitySection = computed(() => {
  const lesson = currentLessonData.value
  if (!lesson) return null
  return lesson.sections.find(s => s.type === 'activity')
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
  const _section = lesson.sections.find(s => s.name === activeSection.value)
  return _section ? _section.items : []
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
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)
  try {
    const blob = await ttsApi.synthesize({
      text: text.trim(),
      speaker: '',
      speed: 1.0,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    audioModule.load(blob)
    await audioModule.play()
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') return
    audioModule.error.value = err instanceof Error ? err.message : 'Unknown error'
    console.error('TTS synthesis failed:', err)
  }
}

type RepeatMode = 'off' | 'one' | 'all'
const repeatedSectionIndex = shallowRef(0)
const currentText = shallowRef<string | null>(null)
const currentIndex = shallowRef(0)
const repeatMode = ref<RepeatMode>('off')
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

  if (repeatMode.value === 'off') return
  const items2 = currentSectionItems.value
  const idx = currentIndex.value
  if (repeatMode.value === 'one') {
    const item = items2[idx]
    if (item?.arabic) {
      await _playText(item.arabic)
    }
  } else {
    const nextItem = items2[idx + 1]
    if (nextItem?.arabic) {
      await _playText(nextItem.arabic)
    }
  }
}

async function handleTrackPrev(): Promise<void> {
  const items = currentSectionItems.value
  const idx = currentIndex.value
  const prevItem = items[idx - 1]
  if (prevItem?.arabic) {
    await _playText(prevItem.arabic)
  }
}

async function handleTrackNext(): Promise<void> {
  const items = currentSectionItems.value
  const idx = currentIndex.value
  const nextItem = items[idx + 1]
  if (nextItem?.arabic) {
    await _playText(nextItem.arabic)
  }
}

async function handleSpeedChange(_speed: number): Promise<void> {
  const items = currentSectionItems.value
  const idx = currentIndex.value
  const item = items[idx]
  if (item?.arabic) {
    await _playText(item.arabic)
  }
}

function handleRepeatChange(mode: RepeatMode): void {
  repeatMode.value = mode
}

onBeforeRouteLeave((_to: unknown, _from: unknown, next: (go?: unknown) => void) => {
  if (isMissingLevel.value) {
    router.push('/dashboard')
    next(false)
    return
  }
  repeatedSectionIndex.value = currentIndex.value
  currentText.value = currentSectionItems.value[repeatedSectionIndex.value]?.arabic || null
  next()
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
    >
      <div class="max-w-7xl mx-auto">
        <div
          class="bg-stone-100 dark:bg-stone-800 rounded-xl p-1.5 flex flex-wrap gap-1"
          role="tablist"
        >
          <button
            v-for="tab in sectionTabs"
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
            @click="activeSection = tab"
          >
            {{ tab }}
          </button>
        </div>
        <div
          v-if="activeSection === 'Expressions' && expressionsSection"
          :key="`expressions-${currentLesson}`"
        >
          <LessonExpressions :section="expressionsSection" />
        </div>
        <div
          v-if="activeSection === 'Activities' && activitySection"
          :key="`activities-${currentLesson}`"
        >
          <LessonActivities :section="activitySection" />
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
      :current-text="currentText"
      :repeat-mode="repeatMode"
      :repeated-section-index="repeatedSectionIndex"
      @close="audioModule.dispose(); audioModule.isPlaying.value = false; audioModule.audioUrl.value = null"
      @toggle="audioModule.toggle()"
      @seek="(ratio: number) => audioModule.seek(ratio)"
      @speed-change="(speed: number) => handleSpeedChange(speed)"
      @prev-track="handleTrackPrev()"
      @next-track="handleTrackNext()"
      @download="audioModule.download()"
      @repeat-change="(mode: RepeatMode) => handleRepeatChange(mode)"
    />
    <audio
      ref="audioEl"
      data-testid="lesson-audio"
      preload="none"
      @ended="_handleAudioEnded()"
    />
  </div>
</template>
