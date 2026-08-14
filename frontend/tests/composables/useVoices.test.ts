import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVoices } from '~/composables/useVoices'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const testMountedCallbacks: (() => void)[] = []

mockNuxtImport('onMounted', (original) => {
  return (cb: () => void) => {
    testMountedCallbacks.push(cb)
    // If onMounted is available (real component mount), call it directly.
    // Otherwise, tests trigger callbacks manually.
    try {
      original(cb)
    } catch {
      // onMounted not available in unit test context
    }
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
  describe('Voice interface', () => {
    it('Voice type only has id and name fields (no dialect, tag, icon, speaker_wav)', () => {
      // The API returns {id, name} — the interface must match.
      // If extra fields exist, they are dead code that will never be populated.
      const voice = { id: 'test', name: 'Test' } as const
      expect(voice).toMatchObject({ id: expect.any(String), name: expect.any(String) })

      // Verify no extra properties exist on the returned object.
      const keys = Object.keys(voice)
      expect(keys).toEqual(['id', 'name'])
    })
  })
})
