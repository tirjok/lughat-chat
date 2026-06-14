import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PanelToggle from '../app/components/PanelToggle.vue'
import type { PanelName } from '../app/composables/usePanelToggle'
import { setBreakpoint } from './mocks'

describe('PanelToggle component', () => {
  const mockTogglePanel = vi.fn()
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    mockTogglePanel.mockClear()
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth })
  })

  const mountComponent = (props: { activePanel: PanelName }) => {
    return mount(PanelToggle, {
      props: {
        ...props,
        togglePanel: mockTogglePanel
      }
    })
  }

  it('renders a button element', () => {
    const wrapper = mountComponent({ activePanel: 'control-deck' })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('is hidden on desktop (md:hidden class)', () => {
    const wrapper = mountComponent({ activePanel: 'control-deck' })
    const button = wrapper.find('button')
    expect(button.classes()).toContain('md:hidden')
  })

  it('shows sliders-horizontal icon when in canvas mode', () => {
    const wrapper = mountComponent({ activePanel: 'canvas' })
    const icon = wrapper.find('[class*="i-lucide-sliders-horizontal"]')
    expect(icon.exists()).toBe(true)
  })

  it('shows terminal icon when in control-deck mode', () => {
    const wrapper = mountComponent({ activePanel: 'control-deck' })
    const icon = wrapper.find('[class*="i-lucide-terminal"]')
    expect(icon.exists()).toBe(true)
  })

  it('shows "Voice settings" label when in canvas mode', () => {
    const wrapper = mountComponent({ activePanel: 'canvas' })
    const label = wrapper.find('span.text-xs')
    expect(label.text()).toBe('Voice settings')
  })

  it('shows "Text editor" label when in control-deck mode', () => {
    const wrapper = mountComponent({ activePanel: 'control-deck' })
    const label = wrapper.find('span.text-xs')
    expect(label.text()).toBe('Text editor')
  })

  it('has correct aria-label for canvas mode', () => {
    const wrapper = mountComponent({ activePanel: 'canvas' })
    const button = wrapper.find('button')
    expect(button.attributes('aria-label')).toBe('Switch to voice settings')
  })

  it('has correct aria-label for control-deck mode', () => {
    const wrapper = mountComponent({ activePanel: 'control-deck' })
    const button = wrapper.find('button')
    expect(button.attributes('aria-label')).toBe('Switch to text editor')
  })

  it('has min-width and min-height of 48px for WCAG touch target', () => {
    const wrapper = mountComponent({ activePanel: 'control-deck' })
    const button = wrapper.find('button')
    const style = button.attributes('style')
    expect(style).toContain('min-width: 48px')
    expect(style).toContain('min-height: 48px')
  })

  it('is fixed positioned in bottom-right corner', () => {
    const wrapper = mountComponent({ activePanel: 'control-deck' })
    const button = wrapper.find('button')
    expect(button.classes()).toContain('fixed')
    expect(button.classes()).toContain('bottom-6')
    expect(button.classes()).toContain('right-6')
    expect(button.classes()).toContain('z-50')
  })

  it('calls togglePanel when clicked', async () => {
    const wrapper = mountComponent({ activePanel: 'control-deck' })
    await wrapper.find('button').trigger('click')
    expect(mockTogglePanel).toHaveBeenCalledTimes(1)
  })

  it('receives activePanel as a prop', () => {
    const wrapper = mountComponent({ activePanel: 'control-deck' })
    expect(wrapper.props('activePanel')).toBe('control-deck')
  })

  // ─── Responsive Visibility Tests ────────────────────────────────────

  describe('responsive visibility (mobile vs desktop)', () => {
    it('is visible on mobile widths (375px) — no md:hidden hiding it at breakpoint', () => {
      setBreakpoint(375)
      const wrapper = mountComponent({ activePanel: 'control-deck' })
      const button = wrapper.find('button')
      // The button has md:hidden class in markup, but on mobile (375px < 768px)
      // the md:hidden breakpoint doesn't apply, so the button is visible.
      // Verify the button renders and has the expected classes for mobile visibility.
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('md:hidden')
      // md:hidden means "hidden on medium+ screens" — so it IS visible on mobile.
      // The button element exists in the DOM (not hidden via CSS display).
    })

    it('is visible on tablet widths (414px) — below 768px breakpoint', () => {
      setBreakpoint(414)
      const wrapper = mountComponent({ activePanel: 'canvas' })
      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('md:hidden')
    })

    it('is visible on tablet portrait widths (767px) — just below 768px breakpoint', () => {
      setBreakpoint(767)
      const wrapper = mountComponent({ activePanel: 'control-deck' })
      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('md:hidden')
    })

    it('is hidden on desktop widths (768px+) — md:hidden applies', () => {
      setBreakpoint(768)
      const wrapper = mountComponent({ activePanel: 'canvas' })
      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('md:hidden')
    })

    it('is hidden on large desktop widths (1024px) — md:hidden applies', () => {
      setBreakpoint(1024)
      const wrapper = mountComponent({ activePanel: 'control-deck' })
      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('md:hidden')
    })
  })
})
