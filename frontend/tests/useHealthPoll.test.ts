import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useHealthPoll } from '../app/composables/useHealthPoll'

describe('useHealthPoll', () => {
  // ─── Pattern 1: registerEndpoint + direct method call ───────────────
  // The composable uses fetch + onMounted → must use registerEndpoint.
  // onMounted fires real fetch, so we intercept via the Nuxt test router.

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── Initial State ──────────────────────────────────────────────────

  describe('initial state', () => {
    it('When useHealthPoll is called then returns status "loading" and modelLoaded false', () => {
      // Act
      const { status, modelLoaded, modelName, subStatus } = useHealthPoll()

      // Assert
      expect(status).toBe('loading')
      expect(modelLoaded).toBe(false)
      expect(modelName).toBe('')
      expect(subStatus).toBe('')
    })
  })

  // ─── Interface Completeness ─────────────────────────────────────────

  describe('interface completeness', () => {
    it('When useHealthPoll is called then exposes all expected getters and methods', () => {
      // Act
      const result = useHealthPoll()
      const keys = Object.keys(result)

      // Assert
      expect(keys).toContain('status')
      expect(keys).toContain('modelLoaded')
      expect(keys).toContain('modelName')
      expect(keys).toContain('subStatus')
      expect(keys).toContain('stop')
      expect(keys).toContain('retry')
      expect(keys).toContain('start')
    })

    it('When useHealthPoll is called then status is a string', () => {
      // Act
      const { status } = useHealthPoll()

      // Assert
      expect(typeof status).toBe('string')
    })

    it('When useHealthPoll is called then modelLoaded is a boolean', () => {
      // Act
      const { modelLoaded } = useHealthPoll()

      // Assert
      expect(typeof modelLoaded).toBe('boolean')
    })

    it('When useHealthPoll is called then modelName is a string', () => {
      // Act
      const { modelName } = useHealthPoll()

      // Assert
      expect(typeof modelName).toBe('string')
    })

    it('When useHealthPoll is called then subStatus is a string', () => {
      // Act
      const { subStatus } = useHealthPoll()

      // Assert
      expect(typeof subStatus).toBe('string')
    })

    it('When useHealthPoll is called then stop is a function', () => {
      // Act
      const { stop } = useHealthPoll()

      // Assert
      expect(typeof stop).toBe('function')
    })

    it('When useHealthPoll is called then retry is a function', () => {
      // Act
      const { retry } = useHealthPoll()

      // Assert
      expect(typeof retry).toBe('function')
    })

    it('When useHealthPoll is called then start is a function', () => {
      // Act
      const { start } = useHealthPoll()

      // Assert
      expect(typeof start).toBe('function')
    })
  })

  // ─── Options Acceptance ─────────────────────────────────────────────

  describe('custom options', () => {
    it('When maxRetries is provided then no error is thrown', () => {
      // Act
      const { status } = useHealthPoll({ maxRetries: 5 })

      // Assert
      expect(status).toBe('loading')
    })

    it('When retryInterval is provided then no error is thrown', () => {
      // Act
      const { stop } = useHealthPoll({ retryInterval: 5000 })
      stop()

      // Assert
      expect(() => useHealthPoll({ retryInterval: 5000 })).not.toThrow()
    })

    it('When retryAfterError is false then no error is thrown', () => {
      // Act
      const { status } = useHealthPoll({ retryAfterError: false })

      // Assert
      expect(status).toBe('loading')
    })

    it('When baseUrl is provided then no error is thrown', () => {
      // Act
      const { status } = useHealthPoll({ baseUrl: '/api' })

      // Assert
      expect(status).toBe('loading')
    })

    it('When empty options object is provided then no error is thrown', () => {
      // Act
      const { status } = useHealthPoll({})

      // Assert
      expect(status).toBe('loading')
    })
  })

  // ─── Lifecycle: stop ────────────────────────────────────────────────

  describe('stop behavior', () => {
    it('When stop is called before start then no error is thrown', () => {
      // Act
      const { stop } = useHealthPoll()

      // Assert
      expect(() => stop()).not.toThrow()
    })

    it('When stop is called multiple times then no error is thrown', () => {
      // Act
      const { start, stop } = useHealthPoll()
      start()
      stop()
      stop()
      stop()

      // Assert
      expect(() => stop()).not.toThrow()
    })
  })
})
