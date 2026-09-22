import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBackendHealth, resetBackendHealth } from '~/composables/studio/useBackendHealth'

beforeEach(() => {
  resetBackendHealth()
})

describe('useBackendHealth', () => {
  it('reports "loading" status immediately', () => {
    const { status } = useBackendHealth()
    expect(status.value).toBe('loading')
  })

  it('sets modelLoaded to true when status is "ready"', () => {
    const { status, modelLoaded } = useBackendHealth()
    expect(modelLoaded.value).toBe(false)
    status.value = 'ready'
    expect(modelLoaded.value).toBe(true)
  })

  it('transitions to "error" after failed health check', async () => {
    const { status } = useBackendHealth()
    expect(status.value).toBe('loading')

    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 503 })
    ) as unknown as typeof global.fetch

    // wait for the nextTick then the next poll cycle
    await new Promise(resolve => setTimeout(resolve, 2500))

    expect(status.value).toBe('error')
  })

  it('recovers to "ready" after the backend becomes reachable again', async () => {
    vi.useFakeTimers()
    try {
      // Re-schedule the poll under fake timers (module started with real ones)
      resetBackendHealth()
      const { status } = useBackendHealth()

      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as unknown as typeof global.fetch

      // Enough cycles to exhaust any retry budget (10 polls x 2s)
      await vi.advanceTimersByTimeAsync(25_000)
      expect(status.value).toBe('error')

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ready' })
        })
      ) as unknown as typeof global.fetch

      await vi.advanceTimersByTimeAsync(2_500)
      expect(status.value).toBe('ready')
    } finally {
      vi.useRealTimers()
    }
  })

  it('transitions to "ready" when health check succeeds', async () => {
    const { status } = useBackendHealth()
    expect(status.value).toBe('loading')

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ready' })
      })
    ) as unknown as typeof global.fetch

    await new Promise(resolve => setTimeout(resolve, 2500))

    expect(status.value).toBe('ready')
  })
})
