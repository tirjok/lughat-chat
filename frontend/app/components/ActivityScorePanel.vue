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

const hasResult = computed(() => props.result !== null)
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
  <!-- Score display (shown after submission) -->
  <div
    v-if="hasResult"
    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3"
  >
    <!-- Score bar -->
    <div>
      <div class="flex-between mb-1">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Score
        </span>
        <span
          class="text-sm font-bold"
          :class="scoreColorClass"
        >
          {{ score }}
        </span>
      </div>
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          class="h-2 rounded-full transition-all"
          :class="barColorClass"
          :style="{ width: `${score * 100}%` }"
        />
      </div>
    </div>

    <!-- Feedback -->
    <p
      v-if="feedback"
      class="text-sm text-gray-700 dark:text-gray-300"
    >
      {{ feedback }}
    </p>

    <!-- Remaining attempts -->
    <p
      v-if="!isComplete"
      class="text-sm text-gray-500 dark:text-gray-400"
    >
      {{ attemptsRemaining }} attempts remaining
    </p>

    <!-- Correct answer (max attempts reached) -->
    <div
      v-if="correctAnswer"
      class="p-3 rounded bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
    >
      <p class="text-sm font-medium text-green-700 dark:text-green-300">
        Correct answer:
      </p>
      <p class="text-sm text-green-800 dark:text-green-200">
        {{ correctAnswer }}
      </p>
    </div>

    <!-- Navigation buttons -->
    <div class="flex gap-2 mt-3">
      <button
        v-if="isComplete && hasMoreActivities"
        class="btn flex-1"
        @click="emit('next-activity')"
      >
        Next Activity
      </button>
      <button
        v-if="isComplete && lessonJustCompleted"
        class="btn flex-1"
        @click="emit('complete-lesson')"
      >
        Complete Lesson
      </button>
      <button
        v-if="isComplete"
        class="btn flex-1"
        @click="emit('retry')"
      >
        Try Again
      </button>
    </div>
  </div>

  <!-- Lesson completed message -->
  <div
    v-if="lessonJustCompleted"
    class="mt-4 p-4 rounded bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-center"
  >
    <p class="text-lg font-semibold text-green-700 dark:text-green-300">
      Lesson completed ✓
    </p>
    <button
      class="btn mt-2"
      @click="emit('complete-lesson')"
    >
      Back to Roadmap
    </button>
  </div>
</template>
