import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useToast, showToast } from '../app/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('returns a ref with reactive message and visible properties', () => {
    const toast = useToast()

    expect(toast.value.message).toBe('')
    expect(toast.value.visible).toBe(false)
  })

  it('exposes showToast function that updates state', () => {
    const toast = useToast()

    expect(typeof showToast).toBe('function')

    showToast('حدث خطأ في التوليد')

    expect(toast.value.message).toBe('حدث خطأ في التوليد')
    expect(toast.value.visible).toBe(true)
  })

  it('auto-dismisses after 5 seconds', () => {
    const toast = useToast()

    showToast('حدث خطأ في التوليد')
    expect(toast.value.visible).toBe(true)

    vi.advanceTimersByTime(5000)

    expect(toast.value.visible).toBe(false)
    expect(toast.value.message).toBe('')
  })

  it('resets timeout when shown again before auto-dismiss', () => {
    const toast = useToast()

    showToast('رسالة أولى')
    expect(toast.value.visible).toBe(true)

    vi.advanceTimersByTime(3000)

    showToast('رسالة ثانية')
    expect(toast.value.message).toBe('رسالة ثانية')

    vi.advanceTimersByTime(3000)
    expect(toast.value.visible).toBe(true)

    vi.advanceTimersByTime(2001)
    expect(toast.value.visible).toBe(false)
  })
})
