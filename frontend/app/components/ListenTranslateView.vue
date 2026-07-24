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
      class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
    >
      <p class="text-xs font-sans text-gold/60 mb-2 font-medium">
        {{ scene.label }}
      </p>
      <div class="space-y-2">
        <div
          v-for="line in scene.lines"
          :key="line.speaker"
          class="text-ink"
        >
          <span class="font-semibold text-ink">{{ line.speaker }}:</span>
          <span
            class="font-arabic"
            dir="rtl"
          > {{ line.arabic }}</span>
          <span class="text-ink-dim text-xs"> — {{ line.english }}</span>
        </div>
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
      class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
    >
      <p
        class="font-arabic text-ink"
        dir="rtl"
      >
        {{ entry.arabic }}
      </p>
    </div>
  </div>
</template>
