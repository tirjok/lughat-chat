<script setup lang="ts">
import type { IntroduceCharactersActivityContent } from '../composables/useLessons'

const { content } = defineProps<{
  /** The activity content for introduce-characters type. */
  content: IntroduceCharactersActivityContent
}>()
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(character, idx) in content.characters"
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
</template>
