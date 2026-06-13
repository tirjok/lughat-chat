import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GenerateButton from './GenerateButton.vue'

describe('GenerateButton', () => {
  it('renders play icon and "Generate Speech" text in ready state', () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: false,
        modelStatus: 'ready',
        disabled: false
      }
    })

    expect(wrapper.find('.i-lucide-play').exists()).toBe(true)
    expect(wrapper.find('.i-lucide-loader').exists()).toBe(false)
    expect(wrapper.text()).toContain('Generate Speech')
  })

  it('renders loader icon and "Processing Model\u2026" text when model is loading', () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: false,
        modelStatus: 'loading',
        disabled: false
      }
    })

    expect(wrapper.find('.i-lucide-loader').exists()).toBe(true)
    expect(wrapper.find('.i-lucide-play').exists()).toBe(false)
    expect(wrapper.text()).toContain('Processing Model\u2026')
  })

  it('renders loader icon and "Generating\u2026" text when generating', () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: true,
        modelStatus: 'ready',
        disabled: false
      }
    })

    expect(wrapper.find('.i-lucide-loader').exists()).toBe(true)
    expect(wrapper.find('.i-lucide-play').exists()).toBe(false)
    expect(wrapper.text()).toContain('Generating\u2026')
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: false,
        modelStatus: 'ready',
        disabled: true
      }
    })

    expect(wrapper.find('button').attributes('disabled')).toBe('')
  })

  it('is enabled when disabled prop is false', () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: false,
        modelStatus: 'ready',
        disabled: false
      }
    })

    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  it('emits click event when clicked', () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: false,
        modelStatus: 'ready',
        disabled: false
      }
    })

    wrapper.find('button').trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
