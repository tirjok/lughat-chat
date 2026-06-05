import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import AudioPlayer from '../app/components/AudioPlayer.vue'

const stubComponents = {
  SeekableProgressBar: defineComponent({ template: '<div />' }),
  TimeDisplay: defineComponent({ template: '<div />' }),
  PlayPauseButton: defineComponent({ template: '<div />' })
}

describe('AudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset URL mocks between tests
    ;(global.URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue('http://test.url/audio.mp3')
  })

  it('is not rendered when no audio is loaded', () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(wrapper.find('.tts-audio-player-container').exists()).toBe(false)
  })

  it('exposes loadAudio method', async () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(typeof wrapper.vm.loadAudio).toBe('function')
  })

  it('exposes togglePlayPause method', () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(typeof wrapper.vm.togglePlayPause).toBe('function')
  })

  it('exposes downloadAudio method', () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(typeof wrapper.vm.downloadAudio).toBe('function')
  })

  it('exposes reactive state properties', async () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(wrapper.vm.isPlaying).toBeDefined()
    expect(wrapper.vm.isPaused).toBeDefined()
    expect(wrapper.vm.isLoading).toBeDefined()
    expect(wrapper.vm.error).toBeDefined()
    expect(wrapper.vm.duration).toBeDefined()
    expect(wrapper.vm.currentTime).toBeDefined()
  })

  it('initializes state with correct defaults', async () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(wrapper.vm.isPlaying).toBe(false)
    expect(wrapper.vm.isPaused).toBe(false)
    expect(wrapper.vm.isLoading).toBe(false)
    expect(wrapper.vm.error).toBeNull()
    expect(wrapper.vm.duration).toBe(0)
    expect(wrapper.vm.currentTime).toBe(0)
  })

  it('does not throw when play is called without audio element', () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(() => wrapper.vm.play()).not.toThrow()
  })

  it('does not throw when pause is called without audio element', () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(() => wrapper.vm.pause()).not.toThrow()
  })

  it('does not throw when downloadAudio is called without audio', () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(() => wrapper.vm.downloadAudio()).not.toThrow()
  })

  it('does not throw when togglePlayPause is called without audio', () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(() => wrapper.vm.togglePlayPause()).not.toThrow()
  })

  it('does not throw when loadAudio is called with invalid blob', () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(() => wrapper.vm.loadAudio(new Blob(['dummy'], { type: 'audio/mpeg' }))).not.toThrow()
  })

  it('does not throw when unmounted', () => {
    const wrapper = shallowMount(AudioPlayer, { global: { components: stubComponents } })

    expect(() => wrapper.unmount()).not.toThrow()
  })
})
