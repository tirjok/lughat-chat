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
    <ul class="space-y-1">
      <li
        v-for="element in content.expected_elements"
        :key="element"
        class="text-sm text-ink-dim"
      >
        <span class="text-gold">•</span> {{ element }}
      </li>
    </ul>
  </div>
</template>
