<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SectionDefinition } from '~/data/curriculum'

interface Props {
  section: SectionDefinition
}

const _props = defineProps<Props>()

const emit = defineEmits<{
  playLine: [index: number]
  playScene: []
}>()

interface DialogueScene {
  label: string
  lines: DialogueLine[]
}

interface DialogueLine {
  speaker: string
  arabic: string
  english: string
  notes?: string
}

interface EmptyDialogue {
  scenes: DialogueScene[]
}

const dialogueContent = computed<EmptyDialogue>(() => {
  const content = _props.section.content
  if (!content || content.type !== 'dialogue') {
    return { scenes: [] }
  }
  return content as unknown as EmptyDialogue
})

const sceneLabels = computed(() => dialogueContent.value.scenes.map(s => s.label))

const currentSceneIndex = ref(0)

const currentScene = computed(() => dialogueContent.value.scenes[currentSceneIndex.value] ?? { label: '', lines: [] })

const currentLineIndex = ref(0)

function selectScene(index: number): void {
  currentSceneIndex.value = index
  currentLineIndex.value = 0
}

function playLine(index: number): void {
  emit('playLine', index)
}

function playScene(): void {
  emit('playScene')
}

function isMaleSpeaker(speaker: string): boolean {
  const maleNames = ['muhammad', 'ali', 'abraham', 'ibrahim', 'musa', 'moses', 'isa', 'jesus', 'umar', 'uthman', 'abu', 'ibn']
  return maleNames.some(name => speaker.toLowerCase().includes(name))
}

function getSpeakerGradient(speaker: string): string {
  return isMaleSpeaker(speaker)
    ? 'from-teal-700 to-teal-900'
    : 'from-pink-700 to-pink-900'
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
    >
      <button
        v-for="(label, index) in sceneLabels"
        :key="index"
        :data-testid="`scene-tab`"
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

    <!-- Line Cards -->
    <div
      v-for="(line, lineIndex) in currentScene.lines"
      :key="lineIndex"
      class="space-y-3"
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
          lineIndex === currentLineIndex
            ? 'bg-gradient-to-l from-primary-100 to-primary-50 border-primary-300 dark:from-primary-900/40 dark:to-primary-800/30 dark:border-primary-600'
            : 'bg-white border-stone-200 dark:bg-stone-900 dark:border-stone-700'
        ]"
        @click="currentLineIndex = lineIndex; playLine(lineIndex)"
      >
        <!-- Arabic Text (RTL) -->
        <p
          dir="rtl"
          class="font-arabic text-lg md:text-xl text-stone-800 dark:text-stone-100 mb-2"
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
          class="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
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

    <!-- Play Scene Button -->
    <button
      v-if="currentScene.lines.length > 0"
      data-testid="play-scene"
      class="w-full px-4 py-3 rounded-xl bg-primary-700 text-white font-semibold hover:bg-primary-800 transition-colors"
      @click="playScene"
    >
      Play Scene
    </button>

    <!-- Comparison Card -->
    <div
      v-if="dialogueContent.scenes.length > 1"
      data-testid="comparison-card"
      class="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-4 md:p-5"
    >
      <h3 class="!text-base font-semibold text-stone-700 dark:text-stone-200 mb-3">
        Key Differences Between Scenes
      </h3>
      <div class="space-y-2 text-sm text-stone-600 dark:text-stone-400">
        <p>
          <strong>Gender suffixes:</strong> Scene 1 uses male forms (أَخِي = my brother), Scene 2 uses female forms (أُخْتِي = my sister).
        </p>
        <p>
          <strong>Verb conjugation:</strong> حَالُكَ (male address) vs حَالُكِ (female address).
        </p>
        <p>
          <strong>Welcome phrases:</strong> مَرْحَبًا بِكَ فِي مَسْجِدِنَا (mosque) vs مَرْحَبًا بِكِ فِي بَيْتِنَا (house).
        </p>
      </div>
    </div>
  </div>
</template>
