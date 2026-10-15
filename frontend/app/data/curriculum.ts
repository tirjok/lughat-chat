/**
 * Curriculum data types and helpers.
 *
 * This file contains ONLY type definitions and internal helper functions.
 * The actual lesson data is loaded from `lesson-*.json` files at build time
 * via `data-loader.ts`.
 *
 * Consumer code imports from this module — the API surface is preserved
 * so that existing pages and components require minimal changes.
 */

// ---------------------------------------------------------------------------
// Type definitions (unchanged from original)
// ---------------------------------------------------------------------------

export interface CurriculumLevel {
  code: string
  title: string
  arabicTitle: string
  description: string
  lessonRange: string
  vocabularyCount: string
  speakingWPM: string
  readingWPM: string
  goal: string
  keySkills: string[]
  lessons: LessonDefinition[]
  gradient: string
}

export interface LessonDefinition {
  id: string
  title: string
  arabicTitle: string
  description: string
  sections: SectionDefinition[]
  competencies?: string[]
  sequence?: number
  activities: ActivityDefinition[]
}

export interface SectionDefinition {
  name?: string
  type?: SectionType
  title?: string
  content: SectionContent
  _lessonId: string
  get items(): SectionItem[]
}

// ---------------------------------------------------------------------------
// Internal helpers (used by data-loader.ts for flat items accessor)
// ---------------------------------------------------------------------------




// ---------------------------------------------------------------------------
// Type exports (unchanged from original)
// ---------------------------------------------------------------------------

export type SectionItemType = 'dialogue' | 'vocabulary' | 'pronoun' | 'expression' | 'grammar' | 'activity'

export interface SectionItem {
  id: string
  arabic: string
  transliteration?: string
  english?: string
  notes?: string
  audioUrl?: string
  options?: string[]
}

export type SectionType
  = | 'dialogue'
    | 'vocabulary'
    | 'pronouns'
    | 'expressions'
    | 'grammar'
    | 'activity'

export interface DialogueLine {
  speaker: string
  arabic: string
  english: string
  notes?: string
}

export interface VocabWord {
  arabic: string
  english: string
  singular?: string
  plural?: string
}

export interface DialogueScene {
  label: string
  lines: DialogueLine[]
}

export type SectionContent
  = | { type: 'dialogue', scenes: DialogueScene[] }
    | { type: 'vocabulary', categories: { label: string, words: VocabWord[] }[] }
    | { type: 'pronouns', pronouns: { arabic: string, english: string, example: string }[] }
    | { type: 'expressions', expressions: { arabic: string, english: string }[] }
    | { type: 'grammar', topics: { name: string, description: string, examples: { arabic: string, english: string }[] }[] }

export type ActivityContent
  = | { type: 'listen-translate', dialogue: { [sceneKey: string]: { label: string, arabic: string, english_expected: string } } }
    | { type: 'translate-to-english', sentences: { arabic: string, english_expected: string }[] }
    | { type: 'translate-to-arabic', sentences: { english: string, arabic_expected: string }[] }
    | { type: 'introduce-characters', characters: { name: string, arabic: string, gender: string, sentences: { english: string, arabic_expected: string }[] }[] }
    | { type: 'role-play', scenario: string, expectedElements: string[] }
    | { type: 'fill-blank', prompt: string, answer: string, options?: string[] }
    | { type: 'matching', pairs: { source: string, target: string }[] }

export interface ActivityDefinition {
  id: number
  type: ActivityType
  title: string
  description: string
  order: number
  competencyMap: Record<string, number>
  maxAttempts: number
  content: ActivityContent
}

export type ActivityType
  = | 'listen-translate'
    | 'role-play'
    | 'fill-blank'
    | 'matching'
    | 'translate-to-english'
    | 'translate-to-arabic'
    | 'introduce-characters'

// ---------------------------------------------------------------------------
// Re-exports from data-loader (same API surface as before)
// ---------------------------------------------------------------------------

export {
  loadLevels,
  getLevelByCode,
  getLessonById,
  getLevelForLesson,
  getAllLessons,
  getTotalLessonCount,
  getActivitiesByLesson,
  loadLesson
} from '~/data/data-loader'
