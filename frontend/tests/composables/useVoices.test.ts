import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clearUseStateRegistry } from '../setup'
import { useVoices } from '~/composables/studio/useVoices'

describe('useVoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearUseStateRegistry()
  })

  describe('initial state', () => {
    it('returns an empty voices array', () => {
      const { voices } = useVoices()
      expect(voices.value).toEqual([])
    })
  })

  describe('successful fetch', () => {
    it('fetches voices from /api/voices and populates the cached array', async () => {
      const mockVoices = [
        { id: 'female', name: 'Female Voice', dialect: '', tag: '', icon: '', speaker_wav: '' },
        { id: 'male', name: 'Male Voice', dialect: '', tag: '', icon: '', speaker_wav: '' }
      ]

      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockVoices)
      })) as unknown as typeof global.fetch

      const { voices, loadVoices } = useVoices()
      await loadVoices()

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(voices.value).toEqual(mockVoices)
      expect(fetch).toHaveBeenCalledWith('/api/voices')
    })
  })

  describe('fetch error handling', () => {
    it('returns an empty array when fetch throws a network error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network failure'))) as unknown as typeof global.fetch

      const { voices, loadVoices } = useVoices()
      await loadVoices()

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(voices.value).toEqual([])
    })

    it('returns an empty array when response is not ok', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 503
      })) as unknown as typeof global.fetch

      const { voices, loadVoices } = useVoices()
      await loadVoices()

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(voices.value).toEqual([])
    })
  })
})
