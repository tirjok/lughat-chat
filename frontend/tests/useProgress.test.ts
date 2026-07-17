import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useProgress } from '../app/composables/useProgress'

describe('useProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns null for progress', () => {
      const { progress } = useProgress()
      expect(progress.value).toBeNull()
    })

    it('has loading and error as false/null', () => {
      const { loading, error } = useProgress()
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })
  })

  describe('fetchProgress', () => {
    it('fetches progress data from /api/lessons/:id', async () => {
      const mockProgress = {
        status: 'in_progress',
        activities: {
          1: { score: 0.5, status: 'in_progress', attempts: 1 },
          2: { score: 0, status: 'available', attempts: 0 }
        }
      }

      registerEndpoint('/api/lessons/1', () => ({
        id: 1, level: 'A1', sequence: 1, title: 'Test',
        competencies: [], sections: [], activities: [],
        progress: mockProgress
      }))

      const { progress, fetchProgress } = useProgress()

      await fetchProgress(1)

      expect(progress.value).toEqual(mockProgress)
    })

    it('sets loading to true during fetch', async () => {
      registerEndpoint('/api/lessons/1', () => ({
        id: 1, level: 'A1', sequence: 1, title: 'Test',
        competencies: [], sections: [], activities: [],
        progress: { status: 'available', activities: {} }
      }))

      const { loading, fetchProgress } = useProgress()

      const promise = fetchProgress(1)
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })

    it('sets error when fetch fails', async () => {
      registerEndpoint('/api/lessons/999', {
        handler: () => {
          throw new Error('HTTP 500: Server error')
        }
      })

      const { error, fetchProgress } = useProgress()

      await fetchProgress(999)
      expect(error.value).toContain('500')
    })
  })
})
