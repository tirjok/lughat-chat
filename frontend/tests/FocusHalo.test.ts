import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import FocusHalo from '../app/components/FocusHalo.vue'

describe('FocusHalo', () => {
  it('renders a radial gradient glow element', () => {
    const wrapper = mount(FocusHalo)
    const halo = wrapper.find('.tts-halo')
    expect(halo.exists()).toBe(true)
  })

  it('is hidden by default when textarea is not focused', () => {
    const wrapper = mount(FocusHalo)
    const halo = wrapper.find('.tts-halo')
    expect(halo.classes()).toContain('opacity-0')
  })

  it('becomes visible when focused prop is true', () => {
    const wrapper = mount(FocusHalo, {
      props: { focused: true }
    })
    const halo = wrapper.find('.tts-halo')
    expect(halo.classes()).not.toContain('opacity-0')
  })
})
