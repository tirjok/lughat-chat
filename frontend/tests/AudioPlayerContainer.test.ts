import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock the composable before importing the component
vi.mock('../app/composables/useAudioPlayer', () => ({
  useAudioPlayer: vi.fn()
}))

import AudioPlayerContainer from '../app/components/AudioPlayerContainer.vue'
import { useAudioPlayer } from '../app/composables/useAudioPlayer'
import { createMockUseAudioPlayer } from './mocks'

describe('AudioPlayerContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is not rendered when no audio is available', () => {
    vi.mocked(useAudioPlayer).mockReturnValue(createMockUseAudioPlayer())

    const wrapper = mount(AudioPlayerContainer)

    expect(wrapper.find('.tts-audio-player-container').exists()).toBe(false)
  })

  it('renders all sub-components when audio is available', () => {
    const mock = createMockUseAudioPlayer()
    mock.audioUrl.value = 'http://example.com/audio.mp3'
    vi.mocked(useAudioPlayer).mockReturnValue(mock)

    const wrapper = mount(AudioPlayerContainer)

    expect(wrapper.find('.tts-audio-player-container').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'PlayPauseButton' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'SeekableProgressBar' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'TimeDisplay' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'DownloadButton' }).exists()).toBe(true)
  })

  it('calls downloadAudio when download button is clicked', async () => {
    const mock = createMockUseAudioPlayer()
    mock.audioUrl.value = 'http://example.com/audio.mp3'
    vi.mocked(useAudioPlayer).mockReturnValue(mock)

    const wrapper = mount(AudioPlayerContainer)

    const downloadBtn = wrapper.findComponent({ name: 'DownloadButton' })
    expect(downloadBtn.exists()).toBe(true)

    await downloadBtn.trigger('click')

    expect(mock.downloadAudio).toHaveBeenCalledTimes(1)
  })
})
