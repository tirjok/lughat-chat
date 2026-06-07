import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeDisplay from '../app/components/TimeDisplay.vue'

describe('TimeDisplay', () => {
  it('renders current time and duration in MM:SS format', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 65,
        duration: 180
      }
    })

    const spans = wrapper.findAll('span')
    expect(spans.length).toBe(2)
    // RTL: current time on right (first span in DOM), duration on left
    expect(spans[0].text()).toBe('1:05')
    expect(spans[1].text()).toBe('3:00')
  })

  it('displays "0:00" for zero currentTime and duration', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 0,
        duration: 0
      }
    })

    const spans = wrapper.findAll('span')
    expect(spans[0].text()).toBe('0:00')
    expect(spans[1].text()).toBe('0:00')
  })

  it('uses monospace font', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 30,
        duration: 60
      }
    })

    const container = wrapper.find('.tts-audio__time')
    expect(container.classes()).toContain('font-mono')
  })

  it('applies RTL layout with current time on the right', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 30,
        duration: 60
      }
    })

    expect(wrapper.find('.tts-audio__time').attributes('dir')).toBe('rtl')
  })

  it('renders label elements for accessibility', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 30,
        duration: 60,
        currentLabel: 'Current time',
        durationLabel: 'Duration'
      }
    })

    expect(wrapper.text()).toContain('Current time')
    expect(wrapper.text()).toContain('Duration')
  })

  it('does not render labels when not provided', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 30,
        duration: 60
      }
    })

    expect(wrapper.text()).not.toContain('Current time')
    expect(wrapper.text()).not.toContain('Duration')
  })

  it('handles NaN currentTime gracefully', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: NaN as unknown as number,
        duration: 60
      }
    })

    expect(wrapper.findAll('span')[0].text()).toBe('0:00')
  })

  it('handles NaN duration gracefully', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 30,
        duration: NaN as unknown as number
      }
    })

    expect(wrapper.findAll('span')[1].text()).toBe('0:00')
  })
})
