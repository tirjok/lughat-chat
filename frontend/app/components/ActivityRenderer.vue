<script setup lang="ts">
import type {
  DialogueScene,
  DialogueSceneFlat,
  IntroduceCharactersActivityContent,
  ListenTranslateActivityContent,
  RolePlayActivityContent,
  TranslateActivityContent
} from '../composables/useLessons'

interface Props {
  activity: import('../composables/useLessons').Activity
  lessonId: number
  activityIndex?: number
}

const props = defineProps<Props>()

// --- Type guard: is this content a ListenTranslateActivityContent? ---
function isListenTranslateContent(
  content: unknown
): content is ListenTranslateActivityContent {
  return (
    content !== null
    && typeof content === 'object'
    && 'dialogue' in content
  )
}

// --- Type guard: is this content a TranslateActivityContent? ---
function isTranslateContent(
  content: unknown
): content is TranslateActivityContent {
  return (
    content !== null
    && typeof content === 'object'
    && 'sentences' in content
  )
}

// --- Type guard: is this content an IntroduceCharactersActivityContent? ---
function isIntroduceCharactersContent(
  content: unknown
): content is IntroduceCharactersActivityContent {
  return (
    content !== null
    && typeof content === 'object'
    && 'characters' in content
  )
}

// --- Type guard: is this content a RolePlayActivityContent? ---
function isRolePlayContent(
  content: unknown
): content is RolePlayActivityContent {
  return (
    content !== null
    && typeof content === 'object'
    && 'scenario' in content
  )
}

// --- Computed properties (type-safe narrowing via activity.type) ---

const activityType = computed<string>(() => props.activity.type)

// Dialogue scenes for listen-translate (structured: scenes with lines)
const dialogueScenes = computed<DialogueScene[]>(() => {
  if (props.activity.type !== 'listen-translate') return []
  const content = props.activity.content
  if (!isListenTranslateContent(content)) return []
  const dialogue = content.dialogue
  if (!dialogue) return []
  // Convert Record<string, DialogueSceneFlat> → DialogueScene[]
  return Object.values(dialogue).map(flat => ({
    label: flat.label,
    lines: [
      {
        speaker: flat.label,
        arabic: flat.arabic,
        english: flat.english_expected ?? ''
      }
    ]
  }))
})

// Simple dialogues for listen-translate (flat: { arabic: '...' })
const simpleDialogues = computed<DialogueSceneFlat[]>(() => {
  if (props.activity.type !== 'listen-translate') return []
  const content = props.activity.content
  if (!isListenTranslateContent(content)) return []
  const dialogue = content.dialogue
  if (!dialogue) return []
  const entries = Object.values(dialogue)
  // Check if entries have 'arabic' directly (simple format)
  const hasArabic = entries.some(e => 'arabic' in e)
  if (hasArabic) return entries as DialogueSceneFlat[]
  return []
})

// Sentences for translate activities
const sentences = computed(() => {
  const type = props.activity.type
  if (type === 'translate-to-english' || type === 'translate-to-arabic') {
    const content = props.activity.content
    if (isTranslateContent(content)) return content.sentences
  }
  return []
})

// Characters for introduce-characters
const characters = computed(() => {
  if (props.activity.type === 'introduce-characters') {
    const content = props.activity.content
    if (isIntroduceCharactersContent(content)) return content.characters
  }
  return []
})

// Role-play content (narrowed)
const rolePlayContent = computed<RolePlayActivityContent | undefined>(() => {
  if (props.activity.type === 'role-play') {
    const content = props.activity.content
    if (isRolePlayContent(content)) return content
  }
  return undefined
})

// Section content for SectionRenderer (narrowed)
const sectionContent = computed<LessonSection | null>(() => {
  const type = props.activity.type
  if (type === 'listen-translate') {
    const content = props.activity.content
    if (!isListenTranslateContent(content)) return null
    const c = content.dialogue
    if (!c) return null
    const entries = Object.values(c)
    const hasLines = entries.some(e => 'lines' in e)
    if (hasLines) {
      // Build a pseudo-section for SectionRenderer
      const scenes = Object.values(c).map(flat => ({
        label: flat.label,
        lines: [
          {
            speaker: flat.label,
            arabic: flat.arabic,
            english: flat.english_expected ?? ''
          }
        ]
      }))
      return { type: 'dialogue', title: '', content: { type: 'dialogue', scenes } } as LessonSection
    }
  }
  return null
})
</script>

<template>
  <div
    class="activity-renderer card"
    dir="rtl"
  >
    <!-- Activity header -->
    <div class="flex-between mb-3">
      <h3 class="font-semibold text-gray-900 dark:text-white">
        {{ activity.title }}
      </h3>
    </div>

    <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
      {{ activity.description }}
    </p>

    <!-- SectionRenderer for dialogue sections -->
    <SectionRenderer
      v-if="sectionContent"
      :section="sectionContent!"
      :lesson-id="lessonId"
    />

    <!-- Listen-Translate: Simple dialogue (arabic only) -->
    <div
      v-else-if="activityType === 'listen-translate' && simpleDialogues.length > 0"
      class="space-y-2"
    >
      <div
        v-for="(entry, idx) in simpleDialogues"
        :key="idx"
        class="p-2 rounded bg-gray-50 dark:bg-gray-700"
      >
        <p class="arabic-text text-gray-900 dark:text-white">
          {{ entry.arabic }}
        </p>
      </div>
    </div>

    <!-- Listen-Translate: Structured dialogue (scenes with lines) -->
    <div
      v-else-if="activityType === 'listen-translate'"
      class="space-y-3"
    >
      <div
        v-for="(scene, sceneIdx) in dialogueScenes"
        :key="sceneIdx"
        class="p-3 rounded bg-gray-50 dark:bg-gray-700"
      >
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ scene.label }}
        </p>
        <div class="space-y-1">
          <p
            v-for="line in scene.lines"
            :key="line.speaker"
            class="text-gray-900 dark:text-white"
          >
            <span class="font-medium">{{ line.speaker }}:</span>
            <span class="arabic-text">{{ line.arabic }}</span>
            <span class="english-text text-gray-500 dark:text-gray-400">
              — {{ line.english }}
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- Translate-to-English: Arabic sentences -->
    <div
      v-else-if="activityType === 'translate-to-english'"
      class="space-y-2"
    >
      <div
        v-for="(sentence, idx) in sentences"
        :key="idx"
        class="p-2 rounded bg-gray-50 dark:bg-gray-700"
      >
        <p class="arabic-text text-gray-900 dark:text-white">
          {{ sentence.arabic }}
        </p>
      </div>
    </div>

    <!-- Translate-to-Arabic: English sentences -->
    <div
      v-else-if="activityType === 'translate-to-arabic'"
      class="space-y-2"
    >
      <div
        v-for="(sentence, idx) in sentences"
        :key="idx"
        class="p-2 rounded bg-gray-50 dark:bg-gray-700"
      >
        <p class="text-gray-900 dark:text-white">
          {{ sentence.english }}
        </p>
      </div>
    </div>

    <!-- Introduce-Characters: Character list -->
    <div
      v-else-if="activityType === 'introduce-characters'"
      class="space-y-2"
    >
      <div
        v-for="(character, idx) in characters"
        :key="idx"
        class="p-3 rounded bg-gray-50 dark:bg-gray-700"
      >
        <p class="font-medium text-gray-900 dark:text-white">
          {{ character.name }}
          <span class="text-sm text-gray-500 dark:text-gray-400">
            ({{ character.arabic }})
          </span>
        </p>
      </div>
    </div>

    <!-- Role-Play: Scenario -->
    <div
      v-else-if="activityType === 'role-play'"
      class="space-y-2"
    >
      <p class="text-gray-900 dark:text-white">
        {{ rolePlayContent?.scenario }}
      </p>
      <ul class="space-y-1">
        <li
          v-for="(element, idx) in rolePlayContent?.expected_elements"
          :key="idx"
          class="text-sm text-gray-600 dark:text-gray-400"
        >
          • {{ element }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.arabic-text {
  font-family: 'Cairo', sans-serif;
  font-size: 1.1em;
  direction: rtl;
}

.english-text {
  font-size: 0.9em;
}
</style>
