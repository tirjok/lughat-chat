<script setup lang="ts">
import type { SectionDefinition } from '~/data/curriculum'

interface Props {
  section: SectionDefinition
  isAudioDisabled?: boolean
  malePatterns?: string[]
}

const _props = defineProps<Props>()

const emit = defineEmits<{
  playLine: [index: number]
  playScene: []
}>()

const dialogueContent = computed(() => {
  const content = _props.section.content
  if (!content || content.type !== 'dialogue') {
    return { scenes: [] }
  }
  return content
})

const sceneLabels = computed(() => dialogueContent.value.scenes.map(s => s.label))

const currentSceneIndex = ref(0)
const currentLineIndex = ref(0)
const lineCardsContainer = ref<HTMLElement | null>(null)

function selectScene(index: number): void {
  currentSceneIndex.value = index
  currentLineIndex.value = 0
}

function selectLine(_index: number): void {
  const container = lineCardsContainer.value
  if (!container) return
  const cards = container.querySelectorAll('[data-testid^="line-card-"]')
  const el = cards[currentLineIndex.value] as HTMLElement | null
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function playLine(index: number): void {
  selectLine(index)
  emit('playLine', index)
}

function playScene(): void {
  emit('playScene')
}

function getSpeakerGradient(speaker: string): string {
  const lower = speaker.toLowerCase()
  const patterns = _props.malePatterns
  if (patterns?.some(p => lower.includes(p.toLowerCase()))) return 'from-teal-700 to-teal-900'
  return 'from-stone-500 to-stone-700'
}

function handleTablistKeydown(event: KeyboardEvent): void {
  const key = event.key
  const multi = sceneLabels.value.length
  if (multi <= 1) return

  if (key === 'ArrowRight') {
    event.preventDefault()
    selectScene((currentSceneIndex.value + 1) % multi)
  } else if (key === 'ArrowLeft') {
    event.preventDefault()
    selectScene((currentSceneIndex.value - 1 + multi) % multi)
  } else if (key === 'Enter' || key === ' ') {
    event.preventDefault()
    const tablist = event.target as HTMLElement
    const target = tablist.id
    const match = target.match(/^scene-tab-(\d+)$/)
    if (match) selectScene(parseInt(match[1]!, 10))
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Scene Tabs -->
    <div
      v-if="sceneLabels.length > 1"
      class="flex gap-2 overflow-x-auto pb-2"
      data-testid="scene-tabs"
      role="tablist"
      :aria-activedescendant="`scene-tab-${currentSceneIndex}`"
      @keydown="handleTablistKeydown"
    >
      <button
        v-for="(label, index) in sceneLabels"
        :id="`scene-tab-${index}`"
        :key="index"
        :data-testid="`scene-tab`"
        :tabindex="index === currentSceneIndex ? '0' : '-1'"
        :class="[
          'px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
          index === currentSceneIndex
            ? 'bg-primary-700 text-white active'
            : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
        ]"
        :role="`tab`"
        :aria-selected="index === currentSceneIndex"
        @click="selectScene(index)"
      >
        {{ label }}
      </button>
    </div>

    <!-- No Dialogue Content Error State -->
    <p
      v-if="dialogueContent.scenes.length === 0"
      class="text-center py-8 text-stone-400"
    >
      No dialogue content for this lesson.
    </p>

    <!-- Line Cards -->
    <div
      ref="lineCardsContainer"
      class="space-y-3"
    >
      <div
        v-for="(line, lineIndex) in (dialogueContent.scenes[currentSceneIndex]?.lines ?? [])"
        :key="lineIndex"
      >
        <!-- Speaker Badge -->
        <div
          v-if="line.speaker"
          class="flex items-center gap-2"
        >
          <span
            :data-testid="`speaker-badge-${lineIndex}`"
            :class="`inline-block px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-br ${getSpeakerGradient(line.speaker)}`"
          >
            {{ line.speaker }}
          </span>
        </div>

        <!-- Line Card -->
        <div
          :data-testid="`line-card-${lineIndex}`"
          :class="[
            'rounded-xl border p-4 md:p-5 transition-all cursor-pointer',
            _props.isAudioDisabled
              ? 'opacity-40 cursor-not-allowed'
              : [lineIndex === currentLineIndex
                ? 'bg-gradient-to-l from-primary-100 to-primary-50 border-primary-300 dark:from-primary-900/40 dark:to-primary-800/30 dark:border-primary-600'
                : 'bg-white border-stone-200 dark:bg-stone-900 dark:border-stone-700']
          ]"
          @click="currentLineIndex = lineIndex"
        >
          <!-- Arabic Text (RTL) -->
          <p
            dir="rtl"
            class="font-arabic text-xl md:text-2xl text-stone-800 dark:text-stone-100 mb-2"
          >
            {{ line.arabic }}
          </p>

          <!-- English Translation -->
          <p class="text-sm text-stone-500 dark:text-stone-400 mb-2">
            {{ line.english }}
          </p>

          <!-- Teacher Note -->
          <p
            v-if="line.notes"
            class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-1.5 inline-block"
          >
            {{ line.notes }}
          </p>

          <!-- Play Button -->
          <button
            :data-testid="`play-line-${lineIndex}`"
            :disabled="_props.isAudioDisabled"
            class="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            :class="{ 'pointer-events-none': _props.isAudioDisabled }"
            aria-label="Play audio"
            @click.stop="playLine(lineIndex)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Play Scene Button -->
    <button
      v-if="(dialogueContent.scenes[currentSceneIndex]?.lines ?? []).length > 0"
      data-testid="play-scene"
      :disabled="_props.isAudioDisabled"
      :title="_props.isAudioDisabled ? 'Audio is currently disabled' : undefined"
      class="flex w-full items-center justify-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      @click="playScene"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-5 h-5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
      Play Scene
    </button>
  </div>
</template>
