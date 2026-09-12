import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useToast, showToast } from '~/composables/common/useToast'

// Suppress Vue warning: onMounted called outside component context.
// These unit tests call useToast() directly without mount(), which triggers
// Vue's lifecycle injection warning. This is expected — the tests verify
// observable behavior (toast state), not lifecycle correctness.
const originalWarn = console.warn
beforeEach(() => {
  console.warn = (msg: string) => {
    if (msg.includes('onMounted') || msg.includes('Lifecycle injection')) return
    originalWarn(msg)
  }
})
afterEach(() => {
  console.warn = originalWarn
})

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    // Clear toast state between tests
    const toast = useToast()
    toast.value = []
  })

  it('returns a ref with an empty array initially', () => {
    const toast = useToast()

    expect(Array.isArray(toast.value)).toBe(true)
    expect(toast.value.length).toBe(0)
  })

  it('exposes showToast function that updates state', () => {
    const toast = useToast()

    showToast('حدث خطأ في التوليد')

    expect(toast.value.length).toBe(1)
    expect(toast.value[0].message).toBe('حدث خطأ في التوليد')
    expect(toast.value[0].type).toBe('success')
  })

  it('auto-dismisses after 5 seconds', () => {
    const toast = useToast()

    showToast('حدث خطأ في التوليد')
    expect(toast.value.length).toBe(1)

    vi.advanceTimersByTime(5000)

    expect(toast.value.length).toBe(0)
  })

  it('resets timeout when shown again before auto-dismiss', () => {
    const toast = useToast()

    showToast('رسالة أولى')
    expect(toast.value.length).toBe(1)

    vi.advanceTimersByTime(3000)

    showToast('رسالة ثانية')
    expect(toast.value.length).toBe(2)
    expect(toast.value[1].message).toBe('رسالة ثانية')

    vi.advanceTimersByTime(3000)
    expect(toast.value.length).toBeGreaterThan(0)

    vi.advanceTimersByTime(2001)
    expect(toast.value.length).toBe(0)
  })
})
