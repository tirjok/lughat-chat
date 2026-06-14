import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PanelToggle from '../app/components/PanelToggle.vue'
import type { PanelName } from '../app/composables/usePanelToggle'

describe('PanelToggle component', () => {
  const mockTogglePanel = vi.fn()

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
    mockTogglePanel.mockClear()
    const wrapper = mountComponent({ activePanel: 'control-deck' })
    await wrapper.find('button').trigger('click')
    expect(mockTogglePanel).toHaveBeenCalledTimes(1)
  })

  it('receives activePanel as a prop', () => {
    const wrapper = mountComponent({ activePanel: 'control-deck' })
    expect(wrapper.props('activePanel')).toBe('control-deck')
  })
})
