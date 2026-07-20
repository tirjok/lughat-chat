<script setup lang="ts">
import type { TranslateActivityContent } from '../composables/useLessons'

const { content } = defineProps<{
  /** The activity content for translate types. */
  content: TranslateActivityContent
  /** The activity type (translate-to-english or translate-to-arabic). */
  activityType: string
}>()

const sentences = computed(() => content.sentences)
</script>

<template>
  <div class="space-y-3">
    <!-- Sentence list -->
    <div
      v-for="(sentence, idx) in sentences"
      :key="idx"
      class="p-2 rounded bg-gray-50 dark:bg-gray-700"
    >
      <p
        v-if="sentence.arabic"
        class="arabic-text text-gray-900 dark:text-white"
      >
        {{ sentence.arabic }}
      </p>
      <p
        v-else
        class="text-gray-900 dark:text-white"
      >
        {{ sentence.english }}
      </p>
    </div>
  </div>
</template>
