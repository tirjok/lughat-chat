import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GenerateButton from '~/components/studio/GenerateButton.vue'

describe('GenerateButton', () => {
  it('applies is-disabled class when disabled prop is true', () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: false,
        modelStatus: 'ready',
        disabled: true
      }
    })

    const btn = wrapper.find('button')
    // Native disabled attribute is set when disabled prop is true
    expect(btn.attributes('disabled')).toBe('')
    expect(btn.classes()).toContain('is-disabled')
    expect(btn.element.disabled).toBe(true)
  })

  it('does NOT apply is-disabled class when disabled prop is false', () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: false,
        modelStatus: 'ready',
        disabled: false
      }
    })
    const btn = wrapper.find('button')
    expect(btn.attributes('disabled')).toBeUndefined()
    expect(btn.classes()).not.toContain('is-disabled')
    expect(btn.element.disabled).toBe(false)
  })

  it('shows "Generate Speech" content when ready and not generating', () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: false,
        modelStatus: 'ready',
        disabled: false
      }
    })

    expect(wrapper.text()).toContain('Generate Speech')
    expect(wrapper.text()).not.toContain('Processing')
  })

  it('shows "Processing Model..." when generating', () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: true,
        modelStatus: 'ready',
        disabled: false
      }
    })

    expect(wrapper.text()).toContain('Processing Model...')
    expect(wrapper.text()).not.toContain('Generate Speech')
  })

  it('emits click event when button is clicked', async () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: false,
        modelStatus: 'ready',
        disabled: false
      }
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does NOT emit click when disabled (native attribute blocks interaction)', async () => {
    const wrapper = mount(GenerateButton, {
      props: {
        isGenerating: false,
        modelStatus: 'ready',
        disabled: true
      }
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
