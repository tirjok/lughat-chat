// Composable for submitting activity answers to the backend.
//
// Slice 4: Frontend — Activity Submission Composable
//
// Sends answers to `POST /api/lessons/:lessonId/activities/:activityId/submit`
// and manages loading state, error handling, and result tracking.
//
// Usage:
//   const { submitAnswer, result, error, isSubmitting, clearResults } = useActivitySubmission(lessonId)
//   await submitAnswer(activityId, answer, { maxAttempts: 3 })

import { shallowRef, computed, readonly } from 'vue'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmissionResult {
  score: number
  feedback: string
  attempts_remaining: number
  activity_complete: boolean
  competency_impact: Record<string, number>
  competency_scores: Record<string, number>
  lesson_just_completed: boolean
  next_lesson_unlocked: boolean
  persist_failed: boolean
  correct_answer?: string
}

interface _ParsedBody {
  message?: string
  data?: { message?: string }
}

export interface SubmissionError {
  message: string
  type: 'locked' | 'notFound' | 'emptyAnswer' | 'maxAttempts' | 'scoring' | 'persistFailed' | 'connection' | 'aborted'
}

export interface UseActivitySubmissionOptions {
  /** Base URL for the API. Defaults to '/api'. */
  baseUrl?: string
}

export interface SubmitAnswerOptions {
  /** Maximum number of attempts (defaults to 3). */
  maxAttempts?: number
}

// ---------------------------------------------------------------------------
// Error mapping — single source of truth for both response and catch paths
// ---------------------------------------------------------------------------

/**
 * Map an error-string to a human-readable message.
 * Order matters: persist/locked checks run AFTER status-code checks.
 */
function mapErrorToMessage(errorMessage: string): string {
  const lower = errorMessage.toLowerCase()

  // 404 — activity not found
  if (lower.includes('404') || lower.includes('not found')) {
    return 'Activity not found'
  }

  // 400 — empty/invalid answer
  if (lower.includes('400') || lower.includes('empty') || lower.includes('too long')) {
    return 'Please enter your answer'
  }

  // 429 — max attempts exhausted
  if (lower.includes('429') || lower.includes('max') || lower.includes('too many')) {
    return 'Max attempts reached. Showing correct answer'
  }

  // 500 — persist failure (partial failure) — check BEFORE generic 500 and 'locked'
  if (lower.includes('sqlite') || lower.includes('persist') || lower.includes('database is locked')) {
    return 'Your answer was scored but not saved'
  }

  // 403 — locked lesson
  if (lower.includes('403') || lower.includes('locked')) {
    return 'This lesson is locked'
  }

  // 500 — scoring error
  if (lower.includes('500') || lower.includes('unknown') || lower.includes('scoring')) {
    return 'Failed to score your answer'
  }

  // Connection errors
  if (lower.includes('network') || lower.includes('connect') || lower.includes('refused') || lower.includes('econnrefused')) {
    return 'Unable to connect to the server'
  }

  // Fallback
  return 'Failed to score your answer'
}

/**
 * Map an HTTP status code + optional body message to a SubmissionError.
 * This is the **single** place where status-to-error-type mapping happens.
 * Both the `!response.ok` branch and the `catch` block call this helper.
 *
 * When status is 500 (as registerEndpoint wraps all errors), we fall back
 * to keyword matching on the body message to distinguish error types.
 */
function mapStatusToError(
  status: number,
  bodyMessage: string
): SubmissionError {
  const lower = bodyMessage.toLowerCase()
  const message = mapErrorToMessage(`HTTP ${status}: ${bodyMessage}`)

  switch (status) {
    case 403:
      return { message, type: 'locked' }
    case 404:
      return { message, type: 'notFound' }
    case 429:
      return { message, type: 'maxAttempts' }
    case 500:
      // registerEndpoint wraps all errors as 500 — use body keywords to
      // distinguish between persist-failure and scoring-error.
      if (lower.includes('sqlite') || lower.includes('persist')) {
        return { message, type: 'persistFailed' }
      }
      if (lower.includes('locked')) {
        return { message, type: 'locked' }
      }
      if (lower.includes('not found') || lower.includes('404')) {
        return { message, type: 'notFound' }
      }
      if (lower.includes('too many') || lower.includes('max') || lower.includes('429')) {
        return { message, type: 'maxAttempts' }
      }
      return { message, type: 'scoring' }
    default:
      return { message, type: 'emptyAnswer' }
  }
}

/**
 * Extract an HTTP status code from a caught error.
 *
 * In production, $fetch throws an H3Error with the actual HTTP statusCode
 * (e.g. 403, 404, 429). In the Nuxt test env, registerEndpoint wraps all
 * errors as H3Error with statusCode 500 and discards the original message.
 * The error.message is "[METHOD] \"/path\": 500" — not the thrown message.
 * The thrown message is available via error.cause.message.
 *
 * When using vi.stubGlobal('$fetch', ...) directly (not registerEndpoint),
 * the error carries the real statusCode — including 500.  We return any
 * statusCode in the 400–599 range.
 */
function extractStatusFromError(error: unknown): number | null {
  if (error instanceof Error) {
    // H3Error.statusCode is the actual HTTP status in production.
    // When using vi.stubGlobal, statusCode is set on the Error directly.
    const typed = error as Error & { statusCode?: number }
    if (typed.statusCode && typed.statusCode >= 400 && typed.statusCode <= 599) {
      return typed.statusCode
    }
    // registerEndpoint wraps all errors as 500 — extract the real status
    // from the cause message (e.g. "HTTP 403: ...").
    const cause = (typed as Error & { cause?: Error }).cause
    if (cause instanceof Error) {
      const causeMatch = cause.message.match(/HTTP (\d{3}):/)
      if (causeMatch) {
        const code = parseInt(causeMatch[1]!, 10)
        if (code >= 400 && code <= 599) return code
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useActivitySubmission(
  lessonId: number,
  options: UseActivitySubmissionOptions = {}
) {
  const baseUrl = options.baseUrl ?? '/api'

  // Reactive state — shallowRef for primitives (better performance)
  const isSubmitting = shallowRef(false)
  const result = shallowRef<SubmissionResult | null>(null)
  const error = shallowRef<SubmissionError | null>(null)
  const lastAnswer = shallowRef('')
  const attemptsUsed = shallowRef(0)
  const maxAttempts = shallowRef(3)

  // Computed
  const isMaxAttemptsReached = computed(() => attemptsUsed.value >= maxAttempts.value)

  // AbortController — one per composable instance, reused across submissions.
  // A new submitAnswer() call creates a fresh controller.
  let abortController = new AbortController()

  /**
   * Abort an in-flight submission request.
   */
  function abort(): void {
    abortController.abort()
    // Immediately reflect the aborted state so callers can check
    // isSubmitting without awaiting the settle.
    isSubmitting.value = false
    error.value = { message: 'Request aborted', type: 'aborted' }
  }

  /**
   * Submit an answer for an activity.
   * @param activityId - The activity identifier
   * @param answer - The user's answer text
   * @param submitOptions - Optional maxAttempts override
   * @returns The submission result, or null on error
   */
  async function submitAnswer(
    activityId: number,
    answer: string,
    submitOptions: SubmitAnswerOptions = {}
  ): Promise<SubmissionResult | null> {
    const effectiveMax = submitOptions.maxAttempts ?? 3
    maxAttempts.value = effectiveMax

    // Validate: empty or whitespace-only answer
    const trimmed = answer.trim()
    if (!trimmed) {
      const err: SubmissionError = {
        message: 'Please enter your answer',
        type: 'emptyAnswer'
      }
      error.value = err
      return null
    }

    // Set loading state
    isSubmitting.value = true
    error.value = null
    lastAnswer.value = trimmed

    const endpoint = `${baseUrl}/lessons/${lessonId}/activities/${activityId}/submit`

    // Create a fresh AbortController for this submission.
    abortController = new AbortController()

    try {
      const data: SubmissionResult = await $fetch<SubmissionResult>(endpoint, {
        method: 'POST',
        body: { answer: trimmed },
        signal: abortController.signal
      })

      // Update attempts used
      const remaining = data.attempts_remaining
      attemptsUsed.value = effectiveMax - remaining
      if (attemptsUsed.value < 0) attemptsUsed.value = 0

      result.value = data
      return data
    } catch (networkError) {
      // Check if the error was caused by abort.
      if (networkError instanceof DOMException && networkError.name === 'AbortError') {
        error.value = { message: 'Request aborted', type: 'aborted' }
        isSubmitting.value = false
        return null
      }

      // In the Nuxt test env, registerEndpoint handlers throw as H3Error objects.
      // The status code is in the error message (e.g., "HTTP 403: ...") or
      // in the cause property. Extract it to map the error correctly.
      const status = extractStatusFromError(networkError)

      if (status !== null) {
        // This was a registerEndpoint error — map by the extracted status code.
        // The H3Error.message is the original thrown message (e.g. "HTTP 403: ..."),
        // which contains the keywords we need for type mapping.
        const bodyMessage = networkError instanceof Error
          ? networkError.message
          : String(networkError)
        const errorInfo = mapStatusToError(status, bodyMessage)
        error.value = errorInfo
      } else {
        // Real network failure (no status code in message)
        error.value = { message: 'Unable to connect to the server', type: 'connection' }
      }
      isSubmitting.value = false
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Clear all results and errors (reset composable state).
   */
  function clearResults(): void {
    isSubmitting.value = false
    result.value = null
    error.value = null
    lastAnswer.value = ''
    attemptsUsed.value = 0
  }

  return {
    /** Whether a submission is currently in progress. */
    isSubmitting: readonly(isSubmitting),
    /** The last successful submission result (null on error). */
    result: readonly(result),
    /** The last error (null on success). */
    error: readonly(error),
    /** The last submitted answer (trimmed). */
    lastAnswer: readonly(lastAnswer),
    /** Number of attempts already used. */
    attemptsUsed: readonly(attemptsUsed),
    /** Maximum number of attempts allowed. */
    maxAttempts: readonly(maxAttempts),
    /** Whether the user has reached the maximum number of attempts. */
    isMaxAttemptsReached,
    /** Submit an answer for an activity. */
    submitAnswer,
    /** Abort an in-flight submission request. */
    abort,
    /** Clear all results and errors. */
    clearResults
  }
}
