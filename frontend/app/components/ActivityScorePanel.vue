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

// Score label text
const scoreLabel = computed(() => {
  if (score.value >= 0.9) return 'Excellent!'
  if (score.value >= 0.7) return 'Great job!'
  if (score.value >= 0.4) return 'Good effort!'
  return 'Keep practicing!'
})

// Score bar color
const barColorClass = computed(() => {
  if (score.value >= 0.7) return 'bg-emerald-400'
  if (score.value >= 0.4) return 'bg-amber-400'
  return 'bg-red-400'
})
</script>

<template>
  <div class="mt-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.03]">
    <!-- Score Header -->
    <div class="flex-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-ink">Score</span>
        <span
          v-if="result"
          class="text-xs font-medium"
          :class="score >= 0.7 ? 'text-emerald-400' : score >= 0.4 ? 'text-amber-400' : 'text-red-400'"
        >
          {{ scoreLabel }}
        </span>
      </div>
      <span
        class="text-2xl font-bold"
        :class="score >= 0.7 ? 'text-emerald-400' : score >= 0.4 ? 'text-amber-400' : 'text-red-400'"
      >
        {{ (score * 100).toFixed(0) }}%
      </span>
    </div>

    <!-- Score Bar -->
    <div class="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-3">
      <div
        class="h-full rounded-full transition-all duration-700"
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
      class="p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/25 mb-4"
    >
      <div class="flex items-center gap-2 mb-1.5">
        <span class="ph ph-check-circle text-emerald-400 text-sm" />
        <p class="text-xs text-emerald-400/80 font-semibold">
          Correct Answer:
        </p>
      </div>
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
        <span class="ph ph-arrows-clockwise ml-1.5" />
        Try Again
      </button>
      <button
        v-if="hasMoreActivities"
        class="btn flex-1"
        @click="emit('next-activity')"
      >
        <span class="ph ph-arrow-right ml-1.5" />
        Next Activity
      </button>
      <button
        v-if="lessonJustCompleted"
        class="btn flex-1"
        @click="emit('complete-lesson')"
      >
        <span class="ph ph-check-circle ml-1.5" />
        Complete Lesson
      </button>
    </div>

    <!-- Attempts remaining -->
    <p
      v-if="attemptsRemaining > 0 && !isComplete"
      class="text-xs text-ink-dim/50 mt-2 text-center"
    >
      {{ attemptsRemaining }} attempt{{ attemptsRemaining > 1 ? 's' : '' }} remaining
    </p>
  </div>
</template>
