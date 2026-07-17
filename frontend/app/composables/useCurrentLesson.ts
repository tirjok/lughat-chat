// Composable for managing current lesson and activity state.
//
// Slice 7: Navigation Infrastructure
//
// This composable tracks which lesson and activity the user is viewing,
// and provides navigation between activities within a lesson.
// It is intentionally lightweight — the actual lesson data is fetched
// by `useLessons` and accessed via `currentLessonId`.

import { ref, computed } from 'vue'
import type { LessonDetail } from './useLessons'

export function useCurrentLesson() {
  const currentLessonId = ref<number | null>(null)
  const currentActivityIndex = ref<number>(0)

  const currentLesson = computed<LessonDetail | null>(() => {
    // The consuming page/composable must populate this via useLessons.
    // This composable manages the ID; the actual lesson object is
    // resolved by the parent using useLessons().lessons.
    return null
  })

  const currentActivity = computed(() => {
    const lesson = currentLesson.value
    if (!lesson?.activities) return null
    const idx = currentActivityIndex.value
    return lesson.activities[Math.min(idx, lesson.activities.length - 1)] ?? null
  })

  /**
   * Select a lesson by ID and reset to the first activity.
   * @param lessonId - The lesson identifier
   */
  function selectLesson(lessonId: number): void {
    currentLessonId.value = lessonId
    currentActivityIndex.value = 0
  }

  /**
   * Advance to the next activity within the current lesson.
   * Clamps to the last activity if already at the end.
   */
  function nextActivity(): void {
    const lesson = currentLesson.value
    if (!lesson?.activities) return
    const maxIndex = lesson.activities.length - 1
    currentActivityIndex.value = Math.min(
      currentActivityIndex.value + 1,
      maxIndex
    )
  }

  /**
   * Go to the previous activity within the current lesson.
   * Clamps to the first activity (index 0).
   */
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
