import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToastNotification from '../app/components/ToastNotification.vue'
import { useToast, showToast } from '../app/composables/useToast'

describe('ToastNotification', () => {
  it('renders the error message when showToast is called', async () => {
    // Call showToast before mounting so toast renders visible
    const toast = useToast()
    showToast('حدث خطأ في التوليد')

    const wrapper = mount(ToastNotification)

    // Toast should be visible with the message
    expect(toast.value.visible).toBe(true)
    const toastEl = wrapper.find('.tts-toast')
    expect(toastEl.exists()).toBe(true)
    expect(toastEl.text()).toContain('حدث خطأ في التوليد')
  })

  it('can be dismissed by clicking the close button', async () => {
    const wrapper = mount(ToastNotification)

    // Trigger the toast
    const toast = useToast()
    showToast('حدث خطأ في التوليد')

    await wrapper.vm.$nextTick()

    // Click the close button
    const closeButton = wrapper.find('.tts-toast__close')
    await closeButton.trigger('click')

    // Toast should be hidden again
    expect(toast.value.visible).toBe(false)
  })

  describe('Issue 23: aria-live on toast root', () => {
    it('toast root element has aria-live="polite" for screen reader announcements', async () => {
      useToast()
      showToast('Test message')

      const wrapper = mount(ToastNotification)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.tts-toast').attributes('aria-live')).toBe('polite')
    })
  })

  describe('Issue 21: aria-labels on icon buttons', () => {
    it('close button has aria-label="Close notification"', async () => {
      useToast()
      showToast('Test message')

      const wrapper = mount(ToastNotification)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.tts-toast__close').attributes('aria-label')).toBe('Close notification')
    })
  })
})
