<script setup lang="ts">
import type { IntroduceCharactersActivityContent } from '../composables/useLessons'

const { content } = defineProps<{
  /** The activity content for introduce-characters type. */
  content: IntroduceCharactersActivityContent
}>()
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(character, idx) in content.characters"
      :key="idx"
      class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
    >
      <p class="font-arabic text-ink">
        {{ character.arabic }}
      </p>
      <p class="text-sm text-ink-dim">
        {{ character.name }}
      </p>
    </div>
  </div>
</template>
