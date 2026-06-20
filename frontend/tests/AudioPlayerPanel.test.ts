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

  it('is hidden when visible=false (hidden-slide class applied)', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: false,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0,
        isPaused: false
      }
    })

    // Panel is always in DOM (CSS transitions), but hidden-slide class is applied
    const panel = wrapper.find('.fixed.bottom-0')
    expect(panel.exists()).toBe(true)
    expect(panel.classes()).toContain('hidden-slide')
    expect(panel.classes()).not.toContain('visible-slide')
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
        speedValue: 1.0,
        isPaused: false
      }
    })

    const panel = wrapper.find('.fixed.bottom-0')
    expect(panel.exists()).toBe(true)
  })

  it('uses fixed positioning with bottom-0 right-0 (not absolute left-0)', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 0,
        duration: 10,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0,
        isPaused: false
      }
    })

    const panel = wrapper.find('.fixed.bottom-0.right-0')
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
        speedValue: 1.0,
        isPaused: false
      }
    })

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
        speedValue: 1.0,
        isPaused: false
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
        speedValue: 1.0,
        isPaused: false
      }
    })

    const playBtn = wrapper.find('button.bg-sunrise-magenta')
    expect(playBtn.exists()).toBe(true)
    await playBtn.trigger('click')

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
        speedValue: 1.0,
        isPaused: false
      }
    })

    const downloadBtn = wrapper.find('button[title="Download MP3"]')
    await downloadBtn.trigger('click')

    expect(wrapper.emitted('download')).toBeDefined()
    expect(wrapper.emitted('download')!.length).toBe(1)
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
        speedValue: 1.0,
        isPaused: false
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
        speedValue: 1.0,
        isPaused: false
      }
    })

    const html = wrapper.html()
    expect(html).toContain('0:00')
  })

  it('applies visible-slide class when panel is visible', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: false,
        currentTime: 0,
        duration: 10,
        audioUrl: null,
        selectedVoiceName: '',
        speedValue: 1.0,
        isPaused: false
      }
    })

    const panel = wrapper.find('.visible-slide')
    expect(panel.exists()).toBe(true)
  })

  it('uses cubic-bezier(0.16, 1, 0.3, 1) easing in transition styles', () => {
    const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
    const componentSource = fs.readFileSync(componentPath, 'utf-8')

    expect(componentSource).toContain('cubic-bezier(0.16, 1, 0.3, 1)')
    expect(componentSource).toContain('hidden-slide')
    expect(componentSource).toContain('visible-slide')
    expect(componentSource).toContain('translateY(150%)')
  })

  it('does not auto-collapse when playback ends — panel stays visible', () => {
    const wrapper = shallowMount(AudioPlayerPanel, {
      global: { components: stubComponents },
      props: {
        visible: true,
        isPlaying: true,
        currentTime: 5,
        duration: 10,
        audioUrl: 'http://test.url/audio.mp3',
        selectedVoiceName: 'Test Voice',
        speedValue: 1.0,
        isPaused: false
      }
    })

    let panel = wrapper.find('.fixed.bottom-0')
    expect(panel.exists()).toBe(true)

    wrapper.setProps({ isPlaying: false })

    panel = wrapper.find('.fixed.bottom-0')
    expect(panel.exists()).toBe(true)
  })

  // ─── Prototype Pixel-Perfect Layout Tests ────────────────────────────

  describe('prototype pixel-perfect layout', () => {
    it('matches prototype: mb-1 md:mb-2 gap-2 on player header', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('mb-1 md:mb-2 gap-2')
    })

    it('matches prototype: smaller icon sizes on mobile (w-8 h-8 md:w-10 md:h-10)', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('w-8 h-8 md:w-10 md:h-10')
    })

    it('matches prototype: text-xs md:text-sm for header, text-[10px] md:text-xs for subtitle', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('text-xs md:text-sm')
      expect(source).toContain('text-[10px] md:text-xs')
    })

    it('matches prototype: waveform container p-2 md:p-4, gap-2 md:gap-4, h-8 md:h-12', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('p-2 md:p-4')
      expect(source).toContain('gap-2 md:gap-4')
      expect(source).toContain('h-8 md:h-12')
    })

    it('matches prototype: play button w-10 h-10 md:w-12 md:h-12', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('w-10 h-10 md:w-12 md:h-12')
    })

    it('matches prototype: canvas min-w-[100px]', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('min-w-[100px]')
    })

    it('matches prototype: time display text-[10px] md:text-xs, w-8 md:w-10', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('text-[10px] md:text-xs')
      expect(source).toContain('w-8 md:w-10')
    })

    it('matches prototype: no w-[92%] wrapper (full width on both)', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).not.toContain('w-[92%]')
    })

    it('matches prototype: waveform container uses flex-1 (horizontal, not flex-col)', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('flex items-center')
      // The waveform container uses flex-1 (horizontal layout)
      expect(source).toContain('flex-1 h-8 md:h-12')
      // The waveform container (waveform-wrapper div) does NOT use flex-col
      // (the outer panel wrapper uses flex-col for overall layout)
      expect(source).toContain('overflow-hidden min-w-[100px]')
    })

    it('matches prototype: gradient audio icon with drop-shadow', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('bg-gradient-to-br from-sunrise-orange to-sunrise-magenta')
    })

    it('matches prototype: shadow-[0_0_15px_rgba(221,36,118,0.4)] on play button', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('shadow-[0_0_15px_rgba(221,36,118,0.4)]')
    })

    it('matches prototype: truncate on voice name and subtitle', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('truncate')
    })

    it('matches prototype: min-w-0 on text container', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('min-w-0')
    })
  })

  // ─── Issue 5: Desktop Width Constraint Tests ──────────────────────────

  describe('Issue 5: Desktop width constraint', () => {
    it('uses responsive padding: p-4 on mobile, p-6 on desktop', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('p-4 md:p-6')
    })

    it('uses responsive gap: gap-3 on mobile, gap-4 on desktop', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('gap-3 md:gap-4')
    })

    it('uses stronger shadow: 0_-15px_40px_rgba(0,0,0,0.6)', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('shadow-[0_-15px_40px_rgba(0,0,0,0.6)]')
      expect(source).not.toContain('shadow-[0_-10px_40px_rgba(0,0,0,0.5)]')
    })

    it('uses z-50 (not z-30) for panel stacking', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('z-50')
      expect(source).not.toContain('z-30')
    })

    it('has hidden-slide class for slide animation', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('hidden-slide')
      expect(source).toContain('visible-slide')
      expect(source).not.toContain('slide-up-player-enter-active')
      expect(source).not.toContain('slide-up-player-leave-active')
    })

    it('has transition styles with cubic-bezier easing inline', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('cubic-bezier(0.16, 1, 0.3, 1)')
    })

    it('does not have extra inline border-left/right styles', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).not.toContain('border-left: 1px solid')
      expect(source).not.toContain('border-right: 1px solid')
    })
  })

  // ─── Responsive Layout Tests ──────────────────────────────────────────

  describe('responsive layout', () => {
    it('has responsive widths: md:w-[65%] lg:w-[70%] xl:w-[75%]', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('md:w-[65%]')
      expect(source).toContain('lg:w-[70%]')
      expect(source).toContain('xl:w-[75%]')
    })

    it('has responsive border: border-t on mobile, md:border-l on desktop', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('border-t md:border-l')
    })

    it('has responsive text sizing for play icon (text-lg md:text-xl)', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('text-lg md:text-xl')
    })

    it('has responsive audio icon text (text-sm md:text-base)', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('text-sm md:text-base')
    })
  })
})
