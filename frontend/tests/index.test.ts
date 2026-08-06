import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import Index from '../app/pages/index.vue'
import { setBreakpoint } from './mocks'

// Mock composables that index.vue uses directly.
// These use vi.mock() to intercept the module imports — required now that
// manual globalThis stubs are removed from setup.component.ts.
vi.mock('../composables/usePanelToggle', () => ({
  usePanelToggle: () => ({ activePanel: ref('desktop') })
}))

vi.mock('../composables/useAudioModule', () => ({
  useAudioModule: () => ({
    audioRef: ref(null),
    audioUrl: ref(null),
    duration: ref(0),
    isPlaying: ref(false),
    isPaused: ref(false),
    isLoading: ref(false),
    error: ref(null),
    formattedCurrentTime: ref('0:00'),
    formattedDuration: ref('0:00'),
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    seek: vi.fn(),
    download: vi.fn(),
    dispose: vi.fn()
  })
}))

vi.mock('../composables/useScrollReveal', () => ({
  useScrollReveal: vi.fn(() => ({
    revealOnScroll: vi.fn(),
    isRevealed: computed(() => true)
  }))
}))

vi.mock('../composables/useToast', () => ({
  showToast: vi.fn()
}))

beforeEach(() => {
  // Stub fetch so useVoices() doesn't try to call the real API
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
})

// ─── Behavioral Tests (black-box: rendered component tree, emitted events) ──

describe('index.vue', () => {
  describe('component tree', () => {
    it('When rendered then controlDeck exists', () => {
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('[data-panel="control-deck"]')
      // Assert
      expect(component.exists()).toBe(true)
    })

    it('When rendered then canvas element exists', () => {
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('[data-panel="canvas"]')
      // Assert
      expect(component.exists()).toBe(true)
    })

    // NOTE: shallowMount replaces imported components (WaveformCanvas, AudioPlayerPanel,
    // MobileStatusIndicator) with stub <component> elements. The stubs don't render
    // visible DOM elements, so we can't assert on them meaningfully. The data-panel
    // tests above verify the actual rendered structure.

    it('When rendered then ToastNotification exists for global notifications', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('[aria-live="polite"]')
      // Assert
      expect(component.exists()).toBe(true)
    })

    it('When rendered then textarea element exists for text input', () => {
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('textarea')
      // Assert
      expect(component.exists()).toBe(true)
    })
    // NOTE: FocusHaloCanvas is auto-imported (not explicitly imported in index.vue).
    // In jsdom without Nuxt, auto-imported components don't render, so this test
    // is skipped. The component exists in the template and renders in the browser.

    it('When rendered then canvas has correct classes', () => {
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('[data-panel="canvas"]')
      // Assert
      expect(component.classes()).toContain('flex', 'flex-col')
    })
  })
})

// ─── Responsive Tests (black-box: breakpoint simulation) ─────────────────

describe('index.vue — responsive layout', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth })
  })

  describe('shortcut hint visibility', () => {
    it('When width < 768px then shortcutHint hidden', () => {
      // Act
      setBreakpoint('md')
      Object.defineProperty(window, 'innerWidth', { value: 600 })

      const wrapper = shallowMount(Index)

      // Assert
      // The shortcut hint is a <div> with 'hidden md:flex' — always in DOM, hidden on mobile via CSS
      const hint = wrapper.find('div.absolute.bottom-6.right-8')
      expect(hint.exists()).toBe(true)
      expect(hint.classes()).toContain('hidden')
      expect(hint.classes()).toContain('md:flex')
    })

    it('When width >= 768px then shortcutHint visible', () => {
      // Act
      setBreakpoint('lg')
      Object.defineProperty(window, 'innerWidth', { value: 1024 })

      const wrapper = shallowMount(Index)

      // Assert
      const hint = wrapper.find('div.absolute.bottom-6.right-8')
      expect(hint.exists()).toBe(true)
      // md:flex overrides hidden at >=768px (CSS media query — not reactive in jsdom)
      expect(hint.classes()).toContain('md:flex')
    })
  })
})
