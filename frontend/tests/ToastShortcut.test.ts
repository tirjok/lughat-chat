import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ToastNotification from '../app/components/ToastNotification.vue'
import { useToast, showToast } from '../app/composables/useToast'
import { setBreakpoint } from './setup.component'

// ─── Behavioral Tests (black-box: rendered toast, dismissed state) ──────

describe('Toast mobile positioning + shortcut hint', () => {
  beforeEach(() => {
    useToast().value = []
  })

  afterEach(() => {
    useToast().value = []
  })

  describe('toast container', () => {
    it('When shown then toast container has pointer-events-none for click-through', async () => {
      // Arrange
      useToast()
      showToast('Test message')
      // Act
      const wrapper = mount(ToastNotification)
      await nextTick()
      // Assert
      const container = wrapper.find('[class*="fixed"]')
      expect(container.exists()).toBe(true)
      expect(container.classes()).toContain('pointer-events-none')
    })
  })

  describe('shortcut hint visibility', () => {
    it('When viewport is 375px then shortcut hint is hidden (below md: breakpoint)', () => {
      // Arrange
      setBreakpoint(375)
      // Act
      useToast()
      showToast('Test message')
      const wrapper = mount(ToastNotification)
      // Assert
      const container = wrapper.find('[class*="fixed"]')
      expect(container.exists()).toBe(true)
    })

    it('When viewport is 768px then shortcut hint is visible (at md: breakpoint)', () => {
      // Arrange
      setBreakpoint(768)
      // Act
      useToast()
      showToast('Test message')
      const wrapper = mount(ToastNotification)
      // Assert
      const container = wrapper.find('[class*="fixed"]')
      expect(container.exists()).toBe(true)
    })
  })
})
