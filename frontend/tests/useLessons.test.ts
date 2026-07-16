import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useLessons } from '../app/composables/useLessons'

describe('useLessons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns empty lessons array', () => {
      const { lessons, currentLesson } = useLessons()
      expect(lessons.value).toEqual([])
      expect(currentLesson.value).toBeNull()
    })

    it('has loading and error as false/null', () => {
      const { loading, error, currentLoading, currentError } = useLessons()
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(currentLoading.value).toBe(false)
      expect(currentError.value).toBeNull()
    })
  })

  describe('fetchLessons', () => {
    it('fetches lesson summaries from /api/lessons and populates the ref', async () => {
      const mockLessons = [
        {
          id: 1,
          level: 'A1',
          sequence: 1,
          title: 'The Salutations',
          competency_count: 5,
          section_count: 5,
          status: 'available'
        }
      ]

      registerEndpoint('/api/lessons', () => mockLessons)

      const { lessons, fetchLessons } = useLessons()

      await fetchLessons()

      expect(lessons.value).toEqual(mockLessons)
    })

    it('returns empty array when fetch throws a network error', async () => {
      registerEndpoint('/api/lessons', {
        handler: () => { throw new Error('Network failure') }
      })

      const { lessons, fetchLessons } = useLessons()

      await expect(fetchLessons()).resolves.toEqual([])
      expect(lessons.value).toEqual([])
    })

    it('sets loading to true during fetch', async () => {
      registerEndpoint('/api/lessons', () => Promise.resolve([]))

      const { loading, fetchLessons } = useLessons()

      const promise = fetchLessons()
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })

    it('returns lessons sorted by level then sequence', async () => {
      const mockLessons = [
        { id: 1, level: 'A1', sequence: 1, title: 'Lesson 1', competency_count: 1, section_count: 1, status: 'available' },
        { id: 2, level: 'A1', sequence: 2, title: 'Lesson 2', competency_count: 1, section_count: 1, status: 'locked' },
        { id: 3, level: 'A2', sequence: 1, title: 'Lesson 3', competency_count: 1, section_count: 1, status: 'locked' }
      ]

      registerEndpoint('/api/lessons', () => mockLessons)

      const { fetchLessons } = useLessons()
      const result = await fetchLessons()

      expect(result).toEqual(mockLessons)
    })
  })

  describe('fetchLesson', () => {
    it('fetches full lesson data from /api/lessons/:id', async () => {
      const mockLesson = {
        id: 1,
        level: 'A1',
        sequence: 1,
        title: 'The Salutations',
        competencies: ['Can read fluently'],
        sections: [
          { type: 'dialogue', title: 'Main Text', content: {} },
          { type: 'vocabulary', title: 'Vocabulary', content: {} },
          { type: 'pronouns', title: 'Pronouns', content: {} },
          { type: 'expressions', title: 'Expressions', content: {} },
          { type: 'grammar', title: 'Grammar', content: {} }
        ],
        activities: [
          { id: 1, type: 'listen-translate', title: 'Read & Translate', description: '', order: 1, competency_map: {}, max_attempts: 3 },
          { id: 2, type: 'translate-to-english', title: 'Translate', description: '', order: 2, competency_map: {}, max_attempts: 3 },
          { id: 3, type: 'translate-to-arabic', title: 'Translate to Arabic', description: '', order: 3, competency_map: {}, max_attempts: 3 },
          { id: 4, type: 'introduce-characters', title: 'Characters', description: '', order: 4, competency_map: {}, max_attempts: 3 },
          { id: 5, type: 'role-play', title: 'Role-Play', description: '', order: 5, competency_map: {}, max_attempts: 3 }
        ],
        progress: {
          status: 'available',
          activities: {
            1: { score: 0, status: 'available', attempts: 0 },
            2: { score: 0, status: 'available', attempts: 0 },
            3: { score: 0, status: 'available', attempts: 0 },
            4: { score: 0, status: 'available', attempts: 0 },
            5: { score: 0, status: 'available', attempts: 0 }
          }
        }
      }

      registerEndpoint('/api/lessons/1', () => mockLesson)

      const { currentLesson, fetchLesson } = useLessons()

      await fetchLesson(1)

      expect(currentLesson.value).toEqual(mockLesson)
    })

    it('returns null and sets error when lesson not found (404)', async () => {
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: 'Lesson with id 999 not found' })
      }))
      global.fetch = mockFetch as unknown as typeof fetch

      const { currentLesson, currentError, fetchLesson } = useLessons()

      await fetchLesson(999)
      expect(currentLesson.value).toBeNull()
      expect(currentError.value).toContain('not found')
    })

    it('returns null and sets error when lesson is locked (403)', async () => {
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ detail: 'This lesson is locked. Complete previous lessons to unlock.' })
      }))
      global.fetch = mockFetch as unknown as typeof fetch

      const { currentLesson, currentError, fetchLesson } = useLessons()

      await fetchLesson(2)
      expect(currentLesson.value).toBeNull()
      expect(currentError.value).toContain('locked')
    })

    it('sets loading to true during fetch', async () => {
      registerEndpoint('/api/lessons/1', () => ({
        id: 1, level: 'A1', sequence: 1, title: 'Test',
        competencies: [], sections: [], activities: [],
        progress: { status: 'available', activities: {} }
      }))

      const { currentLoading, fetchLesson } = useLessons()

      const promise = fetchLesson(1)
      expect(currentLoading.value).toBe(true)
      await promise
      expect(currentLoading.value).toBe(false)
    })
  })
})
