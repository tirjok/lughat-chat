// ============================================================================
// Lesson Content Types — derived from backend JSON (backend/content/a1/lesson-01.json)
// ============================================================================

import type { ActivityProgress } from '../shared/types'

// Section types (used in sections array)

export interface DialogueLine {
  speaker: string
  arabic: string
  english: string
  notes?: string
}

export interface DialogueScene {
  label: string
  lines: DialogueLine[]
}

export interface DialogueSectionContent {
  type: 'dialogue'
  scenes: DialogueScene[]
}

export interface VocabWord {
  arabic: string
  english: string
  singular?: string
  plural?: string
}

export interface VocabCategory {
  label: string
  words: VocabWord[]
}

export interface VocabularySectionContent {
  type: 'vocabulary'
  categories: VocabCategory[]
}

export interface PronounEntry {
  arabic: string
  english: string
  example: string
}

export interface PronounsSectionContent {
  type: 'pronouns'
  pronouns: PronounEntry[]
}

export interface ExpressionEntry {
  arabic: string
  english: string
}

export interface ExpressionsSectionContent {
  type: 'expressions'
  expressions: ExpressionEntry[]
}

export interface GrammarExample {
  arabic: string
  english: string
}

export interface GrammarTopic {
  name: string
  description: string
  examples: GrammarExample[]
}

export interface GrammarSectionContent {
  type: 'grammar'
  topics: GrammarTopic[]
}

export type LessonSectionContent
  = | DialogueSectionContent
    | VocabularySectionContent
    | PronounsSectionContent
    | ExpressionsSectionContent
    | GrammarSectionContent

// Discriminated union: each section variant carries its own content type.
export type LessonSection
  = | {
    type: 'dialogue'
    title: string
    content: DialogueSectionContent
  }
  | {
    type: 'vocabulary'
    title: string
    content: VocabularySectionContent
  }
  | {
    type: 'pronouns'
    title: string
    content: PronounsSectionContent
  }
  | {
    type: 'expressions'
    title: string
    content: ExpressionsSectionContent
  }
  | {
    type: 'grammar'
    title: string
    content: GrammarSectionContent
  }

// --- Activity types (used in activities array) ---

export interface DialogueSceneFlat {
  label: string
  arabic: string
  english_expected?: string
}

export interface ListenTranslateActivityContent {
  type: 'listen-translate'
  dialogue: Record<string, DialogueSceneFlat>
}

export interface TranslatedSentence {
  arabic?: string
  english?: string
  arabic_expected?: string
  english_expected?: string
}

export interface TranslateActivityContent {
  type: 'translate-to-english' | 'translate-to-arabic'
  sentences: TranslatedSentence[]
}

export interface CharacterEntry {
  name: string
  arabic: string
  gender: 'male' | 'female'
  sentences: {
    english: string
    arabic_expected: string
  }[]
}

export interface IntroduceCharactersActivityContent {
  type: 'introduce-characters'
  characters: CharacterEntry[]
}

export interface RolePlayActivityContent {
  type: 'role-play'
  scenario: string
  expected_elements: string[]
}

export type ActivityContent
  = | ListenTranslateActivityContent
    | TranslateActivityContent
    | IntroduceCharactersActivityContent
    | RolePlayActivityContent

// Discriminated union: each activity variant carries its own content type.
export type Activity
  = | {
    id: number
    type: 'listen-translate'
    title: string
    description: string
    order: number
    competency_map: Record<string, number>
    max_attempts: number
    content: ListenTranslateActivityContent
  }
  | {
    id: number
    type: 'translate-to-english'
    title: string
    description: string
    order: number
    competency_map: Record<string, number>
    max_attempts: number
    content: TranslateActivityContent
  }
  | {
    id: number
    type: 'translate-to-arabic'
    title: string
    description: string
    order: number
    competency_map: Record<string, number>
    max_attempts: number
    content: TranslateActivityContent
  }
  | {
    id: number
    type: 'introduce-characters'
    title: string
    description: string
    order: number
    competency_map: Record<string, number>
    max_attempts: number
    content: IntroduceCharactersActivityContent
  }
  | {
    id: number
    type: 'role-play'
    title: string
    description: string
    order: number
    competency_map: Record<string, number>
    max_attempts: number
    content: RolePlayActivityContent
  }

// --- Lesson-level types ---

export interface LessonSummary {
  id: number
  level: string
  sequence: number
  title: string
  competency_count: number
  section_count: number
  status: 'available' | 'locked' | 'completed' | 'in_progress'
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
  sections: LessonSection[]
  activities: Activity[]
  progress: LessonProgress
}

export interface UseLessonsOptions {
  baseUrl?: string
}

export interface LevelGroup {
  level: string
  lessons: LessonSummary[]
  progress: number
}

// Module-level singleton state — shared across all consumers.
// When navigating between pages, new instances read the same reactive
// state instead of triggering a second fetch.
let started = false
const lessons = shallowRef<LessonSummary[]>([])
const loading = shallowRef(false)
const error = shallowRef<string | null>(null)

export const useLessons = (options: UseLessonsOptions = {}) => {
  const baseUrl = options.baseUrl || ''

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

  /**
   * Group lessons by CEFR level, sort levels alphabetically, and sort
   * lessons within each level by their `sequence` field.  Computes
   * per-level progress (percentage of completed lessons).
   */
  const groupedLessons = computed<LevelGroup[]>(() => {
    const groups: Record<string, LessonSummary[]> = {}
    for (const lesson of lessons.value) {
      const key = lesson.level
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key]!.push(lesson)
    }

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([level, ls]) => {
        // Sort lessons within the level by sequence (ascending).
        const sorted = [...(ls ?? [])].sort(
          (a, b) => a.sequence - b.sequence
        )
        const total = sorted.length
        const completed = sorted.filter(
          l => l.status === 'completed'
        ).length
        const progress
          = total > 0 ? Math.round((completed / total) * 100) : 0
        return { level, lessons: sorted, progress }
      })
  })

  // Trigger fetch once (singleton pattern).
  if (!started) {
    started = true
    fetchLessons()
  }

  return {
    lessons,
    loading,
    error,
    fetchLessons,
    groupedLessons
  }
}

/** Reset the singleton (for testing only). */
export function __resetLessonsState(): void {
  started = false
  lessons.value = []
  loading.value = false
  error.value = null
}

/**
 * Composable for fetching a single lesson by ID using Nuxt 4 useFetch.
 * Provides SSR-safe data fetching with proper loading/error state.
 * Returns reactive properties compatible with the page template.
 */
export const useLesson = (id: number) => {
  const key = `lesson-${id}`

  const { data, status, error: fetchError, refresh } = useFetch<LessonDetail>(
    `/api/lessons/${id}`,
    {
      key
    }
  )

  // Derive a user-facing error message from the response status
  const errorMessage = computed<string | null>(() => {
    // Check for 404 / 403 response status
    const err = fetchError.value
    if (err) {
      return typeof err === 'string' ? err : String(err)
    }
    return null
  })

  return {
    currentLesson: data,
    currentLoading: computed(() => status.value === 'pending'),
    currentError: errorMessage,
    refresh
  }
}
