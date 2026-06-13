import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeDisplay from '../app/components/TimeDisplay.vue'

describe('TimeDisplay', () => {
  it('renders current time and duration as raw numbers in spans', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 65,
        duration: 180
      }
    })

    const spans = wrapper.findAll('span')
    expect(spans.length).toBe(2)
    // Component outputs raw seconds as numbers
    expect(spans[0].text()).toBe('65')
    expect(spans[1].text()).toBe('180')
  })

  it('displays "0" for zero currentTime and duration', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 0,
        duration: 0
      }
    })

    const spans = wrapper.findAll('span')
    expect(spans[0].text()).toBe('0')
    expect(spans[1].text()).toBe('0')
  })

  it('uses monospace font', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 30,
        duration: 60
      }
    })

    const container = wrapper.find('[class*="font-mono"]')
    expect(container.classes()).toContain('font-mono')
  })

  it('applies flex layout with justify-between', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 30,
        duration: 60
      }
    })

    const container = wrapper.find('[class*="flex"]')
    expect(container.classes()).toContain('justify-between')
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

    // NaN renders as the string "NaN" in Vue templates
    expect(wrapper.findAll('span')[0].text()).toBe('NaN')
  })

  it('handles NaN duration gracefully', () => {
    const wrapper = mount(TimeDisplay, {
      props: {
        currentTime: 30,
        duration: NaN as unknown as number
      }
    })

    // NaN renders as the string "NaN" in Vue templates
    expect(wrapper.findAll('span')[1].text()).toBe('NaN')
  })
})
