<script setup lang="ts">
import type {
  IntroduceCharactersActivityContent,
  ListenTranslateActivityContent,
  RolePlayActivityContent,
  TranslateActivityContent
} from '../composables/useLessons'
import { useActivitySubmission } from '../composables/useActivitySubmission'
import {
  isIntroduceCharactersContent,
  isListenTranslateContent,
  isRolePlayContent,
  isTranslateContent
} from '../utils/activityGuards'
import ActivityForm from './ActivityForm.vue'
import ActivityScorePanel from './ActivityScorePanel.vue'
import IntroduceCharactersView from './IntroduceCharactersView.vue'
import ListenTranslateView from './ListenTranslateView.vue'
import RolePlayView from './RolePlayView.vue'
import TranslateView from './TranslateView.vue'

interface Props {
  activity: import('../composables/useLessons').Activity
  lessonId: number
  /** Total number of activities in the parent lesson. */
  totalActivities?: number
  /** Current activity index (for navigation display). */
  activityIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  totalActivities: undefined,
  activityIndex: undefined
})

const emit = defineEmits<{
  'next-activity': []
  'complete-lesson': []
  'retry': []
}>()

// ---------------------------------------------------------------------------
// Submission composable
// ---------------------------------------------------------------------------

const {
  isSubmitting,
  result,
  error,
  isMaxAttemptsReached,
  submitAnswer,
  clearResults
} = useActivitySubmission(props.lessonId)

// ---------------------------------------------------------------------------
// User answer state — shallowRef for primitives (better performance)
// ---------------------------------------------------------------------------

const userAnswer = shallowRef('')
const inlineError = shallowRef<string | null>(null)

// Maximum allowed answer length (matches backend validation).
const MAX_ANSWER_LENGTH = 1000

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

const listenTranslateContent = computed<ListenTranslateActivityContent | undefined>(() => {
  if (props.activity.type !== 'listen-translate') return undefined
  const content = props.activity.content
  if (!isListenTranslateContent(content)) return undefined
  return content
})

const translateContent = computed<TranslateActivityContent | undefined>(() => {
  if (props.activity.type !== 'translate-to-english' && props.activity.type !== 'translate-to-arabic') return undefined
  const content = props.activity.content
  if (!isTranslateContent(content)) return undefined
  return content
})

const introduceCharactersContent = computed<IntroduceCharactersActivityContent | undefined>(() => {
  if (props.activity.type !== 'introduce-characters') return undefined
  const content = props.activity.content
  if (!isIntroduceCharactersContent(content)) return undefined
  return content
})

const rolePlayContent = computed<RolePlayActivityContent | undefined>(() => {
  if (props.activity.type !== 'role-play') return undefined
  const content = props.activity.content
  if (!isRolePlayContent(content)) return undefined
  return content
})

// Inline correct answer: shown when max attempts are reached.
const inlineCorrectAnswer = computed<string | null>(() => {
  if (!isMaxAttemptsReached.value || !result.value) return null
  return result.value.correct_answer ?? null
})

// ---------------------------------------------------------------------------
// Submit logic
// ---------------------------------------------------------------------------

function validateAnswer(answer: string): string | null {
  const trimmed = answer.trim()
  if (!trimmed) {
    return 'Please enter your answer'
  }
  if (trimmed.length > MAX_ANSWER_LENGTH) {
    return `Answer must be ${MAX_ANSWER_LENGTH} characters or less`
  }
  return null
}

async function handleAnswerSubmitted(): Promise<void> {
  inlineError.value = null

  const validationError = validateAnswer(userAnswer.value)
  if (validationError) {
    inlineError.value = validationError
    return
  }

  await submitAnswer(props.activity.id, userAnswer.value)
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleAnswerSubmitted()
  }
}

function handleRetry(): void {
  resetSubmission()
}

function resetSubmission(): void {
  userAnswer.value = ''
  inlineError.value = null
  clearResults()
}
</script>

<template>
  <div
    class="activity-renderer rounded-lg border border-white/[0.04] bg-studio-800 p-4"
    dir="rtl"
  >
    <!-- Activity header -->
    <div class="mb-3">
      <h4 class="font-sans font-semibold text-ink text-base">
        {{ activity.title }}
      </h4>
      <p class="text-xs text-ink-dim mt-1">
        {{ activity.description }}
      </p>
    </div>

    <!-- Error display -->
    <div
      v-if="error"
      class="p-3 rounded-lg bg-error/10 border border-error/20 text-sm text-error mb-3"
    >
      {{ error }}
    </div>

    <!-- Inline error (empty answer) -->
    <div
      v-if="inlineError"
      class="p-3 rounded-lg bg-error/10 border border-error/20 text-sm text-error mb-3"
    >
      {{ inlineError }}
    </div>

    <!-- Inline correct answer (max attempts reached) -->
    <div
      v-if="inlineCorrectAnswer"
      class="p-3 rounded-lg bg-studio-700/50 border border-white/[0.04] mb-3"
    >
      <p class="text-xs text-ink-dim mb-1">
        Correct Answer:
      </p>
      <p
        class="text-sm text-ink font-arabic"
        dir="rtl"
      >
        {{ inlineCorrectAnswer }}
      </p>
    </div>

    <!-- Listen-Translate: dispatch to ListenTranslateView + shared form -->
    <template v-if="listenTranslateContent">
      <ListenTranslateView :content="listenTranslateContent" />
      <ActivityForm
        v-model="userAnswer"
        dir="rtl"
        :disabled="isMaxAttemptsReached"
        :is-submitting="isSubmitting"
        placeholder="Type your translation here..."
        @submit="handleAnswerSubmitted"
        @keydown="handleKeyDown"
      >
        <template #label>
          Translate to English
        </template>
        <template #buttonText>
          Submit Translation
        </template>
      </ActivityForm>
    </template>

    <!-- Translate-to-English / Translate-to-Arabic -->
    <template v-else-if="translateContent">
      <TranslateView
        :content="translateContent"
        :activity-type="activity.type"
      />
      <ActivityForm
        v-model="userAnswer"
        :dir="activity.type === 'translate-to-arabic' ? 'rtl' : 'ltr'"
        :disabled="isMaxAttemptsReached"
        :is-submitting="isSubmitting"
        :placeholder="activity.type === 'translate-to-arabic' ? 'اكتب الترجمة بالعربية...' : 'Type your translation...'"
        @submit="handleAnswerSubmitted"
        @keydown="handleKeyDown"
      >
        <template #label>
          {{ activity.type === 'translate-to-arabic' ? 'Translate to Arabic' : 'Translate to English' }}
        </template>
        <template #buttonText>
          Submit Translation
        </template>
      </ActivityForm>
    </template>

    <!-- Introduce-Characters -->
    <template v-else-if="introduceCharactersContent">
      <IntroduceCharactersView :content="introduceCharactersContent" />
      <ActivityForm
        v-model="userAnswer"
        dir="rtl"
        :disabled="isMaxAttemptsReached"
        :is-submitting="isSubmitting"
        placeholder="Write an introduction sentence..."
        @submit="handleAnswerSubmitted"
        @keydown="handleKeyDown"
      >
        <template #label>
          Introduce Characters
        </template>
        <template #buttonText>
          Submit Answer
        </template>
      </ActivityForm>
    </template>

    <!-- Role-Play -->
    <template v-else-if="rolePlayContent">
      <RolePlayView :content="rolePlayContent" />
      <ActivityForm
        v-model="userAnswer"
        dir="rtl"
        :disabled="isMaxAttemptsReached"
        :is-submitting="isSubmitting"
        placeholder="Write your response..."
        @submit="handleAnswerSubmitted"
        @keydown="handleKeyDown"
      >
        <template #label>
          Role-Play Response
        </template>
        <template #buttonText>
          Submit Response
        </template>
      </ActivityForm>
    </template>

    <!-- Score display (shown after submission) -->
    <ActivityScorePanel
      :result="result"
      :max-attempts="activity.max_attempts"
      :is-complete="isMaxAttemptsReached"
      :lesson-just-completed="result?.lesson_just_completed ?? false"
      :total-activities="totalActivities"
      :activity-index="activityIndex"
      @next-activity="emit('next-activity')"
      @complete-lesson="emit('complete-lesson')"
      @retry="handleRetry"
    />
  </div>
</template>

<style scoped>
.arabic-text {
  font-family: 'Cairo', sans-serif;
  font-size: 1.1em;
  direction: rtl;
}

.english-text {
  font-size: 0.9em;
}
</style>
