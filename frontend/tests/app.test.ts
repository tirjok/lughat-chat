import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'

import App from '../app/app.vue'

let mockUseHead: ReturnType<typeof vi.fn>
let mockUseSeoMeta: ReturnType<typeof vi.fn>
let mockUseToast: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockUseHead = vi.fn()
  mockUseSeoMeta = vi.fn()
  mockUseToast = vi.fn(() => ({
    message: ref(''),
    visible: ref(true),
    showToast: vi.fn()
  }))
  ;(globalThis as Record<string, unknown>).useHead = mockUseHead
  ;(globalThis as Record<string, unknown>).useSeoMeta = mockUseSeoMeta
  ;(globalThis as Record<string, unknown>).useToast = mockUseToast
})

describe('app.vue — dark theme meta tags', () => {
  it('calls useHead with viewport and favicon meta tags', () => {
    mount(App, { components: { NuxtPage: defineComponent({ template: '<div />' }) } })

    expect(mockUseHead).toHaveBeenCalledTimes(1)
    const callArgs = mockUseHead.mock.calls[0][0]
    expect(callArgs.meta).toContainEqual(
      expect.objectContaining({ name: 'viewport' })
    )
    expect(callArgs.link).toContainEqual(
      expect.objectContaining({ rel: 'icon', href: '/favicon.ico' })
    )
  })

  it('does NOT render ToastNotification (rendered in index.vue instead)', () => {
    const wrapper = mount(App, {
      global: {
        components: {
          NuxtPage: defineComponent({ template: '<div />' })
        }
      }
    })

    // ToastNotification is no longer in app.vue (Phase 1: removed duplicate)
    // It is rendered inside index.vue's page content
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(false)
  })
})
