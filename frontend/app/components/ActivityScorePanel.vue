<script setup lang="ts">
import type { SubmissionResult } from '../composables/useActivitySubmission'

interface Props {
  /** The submission result (nullable when no result yet). */
  result: SubmissionResult | null
  /** Maximum number of attempts (for remaining display). */
  maxAttempts: number
  /** Whether the activity is marked complete. */
  isComplete: boolean
  /** Whether the lesson was just completed. */
  lessonJustCompleted: boolean
  /** Total number of activities in the lesson (for "more" check). */
  totalActivities?: number
  /** Current activity index (for "more" check). */
  activityIndex?: number
}

interface Emits {
  (e: 'next-activity' | 'complete-lesson' | 'retry'): void
}

const props = withDefaults(defineProps<Props>(), {
  totalActivities: undefined,
  activityIndex: undefined
})

const emit = defineEmits<Emits>()

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

const score = computed(() => props.result?.score ?? 0)
const feedback = computed(() => props.result?.feedback ?? '')
const attemptsRemaining = computed(() => props.result?.attempts_remaining ?? props.maxAttempts)
const correctAnswer = computed(() => props.result?.correct_answer)
const lessonJustCompleted = computed(() => props.result?.lesson_just_completed ?? false)

const hasMoreActivities = computed(() => {
  if (props.activityIndex === undefined || props.totalActivities === undefined) return false
  return props.activityIndex < props.totalActivities - 1
})

// Score bar color class
const scoreColorClass = computed(() =>
  score.value >= 0.7 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
)

const barColorClass = computed(() =>
  score.value >= 0.7 ? 'bg-green-500' : 'bg-red-500'
)
</script>

<template>
  <div class="mt-4 p-4 rounded-lg bg-studio-800 border border-white/[0.04]">
    <!-- Score Header -->
    <div class="flex-between mb-3">
      <span class="text-sm font-semibold text-ink">Score</span>
      <span
        class="text-2xl font-bold"
        :class="scoreColorClass"
      >
        {{ (score * 100).toFixed(0) }}%
      </span>
    </div>

    <!-- Score Bar -->
    <div class="h-2 rounded-full bg-studio-700 overflow-hidden mb-3">
      <div
        class="h-full rounded-full transition-all duration-500"
        :class="barColorClass"
        :style="{ width: `${score * 100}%` }"
      />
    </div>

    <!-- Feedback -->
    <p
      v-if="feedback"
      class="text-sm text-ink mb-3"
    >
      {{ feedback }}
    </p>

    <!-- Correct Answer (max attempts reached) -->
    <div
      v-if="correctAnswer"
      class="p-3 rounded-lg bg-studio-700/50 border border-white/[0.04] mb-3"
    >
      <p class="text-xs text-ink-dim mb-1">
        Correct Answer:
      </p>
      <p
        class="text-sm text-ink font-arabic"
        dir="rtl"
      >
        {{ correctAnswer }}
      </p>
    </div>

    <!-- Actions -->
    <div class="flex gap-2">
      <button
        v-if="attemptsRemaining > 0 && !isComplete"
        class="btn flex-1"
        @click="emit('retry')"
      >
        Try Again
      </button>
      <button
        v-if="hasMoreActivities"
        class="btn flex-1"
        @click="emit('next-activity')"
      >
        Next Activity
      </button>
      <button
        v-if="lessonJustCompleted"
        class="btn flex-1"
        @click="emit('complete-lesson')"
      >
        Complete Lesson
      </button>
    </div>

    <!-- Attempts remaining -->
    <p
      v-if="attemptsRemaining > 0 && !isComplete"
      class="text-xs text-ink-dim mt-2"
    >
      {{ attemptsRemaining }} attempt{{ attemptsRemaining > 1 ? 's' : '' }} remaining
    </p>
  </div>
</template>
