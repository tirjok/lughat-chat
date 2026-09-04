import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ToastNotification from '~/components/common/ToastNotification.vue'

// Re-import the mocked composable for assertions
import { useToast, showToast } from '~/composables/common/useToast'

// Mock useToast and showToast so tests don't depend on Nuxt auto-imports.
vi.mock('~/composables/common/useToast', () => {
  const entries: { id: number, message: string, type: 'success' | 'error' | 'info' }[] = []
  let nextId = 0
  return {
    useToast: () => ref(entries),
    showToast: vi.fn((message: string) => {
      entries.push({ id: ++nextId, message, type: 'success' })
    })
  }
})

describe('ToastNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    const toast = useToast()
    ;(toast.value as { id: number, message: string, type: string }[]).length = 0
  })

  it('renders the error message when showToast is called', async () => {
    const toast = useToast()
    showToast('حدث خطأ في التوليد')

    const wrapper = mount(ToastNotification)
    await nextTick()

    expect((toast.value as { id: number, message: string, type: string }[]).length).toBe(1)
    const toastEl = wrapper.find('[class*="fixed"]')
    expect(toastEl.exists()).toBe(true)
    expect(toastEl.text()).toContain('حدث خطأ في التوليد')
  })

  it('can be dismissed by clicking the close button', async () => {
    const toast = useToast()
    const initialLength = (toast.value as { id: number, message: string, type: string }[]).length
    showToast('Test message')

    const wrapper = mount(ToastNotification)
    await nextTick()

    expect((toast.value as { id: number, message: string, type: string }[]).length).toBe(initialLength + 1)

    // Click the close button
    const closeButton = wrapper.find('button[aria-label="Close notification"]')
    expect(closeButton.exists()).toBe(true)
    await closeButton.trigger('click')
    await nextTick()

    expect((toast.value as { id: number, message: string, type: string }[]).length).toBe(initialLength)
  })

  describe('Issue 23: aria-live on toast root', () => {
    it('toast root element has aria-live="polite" for screen reader announcements', async () => {
      const toast = useToast()
      ;(toast.value as { id: number, message: string, type: string }[]).length = 0
      showToast('Test message')

      const wrapper = mount(ToastNotification)
      await nextTick()

      const rootEl = wrapper.find('[aria-live="polite"]')
      expect(rootEl.exists()).toBe(true)
      expect(rootEl.attributes('aria-live')).toBe('polite')
    })
  })

  describe('Issue 21: aria-labels on icon buttons', () => {
    it('close button has aria-label="Close notification"', async () => {
      const toast = useToast()
      ;(toast.value as { id: number, message: string, type: string }[]).length = 0
      showToast('Test message')

      const wrapper = mount(ToastNotification)
      await nextTick()

      const btn = wrapper.find('button[aria-label="Close notification"]')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-label')).toBe('Close notification')
    })
  })
})
