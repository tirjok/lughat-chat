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
      for (const cb of mountedCallbacks) {
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
      for (const cb of mountedCallbacks) {
        cb()
      }

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.modelLoaded.value).toBe(true)
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
    })
  })

  describe('polling stops on terminal state', () => {
    it('stops polling after status becomes "ready"', async () => {
      const fetchSpy = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', model_loaded: true })
      }))
      global.fetch = fetchSpy

      useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      // Wait for enough time to see if polling continues
      await new Promise(resolve => setTimeout(resolve, 4500))

      // Only 1 call: the immediate check sets status to 'ready', which stops polling
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('network error handling', () => {
    it('keeps status as "loading" when fetch throws a network error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      const poller = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of mountedCallbacks) {
        cb()
      }

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(poller.status.value).toBe('loading')
    })
  })
})
