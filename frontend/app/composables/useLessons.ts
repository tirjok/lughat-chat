// Composable for fetching lesson content from the backend API.
//
// Slices 4 & 5 provide:
//   GET /api/lessons          → lesson summaries with status
//   GET /api/lessons/:id      → full lesson data with progress
//
// This composable wraps those endpoints with loading and error states.

export interface LessonSummary {
  id: number
  level: string
  sequence: number
  title: string
  competency_count: number
  section_count: number
  status: 'available' | 'locked' | 'completed' | 'in_progress'
}

export interface ActivityProgress {
  score: number
  status: string
  attempts: number
}

export interface LessonProgress {
  status: string
  activities: Record<string, ActivityProgress>
}

export interface LessonDetail {
  id: number
  level: string
  sequence: number
  title: string
  competencies: string[]
  sections: Record<string, unknown>[]
  activities: Record<string, unknown>[]
  progress: LessonProgress
}

export interface UseLessonsOptions {
  baseUrl?: string
}

export const useLessons = (options: UseLessonsOptions = {}) => {
  const baseUrl = options.baseUrl || ''

  const lessons = ref<LessonSummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const currentLesson = ref<LessonDetail | null>(null)
  const currentLoading = ref(false)
  const currentError = ref<string | null>(null)

  // Fetch all lesson summaries
  async function fetchLessons(): Promise<LessonSummary[]> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${baseUrl}/api/lessons`)
      if (!response.ok) {
        throw new Error(`Failed to fetch lessons: ${response.status}`)
      }
      const data = await response.json()
      lessons.value = data as LessonSummary[]
      return lessons.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      lessons.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  // Fetch a single lesson by ID
  async function fetchLesson(id: number): Promise<LessonDetail | null> {
    currentLoading.value = true
    currentError.value = null
    try {
      const response = await fetch(`${baseUrl}/api/lessons/${id}`)
      if (response.status === 404) {
        currentError.value = `Lesson with id ${id} not found`
        currentLesson.value = null
        return null
      }
      if (response.status === 403) {
        try {
          const data = await response.json()
          currentError.value = data.detail || 'This lesson is locked'
        } catch {
          currentError.value = 'This lesson is locked'
        }
        currentLesson.value = null
        return null
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch lesson: ${response.status}`)
      }
      const data = await response.json()
      currentLesson.value = data as LessonDetail
      return currentLesson.value
    } catch (e) {
      currentError.value = e instanceof Error ? e.message : String(e)
      currentLesson.value = null
      return null
    } finally {
      currentLoading.value = false
    }
  }

  return {
    lessons,
    loading,
    error,
    currentLesson,
    currentLoading,
    currentError,
    fetchLessons,
    fetchLesson
  }
}
