<script setup lang="ts">
import { computed } from 'vue'
import type { SectionDefinition } from '~/data/curriculum'

interface Props {
  section: SectionDefinition
}

const _props = defineProps<Props>()

const emit = defineEmits<{
  playWord: [index: number]
}>()

interface VocabularyCategory {
  label: string
  words: { arabic: string, english: string, singular?: string, plural?: string }[]
}

interface EmptyVocabulary {
  categories: VocabularyCategory[]
}

const vocabularyContent = computed<EmptyVocabulary>(() => {
  const content = _props.section.content
  if (!content || content.type !== 'vocabulary') {
    return { categories: [] }
  }
  return content as unknown as EmptyVocabulary
})

const categoryOffsets = computed(() => {
  const offsets: number[] = []
  let offset = 0
  for (const cat of vocabularyContent.value.categories) {
    offsets.push(offset)
    offset += cat.words.length
  }
  return offsets
})

function playWord(index: number): void {
  emit('playWord', index)
}
</script>

<template>
  <div class="space-y-6">
    <div
      v-for="(category, catIndex) in vocabularyContent.categories"
      :key="catIndex"
    >
      <h3
        data-testid="vocab-category-header"
        class="text-base font-semibold text-stone-700 dark:text-stone-200 mb-3"
      >
        {{ category.label }}
      </h3>

      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-stone-200 dark:border-stone-700">
            <th class="text-right pb-2 pr-4 font-semibold text-stone-600 dark:text-stone-300">
              Arabic
            </th>
            <th class="text-left pb-2 pr-4 font-semibold text-stone-600 dark:text-stone-300">
              English
            </th>
            <th
              v-if="category.words.some(w => w.singular !== undefined)"
              class="text-center pb-2 pr-4 font-semibold text-stone-600 dark:text-stone-300"
            >
              Singular
            </th>
            <th
              v-if="category.words.some(w => w.plural !== undefined)"
              class="text-center pb-2 font-semibold text-stone-600 dark:text-stone-300"
            >
              Plural
            </th>
            <th class="pb-2 w-10" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(word, localIndex) in category.words"
            :key="localIndex"
            class="border-b border-stone-100 dark:border-stone-800"
          >
            <td
              data-testid="vocab-arabic-cell"
              class="text-right pr-4 py-2 font-arabic text-lg text-stone-800 dark:text-stone-100"
              dir="rtl"
            >
              {{ word.arabic }}
            </td>
            <td
              data-testid="vocab-english-cell"
              class="text-left pr-4 py-2 text-stone-600 dark:text-stone-300"
            >
              {{ word.english }}
            </td>
            <td
              v-if="word.singular !== undefined"
              data-testid="vocab-singular-cell"
              class="text-center pr-4 py-2 font-arabic text-stone-600 dark:text-stone-300"
              dir="rtl"
            >
              {{ word.singular }}
            </td>
            <td
              v-if="word.plural !== undefined"
              data-testid="vocab-plural-cell"
              class="text-center py-2 font-arabic text-stone-600 dark:text-stone-300"
              dir="rtl"
            >
              {{ word.plural }}
            </td>
            <td class="py-2">
              <button
                :data-testid="`play-word-${categoryOffsets[catIndex]! + localIndex}`"
                class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                aria-label="Play audio"
                @click="playWord(categoryOffsets[catIndex]! + localIndex)"
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
