import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useHealthPoll } from '../app/composables/useHealthPoll'
import { mountedCallbacks } from './setup'

describe('useHealthPoll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mountedCallbacks.length = 0
  })

  describe('initial state', () => {
    it('sets status to "loading"', () => {
      const poller = useHealthPoll()

      expect(poller.status.value).toBe('loading')
      poller.stop()
    })

    it('sets modelLoaded to false', () => {
      const poller = useHealthPoll()

      expect(poller.modelLoaded.value).toBe(false)
      poller.stop()
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
      for (const cb of mountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.status.value).toBe('ready')
      poller.stop()
    })

    it('sets modelLoaded to true when status is ready', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', model_loaded: true })
      }))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.modelLoaded.value).toBe(true)
      poller.stop()
    })
  })

  describe('failed health check', () => {
    it('transitions status to "error" when HTTP response is not ok', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 503
      }))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.status.value).toBe('error')
      poller.stop()
    })
  })

  describe('polling stops on terminal state', () => {
    it('stops polling after status becomes "ready"', async () => {
      const fetchSpy = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', model_loaded: true })
      }))
      global.fetch = fetchSpy

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      // Wait for enough time to see if polling continues
      await new Promise(resolve => setTimeout(resolve, 4500))

      // Only 1 call: the immediate check sets status to 'ready', which stops polling
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      poller.stop()
    })
  })

  describe('model_name and sub_status parsing', () => {
    beforeEach(() => {
      mountedCallbacks.length = 0
    })

    it('parses model_name from health response', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'loading',
          model_loaded: false,
          model_name: 'XTTS-v2',
          sub_status: 'initializing'
        })
      }))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.modelName.value).toBe('XTTS-v2')
      poller.stop()
    })

    it('parses sub_status from health response', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'loading',
          model_loaded: false,
          model_name: 'XTTS-v2',
          sub_status: 'initializing'
        })
      }))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.subStatus.value).toBe('initializing')
      poller.stop()
    })

    it('exposes empty sub_status when model is ready', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'ready',
          model_loaded: true,
          model_name: 'XTTS-v2',
          sub_status: ''
        })
      }))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.subStatus.value).toBe('')
      expect(poller.modelName.value).toBe('XTTS-v2')
      poller.stop()
    })

    it('defaults model_name to empty string when not in response', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'loading',
          model_loaded: false
          // no model_name field
        })
      }))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.modelName.value).toBe('')
      poller.stop()
    })
  })

  describe('stop() function', () => {
    it('can be called without error', () => {
      const poller = useHealthPoll()
      // Should not throw
      expect(() => poller.stop()).not.toThrow()
    })

    it('clears the interval when called after mount', async () => {
      const fetchSpy = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', model_loaded: true })
      }))
      global.fetch = fetchSpy

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.status.value).toBe('ready')

      // stop() should clear the interval without error
      expect(() => poller.stop()).not.toThrow()
    })
  })

  describe('network error handling', () => {
    beforeEach(() => {
      mountedCallbacks.length = 0
    })

    it('keeps status as "loading" when fetch throws a network error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.status.value).toBe('loading')
      poller.stop()
    })

    it('continues polling past 20 seconds when model has not loaded yet', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      // Wait 25 seconds — well past the old 10-retry limit (20s)
      await new Promise(resolve => setTimeout(resolve, 25000))

      // Should still be "loading", NOT "error" (old behavior would error at 20s)
      expect(poller.status.value).toBe('loading')
      poller.stop()
    }, 30000)

    it('accepts a custom maxRetries override', async () => {
      const fetchSpy = vi.fn(() => Promise.reject(new Error('Network error')))
      global.fetch = fetchSpy

      const poller = useHealthPoll({ maxRetries: 5 })

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      // Wait for 5 retries × 2s = 10 seconds (+ 3s buffer for async resolution)
      await new Promise(resolve => setTimeout(resolve, 13000))

      // Should have entered error state after 5 retries
      expect(poller.status.value).toBe('error')
      poller.stop()
    }, 15000)
  })
})
