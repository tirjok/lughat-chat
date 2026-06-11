import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import KeyboardHint from '../app/components/KeyboardHint.vue'

describe('KeyboardHint', () => {
  it('renders styled kbd badges for Ctrl and Enter keys', () => {
    const wrapper = mount(KeyboardHint)

    const kbds = wrapper.findAll('kbd')
    expect(kbds.length).toBe(2)
    expect(kbds[0].text()).toBe('Ctrl')
    expect(kbds[1].text()).toBe('Enter')
  })

  it('renders "Press" text before the keys', () => {
    const wrapper = mount(KeyboardHint)

    expect(wrapper.text()).toContain('Press')
  })

  it('renders "for quick generation" text after the keys', () => {
    const wrapper = mount(KeyboardHint)

    expect(wrapper.text()).toContain('for quick generation')
  })

  it('renders the + separator between keys', () => {
    const wrapper = mount(KeyboardHint)

    expect(wrapper.text()).toContain('+')
  })
})
