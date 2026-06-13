import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import * as fs from 'fs'
import * as path from 'path'
import AudioPlayerPanel from '../app/components/AudioPlayerPanel.vue'

const stubComponents = {
  WaveformCanvas: defineComponent({ template: '<canvas class="waveform-canvas" />' })
}

describe('AudioPlayerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is not rendered when visible=false', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: false,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0
      }
    })

    const panel = wrapper.find('.absolute.bottom-0')
    expect(panel.exists()).toBe(false)
  })

  it('is rendered when visible=true', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 0,
        duration: 10,
        audioUrl: 'http://test.url/audio.mp3',
        selectedVoiceName: 'Female Voice',
        speedValue: 1.0
      }
    })

    const panel = wrapper.find('.absolute.bottom-0')
    expect(panel.exists()).toBe(true)
  })

  it('renders the generated audio header with voice name and speed', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 0,
        duration: 45,
        audioUrl: 'http://test.url/audio.mp3',
        selectedVoiceName: 'Aisha - Conversational',
        speedValue: 1.5
      }
    })

    const html = wrapper.html()
    expect(html).toContain('Generated Audio')
    expect(html).toContain('Aisha - Conversational')
    expect(html).toContain('1.5x Speed')
  })

  it('renders the waveform canvas container', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 0,
        duration: 10,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0
      }
    })

    // The stub WaveformCanvas renders as <canvas class="waveform-canvas" />
    // inside the panel, which renders when visible=true
    const html = wrapper.html()
    expect(html).toContain('waveform-canvas')
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 0,
        duration: 10,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0
      }
    })

    const closeButtons = wrapper.findAll('button[title="Close Player"]')
    expect(closeButtons.length).toBeGreaterThan(0)
    await closeButtons[0].trigger('click')

    expect(wrapper.emitted('close')).toBeDefined()
    expect(wrapper.emitted('close')!.length).toBe(1)
  })

  it('emits toggle event when play/pause button is clicked', async () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 0,
        duration: 10,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0
      }
    })

    const playPauseBtn = wrapper.find('button.w-12.h-12.rounded-full')
    await playPauseBtn.trigger('click')

    expect(wrapper.emitted('toggle')).toBeDefined()
    expect(wrapper.emitted('toggle')!.length).toBe(1)
  })

  it('emits download event when download button is clicked', async () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 0,
        duration: 10,
        audioUrl: 'http://test.url/audio.mp3',
        selectedVoiceName: '',
        speedValue: 1.0
      }
    })

    const downloadBtn = wrapper.find('button[title="Download MP3"]')
    await downloadBtn.trigger('click')

    expect(wrapper.emitted('download')).toBeDefined()
    expect(wrapper.emitted('download')!.length).toBe(1)
  })

  it('shows pause icon when isPlaying=true', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: true,
        currentTime: 0,
        duration: 10,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0
      }
    })

    const html = wrapper.html()
    expect(html).toContain('i-lucide-pause')
    expect(html).not.toContain('i-lucide-play')
  })

  it('shows play icon when isPlaying=false', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 0,
        duration: 10,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0
      }
    })

    const html = wrapper.html()
    expect(html).toContain('i-lucide-play')
    expect(html).not.toContain('i-lucide-pause')
  })

  it('displays duration in the time display', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 12,
        duration: 45,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0
      }
    })

    const html = wrapper.html()
    expect(html).toContain('0:45')
  })

  it('displays 0:00 when duration is 0', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0
      }
    })

    const html = wrapper.html()
    expect(html).toContain('0:00')
  })

  it('applies slide-up transition classes when visible', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 0,
        duration: 10,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0
      }
    })

    // The Transition wraps the panel with name="slide-up-player"
    // Check that the Transition component is rendered
    const transition = wrapper.findComponent({ name: 'Transition' })
    expect(transition.exists()).toBe(true)
  })

  it('uses cubic-bezier(0.16, 1, 0.3, 1) easing in transition styles', () => {
    // Read the component source to verify the easing is defined
    const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
    const componentSource = fs.readFileSync(componentPath, 'utf-8')

    expect(componentSource).toContain('cubic-bezier(0.16, 1, 0.3, 1)')
    expect(componentSource).toContain('slide-up-player-enter-active')
    expect(componentSource).toContain('slide-up-player-leave-active')
    expect(componentSource).toContain('slide-up-player-enter-from')
    expect(componentSource).toContain('slide-up-player-leave-to')
    expect(componentSource).toContain('translateY(150%)')
  })

  it('does not auto-collapse when playback ends — panel stays visible', () => {
    // When visible=true and isPlaying transitions to false (playback ended),
    // the panel should still be visible — no auto-hide logic exists
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: true,
        currentTime: 5,
        duration: 10,
        audioUrl: 'http://test.url/audio.mp3',
        selectedVoiceName: 'Test Voice',
        speedValue: 1.0
      }
    })

    // Panel is visible initially
    let panel = wrapper.find('.absolute.bottom-0')
    expect(panel.exists()).toBe(true)

    // Simulate playback ending by setting isPlaying to false
    wrapper.setProps({ isPlaying: false })

    // Panel should STILL be visible (no auto-collapse)
    panel = wrapper.find('.absolute.bottom-0')
    expect(panel.exists()).toBe(true)
  })
})
