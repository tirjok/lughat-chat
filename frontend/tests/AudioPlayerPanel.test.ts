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
        speedValue: 1.0
      }
    })

    const panel = wrapper.find('.fixed.bottom-0.right-0')
    expect(panel.exists()).toBe(true)

    // Should NOT use absolute positioning
    const absolutePanel = wrapper.find('.absolute.bottom-0.left-0')
    expect(absolutePanel.exists()).toBe(false)
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
        speedValue: 1.0
      }
    })

    // Panel has visible-slide class (not Transition-based)
    const panel = wrapper.find('.visible-slide')
    expect(panel.exists()).toBe(true)
  })

  it('uses cubic-bezier(0.16,1,0.3,1) easing in transition styles', () => {
    // Read the component source to verify the easing is defined
    const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
    const componentSource = fs.readFileSync(componentPath, 'utf-8')

    expect(componentSource).toContain('cubic-bezier(0.16,1,0.3,1)')
    expect(componentSource).toContain('hidden-slide')
    expect(componentSource).toContain('visible-slide')
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
    let panel = wrapper.find('.fixed.bottom-0')
    expect(panel.exists()).toBe(true)

    // Simulate playback ending by setting isPlaying to false
    wrapper.setProps({ isPlaying: false })

    // Panel should STILL be visible (no auto-collapse)
    panel = wrapper.find('.fixed.bottom-0')
    expect(panel.exists()).toBe(true)
  })

  describe('responsive layout', () => {
    it('renders mobile stacked layout with flex-col on the waveform container', () => {
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
      // Mobile waveform container uses flex-col (stacked: play button above waveform)
      expect(html).toContain('flex flex-col gap-3')
      // Outer wrapper is responsive: narrow on mobile, full on desktop
      expect(html).toContain('w-[92%] md:w-full mx-auto')
    })

    it('renders desktop horizontal layout with flex on the waveform container', () => {
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
      // Waveform container: responsive flex-col → flex-row, items-center on both
      expect(html).toContain('flex flex-col')
      expect(html).toContain('md:flex-row')
      expect(html).toContain('items-center')
      // No separate desktop/mobile sections — single unified container
      expect(html).not.toContain('hidden md:')
    })

    it('uses 44px (w-11 h-11) action buttons on mobile, 40px (w-10 h-10) on desktop', () => {
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
      // Download button: 44px on mobile, 40px on desktop
      expect(html).toContain('w-11 h-11 md:w-10 md:h-10')
      // Close button: same responsive sizing
      const buttons = wrapper.findAll('button[title]')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })

    it('renders mobile panel at 92% width centered (narrower bottom sheet)', () => {
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
      // Mobile panel is narrower (92%) so it doesn't cover the entire textarea
      // On desktop the wrapper expands to full width (responsive, not hidden)
      expect(html).toContain('w-[92%] md:w-full mx-auto')
    })

    it('preserves the visible prop and close/toggle/download emits', () => {
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

      // Close emits close
      const closeBtn = wrapper.find('button[title="Close Player"]')
      expect(closeBtn.exists()).toBe(true)

      // Toggle emits toggle
      const toggleBtn = wrapper.find('button.bg-sunrise-magenta')
      expect(toggleBtn.exists()).toBe(true)

      // Download emits download
      const downloadBtn = wrapper.find('button[title="Download MP3"]')
      expect(downloadBtn.exists()).toBe(true)
    })

    it('preserves the hidden-slide / visible-slide CSS transition', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const componentSource = fs.readFileSync(componentPath, 'utf-8')

      expect(componentSource).toContain('.hidden-slide')
      expect(componentSource).toContain('.visible-slide')
      expect(componentSource).toContain('translateY(150%)')
      expect(componentSource).toContain('opacity: 0')
      expect(componentSource).toContain('opacity: 1')
      expect(componentSource).toContain('pointer-events')
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
      // Should NOT have the old weaker shadow
      expect(source).not.toContain('shadow-[0_-10px_40px_rgba(0,0,0,0.5)]')
    })

    it('uses z-50 (not z-30) for panel stacking', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('z-50')
      expect(source).not.toContain('z-30')
    })

    it('has hidden-slide class for slide animation (not CSS <style> block)', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('hidden-slide')
      expect(source).toContain('visible-slide')
      // Should NOT have the old slide-up-player CSS classes
      expect(source).not.toContain('slide-up-player-enter-active')
      expect(source).not.toContain('slide-up-player-leave-active')
    })

    it('has transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]')
    })

    it('does not have extra inline border-left/right styles', () => {
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).not.toContain('border-left: 1px solid')
      expect(source).not.toContain('border-right: 1px solid')
    })
  })

  // ─── Responsive Flex Direction Tests ──────────────────────────────────

  describe('responsive flex direction (mobile vs desktop)', () => {
    it('flex direction is flex-col on mobile widths (<768px)', () => {
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
      // Mobile layout: flex-col stacks play button above waveform
      expect(html).toContain('flex flex-col gap-3')
      // Outer wrapper is responsive: 92% width on mobile, full on desktop
      expect(html).toContain('w-[92%] md:w-full mx-auto')
      // Verify the source uses responsive flex-col for mobile
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('flex flex-col gap-3')
    })

    it('flex direction is flex-row on desktop widths (≥768px)', () => {
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
      // Waveform container: flex-col on mobile, flex-row on desktop
      expect(html).toContain('flex flex-col')
      expect(html).toContain('md:flex-row')
      expect(html).toContain('items-center')
      // Verify the source has responsive flex-row for desktop
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('md:flex-row')
      expect(source).toContain('items-center')
      expect(source).toContain('md:gap-4')
    })

    it('touch targets are 44px+ on mobile (WCAG compliance)', () => {
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
      // Download/close buttons: 44px (w-11 h-11) on mobile
      expect(html).toContain('w-11 h-11')
      // Play/pause button: 48px (w-12 h-12) on mobile for WCAG
      expect(html).toContain('w-12 h-12')
      // Verify the source has responsive sizing
      const componentPath = path.join(__dirname, '../app/components/AudioPlayerPanel.vue')
      const source = fs.readFileSync(componentPath, 'utf-8')
      expect(source).toContain('w-11 h-11 md:w-10 md:h-10')
      expect(source).toContain('w-12 h-12')
    })
  })
})
