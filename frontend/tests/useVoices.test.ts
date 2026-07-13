import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useVoices } from '../app/composables/useVoices'

describe('useVoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns an empty voices array', () => {
      const { voices } = useVoices()

      expect(voices.value).toEqual([])
    })
  })

  describe('successful fetch', () => {
    it('fetches voices from /api/voices and populates the ref', async () => {
      const mockVoices = [
        { id: 'female', name: 'Female Voice', dialect: '', tag: '', icon: '', speaker_wav: '' },
        { id: 'male', name: 'Male Voice', dialect: '', tag: '', icon: '', speaker_wav: '' }
      ]

      registerEndpoint('/api/voices', () => mockVoices)

      const { voices, loadVoices } = useVoices()

      // Call loadVoices directly instead of relying on onMounted
      await loadVoices()

      expect(voices.value).toEqual(mockVoices)
    })
  })

  describe('fetch error handling', () => {
    it('returns an empty array when fetch throws a network error', async () => {
      registerEndpoint('/api/voices', {
        handler: () => { throw new Error('Network failure') }
      })

      const { voices } = useVoices()

      await expect(useVoices().loadVoices()).resolves.toEqual([])
      expect(voices.value).toEqual([])
    })

    it('returns an empty array when response is not ok', async () => {
      registerEndpoint('/api/voices', {
        handler: () => {
          throw new Error('HTTP 503: Service Unavailable')
        }
      })

      const { voices } = useVoices()

      await expect(useVoices().loadVoices()).resolves.toEqual([])
      expect(voices.value).toEqual([])
    })
  })
})
