import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SeekableProgressBar from '../app/components/SeekableProgressBar.vue'

describe('SeekableProgressBar', () => {
  it('renders fill and thumb elements', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 30,
        duration: 120,
      },
    })

    expect(wrapper.find('.tts-audio__progress-fill').exists()).toBe(true)
    expect(wrapper.find('.tts-audio__progress-thumb').exists()).toBe(true)
  })

  it('sets fill width proportional to current playback position', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 60,
        duration: 120,
      },
    })

    const fill = wrapper.find('.tts-audio__progress-fill')
    const style = fill.attributes('style')

    expect(style).toContain('width: 50%')
  })

  it('sets thumb right position proportional to current playback position', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 30,
        duration: 120,
      },
    })

    const thumb = wrapper.find('.tts-audio__progress-thumb')
    const style = thumb.attributes('style')

    expect(style).toContain('right: 25%')
  })

  it('emits seek event with correct ratio when clicked', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 0,
        duration: 120,
      },
    })

    const mockRect = { right: 200, width: 400 }
    wrapper.element.getBoundingClientRect = () => mockRect as DOMRect

    // Click at 75% from right (middle of bar)
    wrapper.trigger('click', { clientX: 100 })

    expect(wrapper.emitted('seek')).toHaveLength(1)
    // ratio = (rect.right - clientX) / rect.width = (200 - 100) / 400 = 0.25
    expect(wrapper.emitted('seek')?.[0]).toEqual([0.25])
  })

  it('emits seek event at start of bar (rightmost)', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 0,
        duration: 120,
      },
    })

    const mockRect = { right: 200, width: 400 }
    wrapper.element.getBoundingClientRect = () => mockRect as DOMRect

    // Click at rightmost edge (clientX = rect.right)
    wrapper.trigger('click', { clientX: 200 })

    expect(wrapper.emitted('seek')).toHaveLength(1)
    // ratio = (200 - 200) / 400 = 0
    expect(wrapper.emitted('seek')?.[0]).toEqual([0])
  })

  it('emits seek event at end of bar (leftmost)', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 0,
        duration: 120,
      },
    })

    const mockRect = { right: 200, width: 400 }
    wrapper.element.getBoundingClientRect = () => mockRect as DOMRect

    // Click at leftmost edge (clientX = rect.right - width)
    wrapper.trigger('click', { clientX: 0 })

    expect(wrapper.emitted('seek')).toHaveLength(1)
    // ratio = (200 - 0) / 400 = 0.5
    expect(wrapper.emitted('seek')?.[0]).toEqual([0.5])
  })

  it('handles zero duration without error', () => {
    const wrapper = mount(SeekableProgressBar, {
      props: {
        currentTime: 0,
        duration: 0,
      },
    })

    const fill = wrapper.find('.tts-audio__progress-fill')
    expect(fill.attributes('style')).toContain('width: 0%')
  })
})
