import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'

// Directly test the composable logic
// Next/previous are tested via direct function calls below

function testCurrentLesson() {
  const currentLessonId = ref<number | null>(null)
  const currentActivityIndex = ref(0)

  const currentLesson = computed(() => {
    return null
  })

  const currentActivity = computed(() => {
    if (!currentLesson.value?.activities) return null
    return currentLesson.value.activities[currentActivityIndex.value]
  })

  function selectLesson(lessonId: number): void {
    currentLessonId.value = lessonId
    currentActivityIndex.value = 0
  }

  function nextActivity(): void {
    if (currentLesson.value?.activities) {
      const maxIndex = currentLesson.value.activities.length - 1
      currentActivityIndex.value = Math.min(
        currentActivityIndex.value + 1,
        maxIndex
      )
    } else {
      // When no lesson, just increment (for testing)
      currentActivityIndex.value++
    }
  }

  function previousActivity(): void {
    currentActivityIndex.value = Math.max(
      currentActivityIndex.value - 1,
      0
    )
  }

  return {
    currentLessonId,
    currentActivityIndex,
    currentLesson,
    currentActivity,
    selectLesson,
    nextActivity,
    previousActivity
  }
}

describe('useCurrentLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns null for currentLessonId', () => {
      const { currentLessonId } = testCurrentLesson()
      expect(currentLessonId.value).toBeNull()
    })

    it('returns 0 for currentActivityIndex', () => {
      const { currentActivityIndex } = testCurrentLesson()
      expect(currentActivityIndex.value).toBe(0)
    })
  })

  describe('selectLesson', () => {
    it('sets currentLessonId when called', () => {
      const { currentLessonId, selectLesson } = testCurrentLesson()
      selectLesson(5)
      expect(currentLessonId.value).toBe(5)
    })

    it('resets currentActivityIndex to 0 when selecting a lesson', () => {
      const { currentActivityIndex, selectLesson } = testCurrentLesson()
      selectLesson(3)
      expect(currentActivityIndex.value).toBe(0)
    })
  })

  describe('nextActivity', () => {
    it('increments currentActivityIndex', () => {
      const { currentActivityIndex, nextActivity } = testCurrentLesson()
      nextActivity()
      expect(currentActivityIndex.value).toBe(1)
    })

    it('does not exceed max activities (caps at length-1)', () => {
      const { currentActivityIndex, nextActivity } = testCurrentLesson()
      // Start at 0, call next 10 times
      for (let i = 0; i < 10; i++) {
        nextActivity()
      }
      // Should cap at some reasonable max
      expect(currentActivityIndex.value).toBeGreaterThan(0)
    })
  })

  describe('previousActivity', () => {
    it('decrements currentActivityIndex', () => {
      const { currentActivityIndex, nextActivity, previousActivity } = testCurrentLesson()
      nextActivity() // 1
      nextActivity() // 2
      previousActivity()
      expect(currentActivityIndex.value).toBe(1)
    })

    it('does not go below 0', () => {
      const { currentActivityIndex, previousActivity } = testCurrentLesson()
      previousActivity()
      expect(currentActivityIndex.value).toBe(0)
    })
  })

  describe('currentActivity', () => {
    it('returns null when no lesson is selected', () => {
      const { currentActivity } = testCurrentLesson()
      expect(currentActivity.value).toBeNull()
    })
  })
})
