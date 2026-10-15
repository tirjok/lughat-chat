/**
 * Build-time JSON data loader.
 *
 * Reads all `lesson-*.json` files from the data directory, converts them into
 * the application's in-memory data model, and exports the same API surface
 * that `curriculum.ts` previously provided.
 *
 * JSON files are imported at build time and bundled into the application.
 * No network calls at runtime. During development, the Nuxt dev server
 * watches JSON files and hot-reloads on change.
 */

import type {
  ActivityContent,
  ActivityDefinition,
  ActivityType,
  CurriculumLevel,
  DialogueLine,
  DialogueScene,
  LessonDefinition,
  SectionContent,
  SectionDefinition,
  SectionItem,
  SectionType,
  VocabWord
} from '~/data/curriculum'

// ---------------------------------------------------------------------------
// JSON schema (what the CLI produces)
// ---------------------------------------------------------------------------

interface JsonLesson {
  id: number
  level: string
  sequence?: number
  title: string
  arabicTitle: string
  description?: string
  competencies?: string[]
  sections: JsonSection[]
  activities: JsonActivity[]
}

interface JsonSection {
  type: string
  title?: string
  content: Record<string, unknown>
}

interface JsonActivity {
  id: number
  type: string
  title: string
  description: string
  order: number
  competency_map?: Record<string, number>
  max_attempts?: number
  content: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const SECTION_CHARS: Record<string, string> = {
  dialogue: 'd',
  vocabulary: 'v',
  pronouns: 'p',
  expressions: 'e',
  grammar: 'g',
  activity: 'a'
}

function buildSectionId(lessonId: string, sectionType: string, index: number): string {
  const char = SECTION_CHARS[sectionType] ?? 'x'
  return `${lessonId}-${char}${index}`
}

// ---------------------------------------------------------------------------
// Flatten section content → SectionItem[] (backward-compatible accessor)
// ---------------------------------------------------------------------------

function flattenSectionContent(content: SectionContent, lessonId: string): SectionItem[] {
  switch (content.type) {
    case 'dialogue': {
      const scenes = content as { type: 'dialogue', scenes: { label: string, lines: DialogueLine[] }[] }
      return scenes.scenes.flatMap(scene => scene.lines).map((line, index) => ({
        id: buildSectionId(lessonId, 'dialogue', index + 1),
        arabic: line.arabic,
        english: line.english,
        notes: line.notes
      }))
    }
    case 'vocabulary': {
      const vocab = content as { type: 'vocabulary', categories: { label: string, words: VocabWord[] }[] }
      return vocab.categories.flatMap(cat => cat.words).map((word, index) => ({
        id: buildSectionId(lessonId, 'vocabulary', index + 1),
        arabic: word.arabic,
        english: word.english,
        notes: word.singular ?? word.plural
      }))
    }
    case 'pronouns': {
      const pron = content as { type: 'pronouns', pronouns: { arabic: string, english: string, example: string }[] }
      return pron.pronouns.map((p, index) => ({
        id: buildSectionId(lessonId, 'pronouns', index + 1),
        arabic: p.arabic,
        english: p.english,
        notes: p.example
      }))
    }
    case 'expressions': {
      const expr = content as { type: 'expressions', expressions: { arabic: string, english: string }[] }
      return expr.expressions.map((e, index) => ({
        id: buildSectionId(lessonId, 'expressions', index + 1),
        arabic: e.arabic,
        english: e.english
      }))
    }
    case 'grammar': {
      const gram = content as { type: 'grammar', topics: { name: string, description: string, examples: { arabic: string, english: string }[] }[] }
      let globalIndex = 0
      return gram.topics.flatMap(topic => topic.examples.map((ex) => {
        const id = buildSectionId(lessonId, 'grammar', globalIndex + 1)
        globalIndex++
        return {
          id,
          arabic: ex.arabic,
          english: ex.english,
          notes: topic.description
        }
      })).flat()
    }
    default:
      return []
  }
}

// ---------------------------------------------------------------------------
// JSON → TS type conversion
// ---------------------------------------------------------------------------

function jsonToDialogueContent(content: Record<string, unknown>): SectionContent {
  const json = content as { scenes?: { label: string, lines?: { speaker?: string, arabic: string, english: string, notes?: string }[] }[] }
  const scenes: DialogueScene[] = (json.scenes ?? []).map(scene => ({
    label: scene.label ?? '',
    lines: (scene.lines ?? []).map(line => ({
      speaker: line.speaker ?? '',
      arabic: line.arabic,
      english: line.english,
      notes: line.notes
    }))
  }))
  return { type: 'dialogue', scenes }
}

function jsonToVocabularyContent(content: Record<string, unknown>): SectionContent {
  const json = content as { categories?: { label: string, words?: { arabic: string, english: string, singular?: string, plural?: string }[] }[] }
  const categories = (json.categories ?? []).map(cat => ({
    label: cat.label ?? '',
    words: (cat.words ?? []).map(word => ({
      arabic: word.arabic,
      english: word.english,
      singular: word.singular,
      plural: word.plural
    }))
  }))
  return { type: 'vocabulary', categories }
}

function jsonToPronounsContent(content: Record<string, unknown>): SectionContent {
  const json = content as { pronouns?: { arabic: string, english: string, example: string }[] }
  return {
    type: 'pronouns',
    pronouns: (json.pronouns ?? []).map(p => ({
      arabic: p.arabic,
      english: p.english,
      example: p.example
    }))
  }
}

function jsonToExpressionsContent(content: Record<string, unknown>): SectionContent {
  const json = content as { expressions?: { arabic: string, english: string }[] }
  return {
    type: 'expressions',
    expressions: (json.expressions ?? []).map(e => ({
      arabic: e.arabic,
      english: e.english
    }))
  }
}

function jsonToGrammarContent(content: Record<string, unknown>): SectionContent {
  const json = content as { topics?: { name: string, description: string, examples?: { arabic: string, english: string }[] }[] }
  return {
    type: 'grammar',
    topics: (json.topics ?? []).map(topic => ({
      name: topic.name,
      description: topic.description,
      examples: (topic.examples ?? []).map(ex => ({
        arabic: ex.arabic,
        english: ex.english
      }))
    }))
  }
}

function jsonToSectionContent(type: string, content: Record<string, unknown>): SectionContent {
  switch (type) {
    case 'dialogue':
      return jsonToDialogueContent(content)
    case 'vocabulary':
      return jsonToVocabularyContent(content)
    case 'pronouns':
      return jsonToPronounsContent(content)
    case 'expressions':
      return jsonToExpressionsContent(content)
    case 'grammar':
      return jsonToGrammarContent(content)
    default:
      // Unknown section type — return empty content
      return { type: type as SectionType, scenes: [] } as SectionContent
  }
}

function jsonToActivityContent(type: string, content: Record<string, unknown>): ActivityContent {
  // Forward the raw content as-is; the activity components handle the discriminated union
  return content as ActivityContent
}

function jsonToActivity(json: JsonActivity): ActivityDefinition {
  return {
    id: json.id,
    type: json.type as ActivityType,
    title: json.title,
    description: json.description,
    order: json.order,
    competencyMap: json.competency_map ?? {},
    maxAttempts: json.max_attempts ?? 3,
    content: jsonToActivityContent(json.type, json.content)
  }
}

function buildSectionDefinition(
  jsonSection: JsonSection,
  lessonId: string
): SectionDefinition {
  const content = jsonToSectionContent(jsonSection.type, jsonSection.content)
  const sectionType = jsonSection.type as SectionType

  return {
    name: jsonSection.title,
    type: sectionType,
    title: jsonSection.title,
    content,
    _lessonId: lessonId,
    get items(): SectionItem[] {
      return flattenSectionContent(content, lessonId)
    }
  }
}

function jsonToLesson(json: JsonLesson): LessonDefinition {
  const lessonId = `${json.level.toLowerCase()}-${String(json.id).padStart(2, '0')}`
  const sections = json.sections.map(s => buildSectionDefinition(s, lessonId))

  return {
    id: lessonId,
    title: json.title,
    arabicTitle: json.arabicTitle,
    description: json.description ?? '',
    sections,
    competencies: json.competencies,
    sequence: json.sequence,
    activities: json.activities.map(jsonToActivity)
  }
}

// ---------------------------------------------------------------------------
// Level aggregation
// ---------------------------------------------------------------------------

function buildLevels(lessons: LessonDefinition[]): CurriculumLevel[] {
  const levelMap = new Map<string, LessonDefinition[]>()

  for (const lesson of lessons) {
    const existing = levelMap.get(lesson.id.split('-')[0]!.toUpperCase())
    if (existing) {
      existing.push(lesson)
    } else {
      levelMap.set(lesson.id.split('-')[0]!.toUpperCase(), [lesson])
    }
  }

  const gradients: Record<string, string> = {
    A1: 'from-emerald-500 to-teal-600',
    A2: 'from-blue-500 to-indigo-600',
    B1: 'from-violet-500 to-purple-600',
    B2: 'from-orange-500 to-red-600',
    C1: 'from-amber-500 to-yellow-600',
    C2: 'from-rose-500 to-pink-600'
  }

  return Array.from(levelMap.entries()).map(([code, lessonsArr]) => {
    const sorted = [...lessonsArr].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    return {
      code,
      title: code === 'A1' ? 'Beginner' : code === 'A2' ? 'Elementary' : code === 'B1' ? 'Intermediate' : code === 'B2' ? 'Upper Intermediate' : code === 'C1' ? 'Advanced' : 'Proficiency',
      arabicTitle: code === 'A1' ? 'المستوى المبتدئ' : code === 'A2' ? 'المستوى المبتدئ المتقدم' : code === 'B1' ? 'المستوى المتوسط' : code === 'B2' ? 'المستوى المتقدم' : code === 'C1' ? 'المستوى المتخصص' : 'إتقان اللغة',
      description: `${code} level curriculum`,
      lessonRange: `${sorted[0]?.id}–${sorted[sorted.length - 1]?.id}`,
      vocabularyCount: `${sorted.reduce((sum, l) => sum + l.sections.filter(s => s.type === 'vocabulary').reduce((s, sec) => s + sec.items.length, 0), 0)}`,
      speakingWPM: `${code === 'A1' ? '0' : code === 'A2' ? '30' : code === 'B1' ? '60' : code === 'B2' ? '90' : code === 'C1' ? '120' : '150'}`,
      readingWPM: `${code === 'A1' ? '20' : code === 'A2' ? '40' : code === 'B1' ? '70' : code === 'B2' ? '100' : code === 'C1' ? '130' : '160'}`,
      goal: code === 'A1' ? 'Memorize ~500 Arabic root words' : code === 'A2' ? 'Memorize ~1000 Arabic root words' : code === 'B1' ? 'Memorize ~2500 root words' : code === 'B2' ? 'Memorize ~4000 root words' : code === 'C1' ? 'Memorize ~6000 root words' : 'Memorize ~8000 root words',
      keySkills: sorted.flatMap(l => l.competencies ?? []),
      lessons: sorted,
      gradient: gradients[code] ?? 'from-gray-500 to-slate-600'
    }
  })
}

// ---------------------------------------------------------------------------
// Lazy-loaded data (loaded on first access)
// ---------------------------------------------------------------------------

let _cachedLevels: CurriculumLevel[] | null = null
let _allLessons: LessonDefinition[] | null = null

function loadAllJsonLessons(): JsonLesson[] {
  // Try Vite/Nuxt build-time glob first (production build)
  try {
    const modules = import.meta.glob<JsonLesson>('./lesson-*.json', { eager: true })
    const lessons: JsonLesson[] = []
    for (const _path of Object.keys(modules)) {
      const mod = modules[_path]
      if (mod && typeof mod === 'object' && 'default' in mod) {
        lessons.push(mod.default as JsonLesson)
      } else if (mod) {
        lessons.push(mod as JsonLesson)
      }
    }
    if (lessons.length > 0) return lessons
  } catch {
    // import.meta.glob not available (test environment)
  }

  // Fallback: read JSON files directly (test environment)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path')
    const dataDir = path.dirname(new URL(import.meta.url).pathname)
    const files = fs.readdirSync(dataDir).filter((f: string) => /^lesson-\d+\.json$/.test(f)).sort()
    return files.map((f: string) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf-8')) as JsonLesson)
  } catch {
    return []
  }
}

function getLevels(): CurriculumLevel[] {
  if (_cachedLevels === null) {
    const jsonLessons = loadAllJsonLessons()
    const lessons = jsonLessons.map(jsonToLesson)
    _cachedLevels = buildLevels(lessons)
    _allLessons = _cachedLevels.flatMap(l => l.lessons)
  }
  return _cachedLevels
}

// ---------------------------------------------------------------------------
// Public API (identical to current curriculum.ts surface)
// ---------------------------------------------------------------------------

/** Load all levels from JSON files. */
export function loadLevels(): CurriculumLevel[] {
  return getLevels()
}

/** Get a level by its code (e.g., 'A1'). */
export function getLevelByCode(code: string): CurriculumLevel | undefined {
  return loadLevels().find(l => l.code.toLowerCase() === code.toLowerCase())
}

/** Get a lesson by its ID (e.g., 'a1-01'). */
export function getLessonById(id: string): LessonDefinition | undefined {
  return getLevels().flatMap(l => l.lessons).find(l => l.id === id)
}

/** Get the level that contains a given lesson ID. */
export function getLevelForLesson(lessonId: string): CurriculumLevel | undefined {
  return loadLevels().find(l => l.lessons.some(l => l.id === lessonId))
}

/** Get all lessons across all levels (flat list). */
export function getAllLessons(): LessonDefinition[] {
  return getLevels().flatMap(l => l.lessons)
}

/** Get total lesson count across all levels. */
export function getTotalLessonCount(): number {
  return getLevels().reduce((sum, l) => sum + l.lessons.length, 0)
}

/** Get activities for a specific lesson. */
export function getActivitiesByLesson(lessonId: string): ActivityDefinition[] {
  const lesson = getLessonById(lessonId)
  return lesson ? lesson.activities : []
}

/** Load a single lesson by ID (for pages that need one lesson). */
export function loadLesson(id: string): LessonDefinition | undefined {
  return getLessonById(id)
}
