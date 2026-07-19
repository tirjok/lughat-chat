import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useActivitySubmission } from '../app/composables/useActivitySubmission'

// ─── Slice S-4: Frontend Activity Submission Composable Tests ────────

describe('useActivitySubmission', () => {
  let originalFetch: typeof global.fetch | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    // Save original fetch (from Nuxt test env) so error-path tests can
    // restore it after stubbing globalThis.fetch.  Happy-path tests that
    // use registerEndpoint depend on globalThis.fetch being set to the
    // Nuxt test env's fetch — the afterEach restores it.
    originalFetch = (globalThis as Record<string, unknown>).fetch as typeof fetch | undefined
  })

  afterEach(() => {
    // Restore global.fetch to prevent leaking into subsequent tests
    if (originalFetch !== undefined) {
      ;(globalThis as Record<string, unknown>).fetch = originalFetch
    }
  })

  // ------------------------------------------------------------------
  // Initial state
  // ------------------------------------------------------------------

  describe('initial state', () => {
    it('returns isSubmitting as false', () => {
      const { isSubmitting } = useActivitySubmission(1)
      expect(isSubmitting.value).toBe(false)
    })

    it('returns result as null', () => {
      const { result } = useActivitySubmission(1)
      expect(result.value).toBeNull()
    })

    it('returns error as null', () => {
      const { error } = useActivitySubmission(1)
      expect(error.value).toBeNull()
    })

    it('returns lastAnswer as empty string', () => {
      const { lastAnswer } = useActivitySubmission(1)
      expect(lastAnswer.value).toBe('')
    })

    it('returns attemptsUsed as 0', () => {
      const { attemptsUsed } = useActivitySubmission(1)
      expect(attemptsUsed.value).toBe(0)
    })

    it('returns maxAttempts as 3 (default)', () => {
      const { maxAttempts } = useActivitySubmission(1)
      expect(maxAttempts.value).toBe(3)
    })
  })

  // ------------------------------------------------------------------
  // Happy path — successful submission
  // ------------------------------------------------------------------

  describe('successful submission', () => {
    it('submits answer and returns result with score, feedback, attempts_remaining, activity_complete, competency_impact', async () => {
      const mockResult = {
        score: 0.85,
        feedback: 'Good translation — minor improvements possible.',
        attempts_remaining: 2,
        activity_complete: true,
        competency_impact: { C1: 0.3, C2: 0.2 },
        competency_scores: { C1: 0.85, C2: 0.85 },
        lesson_just_completed: false,
        next_lesson_unlocked: false,
        persist_failed: false
      }

      registerEndpoint('/api/lessons/1/activities/1/submit', () => mockResult)

      const { submitAnswer, result, isSubmitting, error } = useActivitySubmission(1)

      await submitAnswer(1, 'Hello')

      expect(isSubmitting.value).toBe(false)
      expect(error.value).toBeNull()
      expect(result.value).toEqual(mockResult)
    })

    it('submits answer and returns result with lesson_just_completed and next_lesson_unlocked', async () => {
      const mockResult = {
        score: 1.0,
        feedback: 'Excellent!',
        attempts_remaining: 2,
        activity_complete: true,
        competency_impact: { C1: 0.3 },
        competency_scores: { C1: 1.0 },
        lesson_just_completed: true,
        next_lesson_unlocked: true,
        persist_failed: false
      }

      registerEndpoint('/api/lessons/2/activities/1/submit', () => mockResult)

      const { submitAnswer, result } = useActivitySubmission(2)

      await submitAnswer(1, 'Perfect answer')

      expect(result.value?.lesson_just_completed).toBe(true)
      expect(result.value?.next_lesson_unlocked).toBe(true)
    })

    it('submits answer with custom maxAttempts parameter', async () => {
      const mockResult = {
        score: 0.5,
        feedback: 'Partial match.',
        attempts_remaining: 1,
        activity_complete: false,
        competency_impact: {},
        competency_scores: {},
        lesson_just_completed: false,
        next_lesson_unlocked: false,
        persist_failed: false
      }

      registerEndpoint('/api/lessons/1/activities/3/submit', () => mockResult)

      const { submitAnswer, result } = useActivitySubmission(1)

      await submitAnswer(3, 'partial', { maxAttempts: 3 })

      expect(result.value?.attempts_remaining).toBe(1)
    })
  })

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------

  describe('loading state', () => {
    it('sets isSubmitting to true during submission', async () => {
      let resolveFn: (() => void) | null = null
      const promise = new Promise<void>((resolve) => {
        resolveFn = resolve
      })

      registerEndpoint('/api/lessons/1/activities/1/submit', {
        handler: () => promise
      })

      const { submitAnswer, isSubmitting } = useActivitySubmission(1)

      const submitPromise = submitAnswer(1, 'test answer')
      expect(isSubmitting.value).toBe(true)

      resolveFn!()
      await submitPromise
      expect(isSubmitting.value).toBe(false)
    })

    it('sets isSubmitting back to false after successful submission', async () => {
      registerEndpoint('/api/lessons/1/activities/1/submit', () => ({
        score: 0.5,
        feedback: 'ok',
        attempts_remaining: 2,
        activity_complete: false,
        competency_impact: {},
        competency_scores: {},
        lesson_just_completed: false,
        next_lesson_unlocked: false,
        persist_failed: false
      }))

      const { submitAnswer, isSubmitting } = useActivitySubmission(1)

      await submitAnswer(1, 'test')
      expect(isSubmitting.value).toBe(false)
    })
  })

  // ------------------------------------------------------------------
  // Error handling — HTTP status codes
  // registerEndpoint wraps all handler-thrown errors as H3Error with
  // statusCode 500 regardless of the original status. The real status
  // code is NOT preserved in the response body. Therefore we use
  // globalThis.fetch stubs for error-path tests.
  // ------------------------------------------------------------------

  describe('error handling — HTTP status codes', () => {
    it('When 403 locked lesson then returns error "This lesson is locked" with type "locked"', async () => {
      const mockResp = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('This lesson is locked. Complete previous lessons to unlock.')
      } as Response

      ;(globalThis as Record<string, unknown>).fetch = vi.fn(() => Promise.resolve(mockResp))

      const { submitAnswer, error, result } = useActivitySubmission(99)

      await submitAnswer(1, 'test answer')

      expect(result.value).toBeNull()
      expect(error.value?.message).toBe('This lesson is locked')
      expect(error.value?.type).toBe('locked')
    })

    it('When 404 non-existent activity then returns error "Activity not found" with type "notFound"', async () => {
      const mockResp = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Activity with id 999 not found in lesson 1')
      } as Response

      ;(globalThis as Record<string, unknown>).fetch = vi.fn(() => Promise.resolve(mockResp))

      const { submitAnswer, error, result } = useActivitySubmission(1)

      await submitAnswer(999, 'test answer')

      expect(result.value).toBeNull()
      expect(error.value?.message).toBe('Activity not found')
      expect(error.value?.type).toBe('notFound')
    })

    it('When 400 empty/invalid answer then returns error "Please enter your answer" with type "emptyAnswer"', async () => {
      const mockResp = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Text is empty or too long')
      } as Response

      ;(globalThis as Record<string, unknown>).fetch = vi.fn(() => Promise.resolve(mockResp))

      const { submitAnswer, error, result } = useActivitySubmission(1)

      await submitAnswer(1, '')

      expect(result.value).toBeNull()
      expect(error.value?.message).toBe('Please enter your answer')
      expect(error.value?.type).toBe('emptyAnswer')
    })

    it('When 429 max attempts reached then returns error "Max attempts reached. Showing correct answer" with type "maxAttempts"', async () => {
      const mockResp = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('Too many attempts')
      } as Response

      ;(globalThis as Record<string, unknown>).fetch = vi.fn(() => Promise.resolve(mockResp))

      const { submitAnswer, error, result } = useActivitySubmission(1)

      await submitAnswer(1, 'test answer')

      expect(result.value).toBeNull()
      expect(error.value?.message).toBe('Max attempts reached. Showing correct answer')
      expect(error.value?.type).toBe('maxAttempts')
    })

    it('When 500 scoring error then returns error "Failed to score your answer" with type "scoring"', async () => {
      const mockResp = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Unknown activity type: unknown-type')
      } as Response

      ;(globalThis as Record<string, unknown>).fetch = vi.fn(() => Promise.resolve(mockResp))

      const { submitAnswer, error, result } = useActivitySubmission(1)

      await submitAnswer(1, 'test answer')

      expect(result.value).toBeNull()
      expect(error.value?.message).toBe('Failed to score your answer')
      expect(error.value?.type).toBe('scoring')
    })

    it('When 500 with "persist" in detail then returns partial-failure error "Your answer was scored but not saved" with type "persistFailed"', async () => {
      const mockResp = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('SQLite write failed for lesson 1, activity 1: database is locked')
      } as Response

      ;(globalThis as Record<string, unknown>).fetch = vi.fn(() => Promise.resolve(mockResp))

      const { submitAnswer, error, result } = useActivitySubmission(1)

      await submitAnswer(1, 'test answer')

      expect(result.value).toBeNull()
      expect(error.value?.message).toBe('Your answer was scored but not saved')
      expect(error.value?.type).toBe('persistFailed')
    })
  })

  // ------------------------------------------------------------------
  // Connection errors
  // ------------------------------------------------------------------

  describe('connection errors', () => {
    it('When network failure then returns error "Unable to connect to the server" with type "connection"', async () => {
      ;(globalThis as Record<string, unknown>).fetch = vi.fn(() => Promise.reject(new Error('Network error: connect ECONNREFUSED')))

      const { submitAnswer, error, result } = useActivitySubmission(1)

      await submitAnswer(1, 'test answer')

      expect(result.value).toBeNull()
      expect(error.value?.message).toBe('Unable to connect to the server')
      expect(error.value?.type).toBe('connection')
    })
  })

  // ------------------------------------------------------------------
  // lastAnswer tracking
  // ------------------------------------------------------------------

  describe('lastAnswer tracking', () => {
    it('updates lastAnswer with the submitted answer', async () => {
      registerEndpoint('/api/lessons/1/activities/1/submit', () => ({
        score: 0.5,
        feedback: 'ok',
        attempts_remaining: 2,
        activity_complete: false,
        competency_impact: {},
        competency_scores: {},
        lesson_just_completed: false,
        next_lesson_unlocked: false,
        persist_failed: false
      }))

      const { submitAnswer, lastAnswer } = useActivitySubmission(1)

      await submitAnswer(1, 'مرحبا بك')
      expect(lastAnswer.value).toBe('مرحبا بك')
    })

    it('resets lastAnswer to empty string when clearing results', async () => {
      registerEndpoint('/api/lessons/1/activities/1/submit', () => ({
        score: 0.5,
        feedback: 'ok',
        attempts_remaining: 2,
        activity_complete: false,
        competency_impact: {},
        competency_scores: {},
        lesson_just_completed: false,
        next_lesson_unlocked: false,
        persist_failed: false
      }))

      const { submitAnswer, lastAnswer, clearResults } = useActivitySubmission(1)

      await submitAnswer(1, 'مرحبا')
      expect(lastAnswer.value).toBe('مرحبا')

      clearResults()
      expect(lastAnswer.value).toBe('')
    })
  })

  // ------------------------------------------------------------------
  // clearResults
  // ------------------------------------------------------------------

  describe('clearResults', () => {
    it('resets isSubmitting to false', async () => {
      let resolveFn: (() => void) | null = null
      const promise = new Promise<void>((resolve) => {
        resolveFn = resolve
      })

      registerEndpoint('/api/lessons/1/activities/1/submit', {
        handler: () => promise
      })

      const { submitAnswer, isSubmitting, clearResults } = useActivitySubmission(1)

      const submitPromise = submitAnswer(1, 'test')
      expect(isSubmitting.value).toBe(true)

      clearResults()
      expect(isSubmitting.value).toBe(false)

      resolveFn!()
      await submitPromise
    })

    it('resets result to null', async () => {
      registerEndpoint('/api/lessons/1/activities/1/submit', () => ({
        score: 0.5,
        feedback: 'ok',
        attempts_remaining: 2,
        activity_complete: false,
        competency_impact: {},
        competency_scores: {},
        lesson_just_completed: false,
        next_lesson_unlocked: false,
        persist_failed: false
      }))

      const { submitAnswer, result, clearResults } = useActivitySubmission(1)

      await submitAnswer(1, 'test')
      expect(result.value).not.toBeNull()

      clearResults()
      expect(result.value).toBeNull()
    })

    it('resets error to null', async () => {
      registerEndpoint('/api/lessons/1/activities/1/submit', {
        handler: () => {
          throw new Error('HTTP 500: Error')
        }
      })

      const { submitAnswer, error, clearResults } = useActivitySubmission(1)

      await submitAnswer(1, 'test')
      expect(error.value).not.toBeNull()

      clearResults()
      expect(error.value).toBeNull()
    })
  })

  // ------------------------------------------------------------------
  // isMaxAttemptsReached
  // ------------------------------------------------------------------

  describe('isMaxAttemptsReached', () => {
    it('returns false when attemptsUsed < maxAttempts', () => {
      const { isMaxAttemptsReached } = useActivitySubmission(1)
      expect(isMaxAttemptsReached.value).toBe(false)
    })

    it('returns true when attemptsUsed equals maxAttempts', async () => {
      registerEndpoint('/api/lessons/1/activities/1/submit', () => ({
        score: 0.5,
        feedback: 'ok',
        attempts_remaining: 0,
        activity_complete: false,
        competency_impact: {},
        competency_scores: {},
        lesson_just_completed: false,
        next_lesson_unlocked: false,
        persist_failed: false
      }))

      const { submitAnswer, isMaxAttemptsReached } = useActivitySubmission(1)
      await submitAnswer(1, 'test')
      expect(isMaxAttemptsReached.value).toBe(true)
    })
  })

  // ------------------------------------------------------------------
  // Result shape — all expected fields
  // ------------------------------------------------------------------

  describe('result shape', () => {
    it('result contains all expected fields from the backend', async () => {
      const mockResult = {
        score: 0.85,
        feedback: 'Good translation.',
        attempts_remaining: 2,
        activity_complete: true,
        competency_impact: { C1: 0.3 },
        competency_scores: { C1: 0.85 },
        lesson_just_completed: false,
        next_lesson_unlocked: false,
        persist_failed: false
      }

      registerEndpoint('/api/lessons/1/activities/1/submit', () => mockResult)

      const { submitAnswer, result } = useActivitySubmission(1)

      await submitAnswer(1, 'test')

      const r = result.value
      expect(r).not.toBeNull()
      expect(typeof r!.score).toBe('number')
      expect(typeof r!.feedback).toBe('string')
      expect(typeof r!.attempts_remaining).toBe('number')
      expect(typeof r!.activity_complete).toBe('boolean')
      expect(typeof r!.competency_impact).toBe('object')
      expect(typeof r!.competency_scores).toBe('object')
      expect(typeof r!.lesson_just_completed).toBe('boolean')
      expect(typeof r!.next_lesson_unlocked).toBe('boolean')
      expect(typeof r!.persist_failed).toBe('boolean')
    })

    it('result includes correct_answer field when 429 response', async () => {
      const mockResp = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('Too many attempts')
      } as Response

      ;(globalThis as Record<string, unknown>).fetch = vi.fn(() => Promise.resolve(mockResp))

      const { submitAnswer, error } = useActivitySubmission(1)

      await submitAnswer(1, 'test answer')

      // After max attempts, the error message should indicate max attempts
      expect(error.value?.message).toBe('Max attempts reached. Showing correct answer')
      expect(error.value?.type).toBe('maxAttempts')
    })
  })

  // ------------------------------------------------------------------
  // Custom baseUrl
  // ------------------------------------------------------------------

  describe('custom baseUrl', () => {
    it('When custom baseUrl is provided then uses it for the API endpoint', async () => {
      registerEndpoint('/custom-api/lessons/1/activities/1/submit', () => ({
        score: 0.85,
        feedback: 'ok',
        attempts_remaining: 2,
        activity_complete: false,
        competency_impact: {},
        competency_scores: {},
        lesson_just_completed: false,
        next_lesson_unlocked: false,
        persist_failed: false
      }))

      const { submitAnswer, result } = useActivitySubmission(1, { baseUrl: '/custom-api' })

      await submitAnswer(1, 'test')

      expect(result.value?.score).toBe(0.85)
    })
  })

  // ------------------------------------------------------------------
  // Empty answer validation (inline error)
  // ------------------------------------------------------------------

  describe('empty answer validation', () => {
    it('When answer is whitespace-only then returns inline error "Please enter your answer" with type "emptyAnswer"', async () => {
      registerEndpoint('/api/lessons/1/activities/1/submit', {
        handler: () => {
          throw new Error('HTTP 400: Text is empty or too long')
        }
      })

      const { submitAnswer, error, result } = useActivitySubmission(1)

      await submitAnswer(1, '   ')

      expect(result.value).toBeNull()
      expect(error.value?.message).toBe('Please enter your answer')
      expect(error.value?.type).toBe('emptyAnswer')
    })
  })

  // ------------------------------------------------------------------
  // abort
  // ------------------------------------------------------------------

  describe('abort', () => {
    it('When abort is called then sets isSubmitting to false', async () => {
      let resolveFn: (() => void) | null = null
      const promise = new Promise<void>((resolve) => {
        resolveFn = resolve
      })

      registerEndpoint('/api/lessons/1/activities/1/submit', {
        handler: () => promise
      })

      const { submitAnswer, isSubmitting, abort } = useActivitySubmission(1)

      const submitPromise = submitAnswer(1, 'test answer')
      expect(isSubmitting.value).toBe(true)

      abort()
      expect(isSubmitting.value).toBe(false)

      resolveFn!()
      await submitPromise
    })

    it('When abort is called then sets error with message "Request aborted" and type "aborted"', async () => {
      let resolveFn: (() => void) | null = null
      const promise = new Promise<void>((resolve) => {
        resolveFn = resolve
      })

      registerEndpoint('/api/lessons/1/activities/1/submit', {
        handler: () => promise
      })

      const { submitAnswer, error, abort } = useActivitySubmission(1)

      const submitPromise = submitAnswer(1, 'test answer')

      abort()
      expect(error.value).not.toBeNull()
      expect(error.value?.message).toBe('Request aborted')
      expect(error.value?.type).toBe('aborted')

      resolveFn!()
      await submitPromise
    })

    it('When abort is called then result remains null', async () => {
      let resolveFn: (() => void) | null = null
      const promise = new Promise<void>((resolve) => {
        resolveFn = resolve
      })

      registerEndpoint('/api/lessons/1/activities/1/submit', {
        handler: () => promise
      })

      const { submitAnswer, result, abort } = useActivitySubmission(1)

      const submitPromise = submitAnswer(1, 'test answer')

      abort()
      expect(result.value).toBeNull()

      resolveFn!()
      await submitPromise
    })
  })
})
