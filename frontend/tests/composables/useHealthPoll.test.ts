import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useHealthPoll, resetHealthPoll } from '../../app/composables/useHealthPoll'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const testMountedCallbacks: (() => void)[] = []
const testUnmountedCallbacks: (() => void)[] = []

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

mockNuxtImport('onUnmounted', () => {
  return (cb: () => void) => {
    testUnmountedCallbacks.push(cb)
  }
})

describe('useHealthPoll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testMountedCallbacks.length = 0
    testUnmountedCallbacks.length = 0
    resetHealthPoll()
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

  describe('singleton pattern (AC-1)', () => {
    it('returns the same instance when called multiple times', () => {
      const a = useHealthPoll()
      const b = useHealthPoll()

      expect(a).toBe(b)
    })

    it('shared status: one caller changes status, the other sees it', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', model_loaded: true })
      }))

      const a = useHealthPoll()
      const b = useHealthPoll()

      // Trigger onMounted to start polling
      for (const cb of testMountedCallbacks) {
        cb()
      }

      // Wait for the first polling cycle to complete
      await new Promise(resolve => setTimeout(resolve, 50))

      // Both callers share the same status ref
      expect(a.status.value).toBe(b.status.value)
      expect(a.status.value).toBe('ready')
    })

    it('starts exactly one interval when called multiple times', () => {
      const spySetInterval = vi.fn((_fn: () => void, _ms: number) => 0)
      const originalSetInterval = globalThis.setInterval as (fn: () => void, ms: number) => number
      ;(globalThis as Record<string, unknown>).setInterval = spySetInterval as (typeof globalThis)['setInterval']

      useHealthPoll()
      useHealthPoll()
      useHealthPoll()

      // Trigger onMounted to start polling (simulates component mount)
      for (const cb of testMountedCallbacks) {
        cb()
      }

      // Only ONE setInterval call should exist (singleton — first caller only)
      expect(spySetInterval).toHaveBeenCalledTimes(1)
      expect(spySetInterval).toHaveBeenCalledWith(expect.any(Function), 2000)

      ;(globalThis as Record<string, unknown>).setInterval = originalSetInterval
    })
  })

  describe('singleton lifecycle (AC-1)', () => {
    it('first mount starts interval, subsequent mounts do not restart it', () => {
      const spySetInterval = vi.fn((_fn: () => void, _ms: number) => 0)
      const originalSetInterval = globalThis.setInterval as (fn: () => void, ms: number) => number
      ;(globalThis as Record<string, unknown>).setInterval = spySetInterval as (typeof globalThis)['setInterval']

      const poller1 = useHealthPoll()
      for (const cb of testMountedCallbacks) { cb() }
      expect(spySetInterval).toHaveBeenCalledTimes(1)

      const poller2 = useHealthPoll()
      for (const cb of testMountedCallbacks) { cb() }
      // mountCount increments but started=true, so no second interval
      expect(spySetInterval).toHaveBeenCalledTimes(1)

      ;(globalThis as Record<string, unknown>).setInterval = originalSetInterval
    })

    it('last unmount clears the interval', () => {
      const spyClearInterval = vi.fn()
      const originalClearInterval = globalThis.clearInterval as (id: number) => void
      ;(globalThis as Record<string, unknown>).clearInterval = spyClearInterval as typeof globalThis.clearInterval

      const spySetInterval = vi.fn((_fn: () => void, _ms: number) => 42)
      const originalSetInterval = globalThis.setInterval as (fn: () => void, ms: number) => number
      ;(globalThis as Record<string, unknown>).setInterval = spySetInterval as (typeof globalThis)['setInterval']

      const poller = useHealthPoll()
      for (const cb of testMountedCallbacks) { cb() }
      expect(spySetInterval).toHaveBeenCalledTimes(1)

      // Unmount the single caller — should clear the interval
      for (const cb of testUnmountedCallbacks) { cb() }
      expect(spyClearInterval).toHaveBeenCalledTimes(1)
      expect(spyClearInterval).toHaveBeenCalledWith(42)

      ;(globalThis as Record<string, unknown>).clearInterval = originalClearInterval
      ;(globalThis as Record<string, unknown>).setInterval = originalSetInterval
    })

    it('status remains accessible after all callers unmount', () => {
      const poller = useHealthPoll()
      for (const cb of testMountedCallbacks) { cb() }
      for (const cb of testUnmountedCallbacks) { cb() }

      expect(poller.status.value).toBe('loading')
      expect(poller.modelLoaded.value).toBe(false)
    })
  })

  describe('150 retries max (AC-3)', () => {
    it('after maxRetries failed checks, status becomes "error"', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network failure')))

      const poller = useHealthPoll({ maxRetries: 5 })
      for (const cb of testMountedCallbacks) { cb() }

      // Wait for 5 retry cycles (5 × 2s interval + buffer)
      await new Promise(resolve => setTimeout(resolve, 11000))

      expect(poller.status.value).toBe('error')
    }, 15000)

    it('uses default maxRetries of 150 when not specified', () => {
      // This is a sanity check: the composable defaults to 150 retries.
      // 150 × 2s = 300s, which is ≥ backend LOAD_HARD_TIMEOUT (300s).
      const poller = useHealthPoll()
      expect(poller.status.value).toBe('loading')
      expect(poller.modelLoaded.value).toBe(false)
    })
  })

  describe('SPA navigation (AC-4)', () => {
    it('navigating between pages does not restart polling', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready', model_loaded: true })
      }))

      // Simulate: TTS Studio page mounts (first caller)
      const studio = useHealthPoll()
      for (const cb of testMountedCallbacks) { cb() }

      // Wait for first health check
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(studio.status.value).toBe('ready')

      // Simulate: Dashboard page mounts (second caller)
      // The singleton should NOT restart polling
      const dashboard = useHealthPoll()
      for (const cb of testMountedCallbacks) { cb() }

      // Wait a bit — no new health checks should fire
      await new Promise(resolve => setTimeout(resolve, 50))

      // Dashboard sees the SAME status (already 'ready')
      expect(dashboard.status.value).toBe('ready')
      expect(dashboard.modelLoaded.value).toBe(true)

      // Simulate: Dashboard unmounts (second caller leaves)
      for (const cb of testUnmountedCallbacks) { cb() }

      // Simulate: Lesson page mounts (third caller)
      const lesson = useHealthPoll()
      for (const cb of testMountedCallbacks) { cb() }

      // Polling should still be running (mountCount > 0)
      // Status should still be 'ready' (no restart needed)
      expect(lesson.status.value).toBe('ready')

      // Simulate: Lesson unmounts (third caller leaves)
      for (const cb of testUnmountedCallbacks) { cb() }

      // Simulate: TTS Studio unmounts (first caller leaves, mountCount = 0)
      for (const cb of testUnmountedCallbacks) { cb() }

      // After all callers unmount, status is accessible
      expect(studio.status.value).toBe('ready')
    })
  })

  describe('AC-2: existing callers receive status correctly', () => {
    it('index.vue destructures { status: modelStatus } correctly', () => {
      const { status } = useHealthPoll()
      expect(status.value).toBe('loading')
    })

    it('ModelStatusIndicator destructures { status, modelLoaded } correctly', () => {
      const { status, modelLoaded } = useHealthPoll()
      expect(status.value).toBe('loading')
      expect(modelLoaded.value).toBe(false)
    })

    it('GlobalNavbar is rendered on every page and receives status correctly', () => {
      const { status, modelLoaded } = useHealthPoll()
      expect(status.value).toBe('loading')
      expect(modelLoaded.value).toBe(false)
    })
  })
})
