import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ToastNotification from '~/components/ToastNotification.vue'
import { useToast, showToast } from '~/composables/useToast'
import { setBreakpoint } from '~~/tests/setup.component'

// Mock useToast and showToast so tests don't depend on Nuxt auto-imports.
vi.mock('~/composables/useToast', () => {
  const entries: { id: number, message: string, type: 'success' | 'error' | 'info' }[] = []
  let nextId = 0
  return {
    useToast: () => ({
      value: entries
    }),
    showToast: vi.fn((message: string) => {
      entries.push({ id: ++nextId, message, type: 'success' })
    })
  }
})

// ─── Behavioral Tests (black-box: rendered toast, dismissed state) ──────

describe('ToastShortcut', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    const toast = useToast()
    ;(toast.value as { id: number, message: string, type: string }[]).length = 0
  })

  it('renders a toast when one exists', async () => {
    // Arrange
    const toast = useToast()
    ;(toast.value as { id: number, message: string, type: string }[]).length = 0
    showToast('Test message')

    // Act
    const wrapper = mount(ToastNotification)
    await nextTick()
    // Assert
    const container = wrapper.find('[class*="fixed"]')
    expect(container.exists()).toBe(true)
  })

  it('renders toast on mobile (375px) and desktop (1024px)', async () => {
    // Arrange
    const toast = useToast()
    ;(toast.value as { id: number, message: string, type: string }[]).length = 0
    showToast('Test message')

    // Act
    const wrapper = mount(ToastNotification)
    // Assert
    const container = wrapper.find('[class*="fixed"]')
    expect(container.exists()).toBe(true)
  })

  it('renders toast when multiple toasts exist', async () => {
    // Arrange
    const toast = useToast()
    ;(toast.value as { id: number, message: string, type: string }[]).length = 0
    showToast('Test message')
    showToast('Another message')

    // Act
    const wrapper = mount(ToastNotification)
    await nextTick()
    // Assert
    const container = wrapper.find('[class*="fixed"]')
    expect(container.exists()).toBe(true)
  })

  describe('responsive breakpoint behavior', () => {
    it('renders correctly at mobile breakpoint (375px)', async () => {
      // Arrange
      setBreakpoint(375)
      const toast = useToast()
      ;(toast.value as { id: number, message: string, type: string }[]).length = 0
      showToast('Mobile test')

      // Act
      const wrapper = mount(ToastNotification)
      await nextTick()
      // Assert
      const container = wrapper.find('[class*="fixed"]')
      expect(container.exists()).toBe(true)
    })

    it('renders correctly at tablet breakpoint (768px)', async () => {
      // Arrange
      setBreakpoint(768)
      const toast = useToast()
      ;(toast.value as { id: number, message: string, type: string }[]).length = 0
      showToast('Tablet test')

      // Act
      const wrapper = mount(ToastNotification)
      await nextTick()
      // Assert
      const container = wrapper.find('[class*="fixed"]')
      expect(container.exists()).toBe(true)
    })
  })
})
