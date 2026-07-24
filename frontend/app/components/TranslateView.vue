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
  <div class="space-y-2">
    <div
      v-for="(sentence, idx) in sentences"
      :key="idx"
      class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
    >
      <p
        v-if="sentence.arabic"
        class="font-arabic text-ink"
      >
        {{ sentence.arabic }}
      </p>
      <p
        v-else
        class="text-ink"
      >
        {{ sentence.english }}
      </p>
    </div>
  </div>
</template>
