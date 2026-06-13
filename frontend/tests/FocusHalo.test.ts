import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import FocusHalo from '../app/components/FocusHalo.vue'

describe('FocusHalo', () => {
  it('renders a radial gradient glow element', () => {
    const wrapper = mount(FocusHalo)
    const halo = wrapper.find('.canvas-halo')
    expect(halo.exists()).toBe(true)
  })

  it('is hidden by default when textarea is not focused', () => {
    const wrapper = mount(FocusHalo)
    const halo = wrapper.find('.canvas-halo')
    // The halo uses CSS class .active for visibility, default is hidden (opacity: 0 in CSS)
    expect(halo.classes()).not.toContain('active')
  })

  it('becomes visible when focused prop is true', () => {
    const wrapper = mount(FocusHalo, {
      props: { focused: true }
    })
    const halo = wrapper.find('.canvas-halo')
    expect(halo.classes()).toContain('active')
  })
})
