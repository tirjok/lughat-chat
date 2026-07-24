import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ActivityScorePanel from '../app/components/ActivityScorePanel.vue'

// Mock ActivityForm — not rendered in ActivityScorePanel, but ActivityRenderer
// also uses it. Keep the mock so mountSuspended doesn't fail.
mockComponent('ActivityForm', {
  props: ['placeholder', 'dir', 'disabled', 'isSubmitting', 'modelValue'],
  template: '<div class="activity-form" data-testid="activity-form"></div>'
})

// Mock useActivitySubmission — ActivityScorePanel doesn't import it directly,
// but ActivityRenderer does. The mock prevents mountSuspended from failing.
mockNuxtImport('useActivitySubmission', () => () => ({
  isSubmitting: { value: false },
  result: { value: null },
  error: { value: null },
  submitAnswer: vi.fn(),
  clearResults: vi.fn()
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    score: 0.0,
    feedback: '',
    attempts_remaining: 3,
    activity_complete: false,
    competency_impact: {},
    competency_scores: {},
    lesson_just_completed: false,
    next_lesson_unlocked: false,
    persist_failed: false,
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActivityScorePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =====================================================================
  // 1. Score bar — rendering & color coding
  // =====================================================================

  describe('score bar rendering & color coding', () => {
    it('When rendered with a result then the score bar is visible with score text', async () => {
      // Arrange: mount with a score of 0.85
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.85, feedback: 'Good translation.' }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false,
          totalActivities: 5,
          activityIndex: 0
        }
      })
      // Act & Assert: verify score text "Score" and "0.85" appear
      expect(wrapper.text()).toContain('Score')
      expect(wrapper.text()).toContain('85%')
    })

    it('When score is exactly 0.7 (threshold boundary) then score bar is green', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.7 }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.html()).toMatch(/text-emerald-400/)
    })

    it('When score is 0.69 (just below threshold) then score bar is red', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.69 }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.html()).toMatch(/text-amber-400|text-red-400/)
    })

    it('When score < 0.7 then score bar is red', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.3 }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.html()).toMatch(/text-amber-400|text-red-400/)
    })

    it('When score is 0.0 (all wrong) then score bar is red with 0% width', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.0 }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.html()).toMatch(/text-amber-400|text-red-400/)
      expect(wrapper.html()).toMatch(/width: 0%/)
    })

    it('When score is 1.0 (perfect) then score bar is green with 100% width', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 1.0 }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.html()).toMatch(/text-emerald-400/)
      expect(wrapper.html()).toMatch(/width: 100%/)
    })
  })

  // =====================================================================
  // 2. Score bar — proportional width
  // =====================================================================

  describe('score bar — proportional width', () => {
    it('When score is 0.5 then score bar width is 50%', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.5 }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.html()).toMatch(/width: 50%/)
    })

    it('When score is 0.3 then score bar width is 30%', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.3 }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.html()).toMatch(/width: 30%/)
    })

    it('When score is 0.85 then score bar width is 85%', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.85 }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.html()).toMatch(/width: 85%/)
    })
  })

  // =====================================================================
  // 3. Score bar — background color class
  // =====================================================================

  describe('score bar — background color class', () => {
    it('When score >= 0.7 then bar uses bg-green-500 class', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.75 }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.html()).toMatch(/bg-emerald-400/)
    })

    it('When score < 0.7 then bar uses bg-red-500 class', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.45 }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.html()).toMatch(/bg-amber-400|bg-red-400/)
    })
  })

  // =====================================================================
  // 4. Feedback display
  // =====================================================================

  describe('feedback display', () => {
    it('When result has a non-empty feedback string then feedback is displayed', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({
            score: 0.85,
            feedback: 'Good translation — minor improvements possible.'
          }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).toContain('Good translation — minor improvements possible.')
    })

    it('When feedback is empty string then no feedback paragraph is rendered', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.5, feedback: '' }),
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.html()).not.toMatch(/<p[^>]*class="text-sm text-gray-700|<p[^>]*class="text-sm text-gray-300/)
    })

    it('When feedback is empty then no "Try again" text is rendered', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.5, feedback: '' }),
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).not.toContain('Try again')
    })

    it('When feedback contains Arabic text then it renders correctly (RTL)', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({
            score: 0.7,
            feedback: 'ممتاز! ترجمة جيدة.'
          }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).toContain('ممتاز! ترجمة جيدة.')
    })
  })

  // =====================================================================
  // 5. Attempts remaining
  // =====================================================================

  describe('attempts remaining', () => {
    it('When activity not complete then remaining attempts are displayed', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.4, attempts_remaining: 2 }),
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).toContain('2')
      expect(wrapper.text()).toContain('attempts remaining')
    })

    it('When 2 attempts remaining then "2 attempts remaining" is displayed', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.5, attempts_remaining: 2 }),
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).toContain('2 attempts remaining')
    })

    it('When 1 attempt remaining then "1 attempt remaining" is displayed', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.3, attempts_remaining: 1 }),
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).toContain('1 attempt remaining')
    })

    it('When activity is complete then remaining attempts are NOT displayed', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 1.0, attempts_remaining: 0 }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).not.toContain('attempts remaining')
    })

    it('When 0 attempts remaining and activity not complete then "attempts remaining" is NOT shown', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.2, attempts_remaining: 0, activity_complete: true }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).not.toContain('attempts remaining')
    })

    it('When no result yet then score panel is always rendered (score + Try Again shown)', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: null,
          maxAttempts: 5,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).toContain('Score')
      expect(wrapper.text()).toContain('Try Again')
    })
  })

  // =====================================================================
  // 6. Correct answer display
  // =====================================================================

  describe('correct answer display', () => {
    it('When max attempts reached and correct_answer exists then correct answer is shown in styled box', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({
            score: 0.2,
            attempts_remaining: 0,
            activity_complete: true,
            correct_answer: 'السلام عليكم'
          }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).toContain('Correct Answer:')
      expect(wrapper.text()).toContain('السلام عليكم')
      expect(wrapper.html()).toMatch(/bg-emerald-500\/8/)
    })

    it('When correct_answer is null then no correct answer box is rendered', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({
            score: 0.5,
            attempts_remaining: 1,
            activity_complete: false
          }),
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).not.toContain('Correct Answer:')
    })
  })

  // =====================================================================
  // 7. Navigation buttons
  // =====================================================================

  describe('navigation buttons', () => {
    it('When activity is complete and more activities exist then "Next Activity" button exists', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 1.0, activity_complete: true }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false,
          totalActivities: 5,
          activityIndex: 0
        }
      })
      expect(wrapper.text()).toContain('Next Activity')
    })

    it('When activity is complete and index < total−1 (mid-lesson) then "Next Activity" is shown but NOT "Complete Lesson"', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 1.0, activity_complete: true }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false,
          totalActivities: 5,
          activityIndex: 2
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const nextBtn = Array.from(buttons).find(b => b.textContent?.includes('Next Activity'))
      const completeBtn = Array.from(buttons).find(b => b.textContent?.includes('Complete Lesson'))
      expect(nextBtn).not.toBeNull()
      expect(completeBtn).toBeUndefined()
    })

    it('When activity is complete but no more activities (last index) then "Next Activity" button is NOT shown', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 1.0, activity_complete: true }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false,
          totalActivities: 1,
          activityIndex: 0
        }
      })
      expect(wrapper.text()).not.toContain('Next Activity')
    })

    it('When activity is the last one (index === total−1) then "Next Activity" button is NOT rendered', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 1.0, activity_complete: true }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false,
          totalActivities: 5,
          activityIndex: 4
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const nextBtn = Array.from(buttons).find(b => b.textContent?.includes('Next Activity'))
      expect(nextBtn).toBeUndefined()
    })

    it('When totalActivities or activityIndex is undefined then "Next Activity" is NOT shown', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 1.0, activity_complete: true }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const nextBtn = Array.from(buttons).find(b => b.textContent?.includes('Next Activity'))
      expect(nextBtn).toBeUndefined()
    })

    it('When lessonJustCompleted then "Complete Lesson" button is rendered', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({
            score: 1.0,
            activity_complete: true,
            lesson_just_completed: true,
            next_lesson_unlocked: true
          }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: true
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const completeBtn = Array.from(buttons).find(b => b.textContent?.includes('Complete Lesson'))
      expect(completeBtn).not.toBeNull()
    })

    it('When lessonJustCompleted is false then "Complete Lesson" button is NOT rendered', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 1.0, activity_complete: true }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const completeBtn = Array.from(buttons).find(b => b.textContent?.includes('Complete Lesson'))
      expect(completeBtn).toBeUndefined()
    })

    it('When activity is complete but lesson not just completed then "Try Again" button exists', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.5, activity_complete: false }),
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).toContain('Try Again')
    })

    it('When activity is complete but lesson not just completed then "Try Again" button is shown', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({
            score: 0.5,
            activity_complete: false,
            lesson_just_completed: false
          }),
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const retryBtn = Array.from(buttons).find(b => b.textContent?.includes('Try Again'))
      expect(retryBtn).not.toBeNull()
    })
  })

  // =====================================================================
  // 8. Lesson completed message & "Complete Lesson"
  // =====================================================================

  describe('lesson completed message & "Complete Lesson"', () => {
    it('When lessonJustCompleted then "Complete Lesson" button is displayed', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({
            score: 1.0,
            activity_complete: true,
            lesson_just_completed: true,
            next_lesson_unlocked: true
          }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: true
        }
      })
      expect(wrapper.text()).toContain('Complete Lesson')
    })

    it('When lessonJustCompleted is false then "Lesson completed" message is NOT displayed', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 1.0, activity_complete: true }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).not.toContain('Complete Lesson')
    })

    it('When lessonJustCompleted is true then "Complete Lesson" button is displayed', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({
            score: 1.0,
            activity_complete: true,
            lesson_just_completed: true,
            next_lesson_unlocked: true
          }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: true
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const roadmapBtn = Array.from(buttons).find(b => b.textContent?.includes('Complete Lesson'))
      expect(roadmapBtn).not.toBeNull()
    })

    it('When lessonJustCompleted is false then "Complete Lesson" is NOT shown', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 1.0, activity_complete: true }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const roadmapBtn = Array.from(buttons).find(b => b.textContent?.includes('Complete Lesson'))
      expect(roadmapBtn).toBeUndefined()
    })
  })

  // =====================================================================
  // 9. No result state
  // =====================================================================

  describe('no result state', () => {
    it('When result is null then score panel shows 0% score and Try Again button', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: null,
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).toContain('Score')
      expect(wrapper.text()).toContain('Try Again')
    })

    it('When result is null then 0% score bar is rendered (width is 0%)', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: null,
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      expect(wrapper.text()).toContain('Score')
      expect(wrapper.text()).toContain('0%')
      expect(wrapper.html()).toMatch(/width: 0%/)
    })

    it('When result is null then Try Again button is rendered', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: null,
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false,
          totalActivities: 5,
          activityIndex: 0
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const retryBtn = Array.from(buttons).find(b => b.textContent?.includes('Try Again'))
      expect(retryBtn).not.toBeNull()
    })
  })

  // =====================================================================
  // 10. Multi-activity completion flow
  // =====================================================================

  describe('multi-activity completion flow', () => {
    it('When last activity (index 4 of 5) is complete and lessonJustCompleted then "Complete Lesson" + "Complete Lesson" shown', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({
            score: 1.0,
            activity_complete: true,
            lesson_just_completed: true,
            next_lesson_unlocked: true
          }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: true,
          totalActivities: 5,
          activityIndex: 4
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const completeBtn = Array.from(buttons).find(b => b.textContent?.includes('Complete Lesson'))
      const roadmapBtn = Array.from(buttons).find(b => b.textContent?.includes('Complete Lesson'))
      expect(completeBtn).not.toBeNull()
      expect(roadmapBtn).not.toBeNull()
    })
  })

  // =====================================================================
  // 11. Event emissions
  // =====================================================================

  describe('event emissions', () => {
    it('When "Next Activity" button exists then it emits "next-activity" on click', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 1.0, activity_complete: true }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: false,
          totalActivities: 5,
          activityIndex: 0
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const nextBtn = Array.from(buttons).find(b => b.textContent?.includes('Next Activity'))
      expect(nextBtn).toBeDefined()
    })

    it('When "Complete Lesson" button exists then it emits "complete-lesson" on click', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({
            score: 1.0,
            activity_complete: true,
            lesson_just_completed: true,
            next_lesson_unlocked: true
          }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: true
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const completeBtn = Array.from(buttons).find(b => b.textContent?.includes('Complete Lesson'))
      expect(completeBtn).toBeDefined()
    })

    it('When "Complete Lesson" button exists then it emits "complete-lesson" on click', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({
            score: 1.0,
            activity_complete: true,
            lesson_just_completed: true,
            next_lesson_unlocked: true
          }),
          maxAttempts: 3,
          isComplete: true,
          lessonJustCompleted: true
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const roadmapBtn = Array.from(buttons).find(b => b.textContent?.includes('Complete Lesson'))
      expect(roadmapBtn).toBeDefined()
    })

    it('When "Try Again" button exists then it emits "retry" on click', async () => {
      const wrapper = await mountSuspended(ActivityScorePanel, {
        props: {
          result: makeResult({ score: 0.5, activity_complete: false }),
          maxAttempts: 3,
          isComplete: false,
          lessonJustCompleted: false
        }
      })
      const buttons = wrapper.element.querySelectorAll('button')
      const retryBtn = Array.from(buttons).find(b => b.textContent?.includes('Try Again'))
      expect(retryBtn).toBeDefined()
    })
  })
})
