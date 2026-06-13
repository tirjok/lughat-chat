import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayPauseButton from '../app/components/PlayPauseButton.vue'

describe('PlayPauseButton', () => {
  it('renders play icon when not playing and not paused', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: false,
        isPaused: false,
        isLoading: false
      }
    })

    expect(wrapper.find('.i-lucide-play').exists()).toBe(true)
    expect(wrapper.find('.i-lucide-pause').exists()).toBe(false)
  })

  it('renders pause icon when actively playing', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: true,
        isPaused: false,
        isLoading: false
      }
    })

    expect(wrapper.find('.i-lucide-pause').exists()).toBe(true)
    expect(wrapper.find('.i-lucide-play').exists()).toBe(false)
  })

  it('renders play icon when paused and not actively playing', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: false,
        isPaused: true,
        isLoading: false
      }
    })

    expect(wrapper.find('.i-lucide-play').exists()).toBe(true)
    expect(wrapper.find('.i-lucide-pause').exists()).toBe(false)
  })

  it('emits toggle event when clicked', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: false,
        isPaused: false,
        isLoading: false
      }
    })

    wrapper.trigger('click')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('renders a circular button with magenta background', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: false,
        isPaused: false,
        isLoading: false
      }
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.classes()).toContain('rounded-full')
    expect(button.classes()).toContain('bg-sunrise-magenta')
  })

  it('renders icons with aria-hidden="true"', () => {
    const wrapper = mount(PlayPauseButton, {
      props: {
        isPlaying: false,
        isPaused: false,
        isLoading: false
      }
    })

    const icon = wrapper.find('[aria-hidden="true"]')
    expect(icon.exists()).toBe(true)
  })

  describe('Issue 21: aria-labels on icon buttons', () => {
    it('button has no explicit aria-label (icon is aria-hidden)', () => {
      const wrapper = mount(PlayPauseButton, {
        props: { isPlaying: false, isPaused: false, isLoading: false }
      })
      const btn = wrapper.find('button')
      // Component does not set aria-label on the button itself;
      // the icon inside has aria-hidden="true"
      expect(btn.attributes('aria-label')).toBeUndefined()
    })

    it('the icon span has aria-hidden="true" for play state', () => {
      const wrapper = mount(PlayPauseButton, {
        props: { isPlaying: false, isPaused: false, isLoading: false }
      })
      const icon = wrapper.find('[aria-hidden="true"]')
      expect(icon.attributes('aria-hidden')).toBe('true')
    })
  })
})
