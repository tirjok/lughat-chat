import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useLessons, __resetLessonsState } from '../app/composables/useLessons'

describe('useLessons', () => {
  vi.clearAllMocks()
  __resetLessonsState()

  describe('initial state', () => {
    beforeEach(() => {
      registerEndpoint('/api/lessons', () => [])
    })

    it('returns empty lessons array', () => {
      const { lessons } = useLessons()
      expect(lessons.value).toEqual([])
    })

    it('has loading and error as false/null after fetch completes', async () => {
      const { loading, error, fetchLessons } = useLessons()
      await fetchLessons()
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
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
      const originalFetch = global.fetch
      const mockRejected = vi.fn().mockRejectedValue(new Error('Network failure'))
      global.fetch = mockRejected as typeof fetch

      const { lessons, fetchLessons } = useLessons()
      await fetchLessons()
      expect(lessons.value).toEqual([])

      global.fetch = originalFetch
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
        { id: 3, level: 'A1', sequence: 3, title: 'Lesson 3', competency_count: 1, section_count: 1, status: 'locked' },
        { id: 1, level: 'A1', sequence: 1, title: 'Lesson 1', competency_count: 1, section_count: 1, status: 'available' },
        { id: 2, level: 'A1', sequence: 2, title: 'Lesson 2', competency_count: 1, section_count: 1, status: 'locked' },
        { id: 4, level: 'A2', sequence: 2, title: 'Lesson 4', competency_count: 1, section_count: 1, status: 'locked' },
        { id: 5, level: 'A2', sequence: 1, title: 'Lesson 5', competency_count: 1, section_count: 1, status: 'locked' }
      ]

      registerEndpoint('/api/lessons', () => mockLessons)

      const { lessons, fetchLessons, groupedLessons } = useLessons()
      await fetchLessons()

      // The raw lessons array preserves API order (not sorted).
      expect(lessons.value).toEqual(mockLessons)

      // groupedLessons must sort by level first, then by sequence within each level.
      const groups = groupedLessons.value
      expect(groups.length).toBe(2)

      // A1 group: lessons ordered by sequence 1, 2, 3
      const a1 = groups.find(g => g.level === 'A1')
      expect(a1).toBeDefined()
      expect(a1!.lessons.map(l => l.sequence)).toEqual([1, 2, 3])

      // A2 group: lessons ordered by sequence 1, 2 (reversed in API response)
      const a2 = groups.find(g => g.level === 'A2')
      expect(a2).toBeDefined()
      expect(a2!.lessons.map(l => l.sequence)).toEqual([1, 2])
    })
  })
})
