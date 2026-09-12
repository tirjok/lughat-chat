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
