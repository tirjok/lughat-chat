import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVoices } from '~/composables/useVoices'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const testMountedCallbacks: (() => void)[] = []

mockNuxtImport('onMounted', () => {
  return (cb: () => void) => {
    testMountedCallbacks.push(cb)
  }
})

describe('useVoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testMountedCallbacks.length = 0
  })

  describe('initial state', () => {
    it('returns an empty voices array', () => {
      const { voices } = useVoices()

      expect(voices.value).toEqual([])
    })
  })

  describe('successful fetch', () => {
    it('fetches voices from /api/voices on mount and populates the ref', async () => {
      const mockVoices = [
        { id: 'female', name: 'Female Voice' },
        { id: 'male', name: 'Male Voice' }
      ]

      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockVoices)
      }))

      const { voices } = useVoices()

      // Trigger onMounted to start fetching
      for (const cb of testMountedCallbacks) {
        cb()
      }

      // Wait for the fetch to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(voices.value).toEqual(mockVoices)
      expect(fetch).toHaveBeenCalledWith('/api/voices')
    })
  })

  describe('fetch error handling', () => {
    it('returns an empty array when fetch throws a network error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network failure')))

      const { voices } = useVoices()

      // Trigger onMounted
      for (const cb of testMountedCallbacks) {
        cb()
      }

      // Wait for the fetch to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(voices.value).toEqual([])
    })

    it('returns an empty array when response is not ok', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 503
      }))

      const { voices } = useVoices()

      // Trigger onMounted
      for (const cb of testMountedCallbacks) {
        cb()
      }

      // Wait for the fetch to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(voices.value).toEqual([])
    })
  })
})
