import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import AudioPlayerPanel from '../app/components/AudioPlayerPanel.vue'

const stubComponents = {
  WaveformCanvas: defineComponent({ template: '<canvas class="waveform-canvas" />' })
}

// ─── Behavioral Tests (black-box: rendered output, emitted events) ──────

describe('AudioPlayerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility state', () => {
    it('When visible=false then panel has hidden-slide and no visible-slide', () => {
      // Arrange
      const wrapper = shallowMount(AudioPlayerPanel, {
        global: { components: stubComponents },
        props: { visible: false, isPlaying: false, currentTime: 0, duration: 0, audioUrl: null, selectedVoiceName: '', speedValue: 1.0, isPaused: false }
      })
      // Act
      const panel = wrapper.find('.fixed.bottom-0')
      // Assert
      expect(panel.exists()).toBe(true)
      expect(panel.classes()).toContain('hidden-slide')
      expect(panel.classes()).not.toContain('visible-slide')
    })

    it('When visible=true then panel renders with visible-slide class', () => {
      // Arrange
      const wrapper = shallowMount(AudioPlayerPanel, {
        global: { components: stubComponents },
        props: { visible: true, isPlaying: false, currentTime: 0, duration: 10, audioUrl: 'http://test.url/audio.mp3', selectedVoiceName: 'Female Voice', speedValue: 1.0, isPaused: false }
      })
      // Act
      const panel = wrapper.find('.visible-slide')
      // Assert
      expect(panel.exists()).toBe(true)
    })
  })

  describe('panel layout', () => {
    it('When rendered then panel uses fixed bottom-0 right-0 positioning', () => {
      // Arrange
      const wrapper = shallowMount(AudioPlayerPanel, {
        global: { components: stubComponents },
        props: { visible: true, isPlaying: false, currentTime: 0, duration: 10, audioUrl: null, selectedVoiceName: '', speedValue: 1.0, isPaused: false }
      })
      // Act
      const panel = wrapper.find('.fixed.bottom-0.right-0')
      // Assert
      expect(panel.exists()).toBe(true)
    })
  })

  describe('header display', () => {
    it('When audio is generated then header shows voice name and speed value', () => {
      // Arrange
      const wrapper = shallowMount(AudioPlayerPanel, {
        global: { components: stubComponents },
        props: { visible: true, isPlaying: false, currentTime: 0, duration: 45, audioUrl: 'http://test.url/audio.mp3', selectedVoiceName: 'Aisha - Conversational', speedValue: 1.5, isPaused: false }
      })
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('Generated Audio')
      expect(html).toContain('Aisha - Conversational')
      expect(html).toContain('1.5x Speed')
    })

    it('When duration=0 then time display shows 0:00', () => {
      // Arrange
      const wrapper = shallowMount(AudioPlayerPanel, {
        global: { components: stubComponents },
        props: { visible: true, isPlaying: false, currentTime: 0, duration: 0, audioUrl: null, selectedVoiceName: '', speedValue: 1.0, isPaused: false }
      })
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('0:00')
    })

    it('When duration=45 then time display shows 0:45', () => {
      // Arrange
      const wrapper = shallowMount(AudioPlayerPanel, {
        global: { components: stubComponents },
        props: { visible: true, isPlaying: false, currentTime: 12, duration: 45, audioUrl: null, selectedVoiceName: '', speedValue: 1.0, isPaused: false }
      })
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('0:45')
    })
  })

  describe('waveform canvas', () => {
    it('When rendered then waveform canvas container is present', () => {
      // Arrange
      const wrapper = shallowMount(AudioPlayerPanel, {
        global: { components: stubComponents },
        props: { visible: true, isPlaying: false, currentTime: 0, duration: 10, audioUrl: null, selectedVoiceName: '', speedValue: 1.0, isPaused: false }
      })
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('waveform-canvas')
    })
  })

  describe('close button interaction', () => {
    it('When user clicks close button then emits close event once', async () => {
      // Arrange
      const wrapper = shallowMount(AudioPlayerPanel, {
        global: { components: stubComponents },
        props: { visible: true, isPlaying: false, currentTime: 0, duration: 10, audioUrl: null, selectedVoiceName: '', speedValue: 1.0, isPaused: false }
      })
      const closeButtons = wrapper.findAll('button[title="Close Player"]')
      // Act
      expect(closeButtons.length).toBeGreaterThan(0)
      await closeButtons[0].trigger('click')
      // Assert
      expect(wrapper.emitted('close')).toBeDefined()
      expect(wrapper.emitted('close')!.length).toBe(1)
    })
  })

  describe('play/pause button interaction', () => {
    it('When user clicks play button then emits toggle event once', async () => {
      // Arrange
      const wrapper = shallowMount(AudioPlayerPanel, {
        global: { components: stubComponents },
        props: { visible: true, isPlaying: false, currentTime: 0, duration: 10, audioUrl: null, selectedVoiceName: '', speedValue: 1.0, isPaused: false }
      })
      const playBtn = wrapper.find('button.bg-sunrise-magenta')
      // Act
      expect(playBtn.exists()).toBe(true)
      await playBtn.trigger('click')
      // Assert
      expect(wrapper.emitted('toggle')).toBeDefined()
      expect(wrapper.emitted('toggle')!.length).toBe(1)
    })
  })

  describe('download button interaction', () => {
    it('When user clicks download button then emits download event once', async () => {
      // Arrange
      const wrapper = shallowMount(AudioPlayerPanel, {
        global: { components: stubComponents },
        props: { visible: true, isPlaying: false, currentTime: 0, duration: 10, audioUrl: 'http://test.url/audio.mp3', selectedVoiceName: '', speedValue: 1.0, isPaused: false }
      })
      const downloadBtn = wrapper.find('button[title="Download MP3"]')
      // Act
      await downloadBtn.trigger('click')
      // Assert
      expect(wrapper.emitted('download')).toBeDefined()
      expect(wrapper.emitted('download')!.length).toBe(1)
    })
  })

  describe('panel persistence after playback', () => {
    it('When playback ends then panel remains visible (no auto-collapse)', () => {
      // Arrange
      const wrapper = shallowMount(AudioPlayerPanel, {
        global: { components: stubComponents },
        props: { visible: true, isPlaying: true, currentTime: 5, duration: 10, audioUrl: 'http://test.url/audio.mp3', selectedVoiceName: 'Test Voice', speedValue: 1.0, isPaused: false }
      })
      // Act
      let panel = wrapper.find('.fixed.bottom-0')
      expect(panel.exists()).toBe(true)
      wrapper.setProps({ isPlaying: false })
      panel = wrapper.find('.fixed.bottom-0')
      // Assert
      expect(panel.exists()).toBe(true)
    })
  })
})
