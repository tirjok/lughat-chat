<script setup lang="ts">
import { computed } from 'vue'
import type { SectionDefinition } from '~/data/curriculum'

interface Props {
  section: SectionDefinition
}

const _props = defineProps<Props>()

interface GrammarTopic {
  name: string
  description: string
  examples: { arabic: string, english: string }[]
}

const grammarContent = computed(() => {
  const content = _props.section.content
  if (!content || content.type !== 'grammar') return null
  return content as { type: 'grammar', topics: GrammarTopic[] }
})

// Placeholder topics carry an empty name; they are filtered out so the section shows the coming-soon fallback.
const topicItems = computed(() => {
  const topics = grammarContent.value?.topics ?? []
  return topics.filter(topic => topic.name.trim() !== '')
})

// Feather icon paths: document, users, book.
const topicIconPaths = [
  'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01'
]

// Full literal strings so UnoCSS's static extraction generates the classes.
const topicColorClasses = [
  'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
]

function topicIcon(index: number): string {
  return topicIconPaths[index % topicIconPaths.length]!
}

function topicColor(index: number): string {
  return topicColorClasses[index % topicColorClasses.length]!
}
</script>

<template>
  <div class="space-y-6">
    <div
      v-if="topicItems.length > 0"
      data-testid="grammar-topics"
      class="space-y-6"
    >
      <div
        v-for="(topic, index) in topicItems"
        :key="index"
        :data-testid="`grammar-topic-card-${index}`"
        class="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-sm overflow-hidden"
      >
        <div
          :data-testid="`grammar-topic-header-${index}`"
          class="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center gap-3"
        >
          <div
            :data-testid="`grammar-topic-icon-${index}`"
            :class="['w-10 h-10 rounded-lg flex items-center justify-center', topicColor(index)]"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                :d="topicIcon(index)"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <h3
            :data-testid="`grammar-topic-name-${index}`"
            class="font-semibold text-stone-800 dark:text-stone-100"
          >
            {{ topic.name }}
          </h3>
        </div>
        <div class="p-6">
          <p
            :data-testid="`grammar-topic-description-${index}`"
            class="text-stone-700 dark:text-stone-300 leading-relaxed"
          >
            {{ topic.description }}
          </p>
          <div
            v-if="topic.examples.length > 0"
            :data-testid="`grammar-topic-examples-${index}`"
            class="mt-4 space-y-2"
          >
            <div
              v-for="(example, exIndex) in topic.examples"
              :key="exIndex"
              :data-testid="`grammar-example-row-${index}-${exIndex}`"
              class="flex flex-col sm:flex-row gap-2 sm:gap-4 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg"
            >
              <p
                :data-testid="`grammar-example-arabic-${index}-${exIndex}`"
                class="font-arabic text-xl text-stone-900 dark:text-stone-100 sm:flex-1"
                dir="rtl"
              >
                {{ example.arabic }}
              </p>
              <p
                :data-testid="`grammar-example-english-${index}-${exIndex}`"
                class="text-sm text-stone-600 dark:text-stone-300 sm:flex-1"
              >
                {{ example.english }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-else
      class="card"
    >
      <p
        data-testid="grammar-empty"
        class="text-stone-500 dark:text-stone-400"
      >
        Content coming soon.
      </p>
    </div>
  </div>
</template>
