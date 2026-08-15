import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import StickyAudioBar from '~/components/StickyAudioBar.vue'

// ─── KeyboardEvent Factory ──────────────────────────────────────────────
// Creates a minimal KeyboardEvent for testing keyboard shortcuts.
const makeKey = (key: string, modifiers?: { ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }): KeyboardEvent =>
  new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers
  })

describe('StickyAudioBar', () => {
  // ─── Helper ────────────────────────────────────────────────────────

  const mountBar = (props = {}) =>
    mount(StickyAudioBar, { props })

  // ─── AC-1: Fixed bottom slide-up bar ────────────────────────────────

  describe('visibility / slide-up animation (AC-1)', () => {
    it('StickyAudioBar | when active=false | bar has translate-y-full (hidden state)', () => {
      // Arrange
      const wrapper = mountBar({ active: false })

      // Act & Assert
      const bar = wrapper.get('[data-testid="sticky-bar"]')
      const classStr = bar.classes().join(' ')
      expect(classStr).toContain('translate-y-full')
      expect(classStr).not.toContain('translate-y-0')
    })

    it('StickyAudioBar | when active=true | bar has translate-y-0 (visible state)', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const bar = wrapper.get('[data-testid="sticky-bar"]')
      const classStr = bar.classes().join(' ')
      expect(classStr).toContain('translate-y-0')
      expect(classStr).not.toContain('translate-y-full')
    })

    it('StickyAudioBar | when active toggles | bar CSS class toggles accordingly', async () => {
      // Arrange
      const wrapper = mountBar({ active: false })
      const bar = wrapper.get('[data-testid="sticky-bar"]')

      // Act & Assert
      expect(bar.classes()).toContain('translate-y-full')

      await wrapper.setProps({ active: true })
      expect(bar.classes()).toContain('translate-y-0')
      expect(bar.classes()).not.toContain('translate-y-full')

      await wrapper.setProps({ active: false })
      expect(bar.classes()).toContain('translate-y-full')
    })

    it('StickyAudioBar | when rendered | bar has fixed positioning classes', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const bar = wrapper.get('[data-testid="sticky-bar"]')
      const classStr = bar.classes().join(' ')
      expect(classStr).toContain('fixed')
      expect(classStr).toContain('bottom-0')
      expect(classStr).toContain('left-0')
      expect(classStr).toContain('right-0')
      expect(classStr).toContain('z-50')
    })
  })

  // ─── AC-2: Left controls ────────────────────────────────────────────

  describe('left controls (AC-2)', () => {
    it('StickyAudioBar | when rendered | prev button exists with correct icon', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const prevBtn = wrapper.get('[data-testid="prev-button"]')
      expect(prevBtn.attributes()['data-icon']).toBe('prev')
    })

    it('StickyAudioBar | when rendered | next button exists with correct icon', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const nextBtn = wrapper.get('[data-testid="next-button"]')
      expect(nextBtn.attributes()['data-icon']).toBe('next')
    })

    it('StickyAudioBar | when rendered | play/pause button has primary-600 rounded-full', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const playBtn = wrapper.get('[data-testid="play-pause-button"]')
      const classStr = playBtn.classes().join(' ')
      expect(classStr).toContain('primary-600')
      expect(classStr).toContain('rounded-full')
    })

    it('StickyAudioBar | when isPlaying=false | play icon is shown', async () => {
      // Arrange
      const wrapper = mountBar({ active: true, isPlaying: false })

      // Act
      await nextTick()

      // Assert
      const playBtn = wrapper.get('[data-testid="play-pause-button"]')
      const spans = playBtn.findAll('span')
      const hasPlay = spans.some(s => s.classes().includes('ph-play'))
      expect(hasPlay).toBe(true)
    })

    it('StickyAudioBar | when isPlaying=true and isPaused=false | pause icon is shown', async () => {
      // Arrange
      const wrapper = mountBar({ active: true, isPlaying: true, isPaused: false })

      // Act
      await nextTick()

      // Assert
      const playBtn = wrapper.get('[data-testid="play-pause-button"]')
      const spans = playBtn.findAll('span')
      const hasPause = spans.some(s => s.classes().includes('ph-pause'))
      expect(hasPause).toBe(true)
    })

    it('StickyAudioBar | when isPlaying=true and isPaused=true | play icon is shown', async () => {
      // Arrange
      const wrapper = mountBar({ active: true, isPlaying: true, isPaused: true })

      // Act
      await nextTick()

      // Assert
      const playBtn = wrapper.get('[data-testid="play-pause-button"]')
      const spans = playBtn.findAll('span')
      const hasPlay = spans.some(s => s.classes().includes('ph-play'))
      expect(hasPlay).toBe(true)
    })

    it('StickyAudioBar | when play/pause clicked | emits toggle event', async () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act
      await wrapper.get('[data-testid="play-pause-button"]').trigger('click')

      // Assert
      expect(wrapper.emitted('toggle')).toHaveLength(1)
    })

    it('StickyAudioBar | when prev clicked | emits prevTrack event', async () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act
      await wrapper.get('[data-testid="prev-button"]').trigger('click')

      // Assert
      expect(wrapper.emitted('prevTrack')).toHaveLength(1)
    })

    it('StickyAudioBar | when next clicked | emits nextTrack event', async () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act
      await wrapper.get('[data-testid="next-button"]').trigger('click')

      // Assert
      expect(wrapper.emitted('nextTrack')).toHaveLength(1)
    })
  })

  // ─── AC-3: Center controls ──────────────────────────────────────────

  describe('center controls (AC-3)', () => {
    it('StickyAudioBar | when rendered | Arabic text display has RTL class', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const textDisplay = wrapper.get('[data-testid="arabic-text"]')
      expect(textDisplay.classes()).toContain('rtl')
    })

    it('StickyAudioBar | when textContent provided | displays the Arabic text', () => {
      // Arrange
      const wrapper = mountBar({ active: true, textContent: 'مرحبا بالعالم' })

      // Act & Assert
      const textDisplay = wrapper.get('[data-testid="arabic-text"]')
      expect(textDisplay.text()).toContain('مرحبا بالعالم')
    })

    it('StickyAudioBar | when textContent not provided | shows placeholder', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const textDisplay = wrapper.get('[data-testid="arabic-text"]')
      expect(textDisplay.text()).toContain('Generating...')
    })

    it('StickyAudioBar | when isPlaying=true | wave animation has playing class', async () => {
      // Arrange
      const wrapper = mountBar({ active: true, isPlaying: true })

      // Act
      await nextTick()

      // Assert
      const waveContainer = wrapper.get('[data-testid="wave-animation"]')
      expect(waveContainer.classes()).toContain('playing')
    })

    it('StickyAudioBar | when isPlaying=false | wave animation does not have playing class', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const waveContainer = wrapper.get('[data-testid="wave-animation"]')
      expect(waveContainer.classes()).not.toContain('playing')
    })

    it('StickyAudioBar | when rendered | progress bar exists', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const progressBar = wrapper.get('[data-testid="progress-bar"]')
      expect(progressBar.exists()).toBe(true)
    })

    it('StickyAudioBar | when progress bar clicked | emits seek event with ratio argument', async () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act
      await wrapper.get('[data-testid="progress-bar"]').trigger('click')

      // Assert
      expect(wrapper.emitted('seek')).toBeDefined()
      expect(wrapper.emitted('seek')?.[0]).toEqual([expect.any(Number)])
    })

    it('StickyAudioBar | when currentTime=30 duration=60 | progress fill exists', () => {
      // Arrange
      const wrapper = mountBar({ active: true, currentTime: 30, duration: 60 })

      // Act & Assert
      const fill = wrapper.get('[data-testid="progress-bar"]').find('[data-testid="progress-fill"]')
      expect(fill.exists()).toBe(true)
    })

    it('StickyAudioBar | when rendered | current time display exists', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const currentTimeDisplay = wrapper.get('[data-testid="current-time"]')
      expect(currentTimeDisplay.exists()).toBe(true)
    })

    it('StickyAudioBar | when rendered | duration time display exists', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const durationTimeDisplay = wrapper.get('[data-testid="duration-time"]')
      expect(durationTimeDisplay.exists()).toBe(true)
    })

    it('StickyAudioBar | when currentTime=45 duration=120 | times display 0:45 / 2:00', () => {
      // Arrange
      const wrapper = mountBar({ active: true, currentTime: 45, duration: 120 })

      // Act & Assert
      const currentTimeEl = wrapper.get('[data-testid="current-time"]')
      const durationTimeEl = wrapper.get('[data-testid="duration-time"]')
      expect(currentTimeEl.text()).toContain('0:45')
      expect(durationTimeEl.text()).toContain('2:00')
    })
  })

  // ─── AC-4: Right controls ───────────────────────────────────────────

  describe('right controls (AC-4)', () => {
    it('StickyAudioBar | when rendered | repeat button exists', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const repeatBtn = wrapper.get('[data-testid="repeat-button"]')
      expect(repeatBtn.exists()).toBe(true)
    })

    it('StickyAudioBar | when repeatMode=off | repeat icon is inactive', () => {
      // Arrange
      const wrapper = mountBar({ active: true, repeatMode: 'off' })

      // Act & Assert
      const repeatBtn = wrapper.get('[data-testid="repeat-button"]')
      expect(repeatBtn.classes().join(' ')).not.toContain('active')
    })

    it('StickyAudioBar | when repeatMode=one | repeat icon shows active', () => {
      // Arrange
      const wrapper = mountBar({ active: true, repeatMode: 'one' })

      // Act & Assert
      const repeatBtn = wrapper.get('[data-testid="repeat-button"]')
      expect(repeatBtn.classes()).toContain('active')
    })

    it('StickyAudioBar | when repeatMode=all | repeat icon shows active', () => {
      // Arrange
      const wrapper = mountBar({ active: true, repeatMode: 'all' })

      // Act & Assert
      const repeatBtn = wrapper.get('[data-testid="repeat-button"]')
      expect(repeatBtn.classes()).toContain('active')
    })

    it('StickyAudioBar | when repeat clicked | emits repeatChange event', async () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act
      await wrapper.get('[data-testid="repeat-button"]').trigger('click')

      // Assert
      expect(wrapper.emitted('repeatChange')).toBeDefined()
      expect(wrapper.emitted('repeatChange')?.[0]).toEqual([expect.any(String)])
    })

    it('StickyAudioBar | when rendered | close button exists', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const closeBtn = wrapper.get('[data-testid="close-button"]')
      expect(closeBtn.exists()).toBe(true)
    })

    it('StickyAudioBar | when close clicked | emits close event', async () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act
      await wrapper.get('[data-testid="close-button"]').trigger('click')

      // Assert
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  // ─── AC-5: Dark mode ────────────────────────────────────────────────

  describe('dark mode (AC-5)', () => {
    it('StickyAudioBar | when rendered | bar has dark mode utility classes', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      const bar = wrapper.get('[data-testid="sticky-bar"]')
      const classStr = bar.classes().join(' ')
      expect(classStr).toContain('dark:bg-stone-800')
      expect(classStr).toContain('dark:text-stone-200')
      expect(classStr).toContain('dark:border-stone-700')
    })
  })

  // ─── AC-7: Keyboard shortcuts ───────────────────────────────────────

  describe('keyboard shortcuts (AC-7)', () => {
    it('StickyAudioBar | when Space pressed | emits toggle event', async () => {
      // Arrange
      const wrapper = mountBar({ active: true, shortcutsEnabled: true })
      await nextTick()

      // Act
      window.dispatchEvent(makeKey(' '))

      // Assert
      expect(wrapper.emitted('toggle')).toHaveLength(1)
    })

    it('StickyAudioBar | when Space+Ctrl pressed | does NOT emit toggle', async () => {
      // Arrange
      const wrapper = mountBar({ active: true, shortcutsEnabled: true })
      await nextTick()

      // Act
      window.dispatchEvent(makeKey(' ', { ctrlKey: true }))

      // Assert
      expect(wrapper.emitted('toggle')).toBeUndefined()
    })

    it('StickyAudioBar | when ArrowLeft pressed | emits seek event', async () => {
      // Arrange
      const wrapper = mountBar({ active: true, shortcutsEnabled: true })
      await nextTick()

      // Act
      window.dispatchEvent(makeKey('ArrowLeft'))

      // Assert
      expect(wrapper.emitted('seek')).toHaveLength(1)
    })

    it('StickyAudioBar | when ArrowRight pressed | emits seek event', async () => {
      // Arrange
      const wrapper = mountBar({ active: true, shortcutsEnabled: true })
      await nextTick()

      // Act
      window.dispatchEvent(makeKey('ArrowRight'))

      // Assert
      expect(wrapper.emitted('seek')).toHaveLength(1)
    })

    it('StickyAudioBar | when Ctrl+Enter pressed | does NOT emit toggle', async () => {
      // Arrange
      const wrapper = mountBar({ active: true, shortcutsEnabled: true })
      await nextTick()

      // Act
      window.dispatchEvent(makeKey('Enter', { ctrlKey: true }))

      // Assert
      expect(wrapper.emitted('toggle')).toBeUndefined()
    })

    it('StickyAudioBar | when Escape pressed | emits close event', async () => {
      // Arrange
      const wrapper = mountBar({ active: true, shortcutsEnabled: true })
      await nextTick()

      // Act
      window.dispatchEvent(makeKey('Escape'))

      // Assert
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  // ─── Integration / structural ───────────────────────────────────────

  describe('component structure', () => {
    it('StickyAudioBar | when rendered | has three-section layout (left/center/right)', () => {
      // Arrange
      const wrapper = mountBar({ active: true })

      // Act & Assert
      expect(wrapper.get('[data-testid="controls-left"]').exists()).toBe(true)
      expect(wrapper.get('[data-testid="controls-center"]').exists()).toBe(true)
      expect(wrapper.get('[data-testid="controls-right"]').exists()).toBe(true)
    })
  })
})
