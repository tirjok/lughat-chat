<template>
  <div
    class="section-card mb-6"
    :data-section-type="section.type"
  >
    <h3 class="section-title text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
      {{ section.title }}
    </h3>

    <!-- Dialogue Section -->
    <div
      v-if="section.type === 'dialogue'"
      class="dialogue-content"
    >
      <div
        v-for="scene in (section.content as { scenes?: Array<{ label?: string; lines?: Array<{ speaker?: string; arabic?: string; english?: string }> }> })?.scenes"
        :key="scene.label"
        class="scene mb-4"
      >
        <p class="scene-label text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          {{ scene.label }}
        </p>
        <div
          v-for="line in scene.lines"
          :key="line.speaker"
          class="line flex gap-3 items-start mb-2"
          dir="rtl"
        >
          <span class="speaker font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{{ line.speaker }}:</span>
          <div class="flex-1 space-y-1">
            <span
              class="arabic-text text-lg"
              dir="rtl"
            >{{ line.arabic }}</span>
            <span class="english-text text-sm text-gray-500 dark:text-gray-400">{{ line.english }}</span>
            <button
              v-if="line.arabic"
              class="tts-btn text-sm px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              :data-tts-text="line.arabic"
              @click="handleTTS(line.arabic)"
            >
              🔊 Listen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vocabulary Section -->
    <div
      v-else-if="section.type === 'vocabulary'"
      class="vocabulary-content"
    >
      <div
        v-for="category in (section.content as { categories?: Array<{ label?: string; words?: Array<{ arabic?: string; english?: string; plural?: string }> }> })?.categories"
        :key="category.label"
        class="vocab-category mb-4"
      >
        <h4 class="font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {{ category.label }}
        </h4>
        <div
          v-for="word in category.words"
          :key="word.arabic"
          class="vocab-word flex gap-3 items-center mb-2"
          dir="rtl"
        >
          <span class="arabic text-lg font-medium">{{ word.arabic }}</span>
          <span class="english text-sm text-gray-500 dark:text-gray-400">{{ word.english }}</span>
          <span
            v-if="word.plural"
            class="text-xs text-gray-400 dark:text-gray-500"
          >pl: {{ word.plural }}</span>
          <button
            class="tts-btn text-sm px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
            :data-tts-text="word.arabic"
            @click="handleTTS(word.arabic!)"
          >
            🔊
          </button>
        </div>
      </div>
    </div>

    <!-- Pronouns Section -->
    <div
      v-else-if="section.type === 'pronouns'"
      class="pronouns-content"
    >
      <table class="pronoun-table w-full border-collapse">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-2 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
              Arabic
            </th>
            <th class="text-left py-2 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
              English
            </th>
            <th class="text-left py-2 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
              Example
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="pronoun in (section.content as { pronouns?: Array<{ arabic?: string; english?: string; example?: string }> })?.pronouns"
            :key="pronoun.arabic"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td
              class="py-2 px-4 arabic-text"
              dir="rtl"
            >
              {{ pronoun.arabic }}
            </td>
            <td class="py-2 px-4">
              {{ pronoun.english }}
            </td>
            <td
              class="py-2 px-4 arabic-text"
              dir="rtl"
            >
              {{ pronoun.example }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Expressions Section -->
    <div
      v-else-if="section.type === 'expressions'"
      class="expressions-content"
    >
      <div
        v-for="expr in (section.content as { expressions?: Array<{ arabic?: string; english?: string }> })?.expressions"
        :key="expr.arabic"
        class="expression flex gap-3 items-center mb-2"
        dir="rtl"
      >
        <span class="arabic text-lg font-medium">{{ expr.arabic }}</span>
        <span class="english text-sm text-gray-500 dark:text-gray-400">{{ expr.english }}</span>
        <button
          class="tts-btn text-sm px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          :data-tts-text="expr.arabic"
          @click="handleTTS(expr.arabic!)"
        >
          🔊
        </button>
      </div>
    </div>

    <!-- Grammar Section -->
    <div
      v-else-if="section.type === 'grammar'"
      class="grammar-content"
    >
      <div
        v-for="topic in (section.content as { topics?: Array<{ name?: string; description?: string; examples?: Array<{ arabic?: string; english?: string }> }> })?.topics"
        :key="topic.name"
        class="grammar-topic mb-4"
      >
        <h4 class="font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {{ topic.name }}
        </h4>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {{ topic.description }}
        </p>
        <div
          v-for="ex in topic.examples"
          :key="ex.arabic"
          class="grammar-example flex gap-3 items-center mb-1"
          dir="rtl"
        >
          <span class="arabic text-lg font-medium">{{ ex.arabic }}</span>
          <span class="english text-sm text-gray-500 dark:text-gray-400">{{ ex.english }}</span>
          <button
            class="tts-btn text-sm px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
            :data-tts-text="ex.arabic"
            @click="handleTTS(ex.arabic!)"
          >
            🔊
          </button>
        </div>
      </div>
    </div>

    <!-- Unknown Section Type -->
    <div
      v-else
      class="unknown-section"
    >
      <p class="text-red-500 dark:text-red-400">
        Unknown section type: {{ section.type }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SectionContent {
  scenes?: Array<{
    label?: string
    lines?: Array<{
      speaker?: string
      arabic?: string
      english?: string
    }>
  }>
  categories?: Array<{
    label?: string
    words?: Array<{
      arabic?: string
      english?: string
      plural?: string
    }>
  }>
  pronouns?: Array<{
    arabic?: string
    english?: string
    example?: string
  }>
  expressions?: Array<{
    arabic?: string
    english?: string
  }>
  topics?: Array<{
    name?: string
    description?: string
    examples?: Array<{
      arabic?: string
      english?: string
    }>
  }>
}

interface SectionRendererProps {
  section: {
    type?: string
    title?: string
    content?: SectionContent | Record<string, unknown>
  }
  lessonId: number
}

defineProps<SectionRendererProps>()

const { synthesize } = useTtsApi()

function handleTTS(text: string) {
  synthesize({ text })
}
</script>
