import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SeekableProgressBar from '../app/components/SeekableProgressBar.vue'

describe('SeekableProgressBar', () => {
  it('renders a gradient progress bar', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 30,
        duration: 120
      }
    })

    // The component renders a single gradient bar (no separate fill/thumb)
    const bar = wrapper.find('[class*="relative"]')
    expect(bar.exists()).toBe(true)
  })

  it('sets fill width proportional to current playback position', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 60,
        duration: 120
      }
    })

    const fill = wrapper.find('[class*="absolute"]')
    const style = fill.attributes('style')

    expect(style).toContain('width: 50%')
  })

  it('renders a clickable progress bar', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 30,
        duration: 120
      }
    })

    const bar = wrapper.find('[class*="cursor-pointer"]')
    expect(bar.exists()).toBe(true)
  })

  it('emits seek event with correct ratio when clicked', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 0,
        duration: 120
      }
    })

    const mockRect = { left: 0, right: 400, width: 400 }
    wrapper.element.getBoundingClientRect = () => mockRect as DOMRect

    // Click at 25% from left (clientX = 100)
    wrapper.trigger('click', { clientX: 100 })

    expect(wrapper.emitted('seek')).toHaveLength(1)
    // ratio = (clientX - rect.left) / rect.width = (100 - 0) / 400 = 0.25
    expect(wrapper.emitted('seek')?.[0]).toEqual([0.25])
  })

  it('emits seek event at start of bar (leftmost)', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 0,
        duration: 120
      }
    })

    const mockRect = { left: 0, right: 400, width: 400 }
    wrapper.element.getBoundingClientRect = () => mockRect as DOMRect

    // Click at leftmost edge (clientX = rect.left)
    wrapper.trigger('click', { clientX: 0 })

    expect(wrapper.emitted('seek')).toHaveLength(1)
    // ratio = (0 - 0) / 400 = 0
    expect(wrapper.emitted('seek')?.[0]).toEqual([0])
  })

  it('emits seek event at end of bar (rightmost)', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 0,
        duration: 120
      }
    })

    const mockRect = { left: 0, right: 400, width: 400 }
    wrapper.element.getBoundingClientRect = () => mockRect as DOMRect

    // Click at rightmost edge (clientX = rect.right)
    wrapper.trigger('click', { clientX: 400 })

    expect(wrapper.emitted('seek')).toHaveLength(1)
    // ratio = (400 - 0) / 400 = 1.0
    expect(wrapper.emitted('seek')?.[0]).toEqual([1])
  })

  it('handles zero duration without error', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 0,
        duration: 0
      }
    })

    const fill = wrapper.find('[class*="absolute"]')
    expect(fill.attributes('style')).toContain('width: 0%')
  })
})
