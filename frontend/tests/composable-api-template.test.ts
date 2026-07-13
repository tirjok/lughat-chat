// TEMPLATE: Correct pattern for testing composables that make API calls.
//
// Use this as the starting point when writing tests for composables that:
//  1. Call fetch() or $fetch()
//  2. Use onMounted() or other lifecycle hooks
//  3. Need to test API response handling
//
// Key rules:
//  - Use registerEndpoint() from @nuxt/test-utils/runtime (NOT window.fetch mocking)
//  - Call the composable's public methods directly (NOT via onMounted callbacks)
//  - Import registerEndpoint at the top of the file
//  - Call registerEndpoint BEFORE calling useVoices() (or equivalent)
//  - Call loadVoices() (or equivalent) directly and await it
//
// DO NOT:
//  - Object.defineProperty(window, 'fetch', ...)  (anti-pattern)
//  - Trigger mocked onMounted callbacks for API tests  (anti-pattern)
//  - Rely on setup.ts global mocks for ref/onMounted when API calls are involved  (anti-pattern)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useComposable } from '../app/composables/useComposable'

describe('useComposable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns correct default values', () => {
      const { data } = useComposable()
      expect(data.value).toEqual([])
    })
  })

  describe('successful fetch', () => {
    it('fetches from /api/endpoint and populates the ref', async () => {
      const mockData = [/* ... */]

      // Register the mock endpoint BEFORE calling the composable
      registerEndpoint('/api/endpoint', () => mockData)

      const { data, load } = useComposable()

      // Call the method directly — do NOT trigger onMounted callbacks
      await load()

      expect(data.value).toEqual(mockData)
    })
  })

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      registerEndpoint('/api/endpoint', {
        handler: () => { throw new Error('Network failure') }
      })

      const { data } = useComposable()

      await expect(useComposable().load()).resolves.toEqual([])
      expect(data.value).toEqual([])
    })
  })
})
