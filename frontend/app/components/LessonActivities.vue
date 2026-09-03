<script setup lang="ts">
import type { SectionDefinition } from '~/data/curriculum'

const { section } = defineProps<{ section: SectionDefinition }>()
</script>

<template>
  <div class="card">
    <p
      data-testid="coming-soon-message"
      class="text-stone-500 dark:text-stone-400"
      dir="rtl"
    >
      Content for "{{ section.name }}" section coming soon.
    </p>
  </div>
</template>
