import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import SpeedSlider from '~/components/SpeedSlider.vue'
import { setBreakpoint } from '~~/tests/mocks'

describe('SpeedSlider', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth })
  })

  const mountSlider = (modelValue = 1.0) => {
    return mount(SpeedSlider, {
      props: { modelValue }
    })
  }

  // ─── Behavioral Tests (black-box: rendered elements, events, state) ────

  describe('slider structure', () => {
    it('When rendered then slider track div exists with role="slider"', () => {
      // Arrange
      const wrapper = mountSlider()
      // Act
      const track = wrapper.find('[role="slider"]')
      // Assert
      expect(track.exists()).toBe(true)
      expect(track.attributes('aria-valuemin')).toBe('0.5')
      expect(track.attributes('aria-valuemax')).toBe('2')
    })

    it('When modelValue=1.5 then fill width reflects percentage position', () => {
      // Arrange
      const wrapper = mountSlider(1.5)
      // Act
      const fill = wrapper.find('[role="slider"] > div:nth-child(2)')
      // Assert — 1.5 is 66.67% of the way from 0.5 to 2.0
      const style = fill.attributes('style')
      expect(style).toContain('width: 66.66666666666666%')
    })

    it('When modelValue=1.25 then thumb is centered at 50% of track', () => {
      // Arrange
      const wrapper = mountSlider(1.25)
      // Act
      const track = wrapper.find('[role="slider"]')
      // The third child div is the thumb — its left position should be 50% - 8px (half thumb width)
      const thumb = track.findAll('div')[2]
      const style = thumb.attributes('style')
      expect(style).toContain('left: calc(50% - 8px)')
    })
  })

  describe('display value', () => {
    it('When rendered then display value shows current speed', () => {
      // Arrange
      const wrapper = mountSlider(1.3)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('1.3x')
    })
  })

  describe('slider interaction', () => {
    it('When modelValue=1.0 then display shows 1.0x', () => {
      // Arrange
      const wrapper = mountSlider()
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('1.0x')
    })

    it('When modelValue=1.5 then display shows 1.5x', () => {
      // Arrange
      const wrapper = mountSlider(1.5)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('1.5x')
    })

    it('When modelValue=2.0 then display shows 2.0x (max)', () => {
      // Arrange
      const wrapper = mountSlider(2.0)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('2.0x')
    })

    it('When modelValue=0.5 then display shows 0.5x (min)', () => {
      // Arrange
      const wrapper = mountSlider(0.5)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('0.5x')
    })

    it('When track is clicked near min edge then emits clamped 0.5', async () => {
      // Arrange
      const wrapper = mountSlider(1.0)
      const track = wrapper.find('[role="slider"]')
      // Mock getBoundingClientRect so width=100, left=0
      const mockRect = { left: 0, width: 100 }
      Object.defineProperty(track.element, 'getBoundingClientRect', {
        value: () => mockRect,
        writable: true,
        configurable: true
      })
      // Act — click at 0% (far left)
      await track.trigger('click', { clientX: 0 })
      await nextTick()
      // Assert
      const emissions = wrapper.emitted('update:modelValue') as unknown[][]
      expect(emissions.length).toBeGreaterThanOrEqual(1)
      expect(emissions[emissions.length - 1]).toEqual([0.5])
    })

    it('When track is clicked near max edge then emits clamped 2.0', async () => {
      // Arrange
      const wrapper = mountSlider(1.0)
      const track = wrapper.find('[role="slider"]')
      // Mock getBoundingClientRect so width=100
      const mockRect = { left: 0, width: 100 }
      Object.defineProperty(track.element, 'getBoundingClientRect', {
        value: () => mockRect,
        writable: true,
        configurable: true
      })
      // Act — click at 100% (far right)
      await track.trigger('click', { clientX: 100 })
      await nextTick()
      // Assert
      const emissions = wrapper.emitted('update:modelValue') as unknown[][]
      expect(emissions.length).toBeGreaterThanOrEqual(1)
      expect(emissions[emissions.length - 1]).toEqual([2.0])
    })
  })

  describe('v-model interface', () => {
    it('When track is clicked then emits update:modelValue with new value', async () => {
      // Arrange
      const wrapper = mountSlider(1.0)
      const track = wrapper.find('[role="slider"]')
      // Mock getBoundingClientRect so width=100, left=0
      const mockRect = { left: 0, width: 100 }
      Object.defineProperty(track.element, 'getBoundingClientRect', {
        value: () => mockRect,
        writable: true,
        configurable: true
      })
      // Act — click at 50% (middle) → 0.5 + 0.5 * 1.5 = 1.25
      await track.trigger('click', { clientX: 50 })
      await nextTick()
      // Assert
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([1.3])
    })
  })

  describe('display value formatting', () => {
    it('When modelValue=1.0 then displayValue formats as 1.0x', () => {
      // Arrange
      const wrapper = mountSlider(1.0)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('1.0x')
    })

    it('When modelValue=0.5 then displayValue formats as 0.5x', () => {
      // Arrange
      const wrapper = mountSlider(0.5)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('0.5x')
    })
  })

  // ─── Responsive Tests (black-box: breakpoint simulation) ────────────────

  describe('responsive layout (slider)', () => {
    it('When viewport is 375px then slider renders', () => {
      // Arrange
      setBreakpoint(375)
      // Act
      const wrapper = mountSlider()
      const html = wrapper.html()
      // Assert
      expect(html).toContain('role="slider"')
    })

    it('When viewport is 1024px then slider renders', () => {
      // Arrange
      setBreakpoint(1024)
      // Act
      const wrapper = mountSlider()
      const html = wrapper.html()
      // Assert
      expect(html).toContain('role="slider"')
    })
  })
})
