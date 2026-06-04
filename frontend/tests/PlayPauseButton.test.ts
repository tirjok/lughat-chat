import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayPauseButton from '../app/components/PlayPauseButton.vue'

describe('PlayPauseButton', () => {
  it('renders play icon when not playing and not paused', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: false,
        isPaused: false,
        isLoading: false,
      },
    })

    expect(wrapper.find('.i-lucide-play').exists()).toBe(true)
    expect(wrapper.find('.i-lucide-pause').exists()).toBe(false)
  })

  it('renders pause icon when actively playing', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: true,
        isPaused: false,
        isLoading: false,
      },
    })

    expect(wrapper.find('.i-lucide-pause').exists()).toBe(true)
    expect(wrapper.find('.i-lucide-play').exists()).toBe(false)
  })

  it('renders play icon when paused', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: true,
        isPaused: true,
        isLoading: false,
      },
    })

    expect(wrapper.find('.i-lucide-play').exists()).toBe(true)
    expect(wrapper.find('.i-lucide-pause').exists()).toBe(false)
  })

  it('emits toggle event when clicked', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: false,
        isPaused: false,
        isLoading: false,
      },
    })

    wrapper.trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('is disabled when loading', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: false,
        isPaused: false,
        isLoading: true,
      },
    })

    expect(wrapper.find('button').attributes('disabled')).toBe('')
  })

  it('is enabled when not loading', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: false,
        isPaused: false,
        isLoading: false,
      },
    })

    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })
})
