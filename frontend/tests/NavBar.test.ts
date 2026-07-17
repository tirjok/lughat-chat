import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'
import NavBar from '../app/components/NavBar.vue'

// NavBar no longer calls useSidebar directly — it emits a @toggle event.
// The mock is kept for completeness but is not used by NavBar.

// Mock ModelStatusIndicator
mockComponent('ModelStatusIndicator', {
  template: '<div class="model-status-indicator" data-testid="model-status"></div>'
})

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('component tree', () => {
    it('When rendered then hamburger button exists', async () => {
      const wrapper = await mountSuspended(NavBar)
      const hamburger = wrapper.find('[data-testid="hamburger"]')
      expect(hamburger.exists()).toBe(true)
    })

    it('When rendered then logo is displayed', async () => {
      const wrapper = await mountSuspended(NavBar)
      expect(wrapper.text()).toContain('LughatChat')
    })

    it('When rendered then navigation links exist', async () => {
      const wrapper = await mountSuspended(NavBar)
      expect(wrapper.text()).toContain('Roadmap')
      expect(wrapper.text()).toContain('Playground')
    })

    it('When rendered then TTS status indicator exists', async () => {
      const wrapper = await mountSuspended(NavBar)
      const status = wrapper.find('[data-testid="model-status"]')
      expect(status.exists()).toBe(true)
    })
  })

  describe('interaction', () => {
    it('When hamburger clicked then emits toggle event', async () => {
      const wrapper = await mountSuspended(NavBar)
      const hamburger = wrapper.find('[data-testid="hamburger"]')
      await hamburger.trigger('click')
      expect(wrapper.emitted('toggle')).toHaveLength(1)
    })
  })
})
