// ============================================================================
// Shared Types — used across multiple composables
// ============================================================================

/**
 * Progress state for a single activity within a lesson.
 * Used by both useProgress and useLessons.
 */
export interface ActivityProgress {
  score: number
  status: string
  attempts: number
}
