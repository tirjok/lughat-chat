<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  competencies: string[]
  collapsed?: boolean
}

const _props = withDefaults(defineProps<Props>(), {
  collapsed: false
})

const emit = defineEmits<{
  'update:checked': [count: number]
  'update:collapsed': [collapsed: boolean]
}>()

const isCollapsed = ref(_props.collapsed)

const checkedCompetencies = ref<Set<string>>(new Set())

const checkedCount = computed(() => checkedCompetencies.value.size)

const totalCount = computed(() => _props.competencies.length)

const counterText = computed(() => {
  const n = totalCount.value
  const c = checkedCount.value
  if (n === 0) return 'No competencies'
  return `${c} of ${n} competencies`
})

function toggleCompetency(competency: string): void {
  const set = checkedCompetencies.value
  if (set.has(competency)) {
    set.delete(competency)
  } else {
    set.add(competency)
  }
  emit('update:checked', checkedCount.value)
}

function toggleCollapse(): void {
  isCollapsed.value = !isCollapsed.value
  emit('update:collapsed', isCollapsed.value)
}

// Emit initial count on mount
emit('update:checked', checkedCount.value)

// Watch for external changes to competencies prop
watch(() => _props.competencies, () => {
  emit('update:checked', checkedCount.value)
}, { deep: true })
</script>

<template>
  <div dir="rtl" class="rtl">
    <!-- Collapsible header -->
    <button
      data-testid="competencies-header"
      class="flex items-center gap-2 w-full text-right px-4 py-3 bg-white dark:bg-stone-800 rounded-t-xl border border-b-0 border-stone-200 dark:border-stone-700 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-750 transition"
      @click="toggleCollapse"
    >
      <span class="font-semibold text-stone-800 dark:text-stone-100 text-sm">
        Competencies
      </span>
      <span
        data-testid="competency-counter"
        class="text!-stone-500 dark:text!-stone-400 text-xs"
      >
        {{ counterText }}
      </span>
      <!-- Arrow icon (rotates on toggle) -->
      <svg
        :class="['w-4 h-4 text-stone-400 transition-transform duration-200', isCollapsed ? '' : 'rotate-180']"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Checkbox list body (hidden when collapsed) -->
    <div
      v-if="!isCollapsed"
      data-testid="competency-body"
      class="px-4 py-3 bg-stone-50 dark:bg-stone-900 rounded-b-xl border border-stone-200 dark:border-stone-700 space-y-2"
    >
      <label
        v-for="(competency, idx) in _props.competencies"
        :key="idx"
        data-testid="competency-label"
        class="flex items-start gap-3 p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="checkedCompetencies.has(competency)"
          class="mt-1 shrink-0 w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-primary-600 focus:ring-primary-500"
          @change="toggleCompetency(competency)"
        />
        <span class="text-sm text-stone-700 dark:text-stone-300">
          {{ competency }}
        </span>
      </label>
    </div>
  </div>
</template>
