import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowRef } from 'vue'

describe('debug', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('with fake timers: void async function works', async () => {
    const status = shallowRef<'loading' | 'ready'>('loading')

    async function updateStatus() {
      await Promise.resolve({ ok: true })
      status.value = 'ready'
      console.log('Inside async: status.value =', status.value)
    }

    void updateStatus()
    console.log('Before flush: status.value =', status.value)

    // Flush microtasks with fake timers
    await Promise.resolve()
    console.log('After flush: status.value =', status.value)

    expect(status.value).toBe('ready')
  })
})
