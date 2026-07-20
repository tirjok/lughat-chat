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
}>()

// ---------------------------------------------------------------------------
// Submission composable
// ---------------------------------------------------------------------------

const {
  isSubmitting,
  result,
  error,
  maxAttempts,
  isMaxAttemptsReached,
  submitAnswer,
  clearResults
} = useActivitySubmission(props.activity.id)

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

const activityType = computed<string>(() => props.activity.type)

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

function handleNextActivity(): void {
  emit('next-activity')
}

function handleCompleteLesson(): void {
  emit('complete-lesson')
}

function resetSubmission(): void {
  userAnswer.value = ''
  inlineError.value = null
  clearResults()
}
</script>

<template>
  <div
    class="activity-renderer card"
    dir="rtl"
  >
    <!-- Activity header -->
    <div class="flex-between mb-3">
      <h3 class="font-semibold text-gray-900 dark:text-white">
        {{ activity.title }}
      </h3>
    </div>

    <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
      {{ activity.description }}
    </p>

    <!-- Error display -->
    <div
      v-if="error"
      class="mb-3 p-3 rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
    >
      <p class="text-sm text-red-700 dark:text-red-300">
        {{ error.message }}
      </p>
    </div>

    <!-- Inline error (empty answer) — shown without API call -->
    <div
      v-if="inlineError"
      class="mb-3 p-2 rounded bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800"
    >
      <p class="text-sm text-yellow-700 dark:text-yellow-300">
        {{ inlineError }}
      </p>
    </div>

    <!-- Inline correct answer (max attempts reached) — shown without API call -->
    <div
      v-if="isMaxAttemptsReached && result?.correct_answer"
      class="mb-3 p-3 rounded bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
    >
      <p class="text-sm font-medium text-green-700 dark:text-green-300">
        Correct answer:
      </p>
      <p class="text-sm text-green-800 dark:text-green-200">
        {{ result.correct_answer }}
      </p>
    </div>

    <!-- Listen-Translate: dispatch to ListenTranslateView + shared form -->
    <template v-if="listenTranslateContent">
      <ListenTranslateView :content="listenTranslateContent" />
      <ActivityForm
        v-model="userAnswer"
        placeholder="Type your translation here..."
        :disabled="isMaxAttemptsReached || (result?.activity_complete ?? false)"
        :is-submitting="isSubmitting"
        @submit="handleAnswerSubmitted"
        @keydown="handleKeyDown"
      >
        <template #label>
          Translate this to English:
        </template>
        <template #buttonText>
          Submit Answer
        </template>
      </ActivityForm>
    </template>

    <!-- Translate-to-English / Translate-to-Arabic -->
    <template v-else-if="translateContent">
      <TranslateView
        :content="translateContent"
        :activity-type="activityType"
      />
      <ActivityForm
        v-model="userAnswer"
        :placeholder="activityType === 'translate-to-arabic' ? 'اكتب ترجمتك هنا...' : 'Type your translation here...'"
        :dir="activityType === 'translate-to-arabic' ? 'rtl' : 'ltr'"
        :disabled="isMaxAttemptsReached || (result?.activity_complete ?? false)"
        :is-submitting="isSubmitting"
        @submit="handleAnswerSubmitted"
        @keydown="handleKeyDown"
      >
        <template #label>
          <span v-if="activityType === 'translate-to-english'">Translate to English:</span>
          <span v-else>Translate to Arabic:</span>
        </template>
        <template #buttonText>
          Submit Answer
        </template>
      </ActivityForm>
    </template>

    <!-- Introduce-Characters -->
    <template v-else-if="introduceCharactersContent">
      <IntroduceCharactersView :content="introduceCharactersContent" />
      <ActivityForm
        v-model="userAnswer"
        placeholder="اكتب مقدمة الشخصية..."
        dir="rtl"
        :disabled="isMaxAttemptsReached || (result?.activity_complete ?? false)"
        :is-submitting="isSubmitting"
        @submit="handleAnswerSubmitted"
        @keydown="handleKeyDown"
      >
        <template #label>
          Introduce this character in Arabic:
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
        placeholder="Type your response..."
        :disabled="isMaxAttemptsReached || (result?.activity_complete ?? false)"
        :is-submitting="isSubmitting"
        @submit="handleAnswerSubmitted"
        @keydown="handleKeyDown"
      >
        <template #label>
          Complete the dialogue:
        </template>
        <template #buttonText>
          Submit Answer
        </template>
      </ActivityForm>
    </template>

    <!-- Score display (shown after submission) -->
    <ActivityScorePanel
      :result="result"
      :max-attempts="maxAttempts"
      :is-complete="result?.activity_complete ?? false"
      :lesson-just-completed="result?.lesson_just_completed ?? false"
      :total-activities="totalActivities"
      :activity-index="activityIndex"
      @next-activity="handleNextActivity"
      @complete-lesson="handleCompleteLesson"
      @retry="resetSubmission"
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
