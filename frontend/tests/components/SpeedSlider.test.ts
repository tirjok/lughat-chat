import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import SpeedSlider from '../../app/components/SpeedSlider.vue'
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

  describe('native range input', () => {
    it('When rendered then native <input type="range"> element exists', () => {
      // Arrange
      const wrapper = mountSlider()
      // Act
      const input = wrapper.find('input[type="range"]')
      // Assert
      expect(input.exists()).toBe(true)
    })

    it('When rendered then range input has correct min, max, step attributes', () => {
      // Arrange
      const wrapper = mountSlider()
      // Act
      const input = wrapper.find('input[type="range"]')
      // Assert
      expect(input.attributes('min')).toBe('0.5')
      expect(input.attributes('max')).toBe('2.0')
      expect(input.attributes('step')).toBe('0.1')
    })

    it('When modelValue=1.5 then range input reflects current value', () => {
      // Arrange
      const wrapper = mountSlider(1.5)
      // Act
      const input = wrapper.find('input[type="range"]')
      // Assert
      expect(input.element.value).toBe('1.5')
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
  })

  describe('slider clamping', () => {
    it('When slider set to 0.3 then clamps to 0.5 and emits update:modelValue', async () => {
      // Arrange
      const wrapper = mountSlider(1.0)
      const input = wrapper.find('input[type="range"]')
      // Act
      await input.setValue('0.3')
      await input.trigger('input')
      await nextTick()
      // Assert — last emission should be the clamped value
      const emissions = wrapper.emitted('update:modelValue') as unknown[][]
      expect(emissions.length).toBeGreaterThanOrEqual(1)
      expect(emissions[emissions.length - 1]).toEqual([0.5])
    })

    it('When slider set to 2.5 then clamps to 2.0 and emits update:modelValue', async () => {
      // Arrange
      const wrapper = mountSlider(1.0)
      const input = wrapper.find('input[type="range"]')
      // Act
      await input.setValue('2.5')
      await input.trigger('input')
      await nextTick()
      // Assert — last emission should be the clamped value
      const emissions = wrapper.emitted('update:modelValue') as unknown[][]
      expect(emissions.length).toBeGreaterThanOrEqual(1)
      expect(emissions[emissions.length - 1]).toEqual([2.0])
    })
  })

  describe('v-model interface', () => {
    it('When range input changes then emits update:modelValue with new value', async () => {
      // Arrange
      const wrapper = mountSlider(1.0)
      const input = wrapper.find('input[type="range"]')
      // Act
      await input.setValue('1.5')
      await input.trigger('input')
      // Assert
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([1.5])
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
    it('When viewport is 375px then native range slider renders', () => {
      // Arrange
      setBreakpoint(375)
      // Act
      const wrapper = mountSlider()
      const html = wrapper.html()
      // Assert
      expect(html).toContain('type="range"')
    })

    it('When viewport is 1024px then native range slider renders', () => {
      // Arrange
      setBreakpoint(1024)
      // Act
      const wrapper = mountSlider()
      const html = wrapper.html()
      // Assert
      expect(html).toContain('type="range"')
    })
  })
})
