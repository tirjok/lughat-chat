<script setup lang="ts">
import type { RolePlayActivityContent } from '../composables/useLessons'

const { content } = defineProps<{
  /** The activity content for role-play type. */
  content: RolePlayActivityContent
}>()
</script>

<template>
  <div class="space-y-3">
    <p class="text-ink">
      {{ content.scenario }}
    </p>
    <ul class="space-y-1.5">
      <li
        v-for="element in content.expected_elements"
        :key="element"
        class="text-sm text-ink-dim/70 flex items-center gap-2"
      >
        <span class="text-gold/60">•</span> {{ element }}
      </li>
    </ul>
  </div>
</template>
