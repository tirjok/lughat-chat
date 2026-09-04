<script setup lang="ts">
import { computed } from 'vue'
import type { SectionDefinition } from '~/data/curriculum'

interface Props {
  section: SectionDefinition
}

const _props = defineProps<Props>()

const emit = defineEmits<{
  playExpression: [index: number]
}>()

const expressionsContent = computed(() => {
  const content = _props.section.content
  if (!content || content.type !== 'expressions') return null
  /* eslint-disable @stylistic/member-delimiter-style */
  return content as { type: 'expressions'; expressions: { arabic: string; english: string }[] }
})

const expressionItems = computed(() => expressionsContent.value?.expressions ?? [])

function playExpression(index: number): void {
  emit('playExpression', index)
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="expressionItems.length > 0"
      data-testid="expressions-grid"
      class="grid grid-cols-2 gap-4"
    >
      <div
        v-for="(expression, index) in expressionItems"
        :key="index"
        :data-testid="`expression-card-${index}`"
        class="card space-y-3"
      >
        <p
          data-testid="expression-arabic"
          class="font-arabic text-2xl text-stone-800 dark:text-stone-100 text-right"
          dir="rtl"
        >
          {{ expression.arabic }}
        </p>
        <p
          data-testid="expression-english"
          class="text-sm text-stone-600 dark:text-stone-300"
        >
          {{ expression.english }}
        </p>
        <button
          :data-testid="`play-expression-${index}`"
          class="mt-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          aria-label="Play audio"
          @click="playExpression(index)"
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
