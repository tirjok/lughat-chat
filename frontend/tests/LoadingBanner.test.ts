import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { shallowRef } from 'vue'

import LoadingBanner from '../app/components/LoadingBanner.vue'

// Module-level reactive refs — the mock composable reads these at mount time.
const mockStatus = shallowRef<'loading' | 'ready' | 'error' | 'retrying'>('loading')
const mockModelName = shallowRef<string>('')
const mockSubStatus = shallowRef<string>('')

vi.mock('../app/composables/useHealthPoll', () => ({
  useHealthPoll: () => ({
    get status() { return mockStatus.value },
    get modelLoaded() { return mockStatus.value === 'ready' },
    get modelName() { return mockModelName.value },
    get subStatus() { return mockSubStatus.value },
    stop: vi.fn(),
    retry: vi.fn(),
    start: vi.fn()
  })
}))

export { mockStatus, mockModelName, mockSubStatus }

// ─── Helpers ────────────────────────────────────────────────────────────────

function mountBanner(): ReturnType<typeof mount<typeof LoadingBanner>> {
  return mount(LoadingBanner)
}

// ─── Behavioral Tests ───────────────────────────────────────────────────────

describe('LoadingBanner', () => {
  describe('status transitions', () => {
    it('When status is loading then banner is visible and contains expected text', () => {
      // Arrange
      mockStatus.value = 'loading'

      // Act
      const wrapper = mountBanner()

      // Assert — banner is present
      expect(wrapper.find('[data-test-id="loading-banner"]').exists()).toBe(true)
      // Assert — contains expected content
      expect(wrapper.text()).toContain('Loading')
      expect(wrapper.text()).toContain('2 minutes')
      // Assert — accessibility attributes
      const banner = wrapper.find('[data-test-id="loading-banner"]')
      expect(banner.attributes('role')).toBe('status')
      expect(banner.attributes('aria-live')).toBe('polite')
    })

    it('When status is ready then banner is hidden', () => {
      // Arrange
      mockStatus.value = 'ready'

      // Act
      const wrapper = mountBanner()

      // Assert
      expect(wrapper.find('[data-test-id="loading-banner"]').exists()).toBe(false)
    })

    it('When status is error then banner is hidden', () => {
      // Arrange
      mockStatus.value = 'error'

      // Act
      const wrapper = mountBanner()

      // Assert
      expect(wrapper.find('[data-test-id="loading-banner"]').exists()).toBe(false)
    })

    it('When status is retrying then banner shows retry message', () => {
      // Arrange
      mockStatus.value = 'retrying'

      // Act
      const wrapper = mountBanner()

      // Assert
      expect(wrapper.find('[data-test-id="loading-banner"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Retrying')
    })
  })

  describe('model name integration (M-06)', () => {
    it('When modelName is set then banner shows the model name', () => {
      // Arrange
      mockStatus.value = 'loading'
      mockModelName.value = 'KSA Hamed - Male'

      // Act
      const wrapper = mountBanner()

      // Assert
      expect(wrapper.text()).toContain('KSA Hamed')
    })

    it('When modelName is empty then banner falls back to "TTS Model"', () => {
      // Arrange
      mockStatus.value = 'loading'
      mockModelName.value = ''

      // Act
      const wrapper = mountBanner()

      // Assert
      expect(wrapper.text()).toContain('TTS Model')
    })
  })
})
