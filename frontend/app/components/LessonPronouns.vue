<script setup lang="ts">
import { computed } from 'vue'
import type { SectionDefinition } from '~/data/curriculum'

interface Props {
  section: SectionDefinition
}

const _props = defineProps<Props>()

const emit = defineEmits<{
  playPronoun: [index: number]
}>()

const pronounsContent = computed(() => {
  const content = _props.section.content
  if (!content || content.type !== 'pronouns') return null
  return content as { type: 'pronouns', pronouns: { arabic: string, english: string, example: string }[] }
})

const pronounItems = computed(() => pronounsContent.value?.pronouns ?? [])

const legendItems = [
  { label: 'Male', color: '#3b82f6' },
  { label: 'Female', color: '#ec4899' },
  { label: 'Dual', color: '#10b981' },
  { label: 'Plural-M', color: '#f59e0b' },
  { label: 'Plural-F', color: '#8b5cf6' }
]

function playPronoun(index: number): void {
  emit('playPronoun', index)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Color-coded legend -->
    <div
      class="flex flex-wrap gap-3"
      aria-label="Pronoun gender categories"
    >
      <div
        v-for="legend in legendItems"
        :key="legend.label"
        :data-testid="`pronoun-legend-${legend.label.toLowerCase()}`"
        class="flex items-center gap-2 text-sm font-medium"
      >
        <span
          :style="{ backgroundColor: legend.color }"
          class="inline-block w-3 h-3 rounded-full"
        />
        <span class="text-stone-600 dark:text-stone-300">
          {{ legend.label }}
        </span>
      </div>
    </div>

    <!-- Pronoun cards -->
    <div
      v-if="pronounItems.length > 0"
      data-testid="pronouns-grid"
      class="grid grid-cols-2 gap-4"
    >
      <div
        v-for="(pronoun, index) in pronounItems"
        :key="index"
        :data-testid="`pronoun-card-${index}`"
        class="card space-y-3"
      >
        <p
          data-testid="pronoun-arabic"
          class="font-arabic text-2xl text-stone-800 dark:text-stone-100 text-right"
          dir="rtl"
        >
          {{ pronoun.arabic }}
        </p>
        <p
          data-testid="pronoun-english"
          class="text-sm text-stone-600 dark:text-stone-300"
        >
          {{ pronoun.english }}
        </p>
        <div class="border-t border-stone-200 dark:border-stone-700 pt-2 mt-2">
          <p
            data-testid="pronoun-example"
            class="text-xs text-primary-600 dark:text-primary-400 font-arabic"
            dir="rtl"
          >
            {{ pronoun.example }}
          </p>
        </div>
        <button
          :data-testid="`play-pronoun-${index}`"
          class="mt-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          aria-label="Play audio"
          @click="playPronoun(index)"
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
    <div
      v-else
      class="card"
    >
      <p class="text-stone-500 dark:text-stone-400">
        Content coming soon.
      </p>
    </div>
  </div>
</template>
