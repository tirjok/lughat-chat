import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'

import App from '../app/app.vue'
import GlobalNavbar from '../app/components/GlobalNavbar.vue'

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
describe('app.vue — GlobalNavbar layout wrapper', () => {
  it('wraps NuxtPage inside a layout with GlobalNavbar and min-h-screen', async () => {
    const wrapper = mount(App, {
      global: {
        components: {
          NuxtPage: defineComponent({ template: '<div id="nuxt-page" />' }),
          GlobalNavbar
        }
      }
    })

    // The root <div> should have class "min-h-screen"
    const rootEl = wrapper.element
    expect(rootEl.classList.contains('min-h-screen')).toBe(true)

    // GlobalNavbar must be rendered — it's a custom component, verify it exists in the DOM
    const navbar = wrapper.findComponent({ name: 'GlobalNavbar' })
    expect(navbar.exists()).toBe(true)

    // NuxtPage must be rendered inside the root div
    const nuxtPage = wrapper.find('#nuxt-page')
    expect(nuxtPage.exists()).toBe(true)

    // GlobalNavbar must appear before NuxtPage in the DOM
    const children = Array.from(rootEl.children)
    const navbarIndex = children.indexOf(navbar.element as unknown as Node)
    const nuxtPageIndex = children.indexOf(nuxtPage.element as unknown as Node)
    expect(navbarIndex).toBeLessThan(nuxtPageIndex)
  })

  it('sets base SEO title via useSeoMeta', () => {
    mount(App, { components: { NuxtPage: defineComponent({ template: '<div />' }) } })

    expect(mockUseSeoMeta).toHaveBeenCalledTimes(1)
    const seoArgs = mockUseSeoMeta.mock.calls[0][0]
    expect(seoArgs.title).toBe('LughatChat')
  })
})
