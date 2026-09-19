<script setup lang="ts">
import { ref, watch, onUnmounted, computed, shallowRef } from 'vue'
import { useAudioModule } from '~/composables/common/useAudioModule'
import { useTtsApi } from '~/composables/common/useTtsApi'
import { getLessonById, type SectionDefinition } from '~/data/curriculum'
import { useLessonProgress } from '~/composables/lesson/useLessonProgress'
import { useBackendHealth } from '~/composables/studio/useBackendHealth'
import LessonDialogue from '~/components/lesson/LessonDialogue.vue'
import LessonVocabulary from '~/components/lesson/LessonVocabulary.vue'
import LessonPronouns from '~/components/lesson/LessonPronouns.vue'
import LessonExpressions from '~/components/lesson/LessonExpressions.vue'
import LessonGrammar from '~/components/lesson/LessonGrammar.vue'

const healthPoll = useBackendHealth()
const lessonProgress = useLessonProgress()
const isAudioDisabled = computed(() => healthPoll.status.value !== 'ready')
const lessonId = computed(() => lessonParam.value)
const totalLines = computed(() => {
  const lesson = currentLessonData.value
  if (!lesson) return 0
  return lesson.sections.flatMap(s => s.items).length
})

const completedLines = shallowRef(0)
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
  const lesson = getLessonById(lessonParam.value)
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

const fetchController = shallowRef<AbortController | null>(null)
const fetchTimeoutId = shallowRef<ReturnType<typeof setTimeout> | null>(null)
const cleanedUp = shallowRef(false)

function abortAndCleanup(): void {
  if (cleanedUp.value) return
  cleanedUp.value = true
  fetchController.value?.abort()
  clearTimeout(fetchTimeoutId.value ?? undefined)
  fetchController.value = null
  fetchTimeoutId.value = null
  audioModule.pause()
  audioModule.dispose()
  audioModule.isPlaying.value = false
  lessonProgress.clearLessonProgress(lessonId.value)
  fetchController.value = null
  cleanedUp.value = false
}

async function _playText(text: string): Promise<void> {
  if (!text || !text.trim()) return
  await audioModule.dispose()
  fetchController.value = new AbortController()
  fetchTimeoutId.value = setTimeout(() => fetchController.value!.abort(), 30_000)
  try {
    const blob = await ttsApi.synthesize({
      text: text.trim(),
      speaker: '',
      signal: fetchController.value!.signal
    })
    clearTimeout(fetchTimeoutId.value ?? undefined)
    fetchTimeoutId.value = null
    audioModule.load(blob)
    audioModule.isPlaying.value = true
    await audioModule.play()
  } catch (err: unknown) {
    clearTimeout(fetchTimeoutId.value ?? undefined)
    fetchTimeoutId.value = null
    if (err instanceof DOMException && err.name === 'AbortError') return
    console.error('TTS synthesis failed:', err)
  }
}

type RepeatMode = 'off' | 'one' | 'all'
const repeatedSectionIndex = shallowRef(0)
const currentText = shallowRef<string | null>(null)
const currentIndex = shallowRef(0)
const repeatMode = ref<RepeatMode>('off')

const handleSectionPlay = (sectionType: string, findResult: SectionDefinition | undefined, index: number): void => {
  if (!findResult) return
  const items = findResult.items
  if (items[index]?.arabic) {
    _playText(items[index].arabic)
  }
}

async function _handleAudioEnded(): Promise<void> {
  const total = totalLines.value
  if (total > 0) {
    const newCompleted = Math.min(1, total)
    if (newCompleted > completedLines.value) {
      completedLines.value = newCompleted
      lessonProgress.setLessonProgress(lessonId.value, (completedLines.value / totalLines.value) * 100, totalLines.value)
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
  const idx = currentIndex.value
  const items = currentSectionItems.value
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

async function handleDialoguePlayLine(lineIndex: number): Promise<void> {
  const dialogue = currentLessonData.value?.sections.find(s => s.type === 'dialogue')
  if (!dialogue) return
  const content = dialogue.content as { type: 'dialogue', scenes: { label: string, lines: { arabic: string }[] }[] }
  for (const scene of content.scenes) {
    if (lineIndex < scene.lines.length) {
      const arabic = scene.lines?.[lineIndex]?.arabic
      if (arabic) await _playText(arabic)
      return
    }
    lineIndex -= scene.lines.length
  }
}

async function handleDialoguePlayScene(): Promise<void> {
  const dialogue = currentLessonData.value?.sections.find(s => s.type === 'dialogue')
  if (!dialogue) return
  const content = dialogue.content as { type: 'dialogue', scenes: { label: string, lines: { arabic: string }[] }[] }
  for (const scene of content.scenes) {
    for (const line of scene.lines) {
      if (line.arabic) await _playText(line.arabic)
    }
  }
}

function handleVocabularyPlayWord(index: number): void {
  const vocab = currentLessonData.value?.sections.find(s => s.type === 'vocabulary')
  handleSectionPlay('vocabulary', vocab, index)
}

function handlePronounsPlay(index: number): void {
  const pron = currentLessonData.value?.sections.find(s => s.type === 'pronouns')
  handleSectionPlay('pronouns', pron, index)
}

function handleExpressionsPlay(index: number): void {
  if (!expressionsSection.value) return
  handleSectionPlay('expressions', expressionsSection.value, index)
}

onBeforeRouteLeave((_to, _from, next) => {
  abortAndCleanup()
  if (isMissingLevel.value) {
    router.push('/dashboard')
    next(false)
    return
  }
  repeatedSectionIndex.value = currentIndex.value
  currentText.value = currentSectionItems.value[repeatedSectionIndex.value]?.arabic || null
  next()
})

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
          v-if="activeSection === 'Dialogue' && currentLessonData?.sections.find(s => s.type === 'dialogue')"
          :key="`dialogue-${currentLesson}`"
        >
          <LessonDialogue
            :section="currentLessonData.sections.find(s => s.type === 'dialogue')!"
            :is-audio-disabled="isAudioDisabled"
            @play-line="handleDialoguePlayLine"
            @play-scene="handleDialoguePlayScene"
          />
        </div>
        <div
          v-if="activeSection === 'Vocabulary' && currentLessonData?.sections.find(s => s.type === 'vocabulary')"
          :key="`vocabulary-${currentLesson}`"
        >
          <LessonVocabulary
            :section="currentLessonData.sections.find(s => s.type === 'vocabulary')!"
            :is-audio-disabled="isAudioDisabled"
            @play-word="handleVocabularyPlayWord"
          />
        </div>
        <div
          v-if="activeSection === 'Pronouns' && currentLessonData?.sections.find(s => s.type === 'pronouns')"
          :key="`pronouns-${currentLesson}`"
        >
          <LessonPronouns
            :section="currentLessonData.sections.find(s => s.type === 'pronouns')!"
            :is-audio-disabled="isAudioDisabled"
            @play-pronoun="handlePronounsPlay"
          />
        </div>
        <div
          v-if="activeSection === 'Grammar' && currentLessonData?.sections.find(s => s.type === 'grammar')"
          :key="`grammar-${currentLesson}`"
        >
          <LessonGrammar
            :section="currentLessonData.sections.find(s => s.type === 'grammar')!"
          />
        </div>
        <div
          v-if="activeSection === 'Expressions' && expressionsSection"
          :key="`expressions-${currentLesson}`"
        >
          <LessonExpressions
            :section="expressionsSection"
            :is-audio-disabled="isAudioDisabled"
            @play-expression="handleExpressionsPlay"
          />
        </div>
        <div
          v-if="activeSection === 'Activities' && activitySection"
          :key="`activities-${currentLesson}`"
        >
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
