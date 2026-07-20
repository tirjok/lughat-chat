<script setup lang="ts">
import type { DialogueScene, DialogueSceneFlat, ListenTranslateActivityContent } from '../composables/useLessons'

interface Props {
  /** The activity content for listen-translate type. */
  content: ListenTranslateActivityContent
}

const props = defineProps<Props>()

// ---------------------------------------------------------------------------
// Computed: structured dialogue (scenes with lines)
// ---------------------------------------------------------------------------

const structuredScenes = computed<DialogueScene[]>(() => {
  const dialogue = props.content.dialogue
  if (!dialogue) return []

  const entries = Object.values(dialogue)
  const hasLines = entries.some(e => 'lines' in e)
  if (hasLines) {
    return entries.map(flat => ({
      label: flat.label,
      lines: [
        {
          speaker: flat.label,
          arabic: (flat as DialogueSceneFlat).arabic ?? '',
          english: (flat as DialogueSceneFlat).english_expected ?? ''
        }
      ]
    }))
  }
  return []
})

// ---------------------------------------------------------------------------
// Computed: simple dialogue (arabic only, no structured lines)
// ---------------------------------------------------------------------------

const simpleEntries = computed<DialogueSceneFlat[]>(() => {
  const dialogue = props.content.dialogue
  if (!dialogue) return []

  const entries = Object.values(dialogue)
  const hasArabic = entries.some(e => 'arabic' in e)
  if (hasArabic) return entries as DialogueSceneFlat[]
  return []
})
</script>

<template>
  <!-- Structured dialogue (scenes with lines) -->
  <div
    v-if="structuredScenes.length > 0"
    class="space-y-3"
  >
    <div
      v-for="(scene, sceneIdx) in structuredScenes"
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

  <!-- Simple dialogue (arabic only) -->
  <div
    v-else-if="simpleEntries.length > 0"
    class="space-y-2"
  >
    <div
      v-for="entry in simpleEntries"
      :key="entry.arabic"
      class="p-2 rounded bg-gray-50 dark:bg-gray-700"
    >
      <p class="arabic-text text-gray-900 dark:text-white">
        {{ entry.arabic }}
      </p>
    </div>
  </div>
</template>
