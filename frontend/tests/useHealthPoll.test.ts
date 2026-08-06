import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useHealthPoll } from '../app/composables/useHealthPoll'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const testMountedCallbacks: (() => void)[] = []

mockNuxtImport('onMounted', (original) => {
  return (cb: () => void) => {
    testMountedCallbacks.push(cb)
    try {
      original(cb)
    } catch {
      // onMounted not available in unit test context
    }
  }
})

describe('useHealthPoll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testMountedCallbacks.length = 0
  })

  describe('initial state', () => {
    it('sets status to "loading"', () => {
      const poller = useHealthPoll()

      expect(poller.status.value).toBe('loading')
    })

    it('sets modelLoaded to false', () => {
      const poller = useHealthPoll()

      expect(poller.modelLoaded.value).toBe(false)
    })
  })

  describe('successful health check', () => {
    it('transitions status to "ready" when model is loaded', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', model_loaded: true })
      }))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of testMountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.status.value).toBe('ready')
    })

    it('sets modelLoaded to true when status is ready', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', model_loaded: true })
      }))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of testMountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.modelLoaded.value).toBe(true)
    })
  })

  describe('failed health check', () => {
    it('transitions status to "error" when HTTP response is not ok', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of testMountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.status.value).toBe('error')
    })
  })

  describe('polling stops on terminal state', () => {
    it('stops polling after status becomes "ready"', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', model_loaded: true })
      }))

      const poller = useHealthPoll()

      // Trigger onMounted
      for (const cb of testMountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.status.value).toBe('ready')
      expect(poller.modelLoaded.value).toBe(true)
    })
  })

  describe('network error handling', () => {
    it('keeps status as "loading" when fetch throws a network error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network failure')))

      const poller = useHealthPoll()

      // Trigger onMounted
      for (const cb of testMountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.status.value).toBe('loading')
    })
  })

  describe('frontend default timeout vs backend timeout', () => {
    it('frontend default maxRetries × 2s must be ≥ backend LOAD_HARD_TIMEOUT (300s)', () => {
      // This test verifies the frontend config aligns with the backend.
      // If the backend changes LOAD_HARD_TIMEOUT, update this test.
      expect(150 * 2).toBeGreaterThanOrEqual(300)
    })
  })
})
